-- FINAL SECURITY FIX: Remove sensitive columns and verify RLS

-- 1. Drop sensitive columns from users table entirely
-- Data is already migrated to user_auth_sensitive table
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS mfa_secret CASCADE,
  DROP COLUMN IF EXISTS phone_number CASCADE;

-- 2. Verify RLS is enabled on all sensitive tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_auth_sensitive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Ensure candidates policies are complete and correct
-- Drop and recreate all policies for candidates to ensure clean state
DROP POLICY IF EXISTS "Only practice managers and master users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Restrict candidate creation to practice managers only" ON public.candidates;
DROP POLICY IF EXISTS "Restrict candidate updates to practice managers only" ON public.candidates;
DROP POLICY IF EXISTS "Restrict candidate deletion to practice managers only" ON public.candidates;

-- Recreate with explicit access control
CREATE POLICY "candidates_select_policy"
ON public.candidates
FOR SELECT
TO authenticated
USING (
  -- Only master users or practice managers in the same practice can view
  is_current_user_master()
  OR (
    is_current_user_practice_manager() 
    AND practice_id = get_current_user_practice_id()
  )
);

CREATE POLICY "candidates_insert_policy"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only practice managers can create candidates in their practice
  is_current_user_practice_manager()
  AND practice_id = get_current_user_practice_id()
);

CREATE POLICY "candidates_update_policy"
ON public.candidates
FOR UPDATE
TO authenticated
USING (
  is_current_user_practice_manager()
  AND practice_id = get_current_user_practice_id()
);

CREATE POLICY "candidates_delete_policy"
ON public.candidates
FOR DELETE
TO authenticated
USING (
  is_current_user_practice_manager()
  AND practice_id = get_current_user_practice_id()
);

-- 4. Strengthen role_assignments RLS
DROP POLICY IF EXISTS "Practice managers can insert role assignments" ON public.role_assignments;

CREATE POLICY "role_assignments_select_restricted"
ON public.role_assignments
FOR SELECT
TO authenticated
USING (
  -- Only practice managers can view role assignments in their practice
  is_current_user_practice_manager()
  AND practice_id = get_current_user_practice_id()
);

CREATE POLICY "role_assignments_insert_restricted"
ON public.role_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  is_current_user_practice_manager()
  AND practice_id = get_current_user_practice_id()
);

-- 5. Add final security documentation
COMMENT ON TABLE public.users IS 'SECURITY: Non-sensitive user profile data. Sensitive fields (mfa_secret, phone_number) moved to user_auth_sensitive table. Safe for practice managers to query.';
COMMENT ON TABLE public.candidates IS 'SECURITY CRITICAL: GDPR-protected applicant PII. RLS enforced - accessible ONLY to practice managers within same practice or master users.';
COMMENT ON TABLE public.user_auth_sensitive IS 'SECURITY CRITICAL: MFA secrets and phone numbers. Strictest RLS - accessible ONLY by user themselves or master users. NO practice manager access ever.';
COMMENT ON TABLE public.role_assignments IS 'SECURITY: Role assignment data restricted to practice managers within same practice to prevent privilege escalation reconnaissance.';