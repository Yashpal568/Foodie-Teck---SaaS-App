-- ==============================================================================
-- MIGRATION 20261127000004: ATOMIC CANCELLATION INVENTORY RESTORATION &
--                             SUSPENDED WORKSPACE RLS ENFORCEMENT
-- Safe, additive, idempotent migration (DO NOT run without explicit review).
-- ==============================================================================

BEGIN;

-- 1. Idempotency columns on public.orders for one-time finite inventory restoration
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_restored BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inventory_restored_at TIMESTAMPTZ;

-- 2. Suspension-aware active workspace helper inside unexposed private schema
CREATE OR REPLACE FUNCTION private.is_restaurant_active(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND LOWER(COALESCE(r.status, 'Active')) <> 'suspended'
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_restaurant_active(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_restaurant_active(UUID) TO authenticated, service_role;

-- 3. Atomic, concurrency-safe & idempotent order cancellation with finite stock restore
DROP FUNCTION IF EXISTS public.cancel_order_and_restore_inventory(UUID);
CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_inventory(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order RECORD;
  v_rest RECORD;
  v_item RECORD;
  v_menu_row RECORD;
  v_current_status TEXT;
  v_table_int INT;
  v_has_other_open BOOLEAN := FALSE;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Order ID is required';
  END IF;

  -- Lock order row first to eliminate concurrent double-cancellation races
  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT private.owns_restaurant(v_order.restaurant_id) THEN
    RAISE EXCEPTION 'Forbidden: unauthorized order cancellation';
  END IF;

  SELECT id, status INTO v_rest
  FROM public.restaurants r
  WHERE r.id = v_order.restaurant_id;

  IF NOT private.is_platform_admin() AND LOWER(COALESCE(v_rest.status, 'Active')) = 'suspended' THEN
    RAISE EXCEPTION 'Merchant workspace is suspended';
  END IF;

  v_current_status := UPPER(COALESCE(v_order.status, 'PENDING'));

  -- Idempotency: repeated cancellation requests return current order without restoring stock twice
  IF v_current_status = 'CANCELLED' OR v_order.inventory_restored = TRUE THEN
    RETURN jsonb_build_object(
      'order', to_jsonb(v_order),
      'restored', FALSE,
      'already_cancelled', TRUE
    );
  END IF;

  IF v_current_status NOT IN ('PENDING', 'ORDERED', 'PREPARING', 'READY') THEN
    RAISE EXCEPTION 'Invalid order status transition from % to CANCELLED', v_current_status;
  END IF;

  -- Restore ONLY finite (non-NULL) menu_items.quantity deterministically in menu_item_id order
  FOR v_item IN
    SELECT oi.menu_item_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id
      AND oi.menu_item_id IS NOT NULL
      AND oi.quantity > 0
    ORDER BY oi.menu_item_id ASC
  LOOP
    SELECT mi.* INTO v_menu_row
    FROM public.menu_items mi
    WHERE mi.id = v_item.menu_item_id
      AND mi.restaurant_id = v_order.restaurant_id
    FOR UPDATE;

    IF FOUND AND v_menu_row.quantity IS NOT NULL THEN
      UPDATE public.menu_items
      SET quantity = GREATEST(0, v_menu_row.quantity) + v_item.quantity,
          is_in_stock = TRUE,
          updated_at = NOW()
      WHERE id = v_menu_row.id
        AND restaurant_id = v_order.restaurant_id
        AND quantity IS NOT NULL;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET status = 'CANCELLED',
      inventory_restored = TRUE,
      inventory_restored_at = NOW(),
      updated_at = NOW()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  -- Release table session ONLY if no other active orders remain on the same table
  IF NULLIF(TRIM(COALESCE(v_order.table_number, '')), '') IS NOT NULL THEN
    DECLARE
      v_digits TEXT;
    BEGIN
      v_digits := REGEXP_REPLACE(v_order.table_number, '\D', '', 'g');
      IF v_digits ~ '^\d{1,6}$' THEN
        v_table_int := v_digits::INT;
        SELECT EXISTS (
          SELECT 1
          FROM public.orders o2
          WHERE o2.restaurant_id = v_order.restaurant_id
            AND o2.id <> v_order.id
            AND REGEXP_REPLACE(COALESCE(o2.table_number, ''), '\D', '', 'g') ~ '^\d{1,6}$'
            AND REGEXP_REPLACE(COALESCE(o2.table_number, ''), '\D', '', 'g')::INT = v_table_int
            AND UPPER(COALESCE(o2.status, 'PENDING')) NOT IN ('FINISHED', 'FINISHED_CLOSED', 'CANCELLED')
        ) INTO v_has_other_open;

        IF NOT v_has_other_open THEN
          UPDATE public.table_sessions
          SET status = 'available',
              current_order_id = NULL,
              customers = 0,
              session_start = NULL,
              last_activity = NOW()
          WHERE restaurant_id = v_order.restaurant_id
            AND table_number = v_table_int;
        END IF;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'restored', TRUE,
    'already_cancelled', FALSE
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cancel_order_and_restore_inventory(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_inventory(UUID) TO authenticated;

-- 4. Defense-in-depth trigger preventing suspended owners from self-unsuspending or mutating restaurants.status
CREATE OR REPLACE FUNCTION private.guard_restaurant_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NOT private.is_platform_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Unauthorized: only verified platform administrators may modify workspace status or ownership.';
    END IF;
    IF LOWER(COALESCE(OLD.status, 'Active')) = 'suspended' THEN
      RAISE EXCEPTION 'Merchant workspace is suspended and cannot update restaurant settings.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_restaurant_status ON public.restaurants;
CREATE TRIGGER trg_guard_restaurant_status
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_restaurant_status_update();

-- 5. Tighten tenant write RLS so suspended merchants cannot mutate operational data directly
-- Preserves SELECT on restaurants/subscriptions & full access to support_tickets/ticket_replies!
DROP POLICY IF EXISTS "menu_categories_tenant_write" ON public.menu_categories;
CREATE POLICY "menu_categories_tenant_write" ON public.menu_categories
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "menu_categories_tenant_update" ON public.menu_categories;
CREATE POLICY "menu_categories_tenant_update" ON public.menu_categories
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "menu_categories_tenant_delete" ON public.menu_categories;
CREATE POLICY "menu_categories_tenant_delete" ON public.menu_categories
  FOR DELETE TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "menu_items_tenant_insert" ON public.menu_items;
CREATE POLICY "menu_items_tenant_insert" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "menu_items_tenant_update" ON public.menu_items;
CREATE POLICY "menu_items_tenant_update" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "menu_items_tenant_delete" ON public.menu_items;
CREATE POLICY "menu_items_tenant_delete" ON public.menu_items
  FOR DELETE TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "table_sessions_tenant_all" ON public.table_sessions;
DROP POLICY IF EXISTS "table_sessions_tenant_select" ON public.table_sessions;
DROP POLICY IF EXISTS "table_sessions_tenant_write" ON public.table_sessions;
CREATE POLICY "table_sessions_tenant_select" ON public.table_sessions
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));
CREATE POLICY "table_sessions_tenant_write" ON public.table_sessions
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "qr_codes_tenant_all" ON public.qr_codes;
DROP POLICY IF EXISTS "qr_codes_tenant_select" ON public.qr_codes;
DROP POLICY IF EXISTS "qr_codes_tenant_write" ON public.qr_codes;
CREATE POLICY "qr_codes_tenant_select" ON public.qr_codes
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));
CREATE POLICY "qr_codes_tenant_write" ON public.qr_codes
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "orders_tenant_insert" ON public.orders;
CREATE POLICY "orders_tenant_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "orders_tenant_update" ON public.orders;
CREATE POLICY "orders_tenant_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "order_items_tenant_insert" ON public.order_items;
CREATE POLICY "order_items_tenant_insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND private.owns_restaurant(o.restaurant_id)
        AND (private.is_platform_admin() OR private.is_restaurant_active(o.restaurant_id))
    )
  );

