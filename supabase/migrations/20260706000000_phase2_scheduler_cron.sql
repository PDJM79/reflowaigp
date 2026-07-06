-- =============================================================================
-- ReflowAI GP — Phase 2: pg_cron wiring for the scheduler edge functions
-- =============================================================================
-- Schedules the two edge functions via pg_cron + pg_net (the Supabase pattern).
-- Times are UTC (pg_cron runs in UTC); 00:05/00:15 Europe/London == 00:05/00:15
-- UTC in winter (GMT) and 23:05/23:15 UTC the prior day in summer (BST). The
-- generation function recomputes "today" in the practice timezone, so a fixed
-- UTC trigger a few minutes after local midnight is fine either way; we schedule
-- at 00:05/00:15 UTC for simplicity and let the function resolve local dates.
--
-- Requires: extensions pg_cron + pg_net; Vault secrets 'project_url' and
-- 'edge_cron_secret'. Idempotent (unschedule-if-exists then schedule).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: (re)schedule a job that POSTs to an edge function with the cron secret.
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
    RAISE NOTICE 'Vault secrets not available; skipping cron scheduling. Configure project_url + edge_cron_secret then re-run.';
    RETURN;
  END;

  IF v_url IS NULL OR v_token IS NULL THEN
    RAISE NOTICE 'project_url / edge_cron_secret not set; skipping cron scheduling.';
    RETURN;
  END IF;

  -- Unschedule existing jobs of the same name (idempotent).
  PERFORM cron.unschedule(jobid) FROM cron.job
    WHERE jobname IN ('scheduler-generate-tasks', 'scheduler-overdue-escalator');

  -- Generation: 00:05 UTC daily.
  PERFORM cron.schedule(
    'scheduler-generate-tasks', '5 0 * * *',
    format($f$
      SELECT net.http_post(
        url    := %L,
        headers:= jsonb_build_object('Content-Type','application/json','X-Job-Token', %L),
        body   := '{}'::jsonb
      );
    $f$, v_url || '/functions/v1/scheduler-generate-tasks', v_token)
  );

  -- Overdue escalator: 00:15 UTC daily.
  PERFORM cron.schedule(
    'scheduler-overdue-escalator', '15 0 * * *',
    format($f$
      SELECT net.http_post(
        url    := %L,
        headers:= jsonb_build_object('Content-Type','application/json','X-Job-Token', %L),
        body   := '{}'::jsonb
      );
    $f$, v_url || '/functions/v1/scheduler-overdue-escalator', v_token)
  );

  RAISE NOTICE 'Scheduled scheduler-generate-tasks (00:05 UTC) and scheduler-overdue-escalator (00:15 UTC).';
END $$;
