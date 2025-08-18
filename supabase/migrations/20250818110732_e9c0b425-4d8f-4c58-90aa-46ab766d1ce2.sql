-- Add missing RLS policies for organization setup process

-- Allow authenticated users to insert their own user record during setup
CREATE POLICY "Allow users to insert their own profile during setup" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Allow authenticated users to insert role assignments during setup
CREATE POLICY "Allow users to insert role assignments during setup" 
ON public.role_assignments 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert organization setup records
CREATE POLICY "Allow users to insert organization setup during setup" 
ON public.organization_setup 
FOR INSERT 
TO authenticated
WITH CHECK (true);