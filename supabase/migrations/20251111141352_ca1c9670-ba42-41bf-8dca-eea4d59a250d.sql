-- =====================================================
-- Phase 2A: Email Isolation for employees, candidates, and role_assignments
-- =====================================================

-- =====================================================
-- 1. EMPLOYEES TABLE EMAIL ISOLATION
-- =====================================================

-- Create employee_contact_details table
CREATE TABLE IF NOT EXISTS public.employee_contact_details (
  employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on employee_contact_details
ALTER TABLE public.employee_contact_details ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only practice managers can access via audited function
CREATE POLICY "Practice managers access via audited function only"
  ON public.employee_contact_details
  FOR SELECT
  USING (false); -- No direct SELECT access

CREATE POLICY "Practice managers can insert employee contact details"
  ON public.employee_contact_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.practice_id = get_current_user_practice_id()
      AND is_current_user_practice_manager()
    )
  );

CREATE POLICY "Practice managers can update employee contact details"
  ON public.employee_contact_details
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.practice_id = get_current_user_practice_id()
      AND is_current_user_practice_manager()
    )
  );

-- Migrate existing email data from employees table
INSERT INTO public.employee_contact_details (employee_id, email)
SELECT id, email
FROM public.employees
WHERE email IS NOT NULL;

-- Drop email column from employees table
ALTER TABLE public.employees DROP COLUMN IF EXISTS email;

-- Create audited function to get employee email
CREATE OR REPLACE FUNCTION public.get_employee_email_audited(_employee_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
  _practice_id UUID;
BEGIN
  -- Only practice managers and master users can call this
  IF NOT (is_current_user_practice_manager() OR is_current_user_master()) THEN
    RAISE EXCEPTION 'Unauthorized: Only practice managers can access employee emails';
  END IF;

  -- Get the email
  SELECT email INTO _email
  FROM public.employee_contact_details
  WHERE employee_id = _employee_id;

  -- Get practice_id for audit log
  SELECT practice_id INTO _practice_id
  FROM public.employees
  WHERE id = _employee_id;

  -- Log the access
  INSERT INTO public.audit_logs (
    practice_id,
    user_id,
    entity_type,
    entity_id,
    action,
    after_data
  ) VALUES (
    _practice_id,
    get_user_id_from_auth(),
    'employee_email_access',
    _employee_id,
    'SELECT',
    jsonb_build_object(
      'accessed_employee_id', _employee_id,
      'timestamp', now()
    )
  );

  RETURN _email;
END;
$$;

-- Add updated_at trigger for employee_contact_details
CREATE TRIGGER update_employee_contact_details_updated_at
  BEFORE UPDATE ON public.employee_contact_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. CANDIDATES TABLE EMAIL ISOLATION
-- =====================================================

-- Create candidate_contact_details table
CREATE TABLE IF NOT EXISTS public.candidate_contact_details (
  candidate_id UUID PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on candidate_contact_details
ALTER TABLE public.candidate_contact_details ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only practice managers can access via audited function
CREATE POLICY "Practice managers access via audited function only"
  ON public.candidate_contact_details
  FOR SELECT
  USING (false); -- No direct SELECT access

CREATE POLICY "Practice managers can insert candidate contact details"
  ON public.candidate_contact_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_id
      AND c.practice_id = get_current_user_practice_id()
      AND is_current_user_practice_manager()
    )
  );

CREATE POLICY "Practice managers can update candidate contact details"
  ON public.candidate_contact_details
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_id
      AND c.practice_id = get_current_user_practice_id()
      AND is_current_user_practice_manager()
    )
  );

-- Migrate existing email data from candidates table
INSERT INTO public.candidate_contact_details (candidate_id, email)
SELECT id, email
FROM public.candidates
WHERE email IS NOT NULL;

-- Drop email column from candidates table
ALTER TABLE public.candidates DROP COLUMN IF EXISTS email;

