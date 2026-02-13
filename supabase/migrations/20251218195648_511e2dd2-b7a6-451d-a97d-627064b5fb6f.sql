-- Create governance_approvals table for tracking formal sign-offs
CREATE TABLE public.governance_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('policy', 'fire_safety_assessment', 'ipc_audit', 'room_assessment', 'claim_run')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  approval_type TEXT NOT NULL DEFAULT 'sign_off' CHECK (approval_type IN ('sign_off', 'review', 'audit')),
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'approved', 'rejected', 'pending_changes')),
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  digital_signature TEXT,
  reviewer_title TEXT,
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_governance_approvals_practice_id ON public.governance_approvals(practice_id);
CREATE INDEX idx_governance_approvals_entity ON public.governance_approvals(entity_type, entity_id);
CREATE INDEX idx_governance_approvals_decision ON public.governance_approvals(practice_id, decision);
CREATE INDEX idx_governance_approvals_pending ON public.governance_approvals(practice_id) WHERE decision = 'pending';

-- Enable RLS
ALTER TABLE public.governance_approvals ENABLE ROW LEVEL SECURITY;

-- Users can view approvals for their practice
CREATE POLICY "Users can view approvals for their practice"
ON public.governance_approvals
FOR SELECT
USING (
  practice_id IN (
    SELECT practice_id FROM public.users WHERE id = auth.uid()
  )
);

-- Users can create approval requests for their practice
CREATE POLICY "Users can create approval requests"
ON public.governance_approvals
FOR INSERT
WITH CHECK (
  practice_id IN (
    SELECT practice_id FROM public.users WHERE id = auth.uid()
  )
);

-- Practice managers can update approvals
CREATE POLICY "Practice managers can update approvals"
ON public.governance_approvals
FOR UPDATE
USING (
  practice_id IN (
    SELECT practice_id FROM public.users WHERE id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_governance_approvals_updated_at
BEFORE UPDATE ON public.governance_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();