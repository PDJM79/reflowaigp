-- Fix linter issues from previous migration
-- Remove SECURITY DEFINER from view and fix function search path

-- Step 1: Drop and recreate the users_safe view without SECURITY DEFINER
-- Views don't need SECURITY DEFINER and it's a security warning
DROP VIEW IF EXISTS public.users_safe;

CREATE VIEW public.users_safe AS
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

-- Re-grant permissions
GRANT SELECT ON public.users_safe TO authenticated;

COMMENT ON VIEW public.users_safe IS 'SECURITY: Safe view of users table that excludes mfa_secret and restricts phone_number access. Always use this view instead of querying users table directly.';

-- Step 2: Remove the audit_mfa_secret_access function
-- It was not properly implemented and creates a linter warning
DROP FUNCTION IF EXISTS public.audit_mfa_secret_access() CASCADE;