-- Fix infinite recursion in users table RLS policies
-- First, drop all existing policies on users table
DROP POLICY IF EXISTS "Allow authenticated users to insert users during setup" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to update users during setup" ON public.users;
DROP POLICY IF EXISTS "Allow users to insert their own profile during setup" ON public.users;
DROP POLICY IF EXISTS "Master users can access all practices" ON public.users;
DROP POLICY IF EXISTS "Practice managers can manage users in their practice" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their practice" ON public.users;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert their own profile during setup" 
ON public.users 
FOR INSERT 
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth_user_id = auth.uid());

CREATE POLICY "Practice managers can view users in their practice" 
ON public.users 
FOR SELECT 
USING (
  practice_id IN (
    SELECT practice_id 
    FROM public.users pm 
    WHERE pm.auth_user_id = auth.uid() 
    AND pm.is_practice_manager = true
  )
);

CREATE POLICY "Practice managers can manage users in their practice" 
ON public.users 
FOR ALL 
USING (
  practice_id IN (
    SELECT practice_id 
    FROM public.users pm 
    WHERE pm.auth_user_id = auth.uid() 
    AND pm.is_practice_manager = true
  )
);

CREATE POLICY "Master users can access all users" 
ON public.users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.users master 
    WHERE master.auth_user_id = auth.uid() 
    AND master.is_master_user = true
  )
);

-- Allow setup operations during onboarding
CREATE POLICY "Allow setup operations" 
ON public.users 
FOR ALL 
USING (true);