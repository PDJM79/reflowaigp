-- Phase 1: Role Catalog System
-- Create capability enum for granular permissions

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capability') THEN
    CREATE TYPE public.capability AS ENUM (
      'view_policies', 'ack_policies', 'manage_policies', 'approve_policies', 'manage_redactions',
      'manage_cleaning', 'complete_cleaning', 'manage_ipc', 'run_ipc_audit', 'manage_fire', 'run_fire_checks',
      'manage_hs', 'run_risk_assessment', 'manage_rooms', 'run_room_assessment',
      'manage_training', 'view_training', 'upload_certificate', 'manage_appraisals', 'run_appraisal', 'collect_360',
      'report_incident', 'manage_incident', 'log_complaint', 'manage_complaint',
      'record_script', 'manage_claims', 'manage_medical_requests', 'manage_fridges', 'record_fridge_temp',
      'manage_qof', 'run_reports', 'view_dashboards', 'manage_users', 'assign_roles', 'configure_practice', 'configure_notifications'
    );
  END IF;
END $$;

-- Role catalog: global source of truth for all GP surgery roles
CREATE TABLE IF NOT EXISTS public.role_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('clinical', 'admin', 'governance', 'it', 'support', 'pcn')),
  default_capabilities public.capability[] NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Practice roles: links role_catalog to specific practices
CREATE TABLE IF NOT EXISTS public.practice_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  role_catalog_id uuid NOT NULL REFERENCES public.role_catalog(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (practice_id, role_catalog_id)
);

-- Practice role capabilities: overrides default capabilities per practice-role
CREATE TABLE IF NOT EXISTS public.practice_role_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_role_id uuid NOT NULL REFERENCES public.practice_roles(id) ON DELETE CASCADE,
  capability public.capability NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (practice_role_id, capability)
);

-- User practice roles: links users to practice roles (many-to-many)
CREATE TABLE IF NOT EXISTS public.user_practice_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practice_role_id uuid NOT NULL REFERENCES public.practice_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, practice_role_id)
);

-- Enable RLS on new tables
ALTER TABLE public.practice_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_practice_roles ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user's practice_id
CREATE OR REPLACE FUNCTION public.current_practice_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.practice_id FROM public.users u WHERE u.auth_user_id = auth.uid()
$$;

-- Helper function: Check if current user has a specific capability
CREATE OR REPLACE FUNCTION public.has_capability(cap public.capability, p_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_practice_roles upr
    JOIN public.practice_roles pr ON pr.id = upr.practice_role_id
    JOIN public.role_catalog rc ON rc.id = pr.role_catalog_id
    LEFT JOIN public.practice_role_capabilities prc ON prc.practice_role_id = pr.id AND prc.capability = cap
    WHERE upr.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      AND pr.practice_id = COALESCE(p_id, public.current_practice_id())
      AND pr.is_active = true
      AND (prc.capability IS NOT NULL OR cap = ANY(rc.default_capabilities))
  );
$$;

-- Helper function: Get all capabilities for current user
CREATE OR REPLACE FUNCTION public.get_user_capabilities(p_id uuid DEFAULT NULL)
RETURNS public.capability[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(DISTINCT cap)
  FROM (
    SELECT unnest(rc.default_capabilities) AS cap
    FROM public.user_practice_roles upr
    JOIN public.practice_roles pr ON pr.id = upr.practice_role_id
    JOIN public.role_catalog rc ON rc.id = pr.role_catalog_id
    WHERE upr.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      AND pr.practice_id = COALESCE(p_id, public.current_practice_id())
      AND pr.is_active = true
    UNION
    SELECT prc.capability
    FROM public.user_practice_roles upr
    JOIN public.practice_roles pr ON pr.id = upr.practice_role_id
    JOIN public.practice_role_capabilities prc ON prc.practice_role_id = pr.id
    WHERE upr.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      AND pr.practice_id = COALESCE(p_id, public.current_practice_id())
      AND pr.is_active = true
  ) sub;
$$;

-- RLS Policies for practice_roles
CREATE POLICY pr_select ON public.practice_roles 
  FOR SELECT USING (practice_id = public.current_practice_id());

CREATE POLICY pr_insert ON public.practice_roles 
  FOR INSERT WITH CHECK (practice_id = public.current_practice_id() AND public.has_capability('configure_practice'));

CREATE POLICY pr_update ON public.practice_roles 
  FOR UPDATE USING (practice_id = public.current_practice_id() AND public.has_capability('configure_practice'));

CREATE POLICY pr_delete ON public.practice_roles 
  FOR DELETE USING (practice_id = public.current_practice_id() AND public.has_capability('configure_practice'));

-- RLS Policies for practice_role_capabilities (inherit from practice_roles)
CREATE POLICY prc_select ON public.practice_role_capabilities 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practice_roles pr WHERE pr.id = practice_role_id AND pr.practice_id = public.current_practice_id())
  );