DROP POLICY IF EXISTS "gst_settings_tenant_write" ON public.gst_settings;
DROP POLICY IF EXISTS "gst_settings_tenant_insert" ON public.gst_settings;
DROP POLICY IF EXISTS "gst_settings_tenant_update" ON public.gst_settings;
DROP POLICY IF EXISTS "gst_settings_tenant_delete" ON public.gst_settings;
CREATE POLICY "gst_settings_tenant_insert" ON public.gst_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));
CREATE POLICY "gst_settings_tenant_update" ON public.gst_settings
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));
CREATE POLICY "gst_settings_tenant_delete" ON public.gst_settings
  FOR DELETE TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "payment_methods_tenant_all" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_tenant_select" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_tenant_write" ON public.payment_methods;
CREATE POLICY "payment_methods_tenant_select" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));
CREATE POLICY "payment_methods_tenant_write" ON public.payment_methods
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "notifications_tenant_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_tenant_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_tenant_write" ON public.notifications;
CREATE POLICY "notifications_tenant_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));
CREATE POLICY "notifications_tenant_write" ON public.notifications
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "waiter_calls_tenant_all" ON public.waiter_calls;
DROP POLICY IF EXISTS "waiter_calls_tenant_select" ON public.waiter_calls;
DROP POLICY IF EXISTS "waiter_calls_tenant_write" ON public.waiter_calls;
CREATE POLICY "waiter_calls_tenant_select" ON public.waiter_calls
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));
CREATE POLICY "waiter_calls_tenant_write" ON public.waiter_calls
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

DROP POLICY IF EXISTS "customers_tenant_all" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_select" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_write" ON public.customers;
CREATE POLICY "customers_tenant_select" ON public.customers
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));
CREATE POLICY "customers_tenant_write" ON public.customers
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)))
  WITH CHECK (private.owns_restaurant(restaurant_id) AND (private.is_platform_admin() OR private.is_restaurant_active(restaurant_id)));

COMMIT;

-- ==============================================================================
-- ROLLBACK REFERENCE (Manual Emergency Revert — Do NOT run alongside BEGIN above):
-- DROP TRIGGER IF EXISTS trg_guard_restaurant_status ON public.restaurants;
-- DROP FUNCTION IF EXISTS private.guard_restaurant_status_update();
-- DROP FUNCTION IF EXISTS public.cancel_order_and_restore_inventory(UUID);
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS inventory_restored_at, DROP COLUMN IF EXISTS inventory_restored;
-- Then re-apply baseline policies from 20261127000001_security_hardening_rls.sql & DROP FUNCTION private.is_restaurant_active(UUID).
-- ==============================================================================
