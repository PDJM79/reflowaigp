-- Check and fix practices table RLS policies
-- Drop existing conflicting policies first
DROP POLICY IF EXISTS "Allow authenticated users to create practices during setup" ON public.practices;
DROP POLICY IF EXISTS "Practice managers can manage their practice" ON public.practices;
DROP POLICY IF EXISTS "Users can view their own practice" ON public.practices;

-- Create simpler policies that work during setup
CREATE POLICY "Authenticated users can create practices" 
ON public.practices 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view practices" 
ON public.practices 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Practice managers can update their practice" 
ON public.practices 
FOR UPDATE 
TO authenticated
USING (id IN ( SELECT users.practice_id FROM users WHERE (users.auth_user_id = auth.uid()) AND (users.is_practice_manager = true) ));