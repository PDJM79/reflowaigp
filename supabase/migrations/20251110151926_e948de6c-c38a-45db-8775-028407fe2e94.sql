-- Create policy review history table
CREATE TABLE IF NOT EXISTS public.policy_review_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policy_documents(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL,
  reviewed_by UUID NOT NULL REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version_reviewed TEXT NOT NULL,
  review_type TEXT NOT NULL, -- 'scheduled', 'manual', 'version_update', 'acknowledgment'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policy_review_history ENABLE ROW LEVEL SECURITY;

-- Create policies for policy review history
CREATE POLICY "Users can view review history in their practice"
ON public.policy_review_history
FOR SELECT
USING (practice_id = get_current_user_practice_id());

CREATE POLICY "System can insert review history"
ON public.policy_review_history
FOR INSERT
WITH CHECK (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage review history"
ON public.policy_review_history
FOR ALL
USING (
  practice_id = get_current_user_practice_id() 
  AND is_current_user_practice_manager()
);

-- Create index for better query performance
CREATE INDEX idx_policy_review_history_policy_id ON public.policy_review_history(policy_id);
CREATE INDEX idx_policy_review_history_practice_id ON public.policy_review_history(practice_id);
CREATE INDEX idx_policy_review_history_reviewed_at ON public.policy_review_history(reviewed_at DESC);

-- Add comment
COMMENT ON TABLE public.policy_review_history IS 'Tracks all policy review activities including scheduled reviews, manual reviews, and acknowledgments';