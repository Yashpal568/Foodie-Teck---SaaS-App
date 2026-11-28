-- ==============================================================================
-- MIGRATION 20261127000005: ENABLE SUPABASE REALTIME FOR LIVE KDS, FLOOR & TICKETS
-- Idempotently adds operational tables missing from supabase_realtime publication.
-- ==============================================================================

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'orders',
    'order_items',
    'table_sessions',
    'waiter_calls',
    'notifications',
    'support_tickets',
    'ticket_replies',
    'restaurants',
    'subscriptions',
    'payment_verifications',
    'audit_logs'
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
