-- Down for 20260707140000_phase5_fridge_integration (reversibility test only).
ALTER TABLE public.fridge_units DROP COLUMN IF EXISTS reading_frequency;
