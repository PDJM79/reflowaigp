-- Fix remaining security warnings: employees table and views (fixed)

-- 1. Fix employees table - restrict email visibility
DROP POLICY IF EXISTS "Users can view employees in their practice" ON public.employees;

-- Users can only see their own employee record with full details
CREATE POLICY "Users can view their own employee record"
ON public.employees
FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  OR is_current_user_master()
);

-- Practice managers can view all employees in their practice
CREATE POLICY "Practice managers can view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  is_current_user_practice_manager()
  AND practice_id = get_current_user_practice_id()
);

-- 2. Drop problematic views and create secure replacements
DROP VIEW IF EXISTS public.users_basic CASCADE;
DROP VIEW IF EXISTS public.users_for_managers CASCADE;

-- Create a properly secured view for team management
CREATE VIEW public.users_safe_view AS
SELECT 
  u.id,
  u.practice_id,
  u.auth_user_id,
  u.role,
  u.is_active,
  u.created_at,
  u.updated_at,
  u.is_practice_manager,
  u.is_master_user,
  u.mfa_enabled,
  u.name,
  u.email
FROM public.users u
WHERE 
  u.auth_user_id = auth.uid()
  OR (
    is_current_user_practice_manager() 
    AND u.practice_id = get_current_user_practice_id()
  )
  OR is_current_user_master();

-- Enable SECURITY INVOKER to respect RLS
ALTER VIEW public.users_safe_view SET (security_invoker = on);

COMMENT ON VIEW public.users_safe_view IS 'SECURITY: Safe view of users table. All sensitive fields (mfa_secret, phone_number) moved to user_auth_sensitive. Uses SECURITY INVOKER to enforce RLS.';

-- 3. Clean up UPDATE policy on users table
DROP POLICY IF EXISTS "Users can update their own non-sensitive profile fields" ON public.users;

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
);

-- 4. Add security documentation
COMMENT ON TABLE public.employees IS 'SECURITY: Employee records contain email addresses. RLS enforced - users can only view their own record, practice managers can view all in their practice.';