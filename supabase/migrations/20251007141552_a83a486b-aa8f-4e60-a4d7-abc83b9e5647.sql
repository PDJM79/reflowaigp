-- Allow anonymous users to view all practices for practice selection before login
CREATE POLICY "Anyone can view practices for selection"
ON public.practices
FOR SELECT
TO anon, authenticated
USING (true);

-- Add a comment explaining this policy
COMMENT ON POLICY "Anyone can view practices for selection" ON public.practices IS 
'Allows unauthenticated users to view practice list for federated login selection. Users must still authenticate with proper credentials to access practice data.';