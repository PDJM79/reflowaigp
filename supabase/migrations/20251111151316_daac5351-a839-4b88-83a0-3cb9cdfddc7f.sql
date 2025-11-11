-- Phase 1: Foundation & Infrastructure Migration
-- Onboarding System, Notification Infrastructure, Compliance Mapping

-- ==========================================
-- 1. ONBOARDING SYSTEM
-- ==========================================

-- Add onboarding_stage enum type
DO $$ BEGIN
  CREATE TYPE onboarding_stage AS ENUM ('invited', 'registered', 'configured', 'live');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add onboarding_stage to practices table
ALTER TABLE public.practices
ADD COLUMN IF NOT EXISTS onboarding_stage onboarding_stage DEFAULT 'invited',
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS initial_setup_by uuid REFERENCES public.users(id);

-- Organization setup tracking table
CREATE TABLE IF NOT EXISTS public.organization_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  setup_completed boolean DEFAULT false,
  setup_started_at timestamptz DEFAULT now(),
  setup_completed_at timestamptz,
  templates_seeded boolean DEFAULT false,
  roles_seeded boolean DEFAULT false,
  dashboards_seeded boolean DEFAULT false,
  notifications_seeded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(practice_id)
);

-- Enable RLS on organization_setup
ALTER TABLE public.organization_setup ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_setup
CREATE POLICY "Practice managers can view their org setup"
  ON public.organization_setup FOR SELECT
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

CREATE POLICY "Practice managers can update their org setup"
  ON public.organization_setup FOR UPDATE
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

CREATE POLICY "System can insert org setup"
  ON public.organization_setup FOR INSERT
  WITH CHECK (true);

-- ==========================================
-- 2. NOTIFICATION INFRASTRUCTURE
-- ==========================================

-- Notification type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'claim_reminder',
    'ipc_audit_due',
    'fire_assessment_due',
    'coshh_due',
    'legionella_due',
    'room_assessment_due',
    'dbs_review_due',
    'training_expiry',
    'appraisal_due',
    'complaint_holding_letter',
    'complaint_final_response',
    'medical_request_reminder',
    'medical_request_escalation',
    'fridge_temp_alert',
    'policy_review_due',
    'task_overdue',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification priority enum
DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Scheduled reminders table (tracks what reminders should fire)
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  reminder_type notification_type NOT NULL,
  schedule_pattern text NOT NULL, -- cron pattern or 'on_date'
  next_run_at timestamptz NOT NULL,
  last_run_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on scheduled_reminders
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_reminders
CREATE POLICY "Practice managers can view their reminders"
  ON public.scheduled_reminders FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage their reminders"
  ON public.scheduled_reminders FOR ALL
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

CREATE POLICY "System can manage all reminders"
  ON public.scheduled_reminders FOR ALL
  USING (true);

-- Notification delivery log (tracks actual notifications sent)
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  delivery_method text NOT NULL, -- 'in_app', 'email', 'sms'
  delivered_at timestamptz DEFAULT now(),
  read_at timestamptz,
  failed boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notification_delivery_log
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_delivery_log
CREATE POLICY "Users can view their own delivery logs"
  ON public.notification_delivery_log FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Practice managers can view practice delivery logs"
  ON public.notification_delivery_log FOR SELECT
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

CREATE POLICY "System can insert delivery logs"
  ON public.notification_delivery_log FOR INSERT
  WITH CHECK (true);

-- ==========================================
-- 3. COMPLIANCE MAPPING
-- ==========================================

-- Regulatory framework reference table
CREATE TABLE IF NOT EXISTS public.regulatory_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code text UNIQUE NOT NULL, -- 'HIW', 'CQC', 'QOF'
  framework_name text NOT NULL,
  country text, -- 'Wales', 'England', 'Scotland', 'UK'
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on regulatory_frameworks
ALTER TABLE public.regulatory_frameworks ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulatory_frameworks (read-only for all authenticated users)
CREATE POLICY "Anyone can view regulatory frameworks"
  ON public.regulatory_frameworks FOR SELECT
  USING (true);

-- Regulatory standards reference table (HIW domains, CQC KLOEs, QOF indicators)
CREATE TABLE IF NOT EXISTS public.regulatory_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES public.regulatory_frameworks(id) ON DELETE CASCADE,
  standard_code text NOT NULL, -- 'HIW_SAFE_CARE', 'CQC_S1', 'QOF_001'
  standard_name text NOT NULL,
  description text,
  category text, -- 'Safe Care', 'Effective Care', 'Quality Care', etc.
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(framework_id, standard_code)
);

-- Enable RLS on regulatory_standards
ALTER TABLE public.regulatory_standards ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulatory_standards
CREATE POLICY "Anyone can view regulatory standards"
  ON public.regulatory_standards FOR SELECT
  USING (true);

-- Add compliance mapping fields to process_templates
ALTER TABLE public.process_templates
ADD COLUMN IF NOT EXISTS regulatory_standards uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compliance_metadata jsonb DEFAULT '{}'::jsonb;

-- Add compliance mapping fields to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS regulatory_standards uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compliance_metadata jsonb DEFAULT '{}'::jsonb;

