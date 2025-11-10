-- Create email_logs table for tracking email delivery
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  resend_email_id text UNIQUE,
  recipient_email text NOT NULL,
  recipient_name text,
  email_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  complained_at timestamp with time zone,
  bounce_type text,
  bounce_reason text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_email_logs_practice_id ON public.email_logs(practice_id);
CREATE INDEX idx_email_logs_resend_email_id ON public.email_logs(resend_email_id);
CREATE INDEX idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Practice managers can view email logs in their practice"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
  practice_id = get_current_user_practice_id() 
  AND is_current_user_practice_manager()
);

CREATE POLICY "System can insert email logs"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update email logs"
ON public.email_logs
FOR UPDATE
TO authenticated
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();