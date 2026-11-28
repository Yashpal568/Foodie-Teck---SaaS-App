-- ==============================================================================
-- SERVORA STAGING ONLY: LEAST-PRIVILEGE TABLE & SCHEMA GRANTS
-- Apply AFTER baseline schema (client/src/docs/supabase_schema_and_rls.sql)
-- and migrations 20261127000001 through 20261127000005 on a fresh staging DB.
--
-- NEVER run against production (oliuhzkbnxjiwkrdlcfv).
-- Matches SECURITY DEFINER RPC + multi-tenant RLS isolation design:
--   * service_role: full administrative/seed/cleanup access
--   * authenticated: SELECT/INSERT/UPDATE/DELETE gated row-by-row via RLS
--   * anon: strictly read-only SELECT on public menu/GST/plan tables only;
--           all guest actions use explicit SECURITY DEFINER RPCs.
-- ==============================================================================

BEGIN;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Reset any default anon table privileges before applying narrow public reads
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON
  public.menu_categories,
  public.menu_items,
  public.gst_settings,
  public.subscription_plans
TO anon;

COMMIT;
