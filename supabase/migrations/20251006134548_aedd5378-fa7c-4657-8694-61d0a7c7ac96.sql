-- Phase 1: Core Foundation - Database Schema
-- Add Group entity for multi-practice hierarchy
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add group_id to practices and country field
ALTER TABLE public.practices 
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id),
  ADD COLUMN IF NOT EXISTS country TEXT CHECK (country IN ('wales', 'england', 'scotland')),
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_site_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_drive_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_root_path TEXT;

-- Add MFA and group_manager tracking to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Update role enum to include all 13 roles plus group_manager
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'group_manager';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task Templates (scheduling foundation)
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID REFERENCES public.practices(id),
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  json_schema JSONB,
  ui_schema JSONB,
  default_assignee_role user_role,
  requires_photo BOOLEAN DEFAULT false,
  sla_type TEXT CHECK (sla_type IN ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom')),
  due_rule TEXT, -- RRule string
  allowed_roles user_role[],
  evidence_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (enhanced from process_instances)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  template_id UUID REFERENCES public.task_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'submitted', 'returned', 'closed', 'overdue')) DEFAULT 'open',
  due_at TIMESTAMPTZ NOT NULL,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  assigned_to_user_id UUID REFERENCES public.users(id),
  assigned_to_role user_role,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  requires_photo BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completion_time_seconds INTEGER,
  returned_reason TEXT,
  returned_by UUID REFERENCES public.users(id),
  return_notes TEXT
);

-- Form Templates
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  json_schema JSONB NOT NULL,
  ui_schema JSONB,
  version INTEGER DEFAULT 1,
  owner_role user_role,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form Submissions
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.form_templates(id),
  task_id UUID REFERENCES public.tasks(id),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  status TEXT CHECK (status IN ('draft', 'in_review', 'submitted', 'signed_off')) DEFAULT 'draft',
  current_editors UUID[],
  data JSONB,
  submitted_at TIMESTAMPTZ,
  signed_off_by UUID REFERENCES public.users(id),
  signed_off_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced Evidence manifest
CREATE TABLE IF NOT EXISTS public.evidence_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  submission_id UUID REFERENCES public.form_submissions(id),
  task_id UUID REFERENCES public.tasks(id),
  type TEXT CHECK (type IN ('file', 'photo', 'note', 'link')) NOT NULL,
  link_url TEXT,
  storage_path TEXT, -- Supabase Storage path
  sharepoint_item_id TEXT,
  size_bytes BIGINT,
  sha256 TEXT,
  mime_type TEXT,
  device_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ DEFAULT now(),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location_accuracy NUMERIC,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  tags TEXT[]
);

-- Month-End Scripts (EMIS hash handling)
CREATE TABLE IF NOT EXISTS public.month_end_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  month DATE NOT NULL, -- First day of month
  issue_date DATE NOT NULL,
  emis_hash TEXT NOT NULL, -- Salted hash, NOT raw EMIS ID
  drug_code TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  prescriber TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(practice_id, month, emis_hash, drug_code, issue_date)
);

