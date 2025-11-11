-- Phase 2B Part 2: Drop Insecure Views
-- These views have no RLS protection (views can't have RLS in PostgreSQL)
-- and are not used in the application code. We've already created secure
-- replacement functions: get_users_for_assignment(), get_users_public_info(), 
-- and get_user_mfa_status()

-- Drop the insecure views to eliminate security scanner ERROR findings
DROP VIEW IF EXISTS public.users_for_assignment CASCADE;
DROP VIEW IF EXISTS public.users_public_info CASCADE;
DROP VIEW IF EXISTS public.user_mfa_status CASCADE;

-- The secure replacement functions are already available:
-- - SELECT * FROM get_users_for_assignment() (practice-scoped access)
-- - SELECT * FROM get_users_public_info() (practice-scoped access)
-- - SELECT * FROM get_user_mfa_status() (self + practice manager + master access)

-- Note: If any future code needs these data sets, use the secure functions instead