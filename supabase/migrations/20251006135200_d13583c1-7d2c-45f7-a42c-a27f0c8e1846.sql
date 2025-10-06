-- Phase 1b: RLS Policies for all new tables

-- Helper functions for role checks (using existing patterns)
CREATE OR REPLACE FUNCTION public.is_group_manager(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.users 
      WHERE auth_user_id = user_id 
      AND role = 'group_manager'
    ), 
    false
  );
$$;

-- Groups policies
CREATE POLICY "Group managers can view all groups"
  ON public.groups FOR SELECT
  USING (is_group_manager(auth.uid()));

CREATE POLICY "Group managers can manage groups"
  ON public.groups FOR ALL
  USING (is_group_manager(auth.uid()));

-- Task Templates policies
CREATE POLICY "Users can view templates in their practice"
  ON public.task_templates FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage templates"
  ON public.task_templates FOR ALL
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

CREATE POLICY "Administrators can manage templates"
  ON public.task_templates FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'administrator'
  );

-- Tasks policies
CREATE POLICY "Users can view tasks in their practice"
  ON public.tasks FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can update their assigned tasks"
  ON public.tasks FOR UPDATE
  USING (assigned_to_user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Practice managers can manage all tasks"
  ON public.tasks FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

CREATE POLICY "Administrators can manage all tasks"
  ON public.tasks FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'administrator'
  );

-- Form Templates policies
CREATE POLICY "Users can view form templates"
  ON public.form_templates FOR SELECT
  USING (true);

CREATE POLICY "Domain leads can manage form templates"
  ON public.form_templates FOR ALL
  USING (
    owner_role IN (
      SELECT role FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Form Submissions policies
CREATE POLICY "Users can view submissions in their practice"
  ON public.form_submissions FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can create submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (practice_id = get_current_user_practice_id());

CREATE POLICY "Editors can update submissions"
  ON public.form_submissions FOR UPDATE
  USING (
    practice_id = get_current_user_practice_id()
    AND (
      (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) = ANY(current_editors)
      OR is_current_user_practice_manager()
    )
  );

-- Evidence_v2 policies
CREATE POLICY "Users can view evidence in their practice"
  ON public.evidence_v2 FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can create evidence"
  ON public.evidence_v2 FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id()
    AND created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Month-end Scripts policies
CREATE POLICY "Users can view month-end scripts in their practice"
  ON public.month_end_scripts FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can create month-end scripts"
  ON public.month_end_scripts FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id()
    AND created_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Encrypted Payloads policies
CREATE POLICY "Practice managers can view encrypted payloads"
  ON public.encrypted_payloads FOR SELECT
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

CREATE POLICY "Practice managers can create encrypted payloads"
  ON public.encrypted_payloads FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

-- Claim Runs policies
CREATE POLICY "Users can view claim runs in their practice"
  ON public.claim_runs FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage claim runs"
  ON public.claim_runs FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

-- Claim Items policies
CREATE POLICY "Users can view claim items"
  ON public.claim_items FOR SELECT
  USING (
    claim_run_id IN (
      SELECT id FROM public.claim_runs 
      WHERE practice_id = get_current_user_practice_id()
    )
  );

CREATE POLICY "Practice managers can manage claim items"
  ON public.claim_items FOR ALL
  USING (
    claim_run_id IN (
      SELECT id FROM public.claim_runs 
      WHERE practice_id = get_current_user_practice_id()
    )
    AND is_current_user_practice_manager()
  );

-- IC Sections policies (global read for all)
CREATE POLICY "All authenticated users can view IC sections"
  ON public.ic_sections FOR SELECT
  USING (true);

-- IC Responses policies
CREATE POLICY "Users can view IC responses in their practice"
  ON public.ic_responses FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.form_submissions 
      WHERE practice_id = get_current_user_practice_id()
    )
  );

CREATE POLICY "Users can manage IC responses"
  ON public.ic_responses FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM public.form_submissions 
      WHERE practice_id = get_current_user_practice_id()
    )
  );

-- Rooms policies
CREATE POLICY "Users can view rooms in their practice"
  ON public.rooms FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Estates leads can manage rooms"
  ON public.rooms FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND (
      SELECT role FROM public.users WHERE auth_user_id = auth.uid()
    ) IN ('estates_lead', 'practice_manager')
  );

