-- KF2 — appraisals register (additive, reversible).
-- The curated GP-LB-028-004 logbook confirms the annual cadence; this is the
-- per-employee record behind it. employee_id -> employees (the HR subject),
-- appraiser_id -> users (the manager who conducted it).
CREATE TABLE IF NOT EXISTS public.appraisals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id    uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  employee_id    uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  appraisal_date date NOT NULL,
  appraiser_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  summary        text,
  next_due       date,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appraisals_practice_employee
  ON public.appraisals (practice_id, employee_id, appraisal_date DESC);