CREATE POLICY prc_insert ON public.practice_role_capabilities 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practice_roles pr WHERE pr.id = practice_role_id AND pr.practice_id = public.current_practice_id())
    AND public.has_capability('configure_practice')
  );

CREATE POLICY prc_delete ON public.practice_role_capabilities 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.practice_roles pr WHERE pr.id = practice_role_id AND pr.practice_id = public.current_practice_id())
    AND public.has_capability('configure_practice')
  );

-- RLS Policies for user_practice_roles
CREATE POLICY upr_select ON public.user_practice_roles 
  FOR SELECT USING (practice_id = public.current_practice_id());

CREATE POLICY upr_insert ON public.user_practice_roles 
  FOR INSERT WITH CHECK (practice_id = public.current_practice_id() AND public.has_capability('assign_roles'));

CREATE POLICY upr_update ON public.user_practice_roles 
  FOR UPDATE USING (practice_id = public.current_practice_id() AND public.has_capability('assign_roles'));

CREATE POLICY upr_delete ON public.user_practice_roles 
  FOR DELETE USING (practice_id = public.current_practice_id() AND public.has_capability('assign_roles'));

-- SEED: Insert 24 standard GP surgery roles
INSERT INTO public.role_catalog (role_key, display_name, category, default_capabilities, description) VALUES
-- Clinical roles
('gp_partner', 'GP Partner / GP Lead', 'clinical', 
  ARRAY['view_policies','ack_policies','view_training','run_reports','view_dashboards','configure_practice','manage_users']::public.capability[], 
  'Clinical leadership, governance, escalation'),

('salaried_gp', 'Salaried GP / GP Retainer', 'clinical', 
  ARRAY['view_policies','ack_policies','view_training','upload_certificate','view_dashboards']::public.capability[], 
  'Routine/urgent consultations, chronic disease management'),

('gp_registrar', 'GP Registrar (Trainee)', 'clinical', 
  ARRAY['view_policies','ack_policies','view_training','upload_certificate']::public.capability[], 
  'Supervised clinics; portfolio tasks'),

('anp_acp', 'ANP / ACP', 'clinical', 
  ARRAY['view_policies','ack_policies','view_training','upload_certificate','record_script','record_fridge_temp']::public.capability[], 
  'Independent clinics within competence'),

('practice_nurse', 'Practice Nurse', 'clinical', 
  ARRAY['view_policies','ack_policies','view_training','upload_certificate','record_script','record_fridge_temp','run_ipc_audit']::public.capability[], 
  'LTC clinics, immunisations, cytology'),

('nursing_associate', 'Nursing Associate / Assistant Practitioner', 'clinical', 
  ARRAY['view_policies','ack_policies','record_script','record_fridge_temp']::public.capability[], 
  'Protocol-led tasks'),

('hca_phleb', 'HCA / Phlebotomist', 'clinical', 
  ARRAY['view_policies','ack_policies','record_script','record_fridge_temp']::public.capability[], 
  'Phlebotomy, vitals, ECGs'),

-- PCN roles
('clinical_pharmacist', 'Clinical Pharmacist / Pharmacy Tech (PCN)', 'pcn', 
  ARRAY['view_policies','ack_policies']::public.capability[], 
  'SMRs, repeat workflow support'),

