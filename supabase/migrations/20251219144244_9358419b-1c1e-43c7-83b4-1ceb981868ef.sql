-- Update RLS policies to use capability-based access control

-- ============================================
-- POLICY_DOCUMENTS TABLE - Capability-based policies
-- ============================================

DROP POLICY IF EXISTS "Users can view policies in their practice" ON public.policy_documents;
DROP POLICY IF EXISTS "Users can insert policies in their practice" ON public.policy_documents;
DROP POLICY IF EXISTS "Users can update policies in their practice" ON public.policy_documents;
DROP POLICY IF EXISTS "Users can delete policies in their practice" ON public.policy_documents;

CREATE POLICY "policy_documents_select_policy" ON public.policy_documents
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('view_policies'::capability)
  );

CREATE POLICY "policy_documents_insert_policy" ON public.policy_documents
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_policies'::capability)
  );

CREATE POLICY "policy_documents_update_policy" ON public.policy_documents
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_policies'::capability)
  );

CREATE POLICY "policy_documents_delete_policy" ON public.policy_documents
  FOR DELETE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_policies'::capability)
  );

-- ============================================
-- INCIDENTS TABLE - Capability-based policies
-- ============================================

DROP POLICY IF EXISTS "Users can view incidents in their practice" ON public.incidents;
DROP POLICY IF EXISTS "Users can insert incidents in their practice" ON public.incidents;
DROP POLICY IF EXISTS "Users can update incidents in their practice" ON public.incidents;
DROP POLICY IF EXISTS "Users can delete incidents in their practice" ON public.incidents;

CREATE POLICY "incidents_select_policy" ON public.incidents
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND (public.has_capability('report_incident'::capability) OR public.has_capability('manage_incident'::capability))
  );

CREATE POLICY "incidents_insert_policy" ON public.incidents
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('report_incident'::capability)
  );

CREATE POLICY "incidents_update_policy" ON public.incidents
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_incident'::capability)
  );

CREATE POLICY "incidents_delete_policy" ON public.incidents
  FOR DELETE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_incident'::capability)
  );

-- ============================================
-- COMPLAINTS TABLE - Capability-based policies
-- ============================================

DROP POLICY IF EXISTS "Users can view complaints in their practice" ON public.complaints;
DROP POLICY IF EXISTS "Users can insert complaints in their practice" ON public.complaints;
DROP POLICY IF EXISTS "Users can update complaints in their practice" ON public.complaints;
DROP POLICY IF EXISTS "Users can delete complaints in their practice" ON public.complaints;

CREATE POLICY "complaints_select_policy" ON public.complaints
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND (public.has_capability('log_complaint'::capability) OR public.has_capability('manage_complaint'::capability))
  );

CREATE POLICY "complaints_insert_policy" ON public.complaints
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('log_complaint'::capability)
  );

CREATE POLICY "complaints_update_policy" ON public.complaints
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_complaint'::capability)
  );

CREATE POLICY "complaints_delete_policy" ON public.complaints
  FOR DELETE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_complaint'::capability)
  );

-- ============================================
-- EMPLOYEES TABLE - Capability-based policies
-- ============================================

DROP POLICY IF EXISTS "Users can view employees in their practice" ON public.employees;
DROP POLICY IF EXISTS "Users can insert employees in their practice" ON public.employees;
DROP POLICY IF EXISTS "Users can update employees in their practice" ON public.employees;
DROP POLICY IF EXISTS "Users can delete employees in their practice" ON public.employees;

CREATE POLICY "employees_select_policy" ON public.employees
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND (public.has_capability('view_training'::capability) OR public.has_capability('manage_training'::capability))
  );

CREATE POLICY "employees_insert_policy" ON public.employees
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_training'::capability)
  );

CREATE POLICY "employees_update_policy" ON public.employees
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_training'::capability)
  );

CREATE POLICY "employees_delete_policy" ON public.employees
  FOR DELETE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_training'::capability)
  );

-- ============================================
-- USERS TABLE - Capability-based policies for user management
-- ============================================

DROP POLICY IF EXISTS "Users can view users in their practice" ON public.users;
DROP POLICY IF EXISTS "Practice managers can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- Users can view their own record always
CREATE POLICY "users_select_own_policy" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );

-- Users with manage_users can view all users in their practice
CREATE POLICY "users_select_practice_policy" ON public.users
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_users'::capability)
  );

-- Users with manage_users can insert users in their practice
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_users'::capability)
  );

-- Users with manage_users can update users in their practice, or update own record
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (
    (auth_user_id = auth.uid())
    OR (
      practice_id = public.current_practice_id()
      AND public.has_capability('manage_users'::capability)
    )
  );

-- Only users with manage_users can delete users
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_users'::capability)
  );

-- ============================================
-- GOVERNANCE_APPROVALS TABLE - Capability-based policies
-- ============================================

DROP POLICY IF EXISTS "Users can view governance approvals in their practice" ON public.governance_approvals;
DROP POLICY IF EXISTS "Users can insert governance approvals in their practice" ON public.governance_approvals;
DROP POLICY IF EXISTS "Users can update governance approvals in their practice" ON public.governance_approvals;

CREATE POLICY "governance_approvals_select_policy" ON public.governance_approvals
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('view_dashboards'::capability)
  );

CREATE POLICY "governance_approvals_insert_policy" ON public.governance_approvals
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('approve_policies'::capability)
  );

