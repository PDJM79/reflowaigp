-- ============================================================
-- Onboarding Wizard: onboarding_sessions, compliance_templates,
--                    cleaning_templates, practice_modules
-- Created: 2026-03-04
-- ============================================================
-- ROLLBACK instructions at bottom of file.

-- ── 1. onboarding_sessions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_name        text        NOT NULL,
  registration_number  text,
  regulator            text        NOT NULL DEFAULT 'cqc',  -- 'cqc' | 'hiw'
  address              text,
  postcode             text,
  contact_email        text,
  contact_name         text,
  modules_enabled      jsonb       NOT NULL DEFAULT '[]',
  inspection_data      jsonb,
  rooms_config         jsonb,
  cleaning_config      jsonb,
  ai_recommendations   jsonb,
  current_step         integer     NOT NULL DEFAULT 1,
  completed_at         timestamp,
  created_at           timestamp   NOT NULL DEFAULT now(),
  updated_at           timestamp   NOT NULL DEFAULT now(),
  deleted_at           timestamp   -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_created
  ON public.onboarding_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_registration
  ON public.onboarding_sessions (registration_number)
  WHERE deleted_at IS NULL;

-- ── 2. compliance_templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_templates (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name  text      NOT NULL,
  category     text      NOT NULL,
  title        text      NOT NULL,
  description  text,
  frequency    text      NOT NULL DEFAULT 'annually',
  is_mandatory boolean   NOT NULL DEFAULT true,
  regulator    text,          -- NULL = applies to all regulators
  sort_order   integer   NOT NULL DEFAULT 0,
  created_at   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_templates_module
  ON public.compliance_templates (module_name, sort_order);

-- Seed: Fire Safety
INSERT INTO public.compliance_templates
  (module_name, category, title, description, frequency, is_mandatory, regulator, sort_order)
VALUES
  ('fire_safety', 'fire_safety', 'Fire Risk Assessment',
   'Annual review of fire risks across all areas of the surgery',
   'annually', true, NULL, 1),
  ('fire_safety', 'fire_safety', 'Fire Extinguisher Checks',
   'Monthly visual check of all fire extinguishers and annual service',
   'monthly', true, NULL, 2),
  ('fire_safety', 'fire_safety', 'Fire Alarm Test',
   'Weekly test of fire alarm systems',
   'weekly', true, NULL, 3),
  ('fire_safety', 'fire_safety', 'Emergency Lighting Test',
   'Monthly test of emergency lighting',
   'monthly', true, NULL, 4),
  ('fire_safety', 'fire_safety', 'Fire Evacuation Drill',
   'Six-monthly full evacuation drill with all staff',
   'six_monthly', true, NULL, 5),
  ('fire_safety', 'fire_safety', 'Fire Door Inspection',
   'Monthly check of all fire doors, self-closers, and intumescent strips',
   'monthly', true, NULL, 6),

-- Seed: Legionella / Water Safety
  ('water_safety', 'legionella', 'Legionella Risk Assessment',
   'Annual assessment of water systems for Legionella risk',
   'annually', true, NULL, 1),
  ('water_safety', 'legionella', 'TMV Servicing',
   'Annual service of thermostatic mixing valves',
   'annually', true, NULL, 2),
  ('water_safety', 'legionella', 'Sentinel Outlet Temperature Check',
   'Monthly temperature checks at sentinel outlets (hot ≥50°C, cold ≤20°C)',
   'monthly', true, NULL, 3),
  ('water_safety', 'legionella', 'Showerhead Descale',
   'Quarterly descaling and disinfection of all showerheads',
   'quarterly', true, NULL, 4),
  ('water_safety', 'legionella', 'Cold Water Tank Inspection',
   'Annual inspection and cleaning of cold water storage tanks',
   'annually', true, NULL, 5),

-- Seed: IPC
  ('ipc', 'infection_control', 'IPC Annual Review',
   'Annual review of Infection Prevention and Control policies and procedures',
   'annually', true, NULL, 1),
  ('ipc', 'infection_control', 'Hand Hygiene Audit',
   'Monthly hand hygiene compliance audit for all clinical staff',
   'monthly', true, NULL, 2),
  ('ipc', 'infection_control', 'Environmental Cleaning Audit',
   'Monthly audit of environmental cleaning standards',
   'monthly', true, NULL, 3),
  ('ipc', 'infection_control', 'PPE Stock Check',
   'Weekly check of PPE stocks (gloves, aprons, masks, face shields)',
   'weekly', true, NULL, 4),
  ('ipc', 'infection_control', 'Clinical Waste Audit',
   'Monthly audit of clinical waste segregation and disposal compliance',
   'monthly', true, NULL, 5),

-- Seed: Training
  ('hr_training', 'training', 'Basic Life Support',
   'Annual BLS training for all clinical staff',
   'annually', true, NULL, 1),
  ('hr_training', 'training', 'Fire Safety Awareness',
   'Annual fire safety awareness training for all staff',
   'annually', true, NULL, 2),
  ('hr_training', 'training', 'Information Governance',
   'Annual IG training covering GDPR and patient confidentiality',
   'annually', true, NULL, 3),
  ('hr_training', 'training', 'Safeguarding Adults Level 2',
   'Annual safeguarding adults training for all clinical and administrative staff',
   'annually', true, NULL, 4),
  ('hr_training', 'training', 'Safeguarding Children Level 2',
   'Annual safeguarding children training for all staff',
   'annually', true, NULL, 5),
  ('hr_training', 'training', 'Manual Handling',
   'Triennial manual handling training for all staff',
   'annually', true, NULL, 6),

-- Seed: Policies
  ('policies', 'governance', 'Clinical Governance Policy',
   'Annual review and sign-off of clinical governance policy',
   'annually', true, NULL, 1),
  ('policies', 'governance', 'Complaints Policy',
   'Annual review of patient complaints policy in line with NHS guidance',
   'annually', true, NULL, 2),
  ('policies', 'governance', 'Data Protection Policy',
   'Annual review of GDPR / data protection policy',
   'annually', true, NULL, 3),
  ('policies', 'governance', 'Health & Safety Policy',
   'Annual review of health and safety policy',
   'annually', true, NULL, 4),
  ('policies', 'governance', 'Whistle-blowing Policy',
   'Annual review of whistle-blowing / freedom to speak up policy',
   'annually', true, NULL, 5),

-- Seed: Fridge Management
  ('fridge_temps', 'cold_chain', 'Fridge Temperature Log',
   'Daily morning and afternoon temperature recording for all clinical fridges',
   'daily', true, NULL, 1),
  ('fridge_temps', 'cold_chain', 'Fridge Calibration Check',
   'Annual calibration verification of fridge thermometers',
   'annually', true, NULL, 2),
  ('fridge_temps', 'cold_chain', 'Vaccine Cold Chain Audit',
   'Monthly audit of vaccine storage and cold chain compliance',
   'monthly', true, NULL, 3)

ON CONFLICT DO NOTHING;

-- ── 3. cleaning_templates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cleaning_templates (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type    text      NOT NULL,
  task_name    text      NOT NULL,
  frequency    text      NOT NULL DEFAULT 'daily',
  is_mandatory boolean   NOT NULL DEFAULT true,
  sort_order   integer   NOT NULL DEFAULT 0,
  created_at   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_templates_room
  ON public.cleaning_templates (room_type, sort_order);

-- Seed: Reception
INSERT INTO public.cleaning_templates (room_type, task_name, frequency, is_mandatory, sort_order)
VALUES
  ('reception', 'Wipe down reception desk and counter', 'twice_daily', true, 1),
  ('reception', 'Clean telephone handsets with disinfectant wipe', 'daily', true, 2),
  ('reception', 'Wipe waiting room seats and arms', 'daily', true, 3),
  ('reception', 'Empty general waste bins', 'daily', true, 4),
  ('reception', 'Clean door handles and push plates', 'twice_daily', true, 5),
  ('reception', 'Vacuum / sweep floor', 'daily', true, 6),
  ('reception', 'Clean card reader / payment terminal', 'daily', true, 7),

-- Seed: Consulting Room
  ('consulting_room', 'Wipe examination couch and change paper roll', 'between_patients', true, 1),
  ('consulting_room', 'Wipe desk, keyboard, and mouse with disinfectant', 'daily', true, 2),
  ('consulting_room', 'Disinfect blood pressure cuff and clinical equipment', 'daily', true, 3),
  ('consulting_room', 'Clean sink, taps, and soap dispenser', 'daily', true, 4),
  ('consulting_room', 'Empty clinical waste bin', 'daily', true, 5),
  ('consulting_room', 'Wipe door handles and light switches', 'daily', true, 6),
  ('consulting_room', 'Mop / clean floor', 'daily', true, 7),

-- Seed: Treatment Room
  ('treatment_room', 'Clean treatment couch and change paper roll', 'between_patients', true, 1),
  ('treatment_room', 'Disinfect work surfaces and dressing trolley', 'daily', true, 2),
  ('treatment_room', 'Check and replenish sterile supplies', 'daily', true, 3),
  ('treatment_room', 'Clean autoclave exterior', 'daily', true, 4),
  ('treatment_room', 'Replace sharps bin when 3/4 full', 'as_required', true, 5),
  ('treatment_room', 'Empty clinical waste bin', 'daily', true, 6),
  ('treatment_room', 'Clean sink, taps, and soap dispenser', 'daily', true, 7),
  ('treatment_room', 'Mop / clean floor with disinfectant', 'daily', true, 8),

-- Seed: Staff Room
  ('staff_room', 'Wipe kitchen surfaces and sink', 'daily', true, 1),
  ('staff_room', 'Clean microwave inside and out', 'weekly', true, 2),
  ('staff_room', 'Wipe fridge exterior and handle', 'daily', true, 3),
  ('staff_room', 'Empty general waste and recycling bins', 'daily', true, 4),
  ('staff_room', 'Clean tables and chairs', 'daily', true, 5),
  ('staff_room', 'Wash and dry crockery and utensils', 'daily', true, 6),

-- Seed: Toilets
  ('toilets', 'Clean toilet bowl with disinfectant', 'daily', true, 1),
  ('toilets', 'Wipe toilet seat, lid, and exterior', 'twice_daily', true, 2),
  ('toilets', 'Clean sink and taps', 'twice_daily', true, 3),
  ('toilets', 'Replenish soap, paper towels, and toilet tissue', 'daily', true, 4),
  ('toilets', 'Clean mirror', 'daily', true, 5),
  ('toilets', 'Empty bins', 'daily', true, 6),
  ('toilets', 'Mop floor with disinfectant', 'daily', true, 7),

-- Seed: Corridors
  ('corridors', 'Vacuum / sweep floor', 'daily', true, 1),
  ('corridors', 'Mop hard floors with disinfectant', 'daily', true, 2),
  ('corridors', 'Wipe handrails', 'daily', true, 3),
  ('corridors', 'Clean door handles', 'daily', true, 4),
  ('corridors', 'Check and remove any trip hazards', 'daily', true, 5),
  ('corridors', 'Dust ledges and skirting boards', 'weekly', true, 6)

ON CONFLICT DO NOTHING;

-- ── 4. practice_modules ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.practice_modules (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid      NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  module_name  text      NOT NULL,
  is_enabled   boolean   NOT NULL DEFAULT true,
  config       jsonb,
  created_at   timestamp NOT NULL DEFAULT now(),
  updated_at   timestamp NOT NULL DEFAULT now(),
  UNIQUE (practice_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_practice_modules_practice
  ON public.practice_modules (practice_id);

-- ── ROLLBACK ──────────────────────────────────────────────────
-- To revert this migration, run:
--
--   DROP TABLE IF EXISTS public.practice_modules;
--   DROP TABLE IF EXISTS public.cleaning_templates;
--   DROP TABLE IF EXISTS public.compliance_templates;
--   DROP TABLE IF EXISTS public.onboarding_sessions;
