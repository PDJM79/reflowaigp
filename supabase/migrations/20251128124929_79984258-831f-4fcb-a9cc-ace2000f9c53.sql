-- Fix is_current_user_practice_manager() to use get_user_id_from_auth()
-- This resolves auth.uid() -> users.id before calling has_role()

CREATE OR REPLACE FUNCTION public.is_current_user_practice_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT has_role(get_user_id_from_auth(), 'practice_manager');
$function$;