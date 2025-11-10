-- Fix users table RLS policies to prevent public data exposure
-- Drop all existing SELECT policies on users table
DROP POLICY IF EXISTS "Master users view all" ON public.users;
DROP POLICY IF EXISTS "Practice managers view users in practice" ON public.users;
DROP POLICY IF EXISTS "Users can view their own basic profile" ON public.users;
DROP POLICY IF EXISTS "Master users can access all users" ON public.users;
DROP POLICY IF EXISTS "Practice managers can manage users in their practice" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create their own profile during verified setup" ON public.users;

-- Recreate SELECT policies with strict authentication requirements
-- Only authenticated users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Practice managers can view users in their practice (must be authenticated)
CREATE POLICY "Practice managers can view users in their practice"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    is_current_user_practice_manager() AND 
    practice_id = get_current_user_practice_id()
  );

-- Master users can view all users (must be authenticated)
CREATE POLICY "Master users can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (is_current_user_master());

-- Recreate INSERT policy with strict authentication
CREATE POLICY "Users can create their own profile during verified setup"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid() AND 
    auth_user_id IS NOT NULL
  );

-- Recreate UPDATE policies with strict authentication
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Practice managers can manage users in their practice"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    is_current_user_practice_manager() AND 
    practice_id = get_current_user_practice_id()
  );

CREATE POLICY "Master users can manage all users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (is_current_user_master());