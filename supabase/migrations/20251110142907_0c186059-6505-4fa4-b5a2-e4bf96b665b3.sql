-- ============================================
-- MINFOR SURGERY PHASE 1: POLICY DOCUMENTS & MONTH-END SCRIPTS
-- ============================================

-- 1. CREATE POLICY ACKNOWLEDGMENTS TABLE
-- ============================================
CREATE TABLE public.policy_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.policy_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  practice_id uuid NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  version_acknowledged text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(policy_id, user_id, version_acknowledged)
);

-- Enable RLS
ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for acknowledgments
CREATE POLICY "Users can view acknowledgments in their practice"
  ON policy_acknowledgments FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can create their own acknowledgments"
  ON policy_acknowledgments FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id() AND
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Practice managers can view all acknowledgments"
  ON policy_acknowledgments FOR SELECT
  USING (
    practice_id = get_current_user_practice_id() AND
    is_current_user_practice_manager()
  );

-- 2. EXTEND POLICY_DOCUMENTS TABLE
-- ============================================
ALTER TABLE public.policy_documents 
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_mime_type text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reviewed_by uuid REFERENCES public.users(id);

-- Add index for review_due queries
CREATE INDEX IF NOT EXISTS idx_policy_documents_review_due 
  ON public.policy_documents(practice_id, review_due) 
  WHERE status = 'active';

-- 3. EXTEND MONTH_END_SCRIPTS TABLE
-- ============================================
ALTER TABLE public.month_end_scripts
  ADD COLUMN IF NOT EXISTS removed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS removed_reason text,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_run_id uuid REFERENCES public.claim_runs(id);

-- Add indexes for queries
CREATE INDEX IF NOT EXISTS idx_month_end_scripts_claim_run 
  ON public.month_end_scripts(claim_run_id) 
  WHERE removed = false;

CREATE INDEX IF NOT EXISTS idx_month_end_scripts_month 
  ON public.month_end_scripts(practice_id, month DESC);

-- 4. UPDATE MONTH_END_SCRIPTS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can create month-end scripts" ON month_end_scripts;

CREATE POLICY "Nursing team can create month-end scripts"
  ON month_end_scripts FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id() AND
    created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) AND
    has_any_role(auth.uid(), ARRAY[
      'nurse'::app_role, 
      'nurse_lead'::app_role, 
      'hca'::app_role,
      'practice_manager'::app_role
    ])
  );

CREATE POLICY "PM can update month-end scripts"
  ON month_end_scripts FOR UPDATE
  USING (
    practice_id = get_current_user_practice_id() AND
    is_current_user_practice_manager()
  );

-- 5. EXTEND CLAIM_RUNS TABLE
-- ============================================
ALTER TABLE public.claim_runs
  ADD COLUMN IF NOT EXISTS claim_type text DEFAULT 'enhanced_services',
  ADD COLUMN IF NOT EXISTS total_scripts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_items integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_storage_path text;

-- Add check constraint for claim_type
ALTER TABLE public.claim_runs
  DROP CONSTRAINT IF EXISTS check_claim_type;

ALTER TABLE public.claim_runs
  ADD CONSTRAINT check_claim_type 
  CHECK (claim_type IN ('enhanced_services', 'month_end_scripts', 'other'));

-- 6. STORAGE BUCKET CONFIGURATION
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-documents', 'policy-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can view policies in their practice
CREATE POLICY "Users can view policy documents in their practice"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'policy-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT practice_id::text FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Storage policy: PM and IG leads can upload
CREATE POLICY "PM and IG leads can upload policy documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'policy-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT practice_id::text FROM users WHERE auth_user_id = auth.uid()
    ) AND
    has_any_role(auth.uid(), ARRAY['ig_lead'::app_role, 'practice_manager'::app_role])
  );

-- Storage policy: PM and IG leads can update
CREATE POLICY "PM and IG leads can update policy documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'policy-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT practice_id::text FROM users WHERE auth_user_id = auth.uid()
    ) AND
    has_any_role(auth.uid(), ARRAY['ig_lead'::app_role, 'practice_manager'::app_role])
  );

-- Storage policy: PM and IG leads can delete
CREATE POLICY "PM and IG leads can delete policy documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'policy-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT practice_id::text FROM users WHERE auth_user_id = auth.uid()
    ) AND
    has_any_role(auth.uid(), ARRAY['ig_lead'::app_role, 'practice_manager'::app_role])
  );