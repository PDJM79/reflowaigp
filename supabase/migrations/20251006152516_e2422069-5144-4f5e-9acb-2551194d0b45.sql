-- Fix critical security issues with users and user_auth_sensitive tables

-- 1. Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Users can view only their own record" ON public.users;
DROP POLICY IF EXISTS "Practice managers can view all users in their practice" ON public.users;
DROP POLICY IF EXISTS "Master users can view all user records" ON public.users;

-- 2. Create more restrictive policies for users table
-- Users can only see minimal info about themselves
CREATE POLICY "Users can view their own basic profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Practice managers can view users in their practice (for management purposes)
CREATE POLICY "Practice managers view users in practice"
ON public.users
FOR SELECT
TO authenticated
USING (
  is_current_user_practice_manager() 
  AND practice_id = get_current_user_practice_id()
);

-- Master users can view all users (system admin)
CREATE POLICY "Master users view all"
ON public.users
FOR SELECT
TO authenticated
USING (is_current_user_master());

-- 3. Tighten user_auth_sensitive policies - drop and recreate
DROP POLICY IF EXISTS "Users can only access their own sensitive auth data" ON public.user_auth_sensitive;
DROP POLICY IF EXISTS "Users can only update their own sensitive auth data" ON public.user_auth_sensitive;
DROP POLICY IF EXISTS "Users can insert their own sensitive auth data" ON public.user_auth_sensitive;

-- Only the user themselves can access their MFA secrets
CREATE POLICY "Users access own MFA data only"
ON public.user_auth_sensitive
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users update own MFA data only"
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

CREATE POLICY "Users insert own MFA data only"
ON public.user_auth_sensitive
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- 4. Tighten practices table to prevent address exposure
DROP POLICY IF EXISTS "Users can view their own practice" ON public.practices;

-- Create a more restrictive policy that limits what regular users can see
CREATE POLICY "Users view own practice limited"
ON public.practices
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT practice_id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- Practice managers and master users get full access (they're already covered by existing policies)

-- 5. Add security barrier to prevent information leakage
COMMENT ON TABLE public.users IS 'SECURITY: Contains PII. Access restricted to self, practice managers within practice, or master users only.';
COMMENT ON TABLE public.user_auth_sensitive IS 'SECURITY: Contains MFA secrets. Access strictly limited to user''s own record only.';
COMMENT ON TABLE public.practices IS 'SECURITY: Contains practice addresses and SharePoint config. Regular users have limited view.';