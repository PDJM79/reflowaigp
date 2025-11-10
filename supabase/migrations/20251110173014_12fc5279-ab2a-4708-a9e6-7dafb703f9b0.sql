-- Fix critical security vulnerability: Remove public access to practices table
-- This policy allows anyone (including unauthenticated users) to view sensitive practice data
DROP POLICY IF EXISTS "Anyone can view practices for selection" ON public.practices;

-- Ensure only authenticated users in their own practice can view practice details
-- The existing "Users can view their own practice" policy already handles this correctly

-- Optional: If practice managers need to view all practices in their group for admin purposes,
-- add a more restrictive policy here. For now, we keep it simple and secure.

-- Verify RLS is enabled
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;

-- Summary of remaining policies:
-- 1. "Users can view their own practice" - authenticated users can view their practice
-- 2. "Practice managers can update their practice" - practice managers can update their practice
-- 3. "Master users can manage all practices" - master users have full access
-- 4. "Allow practice creation during setup" - allows initial practice creation (consider removing after setup)

-- Note: The "Allow practice creation during setup" policy should be reviewed.
-- After initial setup is complete, you may want to restrict practice creation to admin/master users only.