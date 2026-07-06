-- Down for 20260709010000_kf_training_types.
ALTER TABLE public.training_records DROP COLUMN IF EXISTS type_id;
DROP INDEX IF EXISTS public.idx_training_types_practice;
DROP TABLE IF EXISTS public.training_types;
