-- Restores the pre-T-0019 state: service_role held UPDATE, DELETE, TRUNCATE.
-- The append-only triggers still refuse all three either way.
GRANT UPDATE, DELETE, TRUNCATE ON public.ai_usage TO service_role;
