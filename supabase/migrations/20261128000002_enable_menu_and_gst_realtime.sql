-- ==============================================================================
-- MIGRATION 20261128000002: ENABLE SUPABASE REALTIME FOR MENU, GST, PAYMENTS & CUSTOMERS
-- Ensures multi-terminal Realtime propagation for menu_items, gst_settings,
-- payment_methods, and customers alongside existing operational tables.
-- ==============================================================================

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'menu_items',
    'menu_categories',
    'gst_settings',
    'payment_methods',
    'customers'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END $$;
