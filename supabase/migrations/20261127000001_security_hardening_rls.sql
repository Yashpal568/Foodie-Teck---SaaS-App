-- ==============================================================================
-- MIGRATION 20261127000001: SERVORA SECURITY HARDENING & MULTI-TENANT RLS
-- Target: PostgreSQL 15+ / Supabase
-- Non-destructive: Drops insecure USING(true) policies and replaces with
-- least-privilege, role-scoped (TO anon / TO authenticated) policies.
-- ==============================================================================

BEGIN;

-- 1. Private internal schema (not exposed via PostgREST / Data API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Dedicated platform admin allowlist inside unexposed schema (defense in depth alongside app_metadata.role)
CREATE TABLE IF NOT EXISTS private.platform_admins (
    user_id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON TABLE private.platform_admins FROM PUBLIC, anon, authenticated;
ALTER TABLE private.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2. Internal RLS helper functions (unexposed private schema, search_path='')
CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND (
    UPPER(COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '')) IN ('SUPER_ADMIN', 'ADMIN', 'PLATFORM_ADMIN')
    OR EXISTS (
      SELECT 1 FROM private.platform_admins pa
      WHERE pa.user_id = (SELECT auth.uid())
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.owns_restaurant(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = p_restaurant_id
        AND r.owner_id = (SELECT auth.uid())
    )
    OR private.is_platform_admin()
  );
$$;
REVOKE EXECUTE ON FUNCTION private.owns_restaurant(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.owns_restaurant(UUID) TO authenticated, service_role;

-- Public-callable admin verification check (restricted to authenticated users only)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_platform_admin();
$$;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 3. Ensure required tables & optional operational tables/columns exist and have RLS enabled
ALTER TABLE public.restaurants
    ADD COLUMN IF NOT EXISTS owner_id UUID,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    duration_days INT DEFAULT 90,
    table_limit INT DEFAULT 9999,
    menu_item_limit INT DEFAULT 9999,
    features JSONB DEFAULT '[]'::jsonb,
    popular BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if subscription_plans already existed prior to this migration
ALTER TABLE public.subscription_plans
    ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 90,
    ADD COLUMN IF NOT EXISTS table_limit INT DEFAULT 9999,
    ADD COLUMN IF NOT EXISTS menu_item_limit INT DEFAULT 9999,
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    table_number INT NOT NULL DEFAULT 1,
    customer_name TEXT DEFAULT 'Walk-in Guest',
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    UNIQUE (restaurant_id, invoice_number)
);

-- Enable RLS across ALL tables in public schema
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 4. Drop ALL legacy permissive / unsafe policies cleanly
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'restaurants', 'subscriptions', 'subscription_plans', 'payment_verifications',
        'payment_methods', 'menu_categories', 'menu_items', 'table_sessions',
        'qr_codes', 'orders', 'order_items', 'gst_settings', 'customers',
        'support_tickets', 'ticket_replies', 'notifications', 'waiter_calls',
        'audit_logs', 'invoices'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 5. Least-Privilege Policies by Table

-- [restaurants]: Owners manage their own restaurant; platform admins manage all.
-- Public QR menus MUST use RPC `public.get_public_restaurant_profile(uuid)` so owner email/phone/owner_id stay private.
CREATE POLICY "restaurants_owner_select" ON public.restaurants
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR private.is_platform_admin());

CREATE POLICY "restaurants_owner_insert" ON public.restaurants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR private.is_platform_admin());

CREATE POLICY "restaurants_owner_update" ON public.restaurants
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR private.is_platform_admin())
  WITH CHECK (owner_id = (SELECT auth.uid()) OR private.is_platform_admin());

-- [subscription_plans]: Publicly readable active catalog; admin-only write
CREATE POLICY "subscription_plans_public_select" ON public.subscription_plans
  FOR SELECT TO anon, authenticated
  USING (COALESCE(active, TRUE) = TRUE);

CREATE POLICY "subscription_plans_admin_select" ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (private.is_platform_admin());

CREATE POLICY "subscription_plans_admin_write" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

-- [subscriptions]: Merchants view own & submit PENDING_APPROVAL only; ONLY admins activate/modify plans
CREATE POLICY "subscriptions_tenant_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));

CREATE POLICY "subscriptions_tenant_insert_pending" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_restaurant(restaurant_id)
    AND UPPER(COALESCE(status, 'PENDING_APPROVAL')) IN ('PENDING_APPROVAL', 'PENDING_PAYMENT')
  );

CREATE POLICY "subscriptions_admin_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

CREATE POLICY "subscriptions_admin_delete" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (private.is_platform_admin());

