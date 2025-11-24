-- Allow anonymous users to view practices for pre-login selection
CREATE POLICY "Anonymous users can view all practices for selection"
ON practices
FOR SELECT
TO anon
USING (true);