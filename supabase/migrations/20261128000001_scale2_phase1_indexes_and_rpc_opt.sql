-- ==============================================================================
-- MIGRATION 20261128000001: SCALE TEST 2.0 OPTIMIZATION PHASE 1
--   1. Additive composite & join indexes for hot QR read and cancellation paths
--   2. Conditional claim_public_table_session() to eliminate redundant writes
--   3. Consolidated get_public_menu_bootstrap() non-PII RPC for single-trip loads
-- Safe, additive, idempotent migration (APPLY TO STAGING FIRST; NEVER TOUCH PROD).
-- Note: supabase_realtime publication tables were audited in client/src and all
--       11 published tables remain actively subscribed; none were dropped here.
-- ==============================================================================

BEGIN;

-- 1. Additive query-path & join indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_created_at
  ON public.menu_items (restaurant_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id
  ON public.order_items (menu_item_id);

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id
  ON public.customers (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_restaurant_id
  ON public.payment_verifications (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant_status
  ON public.table_sessions (restaurant_id, status);

-- 2. Conditional claim_public_table_session:
--    Inserts 'occupied' when missing, or transitions ONLY 'available'/'needs-cleaning'.
--    Skips redundant row writes (and WAL/Realtime fanout) when already 'occupied'/'billing'.
CREATE OR REPLACE FUNCTION public.claim_public_table_session(
  p_restaurant_id UUID,
  p_table_number INTEGER
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND LOWER(COALESCE(r.status, 'Active')) <> 'suspended'
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.table_sessions (
    restaurant_id, table_number, status, customers, session_start, last_activity
  )
  VALUES (
    p_restaurant_id, p_table_number, 'occupied', 1, NOW(), NOW()
  )
  ON CONFLICT (restaurant_id, table_number) DO UPDATE
  SET status = 'occupied',
      customers = GREATEST(1, COALESCE(public.table_sessions.customers, 0)),
      session_start = COALESCE(public.table_sessions.session_start, NOW()),
      last_activity = NOW()
  WHERE LOWER(COALESCE(public.table_sessions.status, 'available')) IN ('available', 'needs-cleaning');

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_public_table_session(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_public_table_session(UUID, INTEGER) TO anon, authenticated, service_role;

-- 3. Single-round-trip non-PII guest menu bootstrap RPC
--    Consolidates profile + menu_items + gst_settings + table numbers/statuses.
--    Inventory validation remains strictly authoritative inside create_validated_order().
CREATE OR REPLACE FUNCTION public.get_public_menu_bootstrap(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile RECORD;
  v_is_active BOOLEAN := FALSE;
  v_menu_items JSONB := '[]'::JSONB;
  v_gst JSONB := '{}'::JSONB;
  v_tables JSONB := '[]'::JSONB;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    r.id,
    r.business_name,
    r.description,
    r.logo_url,
    r.cover_url,
    r.status,
    r.gstin
  INTO v_profile
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_is_active := LOWER(COALESCE(v_profile.status, 'Active')) <> 'suspended';

  IF v_is_active THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'restaurant_id', m.restaurant_id,
          'name', m.name,
          'description', m.description,
          'price', m.price,
          'half_price', m.half_price,
          'quantity', m.quantity,
          'category', m.category,
          'type', m.type,
          'is_in_stock', m.is_in_stock,
          'photo_url', m.photo_url,
          'created_at', m.created_at
        )
        ORDER BY m.created_at ASC, m.id ASC
      ),
      '[]'::JSONB
    )
    INTO v_menu_items
    FROM public.menu_items m
    WHERE m.restaurant_id = p_restaurant_id;
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'enabled', COALESCE(g.enabled, FALSE),
        'rate', COALESCE(g.rate, 0),
        'label', COALESCE(NULLIF(TRIM(g.label), ''), 'GST'),
        'gstin', UPPER(TRIM(COALESCE(NULLIF(g.gstin, ''), v_profile.gstin, '')))
      )
      FROM public.gst_settings g
      WHERE g.restaurant_id = p_restaurant_id
      LIMIT 1
    ),
    jsonb_build_object(
      'enabled', FALSE,
      'rate', 0,
      'label', 'GST',
      'gstin', UPPER(TRIM(COALESCE(v_profile.gstin, '')))
    )
  )
  INTO v_gst;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table_number', ts.table_number,
        'status', LOWER(COALESCE(ts.status, 'available'))
      )
      ORDER BY ts.table_number ASC
    ),
    '[]'::JSONB
  )
  INTO v_tables
  FROM public.table_sessions ts
  WHERE ts.restaurant_id = p_restaurant_id;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'business_name', v_profile.business_name,
      'description', v_profile.description,
      'logo_url', v_profile.logo_url,
      'cover_url', v_profile.cover_url,
      'status', v_profile.status,
      'gstin', v_profile.gstin
    ),
    'menu_items', v_menu_items,
    'gst', v_gst,
    'tables', v_tables
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_menu_bootstrap(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_menu_bootstrap(UUID) TO anon, authenticated, service_role;

-- Update planner statistics after adding indexes
ANALYZE public.menu_items;
ANALYZE public.order_items;
ANALYZE public.customers;
ANALYZE public.payment_verifications;
ANALYZE public.table_sessions;

COMMIT;
