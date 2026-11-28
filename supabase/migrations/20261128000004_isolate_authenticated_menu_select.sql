-- ==============================================================================
-- MIGRATION 20261128000004: AUTHENTICATED CROSS-TENANT MENU_ITEMS SELECT ISOLATION
-- Objectives:
-- 1. Split `menu_items_public_select` so `anon` retains intended public menu
--    row visibility (subject to 20261128000003 column-level grant excluding
--    `quantity`), while `authenticated` direct `SELECT` is restricted strictly
--    to restaurant owners via `private.owns_restaurant(restaurant_id)`.
-- 2. Authenticated customers & cross-tenant users continue browsing public menus
--    via `public.get_public_menu_bootstrap(UUID)` (which omits `quantity`).
-- 3. Preserve existing INSERT, UPDATE, DELETE policies, suspension checks, and
--    `create_validated_order` atomic inventory deduction unchanged.
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "menu_items_public_select" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_anon_public_select" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_authenticated_tenant_select" ON public.menu_items;

-- 1. Anonymous public menu row visibility (column-level grant in 20261128000003 excludes `quantity`)
CREATE POLICY "menu_items_anon_public_select" ON public.menu_items
  FOR SELECT TO anon
  USING (TRUE);

-- 2. Authenticated tenant-isolated direct SELECT (owners/platform admins only)
CREATE POLICY "menu_items_authenticated_tenant_select" ON public.menu_items
  FOR SELECT TO authenticated
  USING (private.owns_restaurant(restaurant_id));

COMMIT;
