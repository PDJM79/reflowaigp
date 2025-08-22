-- Drop the problematic policies that still cause recursion
DROP POLICY IF EXISTS "Practice managers can view users in their practice" ON public.users;
DROP POLICY IF EXISTS "Practice managers can manage users in their practice" ON public.users;
DROP POLICY IF EXISTS "Master users can access all users" ON public.users;
DROP POLICY IF EXISTS "Allow setup operations" ON public.users;

-- Create security definer functions to get user properties without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_practice_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT practice_id FROM public.users WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_practice_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(is_practice_manager, false) FROM public.users WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_master()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(is_master_user, false) FROM public.users WHERE auth_user_id = auth.uid();
$$;

-- Create non-recursive policies using the security definer functions
CREATE POLICY "Practice managers can view users in their practice" 
ON public.users 
FOR SELECT 
USING (
  is_current_user_practice_manager() AND 
  practice_id = get_current_user_practice_id()
);

CREATE POLICY "Practice managers can manage users in their practice" 
ON public.users 
FOR ALL 
USING (
  is_current_user_practice_manager() AND 
  practice_id = get_current_user_practice_id()
);

CREATE POLICY "Master users can access all users" 
ON public.users 
FOR ALL 
USING (is_current_user_master());

-- Simple policy for setup operations
CREATE POLICY "Allow authenticated users setup operations" 
ON public.users 
FOR INSERT 
WITH CHECK (auth_user_id IS NOT NULL);