-- [payment_verifications]: Merchants view own & submit PENDING_APPROVAL; ONLY admins approve/reject
CREATE POLICY "payment_verifications_tenant_select" ON public.payment_verifications
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));

CREATE POLICY "payment_verifications_tenant_insert_pending" ON public.payment_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    private.owns_restaurant(restaurant_id)
    AND UPPER(COALESCE(status, 'PENDING_APPROVAL')) IN ('PENDING_APPROVAL', 'PENDING_PAYMENT')
  );

CREATE POLICY "payment_verifications_admin_update" ON public.payment_verifications
  FOR UPDATE TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

-- [payment_methods]: Strictly tenant-owner only
CREATE POLICY "payment_methods_tenant_all" ON public.payment_methods
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

-- [menu_categories]: Public read for customer QR menu; tenant-owner write
CREATE POLICY "menu_categories_public_select" ON public.menu_categories
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "menu_categories_tenant_write" ON public.menu_categories
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(restaurant_id));

CREATE POLICY "menu_categories_tenant_update" ON public.menu_categories
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

CREATE POLICY "menu_categories_tenant_delete" ON public.menu_categories
  FOR DELETE TO authenticated
  USING (private.owns_restaurant(restaurant_id));

-- [menu_items]: Public read for customer QR menu; tenant-owner write
CREATE POLICY "menu_items_public_select" ON public.menu_items
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "menu_items_tenant_insert" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(restaurant_id));

CREATE POLICY "menu_items_tenant_update" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

CREATE POLICY "menu_items_tenant_delete" ON public.menu_items
  FOR DELETE TO authenticated
  USING (private.owns_restaurant(restaurant_id));

-- [qr_codes]: Tenant-owner only (customers only read signed URLs from printouts / QR scans)
CREATE POLICY "qr_codes_tenant_all" ON public.qr_codes
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

-- [table_sessions]: Tenant-owner only (guests read table numbers via get_public_table_numbers RPC)
CREATE POLICY "table_sessions_tenant_all" ON public.table_sessions
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

-- [orders] & [order_items]: Tenant-owner & admin read/manage; public guests create orders ONLY via RPC create_validated_order
-- and poll order status ONLY via RPC get_public_order_status(order_id, restaurant_id)
CREATE POLICY "orders_tenant_select" ON public.orders
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));

CREATE POLICY "orders_tenant_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_restaurant(restaurant_id));

CREATE POLICY "orders_tenant_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

CREATE POLICY "orders_tenant_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (private.is_platform_admin());

CREATE POLICY "order_items_tenant_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND private.owns_restaurant(o.restaurant_id)
    )
  );

CREATE POLICY "order_items_tenant_insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND private.owns_restaurant(o.restaurant_id)
    )
  );

-- [gst_settings]: Public needs read for customer cart tax preview? Expose only via public RPC or read-only SELECT without PII
CREATE POLICY "gst_settings_public_select" ON public.gst_settings
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "gst_settings_tenant_write" ON public.gst_settings
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

-- [customers]: Strictly tenant-owner PII isolation
CREATE POLICY "customers_tenant_all" ON public.customers
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

-- [support_tickets] & [ticket_replies]: Tenant owner & platform admin
CREATE POLICY "support_tickets_tenant_all" ON public.support_tickets
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

CREATE POLICY "ticket_replies_tenant_all" ON public.ticket_replies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND private.owns_restaurant(t.restaurant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND private.owns_restaurant(t.restaurant_id)
    )
  );

-- [notifications]: Strictly tenant-owner & admin (public order/waiter notifications inserted inside SECURITY DEFINER RPCs)
CREATE POLICY "notifications_tenant_all" ON public.notifications
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

-- [waiter_calls]: Tenant-owner reads/updates/deletes; public guests trigger via RPC request_waiter_assistance
CREATE POLICY "waiter_calls_tenant_all" ON public.waiter_calls
  FOR ALL TO authenticated
  USING (private.owns_restaurant(restaurant_id))
  WITH CHECK (private.owns_restaurant(restaurant_id));

-- [audit_logs]: Tenant-owner SELECT own / admin SELECT all; append-only INSERT by authenticated tenant/admin; UPDATE/DELETE denied
CREATE POLICY "audit_logs_tenant_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));

CREATE POLICY "audit_logs_tenant_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (restaurant_id IS NULL OR private.owns_restaurant(restaurant_id));

-- [invoices]: Tenant-owner read; server service_role / admin write
CREATE POLICY "invoices_tenant_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));

CREATE POLICY "invoices_admin_write" ON public.invoices
  FOR ALL TO authenticated
  USING (private.is_platform_admin())
  WITH CHECK (private.is_platform_admin());

COMMIT;