-- Compliance status tracking
CREATE TABLE IF NOT EXISTS public.compliance_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  framework_id uuid NOT NULL REFERENCES public.regulatory_frameworks(id) ON DELETE CASCADE,
  standard_id uuid NOT NULL REFERENCES public.regulatory_standards(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_assessed', -- 'compliant', 'partial', 'non_compliant', 'not_assessed'
  rag_status text, -- 'red', 'amber', 'green'
  score integer, -- 0-100
  last_assessed_at timestamptz,
  assessed_by uuid REFERENCES public.users(id),
  evidence_count integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(practice_id, standard_id)
);

-- Enable RLS on compliance_status
ALTER TABLE public.compliance_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for compliance_status
CREATE POLICY "Users can view compliance status in their practice"
  ON public.compliance_status FOR SELECT
  USING (practice_id = get_current_user_practice_id());

CREATE POLICY "Practice managers can manage compliance status"
  ON public.compliance_status FOR ALL
  USING (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  );

-- ==========================================
-- 4. SEED REGULATORY DATA
-- ==========================================

-- Insert regulatory frameworks
INSERT INTO public.regulatory_frameworks (framework_code, framework_name, country, description) VALUES
  ('HIW', 'Healthcare Inspectorate Wales', 'Wales', 'Healthcare regulatory framework for Wales'),
  ('CQC', 'Care Quality Commission', 'England', 'Healthcare regulatory framework for England'),
  ('QOF', 'Quality and Outcomes Framework', 'UK', 'UK-wide quality incentive scheme for GP practices')
ON CONFLICT (framework_code) DO NOTHING;

-- Insert HIW standards
INSERT INTO public.regulatory_standards (framework_id, standard_code, standard_name, category, description)
SELECT 
  (SELECT id FROM public.regulatory_frameworks WHERE framework_code = 'HIW'),
  code, name, category, description
FROM (VALUES
  ('HIW_SAFE_CARE', 'Safe Care', 'Safe Care', 'People are protected from abuse and harm'),
  ('HIW_EFFECTIVE_CARE', 'Effective Care', 'Effective Care', 'People receive appropriate care and treatment'),
  ('HIW_DIGNIFIED_CARE', 'Dignified Care', 'Dignified Care', 'People are treated with dignity and respect'),
  ('HIW_TIMELY_CARE', 'Timely Care', 'Timely Care', 'People receive timely care'),
  ('HIW_INDIVIDUAL_CARE', 'Individual Care', 'Individual Care', 'People receive care that respects their needs'),
  ('HIW_STAFF_CULTURE', 'Staff & Resources', 'Staff & Resources', 'Sufficient skilled staff and resources'),
  ('HIW_GOVERNANCE', 'Governance & Leadership', 'Governance', 'Good governance and leadership')
) AS hiw_standards(code, name, category, description)
ON CONFLICT (framework_id, standard_code) DO NOTHING;

-- Insert CQC Key Lines of Enquiry (KLOEs)
INSERT INTO public.regulatory_standards (framework_id, standard_code, standard_name, category, description)
SELECT 
  (SELECT id FROM public.regulatory_frameworks WHERE framework_code = 'CQC'),
  code, name, category, description
FROM (VALUES
  ('CQC_S1', 'Safe - S1', 'Safe', 'Systems, processes and practices keep people safe'),
  ('CQC_E1', 'Effective - E1', 'Effective', 'Care and treatment achieve good outcomes'),
  ('CQC_C1', 'Caring - C1', 'Caring', 'Staff involve and treat people with compassion, kindness, dignity and respect'),
  ('CQC_R1', 'Responsive - R1', 'Responsive', 'Services are organized to meet people''s needs'),
  ('CQC_W1', 'Well-led - W1', 'Well-led', 'Leadership, management and governance assure delivery of high-quality care')
) AS cqc_standards(code, name, category, description)
ON CONFLICT (framework_id, standard_code) DO NOTHING;

-- Insert sample QOF indicators
INSERT INTO public.regulatory_standards (framework_id, standard_code, standard_name, category, description)
SELECT 
  (SELECT id FROM public.regulatory_frameworks WHERE framework_code = 'QOF'),
  code, name, category, description
FROM (VALUES
  ('QOF_PC001', 'Practice Management', 'Practice Management', 'Practice management and quality improvement activities'),
  ('QOF_PC002', 'Patient Experience', 'Practice Management', 'Patient experience and satisfaction'),
  ('QOF_PREV001', 'Prevention', 'Prevention', 'Preventative care and health promotion')
) AS qof_standards(code, name, category, description)
ON CONFLICT (framework_id, standard_code) DO NOTHING;

-- ==========================================
-- 5. INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_organization_setup_practice 
  ON public.organization_setup(practice_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_practice 
  ON public.scheduled_reminders(practice_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_next_run 
  ON public.scheduled_reminders(next_run_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_user 
  ON public.notification_delivery_log(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_practice 
  ON public.notification_delivery_log(practice_id);

CREATE INDEX IF NOT EXISTS idx_compliance_status_practice 
  ON public.compliance_status(practice_id);

CREATE INDEX IF NOT EXISTS idx_compliance_status_framework 
  ON public.compliance_status(framework_id);

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

-- Update updated_at timestamp trigger for new tables
CREATE TRIGGER update_organization_setup_updated_at
  BEFORE UPDATE ON public.organization_setup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_reminders_updated_at
  BEFORE UPDATE ON public.scheduled_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_status_updated_at
  BEFORE UPDATE ON public.compliance_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();