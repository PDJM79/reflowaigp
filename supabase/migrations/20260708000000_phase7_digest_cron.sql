-- =============================================================================
-- ReflowAI GP — Phase 7: pg_cron wiring for the overdue-digest edge function
-- =============================================================================
-- Schedules send-overdue-digest via pg_cron + pg_net, mirroring the Phase 2
-- scheduler cron exactly (same Vault secret pattern, fails soft without secrets).
-- 07:00 UTC daily — a morning digest, after the 00:15 overdue-escalator has run
-- so statuses are current. The function skips practices with nothing overdue.
--
-- Requires: extensions pg_cron + pg_net; Vault secrets 'project_url' and
-- 'edge_cron_secret'. Idempotent (unschedule-if-exists then schedule).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_url   text;
  v_token text;
BEGIN
  -- Pull config from Vault (fail soft if not present so the migration still applies).
  BEGIN
    SELECT decrypted_secret INTO v_url   FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'edge_cron_secret';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Vault secrets not available; skipping digest cron scheduling. Configure project_url + edge_cron_secret then re-run.';
    RETURN;
  END;

  IF v_url IS NULL OR v_token IS NULL THEN
    RAISE NOTICE 'project_url / edge_cron_secret not set; skipping digest cron scheduling.';
    RETURN;
  END IF;

  -- Unschedule existing job of the same name (idempotent).
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-overdue-digest';

  -- Overdue/missed manager digest: 07:00 UTC daily.
  PERFORM cron.schedule(
    'send-overdue-digest', '0 7 * * *',
    format($f$
      SELECT net.http_post(
        url    := %L,
        headers:= jsonb_build_object('Content-Type','application/json','X-Job-Token', %L),
        body   := '{}'::jsonb
      );
    $f$, v_url || '/functions/v1/send-overdue-digest', v_token)
  );

  RAISE NOTICE 'Scheduled send-overdue-digest (07:00 UTC).';
END $$;
