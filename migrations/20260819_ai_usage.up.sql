-- ai_usage — platform AI telemetry. One row per model call, success or failure.
--
-- Shared shape across products (graig-escapes, new-school, reflow-care-nucleus).
-- Written from ONE runtime in this repo: the Express server, INSERT only, via
-- the pg pool in server/db.ts (server/services/mistral.ts). No edge function
-- writes this table. It never receives tenant data.
-- (Corrected 2026-09-29, T-0019: this header previously also listed edge
-- functions via supabase-js with the service role. None ever did.)
--
-- APPEND-ONLY. Revoking UPDATE/DELETE is not sufficient: the Express server
-- connects as the table owner, and an owner keeps its privileges implicitly, so
-- there is nothing to revoke from it. The triggers below are what actually stop
-- history being rewritten. TRUNCATE needs its own statement-level trigger — a
-- row-level trigger cannot see it.
--
-- Unconditional append-only is safe ONLY because this table holds no tenant
-- content: no prompts, no user ids, no practice id. No retention rule will ever
-- require a purge. A table that held prompts could not use this pattern unchanged.

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  repo           text          NOT NULL,
  route          text          NOT NULL DEFAULT 'unknown',
  provider       text          NOT NULL,
  model          text          NOT NULL,
  input_tokens   integer,
  output_tokens  integer,
  cached_tokens  integer,
  latency_ms     integer       NOT NULL,
  success        boolean       NOT NULL,
  error_type     text,
  est_cost_usd   numeric(14,8) NOT NULL DEFAULT 0,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  -- A failure must name its cause, or the one row worth keeping says nothing.
  CONSTRAINT ai_usage_failure_names_cause CHECK (success OR error_type IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created      ON public.ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_repo_route   ON public.ai_usage (repo, route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_failures     ON public.ai_usage (created_at DESC) WHERE NOT success;

CREATE OR REPLACE FUNCTION public.ai_usage_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RAISE EXCEPTION 'ai_usage is append-only; % is not permitted', TG_OP;
END;
$fn$;

DROP TRIGGER IF EXISTS ai_usage_no_update_delete ON public.ai_usage;
CREATE TRIGGER ai_usage_no_update_delete
  BEFORE UPDATE OR DELETE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.ai_usage_append_only();

DROP TRIGGER IF EXISTS ai_usage_no_truncate ON public.ai_usage;
CREATE TRIGGER ai_usage_no_truncate
  BEFORE TRUNCATE ON public.ai_usage
  FOR EACH STATEMENT EXECUTE FUNCTION public.ai_usage_append_only();

-- Telemetry is never client-readable. RLS with no policies denies anon and
-- authenticated outright; the service role and the table owner bypass it.
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM anon, authenticated;
GRANT INSERT, SELECT ON public.ai_usage TO service_role;