('fcp', 'First Contact Physiotherapist (PCN)', 'pcn', 
  ARRAY['view_policies','ack_policies']::public.capability[], 
  'MSK first-contact triage'),

('mhp', 'Mental Health Practitioner (PCN)', 'pcn', 
  ARRAY['view_policies','ack_policies']::public.capability[], 
  'MH triage & brief interventions'),

('splw', 'Social Prescribing Link Worker (PCN)', 'pcn', 
  ARRAY['view_policies','ack_policies']::public.capability[], 
  'Non-medical needs & signposting'),

('paramedic', 'Paramedic / Community Paramedic (PCN)', 'pcn', 
  ARRAY['view_policies','ack_policies']::public.capability[], 
  'Urgent assessment & home visits'),

-- Admin roles
('practice_manager', 'Practice Manager', 'admin', 
  ARRAY['view_policies','ack_policies','manage_policies','approve_policies','manage_redactions','manage_cleaning','manage_ipc','manage_fire','manage_hs','manage_rooms','manage_training','manage_appraisals','manage_claims','manage_complaint','manage_incident','manage_medical_requests','manage_fridges','manage_qof','run_reports','view_dashboards','manage_users','assign_roles','configure_practice','configure_notifications']::public.capability[], 
  'Ops, HR, finance, governance'),

('deputy_pm', 'Deputy PM / Operations Manager', 'admin', 
  ARRAY['view_policies','ack_policies','manage_cleaning','manage_ipc','manage_fire','manage_hs','manage_rooms','manage_training','manage_appraisals','manage_claims','manage_complaint','manage_incident','manage_medical_requests','manage_fridges','manage_qof','run_reports','view_dashboards','configure_practice']::public.capability[], 
  'Ops support and projects'),

('receptionist', 'Receptionist / Care Navigator', 'admin', 
  ARRAY['view_policies','ack_policies','log_complaint','report_incident','view_dashboards']::public.capability[], 
  'Front desk & signposting'),

('medical_secretary', 'Medical Secretary', 'admin', 
  ARRAY['view_policies','ack_policies','manage_medical_requests']::public.capability[], 
  'Referrals & correspondence'),

('doc_admin', 'Workflow / Document Admin', 'admin', 
  ARRAY['view_policies','ack_policies','report_incident']::public.capability[], 
  'Scanning/coding/summarising'),

('rx_clerk', 'Prescription Clerk / Medicines Admin', 'admin', 
  ARRAY['view_policies','ack_policies']::public.capability[], 
  'Repeat requests & queries'),

('data_qof_admin', 'Data / QOF Administrator', 'admin', 
  ARRAY['view_policies','ack_policies','manage_qof','run_reports']::public.capability[], 
  'Call/recall, registers, QOF/IIF'),

('patient_services', 'Patient Services / Complaints & Access Lead', 'admin', 
  ARRAY['view_policies','ack_policies','manage_complaint']::public.capability[], 
  'Complaints & access'),

-- Governance roles
('safeguarding_lead', 'Safeguarding Lead', 'governance', 
  ARRAY['view_policies','ack_policies','manage_incident','run_reports']::public.capability[], 
  'Safeguarding oversight'),

('ig_lead', 'Information Governance / Data Protection Lead', 'governance', 
  ARRAY['view_policies','ack_policies','manage_policies','approve_policies','manage_redactions','manage_complaint','run_reports']::public.capability[], 
  'GDPR/DSPT/FOI/SARs'),

-- IT roles
('it_lead', 'IT / Systems Lead', 'it', 
  ARRAY['view_policies','ack_policies','configure_practice','configure_notifications']::public.capability[], 
  'Systems admin/cyber/BCP'),

-- Support roles
('estates_cleaner', 'Estates / Facilities / Cleaner', 'support', 
  ARRAY['complete_cleaning','manage_fridges','run_fire_checks']::public.capability[], 
  'Cleaning to IPC standards; facilities checks')

ON CONFLICT (role_key) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  default_capabilities = EXCLUDED.default_capabilities,
  description = EXCLUDED.description,
  updated_at = now();