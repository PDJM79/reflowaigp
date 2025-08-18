-- Fix infinite recursion in users table RLS policies by creating security definer functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Practice managers can manage users in their practice" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their practice" ON public.users;
DROP POLICY IF EXISTS "Practice managers can manage role assignments" ON public.role_assignments;
DROP POLICY IF EXISTS "Practice managers can manage organization setup" ON public.organization_setup;

-- Create security definer functions to avoid recursive policy lookups
CREATE OR REPLACE FUNCTION public.get_user_practice_id(user_id uuid)
RETURNS uuid AS $$
  SELECT practice_id FROM public.users WHERE auth_user_id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_practice_manager(user_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE(is_practice_manager, false) FROM public.users WHERE auth_user_id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate policies using security definer functions
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