-- ==============================================================================
-- MIGRATION 20261127000002: ATOMIC ORDER RPCs, PUBLIC SAFE READS & DATA INTEGRITY
-- Implements:
-- - Atomic idempotent order placement (`public.create_validated_order`) with
--   authoritative DB price lookup, stock row locking (deadlock-safe), & single TX
-- - Public safe menu profile (`public.get_public_restaurant_profile`)
-- - Public safe table picker (`public.get_public_table_numbers`)
-- - Public guest waiter trigger (`public.request_waiter_assistance`)
-- - Public guest order tracker (`public.get_public_order_status`)
-- - UTR uniqueness, idempotency unique indexes, & payment tamper-prevention trigger
-- ==============================================================================

BEGIN;

-- 1. Supporting Columns & Integrity Constraints
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_prepaid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT 'full';

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS half_price NUMERIC(12,2) CHECK (half_price IS NULL OR half_price >= 0),
  ADD COLUMN IF NOT EXISTS quantity INT CHECK (quantity IS NULL OR quantity >= 0),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Performance + RLS indexes on hot tenant predicates
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants (owner_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON public.orders (restaurant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_unique
  ON public.orders (restaurant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_rest_table ON public.table_sessions (restaurant_id, table_number);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_rest_unhandled ON public.waiter_calls (restaurant_id, is_handled, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_rest_created ON public.notifications (restaurant_id, created_at DESC);
-- Non-destructively quarantine historical duplicate non-REJECTED UTRs before creating unique index
-- Keeps the winning row (APPROVED first, else earliest created_at) and marks later duplicates REJECTED
WITH ranked_utrs AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(TRIM(utr_number))
      ORDER BY
        CASE WHEN UPPER(COALESCE(status, '')) = 'APPROVED' THEN 0 ELSE 1 END ASC,
        created_at ASC NULLS LAST,
        id ASC
    ) AS rn
  FROM public.payment_verifications
  WHERE UPPER(COALESCE(status, '')) <> 'REJECTED'
    AND NULLIF(TRIM(utr_number), '') IS NOT NULL
)
UPDATE public.payment_verifications pv
SET status = 'REJECTED'
FROM ranked_utrs r
WHERE pv.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_verifications_utr_unique
  ON public.payment_verifications (UPPER(TRIM(utr_number)))
  WHERE UPPER(COALESCE(status, '')) <> 'REJECTED' AND NULLIF(TRIM(utr_number), '') IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_rest_status ON public.subscriptions (restaurant_id, status);

-- 2. Defense-in-depth trigger blocking client privilege/payment tampering even on partial misconfiguration
CREATE OR REPLACE FUNCTION private.guard_subscription_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Service role / postgres superuser (auth.uid() IS NULL in server connection) or platform admin allowed
  IF (SELECT auth.uid()) IS NOT NULL AND NOT private.is_platform_admin() THEN
    IF UPPER(COALESCE(NEW.status, '')) IN ('ACTIVE', 'APPROVED')
       AND UPPER(COALESCE(OLD.status, '')) NOT IN ('ACTIVE', 'APPROVED') THEN
      RAISE EXCEPTION 'Unauthorized: only verified platform administrators may activate subscriptions.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_subscription_status ON public.subscriptions;
CREATE TRIGGER trg_guard_subscription_status
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_subscription_status_transition();

-- 3. Narrow Public Menu Read RPCs (Zero merchant PII exposed)
DROP FUNCTION IF EXISTS public.get_public_restaurant_profile(UUID);
CREATE OR REPLACE FUNCTION public.get_public_restaurant_profile(p_restaurant_id UUID)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  status TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.id, r.business_name, r.description, r.logo_url, r.cover_url, r.status
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id
    AND COALESCE(r.status, 'Active') <> 'Suspended'
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_restaurant_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_profile(UUID) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_table_numbers(UUID);
CREATE OR REPLACE FUNCTION public.get_public_table_numbers(p_restaurant_id UUID)
RETURNS TABLE (table_number INT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ts.table_number
  FROM public.table_sessions ts
  WHERE ts.restaurant_id = p_restaurant_id
  ORDER BY ts.table_number ASC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_table_numbers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_table_numbers(UUID) TO anon, authenticated;

-- 3b. Safe Public Table Claim RPC (allows QR guests to claim an existing available table without exposing table_sessions writes)
DROP FUNCTION IF EXISTS public.claim_public_table_session(UUID, INT);
CREATE OR REPLACE FUNCTION public.claim_public_table_session(
  p_restaurant_id UUID,
  p_table_number INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_restaurant_id IS NULL OR p_table_number IS NULL OR p_table_number < 1 OR p_table_number > 9999 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.table_sessions ts
  SET status = 'occupied',
      customers = GREATEST(1, COALESCE(ts.customers, 0)),
      session_start = COALESCE(ts.session_start, NOW()),
      last_activity = NOW()
  WHERE ts.restaurant_id = p_restaurant_id
    AND ts.table_number = p_table_number
    AND LOWER(COALESCE(ts.status, 'available')) IN ('available', 'needs-cleaning');

  RETURN FOUND;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_public_table_session(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_public_table_session(UUID, INT) TO anon, authenticated;

-- 4. Guest Waiter Call RPC (validates active restaurant & persists notification atomically)
DROP FUNCTION IF EXISTS public.request_waiter_assistance(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.request_waiter_assistance(
  p_restaurant_id UUID,
  p_table_number TEXT,
  p_customer_name TEXT DEFAULT 'Guest'
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  table_number TEXT,
  customer_name TEXT,
  is_handled BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_table TEXT;
  v_clean_name TEXT;
  v_call_row RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = p_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;

  v_clean_table := LEFT(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(p_table_number), ''), '1'), '[^a-zA-Z0-9_-]', '', 'g'), 16);
  v_clean_name := LEFT(COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Guest'), 80);

  INSERT INTO public.waiter_calls (restaurant_id, table_number, customer_name, is_handled, created_at)
  VALUES (p_restaurant_id, v_clean_table, v_clean_name, FALSE, NOW())
  RETURNING * INTO v_call_row;

  INSERT INTO public.notifications (restaurant_id, type, title, message, table_number, is_read, created_at)
  VALUES (
    p_restaurant_id,
    'waiter_call',
    'Waiter Requested',
    format('Table %s (%s) is requesting service.', v_clean_table, v_clean_name),
    v_clean_table,
    FALSE,
    NOW()
  );

  RETURN QUERY
  SELECT v_call_row.id, v_call_row.restaurant_id, v_call_row.table_number,
         v_call_row.customer_name, v_call_row.is_handled, v_call_row.created_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.request_waiter_assistance(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_waiter_assistance(UUID, TEXT, TEXT) TO anon, authenticated;

-- 5. Atomic Idempotent Order Placement RPC (Authoritative DB Prices + Stock Lock)
-- Expects p_items JSONB array: [{ "menu_item_id": "uuid", "quantity": 2, "variant": "full"|"half" }]
DROP FUNCTION IF EXISTS public.create_validated_order(UUID, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, TEXT, BOOLEAN, TEXT);
CREATE OR REPLACE FUNCTION public.create_validated_order(
  p_restaurant_id UUID,
  p_table_number TEXT,
  p_customer_name TEXT DEFAULT 'Guest Customer',
  p_order_type TEXT DEFAULT 'DINE-IN',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_guests INT DEFAULT 1,
  p_notes TEXT DEFAULT '',
  p_idempotency_key TEXT DEFAULT NULL,
  p_initial_status TEXT DEFAULT 'PENDING',
  p_is_prepaid BOOLEAN DEFAULT FALSE,
  p_payment_method TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_order RECORD;
  v_rest RECORD;
  v_gst RECORD;
  v_elem JSONB;
  v_menu_row RECORD;
  v_qty INT;
  v_variant TEXT;
  v_unit_price NUMERIC(12,2);
  v_subtotal NUMERIC(12,2) := 0;
  v_gst_rate NUMERIC(5,2) := 0;
  v_gst_label TEXT := 'GST';
  v_tax NUMERIC(12,2) := 0;
  v_total NUMERIC(12,2) := 0;
  v_order RECORD;
  v_clean_table TEXT;
  v_clean_name TEXT;
  v_clean_type TEXT;
  v_status TEXT;
  v_table_int INT;
  v_item_summary TEXT := '';
  v_line_items JSONB := '[]'::jsonb;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id is required';
  END IF;

  -- Idempotency guard: return already persisted order if duplicate submission
  IF NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '') IS NOT NULL THEN
    SELECT o.* INTO v_existing_order
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND o.idempotency_key = TRIM(p_idempotency_key)
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'order', to_jsonb(v_existing_order),
        'duplicate', TRUE
      );
    END IF;
  END IF;

  SELECT id, status INTO v_rest
  FROM public.restaurants
  WHERE id = p_restaurant_id;

  IF NOT FOUND OR COALESCE(v_rest.status, 'Active') = 'Suspended' THEN
    RAISE EXCEPTION 'Restaurant unavailable or suspended';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one menu item';
  END IF;

  -- Lock menu item rows in deterministic UUID order to eliminate deadlocks and race conditions
  FOR v_elem IN
    SELECT value
    FROM jsonb_array_elements(p_items) AS t(value)
    ORDER BY (value ->> 'menu_item_id') ASC
  LOOP
    v_qty := COALESCE((v_elem ->> 'quantity')::INT, 0);
    IF v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'Invalid item quantity (%): must be between 1 and 99', v_qty;
    END IF;

    IF NOT COALESCE((v_elem ->> 'menu_item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', FALSE) THEN
      RAISE EXCEPTION 'Valid menu_item_id UUID is required';
    END IF;

    SELECT mi.* INTO v_menu_row
    FROM public.menu_items mi
    WHERE mi.id = (v_elem ->> 'menu_item_id')::UUID
      AND mi.restaurant_id = p_restaurant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item % does not belong to this restaurant', COALESCE(v_elem ->> 'menu_item_id', 'unknown');
    END IF;

    IF v_menu_row.is_in_stock = FALSE THEN
      RAISE EXCEPTION 'Item "%" is currently out of stock', v_menu_row.name;
    END IF;

    IF v_menu_row.quantity IS NOT NULL THEN
      IF v_menu_row.quantity < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%" (remaining: %)', v_menu_row.name, v_menu_row.quantity;
      END IF;
      UPDATE public.menu_items
      SET quantity = v_menu_row.quantity - v_qty,
          is_in_stock = CASE WHEN (v_menu_row.quantity - v_qty) <= 0 THEN FALSE ELSE is_in_stock END,
          updated_at = NOW()
      WHERE id = v_menu_row.id;
    END IF;

    v_variant := LOWER(COALESCE(v_elem ->> 'variant', 'full'));
    IF v_variant = 'half' AND v_menu_row.half_price IS NOT NULL THEN
      v_unit_price := ROUND(v_menu_row.half_price, 2);
    ELSE
      v_unit_price := ROUND(v_menu_row.price, 2);
    END IF;

    v_subtotal := ROUND(v_subtotal + (v_unit_price * v_qty), 2);
    v_item_summary := CASE WHEN v_item_summary = '' THEN format('%sx %s', v_qty, v_menu_row.name)
                           ELSE v_item_summary || ', ' || format('%sx %s', v_qty, v_menu_row.name) END;

    v_line_items := v_line_items || jsonb_build_object(
      'menu_item_id', v_menu_row.id,
      'name', v_menu_row.name,
      'price', v_unit_price,
      'quantity', v_qty,
      'variant', v_variant
    );
  END LOOP;

  -- Authoritative GST from DB
  SELECT enabled, rate, label INTO v_gst
  FROM public.gst_settings
  WHERE restaurant_id = p_restaurant_id;

  IF FOUND AND COALESCE(v_gst.enabled, FALSE) = TRUE THEN
    v_gst_rate := GREATEST(0, LEAST(100, COALESCE(v_gst.rate, 0)));
    v_gst_label := COALESCE(NULLIF(TRIM(v_gst.label), ''), 'GST');
  END IF;

  v_tax := ROUND(v_subtotal * (v_gst_rate / 100.0), 2);
  v_total := ROUND(v_subtotal + v_tax, 2);

  v_clean_table := LEFT(COALESCE(NULLIF(TRIM(p_table_number), ''), '1'), 20);
  v_clean_name := LEFT(COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Guest Customer'), 100);
  v_clean_type := UPPER(LEFT(COALESCE(NULLIF(TRIM(p_order_type), ''), 'DINE-IN'), 40));

  -- Only authenticated restaurant owners may place pre-settled POS orders or jump status beyond PENDING
  IF (p_is_prepaid OR UPPER(COALESCE(p_initial_status, 'PENDING')) <> 'PENDING')
     AND NOT private.owns_restaurant(p_restaurant_id) THEN
    v_status := 'PENDING';
  ELSE
    v_status := UPPER(COALESCE(NULLIF(TRIM(p_initial_status), ''), 'PENDING'));
  END IF;

  INSERT INTO public.orders (
    restaurant_id, table_number, customer_name, status,
    subtotal, tax, total, gst_rate, gst_label, type,
    idempotency_key, payment_status, payment_method, is_prepaid, notes,
    created_at, updated_at
  )
  VALUES (
    p_restaurant_id,
    v_clean_table,
    v_clean_name,
    v_status,
    v_subtotal,
    v_tax,
    v_total,
    v_gst_rate,
    v_gst_label,
    v_clean_type,
    NULLIF(TRIM(COALESCE(p_idempotency_key, '')), ''),
    CASE WHEN v_status <> 'PENDING' AND p_is_prepaid THEN 'PAID' ELSE 'UNPAID' END,
    CASE WHEN v_status <> 'PENDING' AND p_is_prepaid THEN LEFT(COALESCE(p_payment_method, ''), 60) ELSE '' END,
    CASE WHEN v_status <> 'PENDING' THEN COALESCE(p_is_prepaid, FALSE) ELSE FALSE END,
    LEFT(COALESCE(p_notes, ''), 300),
    NOW(),
    NOW()
  )
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (order_id, menu_item_id, name, price, quantity, variant)
  SELECT
    v_order.id,
    (x ->> 'menu_item_id')::UUID,
    x ->> 'name',
    (x ->> 'price')::NUMERIC(12,2),
    (x ->> 'quantity')::INT,
    COALESCE(x ->> 'variant', 'full')
  FROM jsonb_array_elements(v_line_items) AS t(x);

  IF v_clean_type <> 'TAKE-AWAY' THEN
    v_table_int := NULLIF(REGEXP_REPLACE(v_clean_table, '\D', '', 'g'), '')::INT;
    IF v_table_int IS NOT NULL THEN
      UPDATE public.table_sessions
      SET status = 'occupied',
          customers = GREATEST(1, COALESCE(p_guests, 1)),
          current_order_id = v_order.id,
          session_start = COALESCE(session_start, NOW()),
          last_activity = NOW()
      WHERE restaurant_id = p_restaurant_id
        AND table_number = v_table_int;
    END IF;
  END IF;

  INSERT INTO public.notifications (restaurant_id, type, title, message, order_id, table_number, is_read, created_at)
  VALUES (
    p_restaurant_id,
    'new_order',
    'New Order Received',
    LEFT(format('Order #%s from Table %s: %s (%s)', RIGHT(v_order.id::TEXT, 6), v_clean_table, v_clean_name, v_item_summary), 280),
    v_order.id,
    v_clean_table,
    FALSE,
    NOW()
  );

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order) || jsonb_build_object('order_items', v_line_items),
    'duplicate', FALSE
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_validated_order(UUID, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_validated_order(UUID, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

-- 6. Public Order Status Lookup (for Guest Order Tracking without exposing full orders table)
DROP FUNCTION IF EXISTS public.get_public_order_status(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_public_order_status(p_order_id UUID, p_restaurant_id UUID)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  table_number TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.id, o.restaurant_id, o.table_number, o.status, o.subtotal, o.tax, o.total, o.created_at, o.updated_at
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.restaurant_id = p_restaurant_id
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_order_status(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_status(UUID, UUID) TO anon, authenticated;

COMMIT;
