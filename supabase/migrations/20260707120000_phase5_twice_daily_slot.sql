-- Phase 5, Step 1 — twice_daily scheduling support (additive, reversible except the enum value).
--
-- Design note (documented deviation from the brief's literal DDL):
--   The brief specified `slot text NULL` + unique indexes on `COALESCE(slot,'')`.
--   The scheduler writer is a Supabase edge function using supabase-js `.upsert({onConflict})`,
--   and PostgREST's on_conflict can only target a plain column list — it CANNOT target a
--   functional (COALESCE) index. To keep the writer idempotent we use an empty-string
--   sentinel: `slot text NOT NULL DEFAULT ''` with PLAIN partial-unique indexes on
--   (selection_id|template_id, scheduled_date, slot). This is semantically identical to
--   COALESCE(slot,'') (non-twice_daily rows share the '' key) and is upsert-targetable.
--   The prior (selection_id, scheduled_date) idempotency indexes were never created via a
--   migration (absent from all migration files + the Drizzle-built DB), so this migration
--   creates the slot-aware guards fresh; DROP IF EXISTS covers any ad-hoc prior names.

-- 1. base_cadence: add twice_daily. Enum ADD VALUE is forward-only in Postgres —
--    the down migration CANNOT remove it (documented, acceptable).
ALTER TYPE public.base_cadence ADD VALUE IF NOT EXISTS 'twice_daily';

-- 2. tasks.slot — 'am'/'pm' for twice_daily occurrences; '' otherwise.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS slot text NOT NULL DEFAULT '';

-- 3. Slot-aware idempotency indexes (replace any prior non-slot variants).
DROP INDEX IF EXISTS public.uniq_tasks_selection_scheduled;
DROP INDEX IF EXISTS public.uniq_tasks_template_scheduled;
DROP INDEX IF EXISTS public.idx_tasks_selection_date;
DROP INDEX IF EXISTS public.idx_tasks_template_date;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tasks_selection_date_slot
  ON public.tasks (selection_id, scheduled_date, slot)
  WHERE source_type = 'logbook' AND selection_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tasks_template_date_slot
  ON public.tasks (template_id, scheduled_date, slot)
  WHERE source_type = 'logbook' AND template_id IS NOT NULL;
