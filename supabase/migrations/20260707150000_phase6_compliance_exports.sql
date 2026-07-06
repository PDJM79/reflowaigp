-- Phase 6, Step 3 — compliance_exports (additive, reversible).
--
-- Records each generated compliance export (PDF/CSV of occurrences + status +
-- evidence for a date range/module; Annex B is the cleaning-filtered variant).
-- The file itself is generated on demand from `params`; file_ref is a stable
-- reference/name for the produced artefact.
CREATE TABLE IF NOT EXISTS public.compliance_exports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  params       jsonb NOT NULL DEFAULT '{}'::jsonb,
  format       text NOT NULL,           -- 'pdf' | 'csv'
  status       text NOT NULL DEFAULT 'complete', -- 'pending' | 'complete' | 'failed'
  file_ref     text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_exports_practice_created
  ON public.compliance_exports (practice_id, created_at DESC);
