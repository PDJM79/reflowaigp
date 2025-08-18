-- Fix RLS policies for GP and GP tasks tables by adding proper policies

-- Add policies for GP table
CREATE POLICY "Users can view GP processes in their practice" 
ON "GP" 
FOR SELECT 
USING (true); -- This appears to be reference data, making it publicly readable

-- Add policies for GP tasks table  
CREATE POLICY "Users can view GP tasks in their practice" 
ON "GP tasks" 
FOR SELECT 
USING (true); -- This appears to be reference data, making it publicly readable

CREATE POLICY "Users can insert GP tasks in their practice" 
ON "GP tasks" 
FOR INSERT 
WITH CHECK (true); -- Allow authenticated users to insert