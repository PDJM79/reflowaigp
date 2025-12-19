-- Update is_practice_manager() function to use new role system with fallback
CREATE OR REPLACE FUNCTION public.is_practice_manager(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    -- Fallback: Check is_practice_manager flag on users table
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = user_id 
      AND is_practice_manager = true
    )
    OR
    -- New role system: Check user_practice_roles for practice_manager role
    EXISTS (
      SELECT 1
      FROM user_practice_roles upr
      JOIN users u ON u.id = upr.user_id
      JOIN practice_roles pr ON pr.id = upr.practice_role_id
      JOIN role_catalog rc ON rc.id = pr.role_catalog_id
      WHERE u.auth_user_id = user_id
        AND pr.is_active = true
        AND rc.role_key = 'practice_manager'
    )
$$;

-- Update practices table policy
DROP POLICY IF EXISTS "Practice managers can update their practice" ON practices;

CREATE POLICY "Practice managers can update their practice" ON practices
FOR UPDATE
USING (
  id IN (
    SELECT practice_id FROM users WHERE auth_user_id = auth.uid()
  )
  AND is_practice_manager(auth.uid())
)
WITH CHECK (
  id IN (
    SELECT practice_id FROM users WHERE auth_user_id = auth.uid()
  )
  AND is_practice_manager(auth.uid())
);

-- Update process_instances table policy
DROP POLICY IF EXISTS "Practice managers manage instances" ON process_instances;

CREATE POLICY "Practice managers manage instances" ON process_instances
FOR ALL
USING (
  practice_id IN (
    SELECT practice_id FROM users WHERE auth_user_id = auth.uid()
  )
  AND is_practice_manager(auth.uid())
);

-- Update process_templates table policy
DROP POLICY IF EXISTS "Practice managers manage templates" ON process_templates;

CREATE POLICY "Practice managers manage templates" ON process_templates
FOR ALL
USING (
  practice_id IN (
    SELECT practice_id FROM users WHERE auth_user_id = auth.uid()
  )
  AND is_practice_manager(auth.uid())
);