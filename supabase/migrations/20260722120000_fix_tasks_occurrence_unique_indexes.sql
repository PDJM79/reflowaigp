-- scheduler-generate-tasks upserts occurrences with ON CONFLICT (selection_id,scheduled_date,slot)
-- and (template_id,scheduled_date,slot). phase5 created these unique indexes PARTIAL
-- (WHERE source_type='logbook' AND ..._id IS NOT NULL). Postgres cannot use a partial index as an
-- ON CONFLICT arbiter unless the partial predicate is restated in the ON CONFLICT clause, which
-- supabase-js does not do. Result: every generation upsert errored with "no unique or exclusion
-- constraint matching the ON CONFLICT specification" (HTTP 500, zero tasks generated).
-- Recreate the indexes NON-partial on the same columns. Rows with NULL selection_id/template_id
-- (adhoc/cleaning/fridge occurrences) remain distinct under NULL unique semantics, so the dedup
-- behaviour for logbook occurrences is unchanged, and the arbiter now matches the upsert.
DROP INDEX IF EXISTS public.uniq_tasks_selection_date_slot;
DROP INDEX IF EXISTS public.uniq_tasks_template_date_slot;
CREATE UNIQUE INDEX uniq_tasks_selection_date_slot ON public.tasks (selection_id, scheduled_date, slot);
CREATE UNIQUE INDEX uniq_tasks_template_date_slot ON public.tasks (template_id, scheduled_date, slot);
