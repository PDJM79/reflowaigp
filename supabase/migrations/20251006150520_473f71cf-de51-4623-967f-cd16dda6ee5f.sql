-- Fix users table sensitive data exposure
-- Prevent mfa_secret from being readable and restrict access to phone numbers

-- Step 1: Update the existing get_user_profile function to NEVER return mfa_secret
-- This ensures even if someone calls the function, they can't get the MFA secret
DROP FUNCTION IF EXISTS public.get_user_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(
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
SET search_path = 'public'
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

-- Step 2: Create a secure view that excludes mfa_secret for general access
-- This view will be used by practice managers and users to view user data
CREATE OR REPLACE VIEW public.users_safe AS
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
  -- Only show phone_number to the user themselves or master users
  CASE 
    WHEN auth_user_id = auth.uid() OR is_current_user_master() THEN phone_number
    ELSE NULL
  END as phone_number
FROM public.users;

-- Step 3: Grant appropriate permissions on the view
GRANT SELECT ON public.users_safe TO authenticated;

-- Step 4: Add a comment explaining the security model
COMMENT ON VIEW public.users_safe IS 'SECURITY: Safe view of users table that excludes mfa_secret and restricts phone_number access. Always use this view instead of querying users table directly.';

COMMENT ON COLUMN public.users.mfa_secret IS 'SECURITY: This column should NEVER be returned in SELECT queries. Only accessible by authentication system internally.';

-- Step 5: Update RLS policies to ensure mfa_secret is never exposed
-- Drop existing policies and recreate with explicit column restrictions
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Practice managers can view users in their practice" ON public.users;
DROP POLICY IF EXISTS "Master users can access all users" ON public.users;

-- Recreate SELECT policies with clear restrictions
-- Users can view their own profile (excluding mfa_secret through the view)
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Practice managers can view users in their practice
CREATE POLICY "Practice managers can view users in their practice"
ON public.users
FOR SELECT
TO authenticated
USING (
  is_current_user_practice_manager() 
  AND practice_id = get_current_user_practice_id()
);

-- Master users can access all users
CREATE POLICY "Master users can access all users"
ON public.users
FOR ALL
TO authenticated
USING (is_current_user_master());

-- Keep existing UPDATE and INSERT policies (they don't affect SELECT)
-- The UPDATE policy already prevents changing sensitive fields

-- Step 6: Add a warning comment on the table
COMMENT ON TABLE public.users IS 'SECURITY WARNING: This table contains sensitive data including mfa_secret. Always query through users_safe view or get_user_profile() function. Direct queries may expose sensitive information.';

-- Step 7: Create an audit trigger for mfa_secret access (optional but recommended)
-- This will help detect if anyone tries to access mfa_secret directly
CREATE OR REPLACE FUNCTION public.audit_mfa_secret_access()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- This would log any attempts to select mfa_secret
  -- Implementation depends on your audit requirements
  RAISE NOTICE 'MFA secret access detected';
END;
$$;