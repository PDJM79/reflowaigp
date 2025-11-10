-- Fix search_path for expire_old_notifications function
DROP FUNCTION IF EXISTS expire_old_notifications();

CREATE OR REPLACE FUNCTION expire_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at < now();
END;
$$;