-- Fix practices table RLS policies for organization setup
-- The issue: during setup, users don't exist in the users table yet

-- Drop existing policies
DROP POLICY IF EXISTS "Master users can manage all practices" ON public.practices;
DROP POLICY IF EXISTS "Master users can view all practices" ON public.practices;
DROP POLICY IF EXISTS "Users can create practices during setup" ON public.practices;
DROP POLICY IF EXISTS "Practice managers can update their practice" ON public.practices;
DROP POLICY IF EXISTS "Users view own practice limited" ON public.practices;

-- Allow authenticated users to insert practices during setup
-- This is safe because they can only create, not access others' data
CREATE POLICY "Users can create practices during setup"
  ON public.practices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own practice
CREATE POLICY "Users can view their own practice"
  ON public.practices FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT practice_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Allow practice managers to update their practice
CREATE POLICY "Practice managers can update their practice"
  ON public.practices FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT practice_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND is_practice_manager = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT practice_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND is_practice_manager = true
    )
  );

-- Allow master users full access to all practices
CREATE POLICY "Master users can manage all practices"
  ON public.practices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND is_master_user = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND is_master_user = true
    )
  );