-- Cleaning Logs policies
CREATE POLICY "Users can view cleaning logs in their practice"
  ON public.cleaning_logs FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can create cleaning logs"
  ON public.cleaning_logs FOR INSERT
  WITH CHECK (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can update cleaning logs"
  ON public.cleaning_logs FOR UPDATE
  USING (practice_id = get_current_user_practice_id());

-- Incidents policies
CREATE POLICY "Users can view incidents in their practice"
  ON public.incidents FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Users can create incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id()
    AND reported_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Practice managers can manage incidents"
  ON public.incidents FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

-- Employees policies
CREATE POLICY "Users can view employees in their practice"
  ON public.employees FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage employees"
  ON public.employees FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

-- Training Records policies
CREATE POLICY "Users can view training records in their practice"
  ON public.training_records FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE practice_id = get_current_user_practice_id()
    )
  );

CREATE POLICY "Practice managers can manage training records"
  ON public.training_records FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE practice_id = get_current_user_practice_id()
    )
    AND is_current_user_practice_manager()
  );

-- Appraisals policies
CREATE POLICY "Users can view appraisals in their practice"
  ON public.appraisals FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE practice_id = get_current_user_practice_id()
    )
  );

CREATE POLICY "Practice managers can manage appraisals"
  ON public.appraisals FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE practice_id = get_current_user_practice_id()
    )
    AND is_current_user_practice_manager()
  );

-- Candidates policies
CREATE POLICY "Practice managers can view candidates"
  ON public.candidates FOR SELECT
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

CREATE POLICY "Practice managers can manage candidates"
  ON public.candidates FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

-- Leave Policies policies
CREATE POLICY "Users can view leave policies in their practice"
  ON public.leave_policies FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage leave policies"
  ON public.leave_policies FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

-- Leave Requests policies
CREATE POLICY "Users can view leave requests in their practice"
  ON public.leave_requests FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE practice_id = get_current_user_practice_id()
    )
  );

CREATE POLICY "Employees can create their own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Managers and PM can manage leave requests"
  ON public.leave_requests FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE practice_id = get_current_user_practice_id()
    )
    AND (
      is_current_user_practice_manager()
      OR employee_id IN (
        SELECT id FROM public.employees 
        WHERE manager_id IN (
          SELECT id FROM public.employees 
          WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
        )
      )
    )
  );

-- Complaints policies
CREATE POLICY "IG leads and PM can view complaints"
  ON public.complaints FOR SELECT
  USING (
    practice_id = get_current_user_practice_id()
    AND (
      (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('ig_lead', 'practice_manager', 'reception_lead')
    )
  );

CREATE POLICY "IG leads and PM can manage complaints"
  ON public.complaints FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND (
      (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('ig_lead', 'practice_manager')
    )
  );

CREATE POLICY "Reception can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id()
    AND (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('reception', 'reception_lead', 'ig_lead', 'practice_manager')
  );

-- Medical Requests policies
CREATE POLICY "Users can view medical requests in their practice"
  ON public.medical_requests FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Administrators can manage medical requests"
  ON public.medical_requests FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND (
      (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('administrator', 'practice_manager')
    )
  );

-- Policy Documents policies
CREATE POLICY "Users can view policy documents in their practice"
  ON public.policy_documents FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "IG leads can manage policy documents"
  ON public.policy_documents FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND (
      (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('ig_lead', 'practice_manager')
    )
  );

-- Fridges policies
CREATE POLICY "Users can view fridges in their practice"
  ON public.fridges FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Estates leads can manage fridges"
  ON public.fridges FOR ALL
  USING (
    practice_id = get_current_user_practice_id()
    AND (
      (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('estates_lead', 'practice_manager', 'nurse_lead')
    )
  );

-- Temp Logs policies
CREATE POLICY "Users can view temp logs in their practice"
  ON public.temp_logs FOR SELECT
  USING (
    fridge_id IN (
      SELECT id FROM public.fridges 
      WHERE practice_id = get_current_user_practice_id()
    )
  );

CREATE POLICY "Users can create temp logs"
  ON public.temp_logs FOR INSERT
  WITH CHECK (
    fridge_id IN (
      SELECT id FROM public.fridges 
      WHERE practice_id = get_current_user_practice_id()
    )
    AND recorded_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Audit Trail policies (append-only, read by PM/Admin)
CREATE POLICY "Practice managers can view audit trail"
  ON public.audit_trail FOR SELECT
  USING (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );

CREATE POLICY "System can insert audit trail"
  ON public.audit_trail FOR INSERT
  WITH CHECK (true);

-- Generated Reports policies
CREATE POLICY "Users can view reports in their practice"
  ON public.generated_reports FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can create reports"
  ON public.generated_reports FOR INSERT
  WITH CHECK (
    practice_id = get_current_user_practice_id()
    AND is_current_user_practice_manager()
  );