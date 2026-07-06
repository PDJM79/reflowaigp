-- Down for 20260708000000_phase7_digest_cron (reversibility test only).
-- Unschedule the digest job if pg_cron is present; fail soft otherwise.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-overdue-digest';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available or job absent; nothing to unschedule.';
END $$;
