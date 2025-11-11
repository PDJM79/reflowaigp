-- Phase 2B: Safety & HR Module Enhancements
-- Fire/H&S Risk Assessments, DBS Tracking, Training Expiry, Staff Self-Service

-- ============================================================================
-- 1. FIRE & HEALTH & SAFETY RISK ASSESSMENTS
-- ============================================================================

-- Create fire_safety_assessments table
CREATE TABLE IF NOT EXISTS public.fire_safety_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('fire_risk', 'health_safety', 'fire_drill', 'equipment_check')),
  assessment_date DATE NOT NULL,
  assessor_id UUID REFERENCES public.users(id),
  next_assessment_due DATE,
  overall_risk_rating TEXT CHECK (overall_risk_rating IN ('low', 'medium', 'high', 'critical')),
  summary TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on fire_safety_assessments
ALTER TABLE public.fire_safety_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policies for fire_safety_assessments
CREATE POLICY "Users can view fire safety assessments in their practice"
  ON public.fire_safety_assessments FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Estates leads and PMs can manage fire safety assessments"
  ON public.fire_safety_assessments FOR ALL
  USING (
    practice_id = get_current_user_practice_id() AND
    has_any_role(auth.uid(), ARRAY['estates_lead', 'practice_manager']::app_role[])
  );

-- Create fire_safety_actions table (auto-generated from assessments)
CREATE TABLE IF NOT EXISTS public.fire_safety_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.fire_safety_assessments(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL,
  action_description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  timeframe TEXT NOT NULL CHECK (timeframe IN ('immediate', 'one_month', 'three_months', 'six_months', 'twelve_months')),
  assigned_to UUID REFERENCES public.users(id),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on fire_safety_actions
ALTER TABLE public.fire_safety_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for fire_safety_actions
CREATE POLICY "Users can view fire safety actions in their practice"
  ON public.fire_safety_actions FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Estates leads and PMs can manage fire safety actions"
  ON public.fire_safety_actions FOR ALL
  USING (
    practice_id = get_current_user_practice_id() AND
    has_any_role(auth.uid(), ARRAY['estates_lead', 'practice_manager']::app_role[])
  );

CREATE POLICY "Assigned users can update their fire safety actions"
  ON public.fire_safety_actions FOR UPDATE
  USING (assigned_to = get_user_id_from_auth());

-- ============================================================================
-- 2. DBS TRACKING & REMINDERS
-- ============================================================================

-- Create dbs_checks table
CREATE TABLE IF NOT EXISTS public.dbs_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL,
  check_date DATE NOT NULL,
  certificate_number TEXT,
  next_review_due DATE, -- Every 3 years or at 5-year inspection
  evidence_id UUID,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on dbs_checks
ALTER TABLE public.dbs_checks ENABLE ROW LEVEL SECURITY;

-- RLS policies for dbs_checks
CREATE POLICY "Practice managers can manage DBS checks"
  ON public.dbs_checks FOR ALL
  USING (
    practice_id = get_current_user_practice_id() AND
    is_current_user_practice_manager()
  );

CREATE POLICY "Employees can view their own DBS checks"
  ON public.dbs_checks FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = get_user_id_from_auth()
    )
  );

-- ============================================================================
-- 3. TRAINING EXPIRY TRACKING ENHANCEMENTS
-- ============================================================================

-- Add reminder tracking to existing training_records table
ALTER TABLE public.training_records 
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS training_provider TEXT;

-- ============================================================================
-- 4. STAFF SELF-SERVICE PORTAL
-- ============================================================================

-- Create employee_self_service_access view (safe exposure of own data)
CREATE OR REPLACE VIEW public.employee_self_service_data AS
SELECT 
  e.id,
  e.practice_id,
  e.user_id,
  e.name,
  e.role,
  e.start_date,
  e.manager_id,
  -- DBS info (without certificate number for privacy)
  dbs.check_date as dbs_check_date,
  dbs.next_review_due as dbs_next_review,
  -- Training count
  (SELECT COUNT(*) FROM public.training_records tr WHERE tr.employee_id = e.id) as training_count,
  -- Appraisal info
  (SELECT COUNT(*) FROM public.appraisals a WHERE a.employee_id = e.id AND a.status = 'completed') as appraisals_completed,
  (SELECT MAX(scheduled_date) FROM public.appraisals a WHERE a.employee_id = e.id) as last_appraisal_date
FROM public.employees e
LEFT JOIN public.dbs_checks dbs ON dbs.employee_id = e.id
WHERE e.end_date IS NULL; -- Only active employees

-- RLS on self-service view
ALTER VIEW public.employee_self_service_data SET (security_invoker = true);

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fire_assessments_practice ON public.fire_safety_assessments(practice_id, assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_fire_actions_practice ON public.fire_safety_actions(practice_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fire_actions_assigned ON public.fire_safety_actions(assigned_to, completed_at);
CREATE INDEX IF NOT EXISTS idx_dbs_checks_employee ON public.dbs_checks(employee_id, next_review_due);
CREATE INDEX IF NOT EXISTS idx_dbs_checks_practice ON public.dbs_checks(practice_id, next_review_due);
CREATE INDEX IF NOT EXISTS idx_training_expiry ON public.training_records(employee_id, expiry_date);

-- ============================================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_fire_assessments_updated_at
  BEFORE UPDATE ON public.fire_safety_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fire_actions_updated_at
  BEFORE UPDATE ON public.fire_safety_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dbs_checks_updated_at
  BEFORE UPDATE ON public.dbs_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. NOTIFICATION TRIGGERS
-- ============================================================================

-- Trigger to notify estates lead when critical fire safety action is created
CREATE OR REPLACE FUNCTION public.notify_critical_fire_action()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity IN ('high', 'critical') THEN
    INSERT INTO public.notifications (
      practice_id,
      user_id,
      notification_type,
      priority,
      title,
      message,
      action_url
    )
    SELECT 
      NEW.practice_id,
      u.id,
      'fire_safety_action',
      CASE NEW.severity
        WHEN 'critical' THEN 'urgent'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
      END,
      'Critical Fire Safety Action Required',
      'A ' || NEW.severity || ' priority fire safety action has been created: ' || NEW.action_description,
      '/fire-safety'
    FROM public.users u
    INNER JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.practice_id = NEW.practice_id
      AND ur.role IN ('estates_lead', 'practice_manager')
      AND u.is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fire_action_notification
  AFTER INSERT ON public.fire_safety_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_critical_fire_action();

COMMENT ON TABLE public.fire_safety_assessments IS 'Fire and Health & Safety risk assessments with annual reminders';
COMMENT ON TABLE public.fire_safety_actions IS 'Auto-generated actions from fire/H&S assessments with severity-based due dates';
COMMENT ON TABLE public.dbs_checks IS 'DBS (Disclosure and Barring Service) check tracking with 3-year review reminders';
COMMENT ON VIEW public.employee_self_service_data IS 'Safe view for employees to access their own HR data';