CREATE POLICY "governance_approvals_update_policy" ON public.governance_approvals
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('approve_policies'::capability)
  );

-- ============================================
-- ROLE MANAGEMENT TABLES - Admin only
-- ============================================

-- Drop existing policies on role tables
DROP POLICY IF EXISTS "practice_roles_select_policy" ON public.practice_roles;
DROP POLICY IF EXISTS "practice_roles_insert_policy" ON public.practice_roles;
DROP POLICY IF EXISTS "practice_roles_update_policy" ON public.practice_roles;
DROP POLICY IF EXISTS "user_practice_roles_select_policy" ON public.user_practice_roles;
DROP POLICY IF EXISTS "user_practice_roles_insert_policy" ON public.user_practice_roles;
DROP POLICY IF EXISTS "user_practice_roles_update_policy" ON public.user_practice_roles;
DROP POLICY IF EXISTS "user_practice_roles_delete_policy" ON public.user_practice_roles;
DROP POLICY IF EXISTS "practice_role_capabilities_select_policy" ON public.practice_role_capabilities;
DROP POLICY IF EXISTS "practice_role_capabilities_insert_policy" ON public.practice_role_capabilities;
DROP POLICY IF EXISTS "practice_role_capabilities_delete_policy" ON public.practice_role_capabilities;
DROP POLICY IF EXISTS "role_catalog_select_policy" ON public.role_catalog;

-- practice_roles - Users in same practice can view, only assign_roles can manage
CREATE POLICY "practice_roles_select_policy" ON public.practice_roles
  FOR SELECT USING (
    practice_id = public.current_practice_id()
  );

CREATE POLICY "practice_roles_insert_policy" ON public.practice_roles
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('assign_roles'::capability)
  );

CREATE POLICY "practice_roles_update_policy" ON public.practice_roles
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('assign_roles'::capability)
  );

-- user_practice_roles - Only users with assign_roles can manage
CREATE POLICY "user_practice_roles_select_policy" ON public.user_practice_roles
  FOR SELECT USING (
    practice_id = public.current_practice_id()
  );

CREATE POLICY "user_practice_roles_insert_policy" ON public.user_practice_roles
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('assign_roles'::capability)
  );

CREATE POLICY "user_practice_roles_update_policy" ON public.user_practice_roles
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('assign_roles'::capability)
  );

CREATE POLICY "user_practice_roles_delete_policy" ON public.user_practice_roles
  FOR DELETE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('assign_roles'::capability)
  );

-- practice_role_capabilities - Only admins can modify capability overrides
CREATE POLICY "practice_role_capabilities_select_policy" ON public.practice_role_capabilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.practice_roles pr
      WHERE pr.id = practice_role_id
      AND pr.practice_id = public.current_practice_id()
    )
  );

CREATE POLICY "practice_role_capabilities_insert_policy" ON public.practice_role_capabilities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practice_roles pr
      WHERE pr.id = practice_role_id
      AND pr.practice_id = public.current_practice_id()
    )
    AND public.has_capability('assign_roles'::capability)
  );

CREATE POLICY "practice_role_capabilities_delete_policy" ON public.practice_role_capabilities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.practice_roles pr
      WHERE pr.id = practice_role_id
      AND pr.practice_id = public.current_practice_id()
    )
    AND public.has_capability('assign_roles'::capability)
  );

-- role_catalog is read-only for all authenticated users
CREATE POLICY "role_catalog_select_policy" ON public.role_catalog
  FOR SELECT USING (true);

-- ============================================
-- CLEANING TABLES - Capability-based policies
-- ============================================

DROP POLICY IF EXISTS "Users can view cleaning logs in their practice" ON public.cleaning_logs;
DROP POLICY IF EXISTS "Users can insert cleaning logs in their practice" ON public.cleaning_logs;
DROP POLICY IF EXISTS "Users can update cleaning logs in their practice" ON public.cleaning_logs;

CREATE POLICY "cleaning_logs_select_policy" ON public.cleaning_logs
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND (public.has_capability('complete_cleaning'::capability) OR public.has_capability('manage_cleaning'::capability))
  );

CREATE POLICY "cleaning_logs_insert_policy" ON public.cleaning_logs
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('complete_cleaning'::capability)
  );

CREATE POLICY "cleaning_logs_update_policy" ON public.cleaning_logs
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_cleaning'::capability)
  );

-- ============================================
-- FRIDGES TABLE - Capability-based policies
-- ============================================

DROP POLICY IF EXISTS "Users can view fridges in their practice" ON public.fridges;
DROP POLICY IF EXISTS "Users can insert fridges in their practice" ON public.fridges;
DROP POLICY IF EXISTS "Users can update fridges in their practice" ON public.fridges;

CREATE POLICY "fridges_select_policy" ON public.fridges
  FOR SELECT USING (
    practice_id = public.current_practice_id()
    AND (public.has_capability('record_fridge_temp'::capability) OR public.has_capability('manage_fridges'::capability))
  );

CREATE POLICY "fridges_insert_policy" ON public.fridges
  FOR INSERT WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_fridges'::capability)
  );

CREATE POLICY "fridges_update_policy" ON public.fridges
  FOR UPDATE USING (
    practice_id = public.current_practice_id()
    AND public.has_capability('manage_fridges'::capability)
  );