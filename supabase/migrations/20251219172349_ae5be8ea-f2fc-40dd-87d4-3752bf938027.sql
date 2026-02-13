-- Drop existing SELECT policies on users table to consolidate them
DROP POLICY IF EXISTS "Master users can view all users" ON public.users;
DROP POLICY IF EXISTS "Master users can manage all users" ON public.users;
DROP POLICY IF EXISTS "Practice managers full access (audited)" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_own_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_practice_policy" ON public.users;

-- Create consolidated, secure SELECT policy
-- Users can ONLY see:
-- 1. Their own record (auth_user_id = auth.uid())
-- 2. Users in their practice IF they have manage_users capability
-- 3. All users IF they are a master user
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (
  -- Own record
  auth_user_id = auth.uid()
  OR
  -- Practice users with manage_users capability
  (practice_id = current_practice_id() AND has_capability('manage_users'::capability))
  OR
  -- Master users can see all
  is_current_user_master()
);

-- Keep existing INSERT, UPDATE, DELETE policies but ensure they're properly scoped
-- (These were already created with users_insert_policy, users_update_policy, users_delete_policy)