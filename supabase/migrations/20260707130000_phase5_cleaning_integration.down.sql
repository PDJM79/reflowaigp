-- Down for 20260707130000_phase5_cleaning_integration (reversibility test only).
ALTER TABLE public.cleaning_tasks DROP COLUMN IF EXISTS default_assignee_role;
ALTER TABLE public.cleaning_tasks DROP COLUMN IF EXISTS selection_id;
