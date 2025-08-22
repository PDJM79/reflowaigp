-- Fix security definer functions with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_practice_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT practice_id FROM public.users WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_practice_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(is_practice_manager, false) FROM public.users WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_master()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(is_master_user, false) FROM public.users WHERE auth_user_id = auth.uid();
$$;