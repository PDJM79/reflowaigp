-- Fix: drop the non-slot task occurrence unique indexes left over from Phase 1.
-- phase5_twice_daily_slot added slot-aware unique indexes
-- (uniq_tasks_selection_date_slot, uniq_tasks_template_date_slot) but did NOT drop
-- Phase 1's non-slot pair (uq_tasks_selection_occurrence, uq_tasks_template_occurrence).
-- Left in place, the non-slot unique indexes reject the second (am/pm) occurrence of a
-- twice_daily logbook on the same (selection|template, scheduled_date), silently
-- breaking twice_daily generation. They are fully superseded by the slot-aware pair.
DROP INDEX IF EXISTS public.uq_tasks_selection_occurrence;
DROP INDEX IF EXISTS public.uq_tasks_template_occurrence;

-- Rollback:
--   CREATE UNIQUE INDEX uq_tasks_selection_occurrence ON public.tasks (selection_id, scheduled_date)
--     WHERE selection_id IS NOT NULL AND scheduled_date IS NOT NULL;
--   CREATE UNIQUE INDEX uq_tasks_template_occurrence ON public.tasks (template_id, scheduled_date)
--     WHERE template_id IS NOT NULL AND scheduled_date IS NOT NULL AND source_type = 'logbook';
