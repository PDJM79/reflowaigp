-- Create process_diagrams table for caching Mermaid flowcharts
CREATE TABLE public.process_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  process_template_id UUID NOT NULL REFERENCES public.process_templates(id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL,
  mermaid_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES public.users(id),
  is_ai_enhanced BOOLEAN DEFAULT false,
  UNIQUE(practice_id, process_template_id, source_hash)
);

-- Enable RLS
ALTER TABLE public.process_diagrams ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view diagrams for their practice
CREATE POLICY "Users can view diagrams for their practice"
ON public.process_diagrams
FOR SELECT
USING (
  practice_id IN (
    SELECT practice_id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- Policy: Users can insert diagrams for their practice
CREATE POLICY "Users can insert diagrams for their practice"
ON public.process_diagrams
FOR INSERT
WITH CHECK (
  practice_id IN (
    SELECT practice_id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- Policy: Users can update diagrams for their practice
CREATE POLICY "Users can update diagrams for their practice"
ON public.process_diagrams
FOR UPDATE
USING (
  practice_id IN (
    SELECT practice_id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_process_diagrams_lookup 
ON public.process_diagrams(practice_id, process_template_id, source_hash);