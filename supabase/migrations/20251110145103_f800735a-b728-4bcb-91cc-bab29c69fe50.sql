-- Fix user_auth_sensitive table RLS policies to protect MFA secrets
-- Drop all existing policies on user_auth_sensitive table
DROP POLICY IF EXISTS "Users insert own MFA data only" ON public.user_auth_sensitive;
DROP POLICY IF EXISTS "Users update own MFA data only" ON public.user_auth_sensitive;
DROP POLICY IF EXISTS "Users view own MFA data only" ON public.user_auth_sensitive;

-- Only the user themselves can view their own MFA data (must be authenticated)
CREATE POLICY "Users can view only their own MFA data"
  ON public.user_auth_sensitive
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Only the user themselves can insert their own MFA data (must be authenticated)
CREATE POLICY "Users can insert only their own MFA data"
  ON public.user_auth_sensitive
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Only the user themselves can update their own MFA data (must be authenticated)
CREATE POLICY "Users can update only their own MFA data"
  ON public.user_auth_sensitive
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Master users can manage MFA data for support purposes (must be authenticated)
CREATE POLICY "Master users can manage all MFA data"
  ON public.user_auth_sensitive
  FOR ALL
  TO authenticated
  USING (is_current_user_master())
  WITH CHECK (is_current_user_master());

-- Prevent DELETE operations by anyone except master users
-- (No separate DELETE policy needed, covered by ALL policy above)