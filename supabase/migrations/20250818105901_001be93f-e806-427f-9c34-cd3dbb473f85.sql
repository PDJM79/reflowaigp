-- Fix search_path for functions by replacing them with CASCADE
DROP FUNCTION public.get_user_practice_id(uuid) CASCADE;
DROP FUNCTION public.is_practice_manager(uuid) CASCADE;

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_practice_id(user_id uuid)
RETURNS uuid AS $$
  SELECT practice_id FROM public.users WHERE auth_user_id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_practice_manager(user_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE(is_practice_manager, false) FROM public.users WHERE auth_user_id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Recreate the policies that were dropped with CASCADE
CREATE POLICY "Practice managers can manage users in their practice" 
ON public.users 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);

CREATE POLICY "Users can view users in their practice" 
ON public.users 
FOR SELECT
USING (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Practice managers can manage role assignments" 
ON public.role_assignments 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);

CREATE POLICY "Practice managers can manage organization setup" 
ON public.organization_setup 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);