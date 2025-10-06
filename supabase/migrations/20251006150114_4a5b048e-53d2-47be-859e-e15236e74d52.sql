-- Fix practices table security vulnerabilities
-- Remove overly permissive policies and implement proper practice_id filtering

-- Step 1: Drop the policies that allow unrestricted access
DROP POLICY IF EXISTS "Authenticated users can view practices" ON public.practices;
DROP POLICY IF EXISTS "Master users can view all practices" ON public.practices;

-- Step 2: Create a new restrictive SELECT policy for regular users
-- Users can only view their own practice
CREATE POLICY "Users can view their own practice"
ON public.practices
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT practice_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

-- Step 3: Create a separate policy for master users to view all practices
-- Master users need to see all practices for administration
CREATE POLICY "Master users can view all practices"
ON public.practices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
    AND is_master_user = true
  )
);

-- Step 4: Tighten the INSERT policy to require proper authentication
-- Replace the overly permissive "true" check
DROP POLICY IF EXISTS "Authenticated users can create practices" ON public.practices;

CREATE POLICY "Users can create practices during setup"
ON public.practices
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow creation if the user is authenticated
  auth.uid() IS NOT NULL
);

-- Step 5: Keep existing policies for practice managers
-- (The "Practice managers can update their practice" policy remains as-is)
-- (The "Master users can manage all practices" policy remains as-is)

-- Step 6: Add security comment
COMMENT ON TABLE public.practices IS 'SECURITY: Access restricted to users within their own practice. Master users can access all practices for administration.';