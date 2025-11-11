-- Phase 2B: Critical View Security & Contact Details Protection (Revised)
-- This migration addresses ERROR-level security findings from the security scan

-- ============================================================================
-- 1. FIX user_contact_details INSERT POLICY (ERROR - Priority 1)
-- ============================================================================
-- Issue: Unrestricted INSERT policy allows any authenticated user to create 
-- contact details for any user (privilege escalation vulnerability)

DROP POLICY IF EXISTS "Users can insert their own contact details" ON public.user_contact_details;

CREATE POLICY "Users can insert only their own contact details"
ON public.user_contact_details
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = get_user_id_from_auth() 
  OR is_current_user_master()
);

-- ============================================================================
-- 2. CLEANUP DUPLICATE user_auth_sensitive INSERT POLICY (WARN)
-- ============================================================================
-- Issue: Two identical INSERT policies exist causing policy confusion

DROP POLICY IF EXISTS "Users can insert only their own MFA data" ON public.user_auth_sensitive;

-- Keep "Users can insert their own MFA data" policy (more descriptive name)

-- ============================================================================
-- 3. SECURE VIEWS WITH security_barrier (ERROR - Partial Fix)
-- ============================================================================
-- Note: Views cannot have RLS policies directly - they inherit RLS from underlying tables.
-- Setting security_barrier prevents query optimization from leaking data.
-- The real fix requires recreating these as security definer functions.

-- For now, mark views as security barriers to prevent optimization leaks
ALTER VIEW public.users_for_assignment SET (security_barrier = true);
ALTER VIEW public.users_public_info SET (security_barrier = true);
ALTER VIEW public.user_mfa_status SET (security_barrier = true);

-- ============================================================================
-- 4. CREATE SECURITY DEFINER FUNCTIONS AS PROPER VIEW REPLACEMENTS
-- ============================================================================

-- Replace users_for_assignment view with a security definer function
CREATE OR REPLACE FUNCTION public.get_users_for_assignment()
RETURNS TABLE (
  id uuid,
  practice_id uuid,
  is_active boolean,
  role app_role,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.practice_id,
    u.is_active,
    ur.role,
    u.name
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  WHERE u.is_active = true
    AND (
      u.practice_id = get_current_user_practice_id()
      OR is_current_user_master()
    );
$$;

-- Replace users_public_info view with a security definer function
CREATE OR REPLACE FUNCTION public.get_users_public_info()
RETURNS TABLE (
  practice_id uuid,
  id uuid,
  is_active boolean,
  auth_user_id uuid,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    practice_id,
    id,
    is_active,
    auth_user_id,
    name
  FROM users
  WHERE practice_id = get_current_user_practice_id()
    OR is_current_user_master();
$$;

-- Replace user_mfa_status view with a security definer function
CREATE OR REPLACE FUNCTION public.get_user_mfa_status(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  mfa_enabled boolean,
  phone_configured boolean,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    uas.user_id,
    (uas.mfa_secret IS NOT NULL) as mfa_enabled,
    (uas.phone_number IS NOT NULL) as phone_configured,
    uas.updated_at
  FROM user_auth_sensitive uas
  WHERE (
    -- User viewing their own status
    (target_user_id IS NULL AND uas.user_id = get_user_id_from_auth())
    OR (target_user_id IS NOT NULL AND uas.user_id = target_user_id AND uas.user_id = get_user_id_from_auth())
    -- Practice manager viewing their practice users
    OR (
      is_current_user_practice_manager() 
      AND uas.user_id IN (
        SELECT id FROM users WHERE practice_id = get_current_user_practice_id()
      )
    )
    -- Master user viewing any user
    OR is_current_user_master()
  );
$$;

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================
-- After migration:
-- 1. Update frontend code to use new functions instead of views:
--    - SELECT * FROM users_for_assignment -> SELECT * FROM get_users_for_assignment()
--    - SELECT * FROM users_public_info -> SELECT * FROM get_users_public_info()
--    - SELECT * FROM user_mfa_status -> SELECT * FROM get_user_mfa_status()
-- 2. Run security scanner to verify ERROR findings are resolved
-- 3. Test authenticated user access within same practice (should work)
-- 4. Test cross-practice access attempts (should fail)
-- 5. Consider dropping the old views once frontend is updated