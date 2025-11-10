-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'none')),
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  policy_reminders BOOLEAN NOT NULL DEFAULT true,
  task_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for notification preferences
CREATE POLICY "Users can view their own notification preferences" 
ON public.notification_preferences 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own notification preferences" 
ON public.notification_preferences 
FOR UPDATE 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own notification preferences" 
ON public.notification_preferences 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create policy view tracking table
CREATE TABLE IF NOT EXISTS public.policy_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policy_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.policy_views ENABLE ROW LEVEL SECURITY;

-- Create policies for policy views
CREATE POLICY "Users can view their own policy views" 
ON public.policy_views 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own policy views" 
ON public.policy_views 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_policy_views_user_id ON public.policy_views(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_views_policy_id ON public.policy_views(policy_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get unacknowledged policies count for notifications
CREATE OR REPLACE FUNCTION public.get_unacknowledged_policies_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practice_id UUID;
  v_count INTEGER;
BEGIN
  -- Get user's practice
  SELECT practice_id INTO v_practice_id
  FROM users
  WHERE id = p_user_id;

  -- Count active policies not acknowledged by this user
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM policy_documents pd
  WHERE pd.practice_id = v_practice_id
    AND pd.is_active = true
    AND NOT EXISTS (
      SELECT 1 
      FROM policy_acknowledgments pa
      WHERE pa.policy_id = pd.id
        AND pa.user_id = p_user_id
        AND pa.version = pd.version
    );

  RETURN COALESCE(v_count, 0);
END;
$$;