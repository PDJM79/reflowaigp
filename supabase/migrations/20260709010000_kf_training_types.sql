-- KF4 — training catalogue (the phantom training_types made real) + typed records.
-- Additive + reversible. training_records.type_id is NULL for legacy rows so they
-- still render untyped.
CREATE TABLE IF NOT EXISTS public.training_types (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id        uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text,
  renewal_frequency  public.base_cadence,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_types_practice ON public.training_types (practice_id);

ALTER TABLE public.training_records
  ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES public.training_types(id) ON DELETE SET NULL;
