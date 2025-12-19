-- =============================================
-- Security Hardening: Audit Logs & Users Table
-- =============================================

-- 1. Drop existing overly permissive audit_logs SELECT policy
DROP POLICY IF EXISTS "Users can view audit logs in their practice" ON public.audit_logs;

-- 2. Create new restricted SELECT policy for audit_logs
-- Only practice managers or users with manage_users capability can view audit logs
CREATE POLICY "Practice managers can view audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND (
    public.is_practice_manager(auth.uid())
    OR public.has_capability(auth.uid(), 'manage_users'::public.capability)
  )
);

-- 3. Create a secure view for team member listing
-- This allows all practice users to see basic colleague info without exposing sensitive columns
CREATE OR REPLACE VIEW public.team_members AS
SELECT 
  u.id,
  u.name,
  u.is_active,
  u.practice_id
FROM public.users u
WHERE u.practice_id = public.get_user_practice_id(auth.uid());

-- Grant access to the view for authenticated users
GRANT SELECT ON public.team_members TO authenticated;

-- 4. Update users table SELECT policy to be more restrictive
-- Drop existing policy
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- Create new tiered SELECT policy
-- Users can see:
-- 1. Their own full record (auth_user_id matches)
-- 2. Full records if they have manage_users capability (for user management)
-- 3. Full records if they are a practice manager
-- 4. Master users see everything
CREATE POLICY "users_select_policy_v2" ON public.users
FOR SELECT TO authenticated
USING (
  -- Own record: full access
  auth_user_id = auth.uid()
  OR
  -- Practice managers: full access to practice users
  (
    practice_id = public.get_user_practice_id(auth.uid()) 
    AND public.is_practice_manager(auth.uid())
  )
  OR
  -- Users with manage_users capability: full access to practice users
  (
    practice_id = public.get_user_practice_id(auth.uid()) 
    AND public.has_capability(auth.uid(), 'manage_users'::public.capability)
  )
  OR
  -- Master users: full access to all
  public.is_current_user_master()
);

-- 5. Add comment explaining the security model
COMMENT ON VIEW public.team_members IS 'Secure view exposing only non-sensitive user fields (id, name, is_active, practice_id) for colleague listing. Use this instead of querying users table directly when you only need basic team info.';

COMMENT ON POLICY "users_select_policy_v2" ON public.users IS 'Tiered access: own record always visible, practice managers and users with manage_users capability see all practice users, master users see all.';