-- Encrypted Payloads (zero-knowledge storage)
CREATE TABLE IF NOT EXISTS public.encrypted_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  module TEXT NOT NULL,
  period_key TEXT NOT NULL, -- e.g., "2025-01" for month-end
  ciphertext TEXT NOT NULL, -- Client-encrypted EMIS ID or sensitive data
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced Service Claims
CREATE TABLE IF NOT EXISTS public.claim_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'in_review', 'submitted', 'approved')) DEFAULT 'draft',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.claim_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_run_id UUID NOT NULL REFERENCES public.claim_runs(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_value NUMERIC(10, 2),
  total_value NUMERIC(10, 2),
  evidence_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Infection Control Audit
CREATE TABLE IF NOT EXISTS public.ic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ic_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.ic_sections(id),
  question_id TEXT NOT NULL,
  answer TEXT,
  comment TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cleaning Schedules
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  name TEXT NOT NULL,
  schedule_rule TEXT, -- RRule
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cleaning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  log_date DATE NOT NULL,
  completed_by UUID REFERENCES public.users(id),
  completed_at TIMESTAMPTZ,
  issues JSONB, -- Array of {item, status, note, photo_id}
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Incidents
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  incident_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  rag TEXT CHECK (rag IN ('red', 'amber', 'green')) NOT NULL,
  photos UUID[], -- References to evidence_v2
  themes TEXT[],
  reported_by UUID NOT NULL REFERENCES public.users(id),
  actions JSONB, -- Array of follow-up actions
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HR: Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  user_id UUID REFERENCES public.users(id), -- Link to app user if they have login
  name TEXT NOT NULL,
  email TEXT,
  role user_role,
  start_date DATE,
  end_date DATE,
  manager_id UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HR: Training Records
CREATE TABLE IF NOT EXISTS public.training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  completion_date DATE NOT NULL,
  expiry_date DATE,
  certificate_evidence_id UUID REFERENCES public.evidence_v2(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HR: Appraisals
CREATE TABLE IF NOT EXISTS public.appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- e.g., "2025"
  reviewer_id UUID NOT NULL REFERENCES public.employees(id),
  form_submission_id UUID REFERENCES public.form_submissions(id),
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'signed')) DEFAULT 'scheduled',
  scheduled_date DATE,
  completed_date DATE,
  employee_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HR: Candidates (with auto-delete)
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  name TEXT NOT NULL,
  email TEXT,
  cv_evidence_id UUID REFERENCES public.evidence_v2(id),
  applied_for TEXT,
  status TEXT CHECK (status IN ('applied', 'screening', 'interviewing', 'offered', 'rejected', 'withdrawn')) DEFAULT 'applied',
  last_contact_at TIMESTAMPTZ DEFAULT now(),
  retention_delete_at TIMESTAMPTZ, -- Auto-delete after 12 months
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leave Management
CREATE TABLE IF NOT EXISTS public.leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  name TEXT NOT NULL,
  annual_days NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  approver_id UUID REFERENCES public.employees(id),
  approved_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Complaints (PTR SLAs)
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  emis_hash TEXT, -- Salted hash, NOT raw EMIS ID
  received_at TIMESTAMPTZ NOT NULL,
  channel TEXT CHECK (channel IN ('email', 'phone', 'letter', 'in_person')),
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('new', 'acknowledged', 'investigating', 'final_sent', 'closed')) DEFAULT 'new',
  ack_due TIMESTAMPTZ NOT NULL, -- +2 working days
  ack_sent_at TIMESTAMPTZ,
  final_due TIMESTAMPTZ NOT NULL, -- +30 working days
  final_sent_at TIMESTAMPTZ,
  redactions JSONB, -- Array of redaction notes
  files UUID[], -- References to evidence_v2
  assigned_to UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insurance & Medicals
CREATE TABLE IF NOT EXISTS public.medical_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  request_type TEXT CHECK (request_type IN ('insurance', 'mortgage', 'shotgun', 'life')) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  emis_hash TEXT, -- Salted hash
  assigned_gp_id UUID REFERENCES public.employees(id),
  sent_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('received', 'assigned', 'in_progress', 'sent', 'completed')) DEFAULT 'received',
  notes TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Policies Library
CREATE TABLE IF NOT EXISTS public.policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  title TEXT NOT NULL,
  version TEXT,
  owner_role user_role,
  source TEXT CHECK (source IN ('sharepoint', 'upload')) DEFAULT 'sharepoint',
  url TEXT,
  sharepoint_item_id TEXT,
  storage_path TEXT, -- Supabase Storage fallback
  effective_from DATE,
  review_due DATE,
  status TEXT CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fridge Temperature Monitoring
CREATE TABLE IF NOT EXISTS public.fridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  name TEXT NOT NULL,
  location TEXT,
  min_temp NUMERIC NOT NULL,
  max_temp NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.temp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fridge_id UUID NOT NULL REFERENCES public.fridges(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  log_time TIME NOT NULL,
  reading NUMERIC NOT NULL,
  recorded_by UUID NOT NULL REFERENCES public.users(id),
  remedial_action TEXT,
  outcome TEXT,
  breach_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Trail (immutable)
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id),
  practice_id UUID REFERENCES public.practices(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  at TIMESTAMPTZ DEFAULT now(),
  before_hash TEXT,
  after_hash TEXT,
  metadata JSONB
);

-- Reports
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id),
  report_type TEXT NOT NULL,
  params JSONB,
  generated_at TIMESTAMPTZ DEFAULT now(),
  storage_path TEXT,
  sharepoint_item_id TEXT,
  file_hash TEXT
);

-- Enable RLS on all new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.month_end_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ic_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practices_group ON public.practices(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_practice ON public.tasks(practice_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON public.tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_evidence_practice ON public.evidence_v2(practice_id);
CREATE INDEX IF NOT EXISTS idx_evidence_task ON public.evidence_v2(task_id);
CREATE INDEX IF NOT EXISTS idx_month_end_practice_month ON public.month_end_scripts(practice_id, month);
CREATE INDEX IF NOT EXISTS idx_complaints_practice ON public.complaints(practice_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_employees_practice ON public.employees(practice_id);

-- Add updated_at triggers
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();