-- KF6: Claim review — manager review of a submitted claim run.
-- Additive: new table only. claim_runs.status is free-text, so approve/query
-- transitions reuse the existing column (no ALTER needed).
CREATE TABLE IF NOT EXISTS public.claim_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id   uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  claim_run_id  uuid NOT NULL REFERENCES public.claim_runs(id) ON DELETE CASCADE,
  reviewed_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  review_date   date NOT NULL,
  outcome       text NOT NULL,
  notes         text,
  created_at    timestamp DEFAULT now(),
  updated_at    timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_reviews_run
  ON public.claim_reviews (practice_id, claim_run_id);