-- Create audited function to get candidate email
CREATE OR REPLACE FUNCTION public.get_candidate_email_audited(_candidate_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
  _practice_id UUID;
BEGIN
  -- Only practice managers and master users can call this
  IF NOT (is_current_user_practice_manager() OR is_current_user_master()) THEN
    RAISE EXCEPTION 'Unauthorized: Only practice managers can access candidate emails';
  END IF;

  -- Get the email
  SELECT email INTO _email
  FROM public.candidate_contact_details
  WHERE candidate_id = _candidate_id;

  -- Get practice_id for audit log
  SELECT practice_id INTO _practice_id
  FROM public.candidates
  WHERE id = _candidate_id;

  -- Log the access
  INSERT INTO public.audit_logs (
    practice_id,
    user_id,
    entity_type,
    entity_id,
    action,
    after_data
  ) VALUES (
    _practice_id,
    get_user_id_from_auth(),
    'candidate_email_access',
    _candidate_id,
    'SELECT',
    jsonb_build_object(
      'accessed_candidate_id', _candidate_id,
      'timestamp', now()
    )
  );

  RETURN _email;
END;
$$;

-- Add updated_at trigger for candidate_contact_details
CREATE TRIGGER update_candidate_contact_details_updated_at
  BEFORE UPDATE ON public.candidate_contact_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. ROLE_ASSIGNMENTS TABLE EMAIL ISOLATION
-- =====================================================

-- Create role_assignment_contacts table
CREATE TABLE IF NOT EXISTS public.role_assignment_contacts (
  assignment_id UUID PRIMARY KEY REFERENCES public.role_assignments(id) ON DELETE CASCADE,
  assigned_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on role_assignment_contacts
ALTER TABLE public.role_assignment_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only practice managers can access via audited function
CREATE POLICY "Practice managers access via audited function only"
  ON public.role_assignment_contacts
  FOR SELECT
  USING (false); -- No direct SELECT access

CREATE POLICY "Practice managers can insert role assignment contacts"
  ON public.role_assignment_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      WHERE ra.id = assignment_id
      AND ra.practice_id = get_current_user_practice_id()
      AND is_current_user_practice_manager()
    )
  );

CREATE POLICY "Practice managers can update role assignment contacts"
  ON public.role_assignment_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      WHERE ra.id = assignment_id
      AND ra.practice_id = get_current_user_practice_id()
      AND is_current_user_practice_manager()
    )
  );

-- Migrate existing email data from role_assignments table
INSERT INTO public.role_assignment_contacts (assignment_id, assigned_email)
SELECT id, assigned_email
FROM public.role_assignments
WHERE assigned_email IS NOT NULL;

-- Drop assigned_email column from role_assignments table
ALTER TABLE public.role_assignments DROP COLUMN IF EXISTS assigned_email;

-- Create audited function to get role assignment email
CREATE OR REPLACE FUNCTION public.get_role_assignment_email_audited(_assignment_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
  _practice_id UUID;
BEGIN
  -- Only practice managers and master users can call this
  IF NOT (is_current_user_practice_manager() OR is_current_user_master()) THEN
    RAISE EXCEPTION 'Unauthorized: Only practice managers can access role assignment emails';
  END IF;

  -- Get the email
  SELECT assigned_email INTO _email
  FROM public.role_assignment_contacts
  WHERE assignment_id = _assignment_id;

  -- Get practice_id for audit log
  SELECT practice_id INTO _practice_id
  FROM public.role_assignments
  WHERE id = _assignment_id;

  -- Log the access
  INSERT INTO public.audit_logs (
    practice_id,
    user_id,
    entity_type,
    entity_id,
    action,
    after_data
  ) VALUES (
    _practice_id,
    get_user_id_from_auth(),
    'role_assignment_email_access',
    _assignment_id,
    'SELECT',
    jsonb_build_object(
      'accessed_assignment_id', _assignment_id,
      'timestamp', now()
    )
  );

  RETURN _email;
END;
$$;

-- Add updated_at trigger for role_assignment_contacts
CREATE TRIGGER update_role_assignment_contacts_updated_at
  BEFORE UPDATE ON public.role_assignment_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();