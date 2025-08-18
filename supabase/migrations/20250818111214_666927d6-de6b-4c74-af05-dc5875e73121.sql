-- Comprehensive RLS policy fix for all tables

-- ===== PRACTICES TABLE =====
DROP POLICY IF EXISTS "Authenticated users can create practices" ON public.practices;
DROP POLICY IF EXISTS "Authenticated users can view practices" ON public.practices;
DROP POLICY IF EXISTS "Practice managers can update their practice" ON public.practices;

CREATE POLICY "Anyone can create practices" 
ON public.practices 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their practice" 
ON public.practices 
FOR SELECT 
USING (
  id IN ( 
    SELECT users.practice_id 
    FROM users 
    WHERE users.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Practice managers can manage their practice" 
ON public.practices 
FOR ALL
USING (
  id IN ( 
    SELECT users.practice_id 
    FROM users 
    WHERE users.auth_user_id = auth.uid() AND users.is_practice_manager = true
  )
);

-- ===== USERS TABLE =====
DROP POLICY IF EXISTS "Allow users to insert their own profile during setup" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Practice managers can manage users in their practice" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their practice" ON public.users;

CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can view users in their practice" 
ON public.users 
FOR SELECT
USING (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Practice managers can manage users in their practice" 
ON public.users 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);

-- ===== ROLE_ASSIGNMENTS TABLE =====
DROP POLICY IF EXISTS "Allow users to insert role assignments during setup" ON public.role_assignments;
DROP POLICY IF EXISTS "Users can view role assignments in their practice" ON public.role_assignments;
DROP POLICY IF EXISTS "Practice managers can manage role assignments" ON public.role_assignments;

CREATE POLICY "Anyone can insert role assignments during setup" 
ON public.role_assignments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view role assignments in their practice" 
ON public.role_assignments 
FOR SELECT
USING (practice_id = public.get_user_practice_id(auth.uid()));

CREATE POLICY "Practice managers can manage role assignments" 
ON public.role_assignments 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);

-- ===== ORGANIZATION_SETUP TABLE =====
DROP POLICY IF EXISTS "Allow users to insert organization setup during setup" ON public.organization_setup;
DROP POLICY IF EXISTS "Practice managers can manage organization setup" ON public.organization_setup;

CREATE POLICY "Anyone can insert organization setup" 
ON public.organization_setup 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Practice managers can manage organization setup" 
ON public.organization_setup 
FOR ALL
USING (
  practice_id = public.get_user_practice_id(auth.uid()) 
  AND public.is_practice_manager(auth.uid())
);

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