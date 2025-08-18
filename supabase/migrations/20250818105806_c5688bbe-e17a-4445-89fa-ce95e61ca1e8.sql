-- Fix security warnings by adding search_path to functions
DROP FUNCTION IF EXISTS public.get_user_practice_id(uuid);
DROP FUNCTION IF EXISTS public.is_practice_manager(uuid);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_practice_id(user_id uuid)
RETURNS uuid AS $$
  SELECT practice_id FROM public.users WHERE auth_user_id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_practice_manager(user_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE(is_practice_manager, false) FROM public.users WHERE auth_user_id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;