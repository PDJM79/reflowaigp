-- Create baseline_snapshots table for immutable compliance baselines
CREATE TABLE public.baseline_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  
  -- Baseline identification
  baseline_name TEXT NOT NULL DEFAULT 'Baseline',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Computed scores (immutable once created)
  compliance_score NUMERIC(5,2) NOT NULL,
  fit_for_audit_score NUMERIC(5,2) NOT NULL,
  
  -- Driver breakdown (JSON array of check types and their scores)
  driver_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Red flags detected during baseline creation
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Source document hashes for audit trail
  source_document_hashes TEXT[] NOT NULL DEFAULT '{}',
  
  -- Audit fields
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Rebaseline tracking (if this replaces a previous baseline)
  replaces_baseline_id UUID REFERENCES public.baseline_snapshots(id),
  rebaseline_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'archived')),
  
  -- Model/pipeline version for reproducibility
  model_version TEXT,
  pipeline_version TEXT
);

-- Create baseline_documents table for uploaded historical documents
CREATE TABLE public.baseline_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  baseline_id UUID REFERENCES public.baseline_snapshots(id) ON DELETE SET NULL,
  
  -- Document details
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size_bytes BIGINT,
  
  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  -- Extracted data
  extracted_data JSONB,
  confidence_score NUMERIC(3,2),
  
  -- Date range the document covers
  document_start_date DATE,
  document_end_date DATE,
  
  -- Audit
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_baseline_snapshots_practice ON public.baseline_snapshots(practice_id);
CREATE INDEX idx_baseline_snapshots_status ON public.baseline_snapshots(status);
CREATE INDEX idx_baseline_snapshots_created_at ON public.baseline_snapshots(created_at DESC);
CREATE INDEX idx_baseline_documents_practice ON public.baseline_documents(practice_id);
CREATE INDEX idx_baseline_documents_baseline ON public.baseline_documents(baseline_id);
CREATE INDEX idx_baseline_documents_status ON public.baseline_documents(processing_status);

-- Enable RLS
ALTER TABLE public.baseline_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for baseline_snapshots
CREATE POLICY "Users can view baselines for their practice"
  ON public.baseline_snapshots FOR SELECT
  USING (practice_id IN (
    SELECT e.practice_id FROM employees e WHERE e.user_id = auth.uid()
  ));

CREATE POLICY "Practice managers can create baselines"
  ON public.baseline_snapshots FOR INSERT
  WITH CHECK (
    practice_id IN (
      SELECT e.practice_id FROM employees e 
      WHERE e.user_id = auth.uid() AND e.role IN ('practice_manager', 'administrator')
    )
  );

CREATE POLICY "Practice managers can update baseline status"
  ON public.baseline_snapshots FOR UPDATE
  USING (
    practice_id IN (
      SELECT e.practice_id FROM employees e 
      WHERE e.user_id = auth.uid() AND e.role IN ('practice_manager', 'administrator')
    )
  );

-- RLS policies for baseline_documents
CREATE POLICY "Users can view documents for their practice"
  ON public.baseline_documents FOR SELECT
  USING (practice_id IN (
    SELECT e.practice_id FROM employees e WHERE e.user_id = auth.uid()
  ));

CREATE POLICY "Practice managers can upload documents"
  ON public.baseline_documents FOR INSERT
  WITH CHECK (
    practice_id IN (
      SELECT e.practice_id FROM employees e 
      WHERE e.user_id = auth.uid() AND e.role IN ('practice_manager', 'administrator')
    )
  );

CREATE POLICY "Practice managers can update documents"
  ON public.baseline_documents FOR UPDATE
  USING (
    practice_id IN (
      SELECT e.practice_id FROM employees e 
      WHERE e.user_id = auth.uid() AND e.role IN ('practice_manager', 'administrator')
    )
  );

-- Create storage bucket for baseline documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'baseline-documents',
  'baseline-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for baseline documents
CREATE POLICY "Users can view baseline documents for their practice"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'baseline-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT e.practice_id::text FROM employees e WHERE e.user_id = auth.uid()
    )
  );

CREATE POLICY "Practice managers can upload baseline documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'baseline-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT e.practice_id::text FROM employees e 
      WHERE e.user_id = auth.uid() AND e.role IN ('practice_manager', 'administrator')
    )
  );