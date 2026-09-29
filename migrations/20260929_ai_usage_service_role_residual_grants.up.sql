-- ai_usage — remove service_role's remaining non-data privileges (follow-up to
-- 20260929_ai_usage_service_role_grants, T-0019).
--
-- After that migration service_role held arxtm: INSERT, SELECT, REFERENCES,
-- TRIGGER, MAINTAIN. None of the last three is needed:
--   * REFERENCES — nothing foreign-keys into ai_usage.
--   * TRIGGER    — lets the holder create triggers on the table. The
--                  append-only guarantee lives in triggers; no app role should
--                  be able to add its own.
--   * MAINTAIN   — (PG17) VACUUM/ANALYZE/REINDEX/CLUSTER/REFRESH/LOCK. Owner
--                  and platform maintenance cover this.
--
-- service_role is left with exactly INSERT, SELECT.

REVOKE REFERENCES, TRIGGER, MAINTAIN ON public.ai_usage FROM service_role;
