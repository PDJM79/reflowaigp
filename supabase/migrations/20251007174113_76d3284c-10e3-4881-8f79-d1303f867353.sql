-- Simplify RLS policies for process_templates to ensure basic access works
DROP POLICY IF EXISTS "Users can view templates in their practice" ON process_templates;
DROP POLICY IF EXISTS "Master users can access all process templates" ON process_templates;
DROP POLICY IF EXISTS "Practice managers can manage templates" ON process_templates;

-- Create simpler, more explicit policies
CREATE POLICY "Users view templates in practice"
ON process_templates FOR SELECT
TO authenticated
USING (
  practice_id IN (
    SELECT practice_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Practice managers manage templates"
ON process_templates FOR ALL
TO authenticated
USING (
  practice_id IN (
    SELECT practice_id 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND is_practice_manager = true
  )
);

CREATE POLICY "Master users access all templates"
ON process_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND is_master_user = true
  )
);

-- Simplify RLS policies for process_instances
DROP POLICY IF EXISTS "Users can view instances in their practice" ON process_instances;
DROP POLICY IF EXISTS "Master users can access all process instances" ON process_instances;
DROP POLICY IF EXISTS "Practice managers can manage instances" ON process_instances;
DROP POLICY IF EXISTS "Users can update their assigned instances" ON process_instances;
DROP POLICY IF EXISTS "Users can insert instances for their practice" ON process_instances;

-- Create simpler policies for process_instances
CREATE POLICY "Users view instances in practice"
ON process_instances FOR SELECT
TO authenticated
USING (
  practice_id IN (
    SELECT practice_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users update assigned instances"
ON process_instances FOR UPDATE
TO authenticated
USING (
  assignee_id IN (
    SELECT id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Practice managers manage instances"
ON process_instances FOR ALL
TO authenticated
USING (
  practice_id IN (
    SELECT practice_id 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND is_practice_manager = true
  )
);

CREATE POLICY "Master users access all instances"
ON process_instances FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND is_master_user = true
  )
);