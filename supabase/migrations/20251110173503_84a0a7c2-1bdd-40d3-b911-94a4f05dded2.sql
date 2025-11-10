-- Security Fix: Replace subquery patterns with security definer functions
-- This addresses two critical security findings:
-- 1. user_auth_sensitive_mfa_exposure
-- 2. users_table_public_exposure

-- Create security definer function to get user's internal ID from auth
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Create security definer function to check if user is in same practice
CREATE OR REPLACE FUNCTION public.is_in_same_practice(_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM users u1
    JOIN users u2 ON u1.practice_id = u2.practice_id
    WHERE u1.id = _user_id 
      AND u2.id = _target_user_id
  );
$$;

-- Fix user_auth_sensitive table policies
-- Drop existing policies that use subquery patterns
DROP POLICY IF EXISTS "Users can view only their own MFA data" ON public.user_auth_sensitive;
DROP POLICY IF EXISTS "Users can insert only their own MFA data" ON public.user_auth_sensitive;
DROP POLICY IF EXISTS "Users can update only their own MFA data" ON public.user_auth_sensitive;

-- Recreate policies with security definer function
CREATE POLICY "Users can view only their own MFA data"
ON public.user_auth_sensitive
FOR SELECT
TO authenticated
USING (user_id = get_user_id_from_auth());

CREATE POLICY "Users can insert only their own MFA data"
ON public.user_auth_sensitive
FOR INSERT
TO authenticated
WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "Users can update only their own MFA data"
ON public.user_auth_sensitive
FOR UPDATE
TO authenticated
USING (user_id = get_user_id_from_auth())
WITH CHECK (user_id = get_user_id_from_auth());

-- Note: The users table policies are already using security definer functions
-- (is_current_user_practice_manager, get_current_user_practice_id, is_current_user_master)
-- which follow best practices. The existing policies are appropriately restrictive.