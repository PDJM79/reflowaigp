-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  priority text DEFAULT 'normal',
  action_url text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread 
  ON public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

CREATE INDEX idx_notifications_practice 
  ON public.notifications(practice_id, created_at DESC);

CREATE INDEX idx_notifications_expires 
  ON public.notifications(expires_at)
  WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Master users can manage all notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (is_current_user_master())
  WITH CHECK (is_current_user_master());

-- Function to auto-expire old notifications (cleanup)
CREATE OR REPLACE FUNCTION expire_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at < now();
END;
$$;