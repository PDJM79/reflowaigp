-- Comprehensive fix for sensitive data protection

-- 1. Clean up all existing SELECT policies on users table
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.users;
DROP POLICY IF EXISTS "Practice managers view basic user info in their practice" ON public.users;
DROP POLICY IF EXISTS "Users can access safe view of their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile via view" ON public.users;

-- 2. Create comprehensive access policies for users table
-- Users can ONLY see their own complete record (including sensitive fields)
CREATE POLICY "Users can view only their own record"
ON public.users
FOR SELECT
USING (auth_user_id = auth.uid());

-- Master users can see all user records (they need this for administration)
CREATE POLICY "Master users can view all user records"
ON public.users
FOR SELECT
USING (is_current_user_master());

-- Practice managers can view users in their practice EXCEPT sensitive fields
-- They must use users_basic view for team management
CREATE POLICY "Practice managers can view users in practice"
ON public.users
FOR SELECT
USING (
  is_current_user_practice_manager() 
  AND practice_id = get_current_user_practice_id()
  AND auth_user_id = auth.uid()  -- Only their own full record
);

-- 3. Ensure users_basic view properly restricts sensitive data
DROP VIEW IF EXISTS public.users_safe CASCADE;

CREATE OR REPLACE VIEW public.users_for_managers AS
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
  email
  -- Explicitly EXCLUDE: mfa_secret, phone_number
FROM public.users
WHERE 
  -- Users can see their own record
  auth_user_id = auth.uid()
  OR 
  -- Practice managers can see team members in their practice (without sensitive fields)
  (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  )
  OR
  -- Master users can see all
  is_current_user_master();

ALTER VIEW public.users_for_managers SET (security_invoker = on);

COMMENT ON VIEW public.users_for_managers IS 'SECURITY: Safe view excluding mfa_secret and phone_number. Practice managers should use this view instead of direct table access.';

-- 4. Reinforce candidates table protection - ensure NO general access
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only practice managers can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only practice managers can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only practice managers can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only practice managers can delete candidates" ON public.candidates;

-- Recreate with stricter checks
CREATE POLICY "Restrict candidate viewing to practice managers only"
ON public.candidates
FOR SELECT
USING (
  (practice_id = get_current_user_practice_id() AND is_current_user_practice_manager())
  OR is_current_user_master()
);

CREATE POLICY "Restrict candidate creation to practice managers only"
ON public.candidates
FOR INSERT
WITH CHECK (
  practice_id = get_current_user_practice_id()
  AND is_current_user_practice_manager()
);

CREATE POLICY "Restrict candidate updates to practice managers only"
ON public.candidates
FOR UPDATE
USING (
  practice_id = get_current_user_practice_id()
  AND is_current_user_practice_manager()
);

CREATE POLICY "Restrict candidate deletion to practice managers only"
ON public.candidates
FOR DELETE
USING (
  practice_id = get_current_user_practice_id()
  AND is_current_user_practice_manager()
);

-- 5. Add additional security: Create function to check if field access is allowed
CREATE OR REPLACE FUNCTION public.can_access_sensitive_user_field(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User accessing their own data
    _target_user_id = auth.uid()
    OR
    -- Master users can access all
    is_current_user_master();
$$;

COMMENT ON FUNCTION public.can_access_sensitive_user_field IS 'SECURITY: Checks if current user can access sensitive fields (mfa_secret, phone_number) for target user.';

-- 6. Add table-level security comments
COMMENT ON COLUMN public.users.mfa_secret IS 'SECURITY CRITICAL: Only accessible by user themselves or master users. Use can_access_sensitive_user_field() to check access.';
COMMENT ON COLUMN public.users.phone_number IS 'SECURITY SENSITIVE: Personal contact information. Only accessible by user themselves or master users.';
COMMENT ON TABLE public.candidates IS 'SECURITY CRITICAL: Contains GDPR-protected applicant data. Strict access controls enforced.';