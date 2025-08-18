-- Fix RLS policy for practices table to allow creation during organization setup
-- Add policy to allow authenticated users to create practices (for initial setup)
CREATE POLICY "Allow authenticated users to create practices during setup" 
ON public.practices 
FOR INSERT 
TO authenticated
WITH CHECK (true);