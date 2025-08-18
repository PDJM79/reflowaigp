-- Fix users table RLS policy for organization setup
-- The issue is that the security definer functions may not work during initial setup

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create simpler policies for setup phase
CREATE POLICY "Allow authenticated users to insert users during setup" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update users during setup" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can view users in their practice" 
ON public.users 
FOR SELECT
USING (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Practice managers can manage users in their practice" 
ON public.users 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);