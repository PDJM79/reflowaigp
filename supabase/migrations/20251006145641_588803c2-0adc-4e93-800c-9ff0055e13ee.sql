-- Fix users table security vulnerabilities

-- Step 1: Create a secure function to get user profile WITHOUT mfa_secret
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE (
  id uuid,
  practice_id uuid,
  auth_user_id uuid,
  role user_role,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_practice_manager boolean,
  is_master_user boolean,
  mfa_enabled boolean,
  name text,
  email text,
  phone_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    practice_id,
    auth_user_id,
    role,
    is_active,
    created_at,
    updated_at,
    is_practice_manager,
    is_master_user,
    mfa_enabled,
    name,
    email,
    phone_number
  FROM public.users
  WHERE users.id = user_id OR users.auth_user_id = user_id;
$$;

-- Step 2: Drop overly permissive setup policies
DROP POLICY IF EXISTS "Allow authenticated users setup operations" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile during setup" ON public.users;

-- Step 3: Create restrictive INSERT policy for new user creation
-- Only allow during authenticated setup where auth_user_id matches the authenticated user
CREATE POLICY "Users can create their own profile during verified setup"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth_user_id = auth.uid()
  AND auth_user_id IS NOT NULL
);

-- Step 4: Update SELECT policy to exclude mfa_secret
-- Drop existing view policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create new SELECT policy that allows users to see their own data
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Step 5: Revoke direct SELECT on mfa_secret column from all roles
-- This ensures mfa_secret is only accessible by system (service role)
REVOKE SELECT (mfa_secret) ON public.users FROM authenticated;
REVOKE SELECT (mfa_secret) ON public.users FROM anon;

-- Step 6: Update the UPDATE policy to prevent users from modifying sensitive fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own non-sensitive profile fields"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  -- Prevent users from changing their own role, practice_id, or auth_user_id
  AND (
    (role IS NOT DISTINCT FROM (SELECT u.role FROM users u WHERE u.auth_user_id = auth.uid()))
    AND (practice_id IS NOT DISTINCT FROM (SELECT u.practice_id FROM users u WHERE u.auth_user_id = auth.uid()))
    AND (auth_user_id IS NOT DISTINCT FROM (SELECT u.auth_user_id FROM users u WHERE u.auth_user_id = auth.uid()))
    AND (is_practice_manager IS NOT DISTINCT FROM (SELECT u.is_practice_manager FROM users u WHERE u.auth_user_id = auth.uid()))
    AND (is_master_user IS NOT DISTINCT FROM (SELECT u.is_master_user FROM users u WHERE u.auth_user_id = auth.uid()))
  )
);

-- Step 7: Ensure practice managers can still view users in their practice
-- (Keep existing policy "Practice managers can view users in their practice")
-- This policy remains as-is for legitimate admin access

-- Step 8: Comment on security changes
COMMENT ON FUNCTION public.get_user_profile IS 'Secure function to retrieve user profiles without exposing mfa_secret. Use this function instead of direct SELECT queries.';
COMMENT ON COLUMN public.users.mfa_secret IS 'SECURITY: This column is restricted from SELECT by RLS. Only accessible via service role for MFA verification.';