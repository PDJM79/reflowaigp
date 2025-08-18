-- Fix RLS policies by dropping existing ones first

-- Drop all existing policies for process_templates
DROP POLICY IF EXISTS "Users can view templates in their practice" ON public.process_templates;
DROP POLICY IF EXISTS "Practice managers can manage templates" ON public.process_templates;

-- Drop all existing policies for process_instances  
DROP POLICY IF EXISTS "Users can view instances in their practice" ON public.process_instances;
DROP POLICY IF EXISTS "Users can insert instances for their practice" ON public.process_instances;
DROP POLICY IF EXISTS "Users can update their assigned instances" ON public.process_instances;
DROP POLICY IF EXISTS "Practice managers can manage instances" ON public.process_instances;

-- Drop all existing policies for step_instances
DROP POLICY IF EXISTS "Users can view steps in their practice" ON public.step_instances;
DROP POLICY IF EXISTS "Users can insert step instances" ON public.step_instances;
DROP POLICY IF EXISTS "Users can update steps they're assigned to" ON public.step_instances;

-- Drop all existing policies for evidence
DROP POLICY IF EXISTS "Users can view evidence in their practice" ON public.evidence;
DROP POLICY IF EXISTS "Users can insert evidence for their steps" ON public.evidence;

-- Drop all existing policies for issues
DROP POLICY IF EXISTS "Users can view issues in their practice" ON public.issues;
DROP POLICY IF EXISTS "Users can insert issues in their practice" ON public.issues;
DROP POLICY IF EXISTS "Practice managers can manage issues" ON public.issues;

-- Drop all existing policies for audit_logs
DROP POLICY IF EXISTS "Users can view audit logs in their practice" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs in their practice" ON public.audit_logs;

-- Now create the new policies
-- ===== PROCESS_TEMPLATES TABLE =====
CREATE POLICY "Users can view templates in their practice" 
ON public.process_templates 
FOR SELECT
USING (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Practice managers can manage templates" 
ON public.process_templates 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);

-- ===== PROCESS_INSTANCES TABLE =====
CREATE POLICY "Users can view instances in their practice" 
ON public.process_instances 
FOR SELECT
USING (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Users can insert instances for their practice" 
ON public.process_instances 
FOR INSERT
WITH CHECK (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Users can update their assigned instances" 
ON public.process_instances 
FOR UPDATE
USING (assignee_id IN ( SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()));

CREATE POLICY "Practice managers can manage instances" 
ON public.process_instances 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);

-- ===== STEP_INSTANCES TABLE =====
CREATE POLICY "Users can view steps in their practice" 
ON public.step_instances 
FOR SELECT
USING (process_instance_id IN ( 
  SELECT process_instances.id 
  FROM process_instances 
  WHERE process_instances.practice_id = public.get_user_practice_id(auth.uid())
));

CREATE POLICY "Users can insert step instances" 
ON public.step_instances 
FOR INSERT
WITH CHECK (process_instance_id IN ( 
  SELECT process_instances.id 
  FROM process_instances 
  WHERE process_instances.practice_id = public.get_user_practice_id(auth.uid())
));

CREATE POLICY "Users can update steps they're assigned to" 
ON public.step_instances 
FOR UPDATE
USING (process_instance_id IN ( 
  SELECT process_instances.id 
  FROM process_instances 
  WHERE process_instances.assignee_id IN ( 
    SELECT users.id 
    FROM users 
    WHERE users.auth_user_id = auth.uid()
  )
));

-- ===== EVIDENCE TABLE =====
CREATE POLICY "Users can view evidence in their practice" 
ON public.evidence 
FOR SELECT
USING (step_instance_id IN ( 
  SELECT si.id 
  FROM step_instances si
  JOIN process_instances pi ON si.process_instance_id = pi.id
  WHERE pi.practice_id = public.get_user_practice_id(auth.uid())
));

CREATE POLICY "Users can insert evidence for their steps" 
ON public.evidence 
FOR INSERT
WITH CHECK (user_id IN ( 
  SELECT users.id 
  FROM users 
  WHERE users.auth_user_id = auth.uid()
));

-- ===== ISSUES TABLE =====
CREATE POLICY "Users can view issues in their practice" 
ON public.issues 
FOR SELECT
USING (process_instance_id IN ( 
  SELECT process_instances.id 
  FROM process_instances 
  WHERE process_instances.practice_id = public.get_user_practice_id(auth.uid())
));

CREATE POLICY "Users can insert issues in their practice" 
ON public.issues 
FOR INSERT
WITH CHECK (process_instance_id IN ( 
  SELECT process_instances.id 
  FROM process_instances 
  WHERE process_instances.practice_id = public.get_user_practice_id(auth.uid())
));

CREATE POLICY "Practice managers can manage issues" 
ON public.issues 
FOR ALL
USING (process_instance_id IN ( 
  SELECT process_instances.id 
  FROM process_instances 
  WHERE process_instances.practice_id = public.get_user_practice_id(auth.uid())
  AND public.is_practice_manager(auth.uid())
));

-- ===== AUDIT_LOGS TABLE =====
CREATE POLICY "Users can view audit logs in their practice" 
ON public.audit_logs 
FOR SELECT
USING (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Users can insert audit logs in their practice" 
ON public.audit_logs 
FOR INSERT
WITH CHECK (practice_id = public.get_user_practice_id(auth.uid()));