-- ==============================================================================
-- MIGRATION 20261128000003: PROTECT PUBLIC STOCK QUANTITY EXPOSURE
-- Objectives:
-- 1. Prevent anonymous (`anon`) users from reading exact `menu_items.quantity`
--    via direct PostgREST SELECT while preserving public menu column reads.
-- 2. Update `get_public_menu_bootstrap` to fold `quantity > 0` into `is_in_stock`
--    and omit raw `quantity` from anonymous responses.
-- 3. Preserve full `authenticated` merchant access to `menu_items.quantity` and
--    keep `create_validated_order` atomic stock validation unchanged.
-- ==============================================================================

BEGIN;

-- 1. Restrict `anon` column-level SELECT on `public.menu_items` to exclude `quantity`
REVOKE SELECT ON public.menu_items FROM anon;
GRANT SELECT (
  id,
  restaurant_id,
  name,
  description,
  price,
  half_price,
  category,
  type,
  is_in_stock,
  photo_url,
  created_at,
  updated_at
) ON public.menu_items TO anon;

-- Ensure `authenticated` merchants keep full SELECT access (subject to existing RLS)
GRANT SELECT ON public.menu_items TO authenticated;

-- 2. Update `get_public_menu_bootstrap` to expose availability (`is_in_stock`) only
CREATE OR REPLACE FUNCTION public.get_public_menu_bootstrap(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile RECORD;
  v_is_active BOOLEAN := TRUE;
  v_menu_items JSONB := '[]'::JSONB;
  v_gst JSONB;
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
          'category', m.category,
          'type', m.type,
          'is_in_stock', (COALESCE(m.is_in_stock, TRUE) AND (m.quantity IS NULL OR m.quantity > 0)),
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

COMMIT;
