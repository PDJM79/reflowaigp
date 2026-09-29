-- ai_usage — tighten service_role to least privilege (T-0019).
--
-- 20260819_ai_usage GRANTed INSERT, SELECT to service_role but never revoked
-- Supabase's default ALL, so service_role still held UPDATE, DELETE and
-- TRUNCATE. The append-only triggers already refuse all three (rehearsed on
-- prod 2026-09-29, rolled back), so this changes no behaviour today. It makes
-- the grants say what the triggers enforce, and removes the privileges if a
-- trigger is ever dropped or disabled.
--
-- Nothing in this repo writes ai_usage through service_role; the only writer
-- is the Express server, as the table owner. INSERT, SELECT are kept so an
-- edge function or admin query can still write and read telemetry.
--
-- The owner (postgres) is untouched: an owner keeps its privileges implicitly,
-- so revoking from it achieves nothing. The triggers remain the load-bearing
-- control for the owner.

REVOKE UPDATE, DELETE, TRUNCATE ON public.ai_usage FROM service_role;
