-- Phase 5, Step 2 — cleaning integration (additive, reversible).
--
-- A cleaning_task can now feed the central scheduler: when a practice opts in
-- (practices.metadata.cleaning_scheduling_enabled = true), each active
-- cleaning_task generates task occurrences (tasks.source_type = 'cleaning') on
-- its own frequency. These appear in My Day and complete transactionally via
-- POST /cleaning-logs (occurrenceTaskId).
--
-- Design note: tasks.selection_id is FK-bound to practice_logbook_selections, so
-- a cleaning occurrence CANNOT reuse it (a cleaning_task is not a logbook
-- selection). Generated cleaning occurrences therefore carry the cleaning_task
-- id in tasks.metadata->>'cleaningTaskId' and are de-duplicated in-app by the
-- single-run scheduler cron (no functional index needed, no upsert-arbiter
-- limitation). cleaning_tasks.selection_id below is a NULLABLE forward-looking
-- link for future logbook-backed cleaning; it is not required by this feature.

-- 1. cleaning_tasks: optional link to a logbook selection (reserved) + a default
--    role so generated occurrences can resolve an assignee like logbook selections.
ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS selection_id uuid REFERENCES public.practice_logbook_selections(id) ON DELETE SET NULL;

ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS default_assignee_role text;
