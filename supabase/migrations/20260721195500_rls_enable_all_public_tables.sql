-- Security lockdown: enable RLS (deny-all, no policies) on every public table.
-- The app is server-authoritative: Express owns all table access via a direct DB
-- connection as `postgres` (BYPASSRLS), and edge functions read/write via the
-- service_role client (BYPASSRLS). Both bypass RLS, so enabling deny-all RLS does NOT
-- break the app; it closes the public-anon-key PostgREST hole (anon/authenticated get
-- no rows because there are no policies). Plain ENABLE (not FORCE) keeps the owner bypass.
-- Idempotent: ENABLE ROW LEVEL SECURITY is a no-op when already enabled.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
