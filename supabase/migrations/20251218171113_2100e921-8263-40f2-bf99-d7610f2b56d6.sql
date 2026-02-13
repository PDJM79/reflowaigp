-- Drop the anonymous access policy that allows unauthenticated users to view practices
DROP POLICY IF EXISTS "Anonymous users can view practice list for selection" ON public.practices;