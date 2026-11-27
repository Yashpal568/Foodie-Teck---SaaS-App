-- ==============================================================================
-- MIGRATION 20261127000003: ADD OPTIONAL GSTIN SUPPORT FOR DYNAMIC RECEIPTS
-- Non-destructive additive migration on restaurants and gst_settings.
-- ==============================================================================

BEGIN;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '';

ALTER TABLE public.gst_settings
  ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '';

-- Recreate public restaurant profile RPC with explicit DROP first (PostgreSQL forbids changing RETURNS TABLE via CREATE OR REPLACE alone)
DROP FUNCTION IF EXISTS public.get_public_restaurant_profile(UUID);

CREATE FUNCTION public.get_public_restaurant_profile(p_restaurant_id UUID)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  status TEXT,
  gstin TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.id, r.business_name, r.description, r.logo_url, r.cover_url, r.status, COALESCE(r.gstin, '')
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id
    AND COALESCE(r.status, 'Active') <> 'Suspended'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_restaurant_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_profile(UUID) TO anon, authenticated;

COMMIT;
