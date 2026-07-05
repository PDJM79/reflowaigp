-- Down for 20260707120000_phase5_twice_daily_slot (reversibility test only).
-- NOTE: the base_cadence 'twice_daily' enum value CANNOT be removed — Postgres has
-- no DROP VALUE. It is left in place (documented, acceptable, harmless).
DROP INDEX IF EXISTS public.uniq_tasks_selection_date_slot;
DROP INDEX IF EXISTS public.uniq_tasks_template_date_slot;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS slot;
