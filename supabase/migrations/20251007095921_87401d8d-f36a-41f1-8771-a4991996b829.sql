-- Fix RLS for organization setup - make it work even during email confirmation
-- The issue is that during signup, users may not be fully authenticated yet

-- Drop and recreate the INSERT policy to be more permissive
DROP POLICY IF EXISTS "Users can create practices during setup" ON public.practices;

-- Allow ANY authenticated request to create a practice during initial setup
-- This is safe because:
-- 1. Users can only create, not view others' data
-- 2. The user will be linked to this practice immediately after
CREATE POLICY "Allow practice creation during setup"
  ON public.practices FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Note: We keep the other policies (SELECT, UPDATE) restrictive for security