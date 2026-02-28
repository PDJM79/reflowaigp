-- =============================================================================
-- FitForAudit GP — Schema Sync Migration
-- Generated: 2026-02-26
-- Purpose  : Bring the live Supabase database up to the Drizzle schema.
--            Safe to run multiple times (fully idempotent).
-- =============================================================================

-- =============================================================================
-- SECTION 1: ENUM TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'practice_manager','nurse_lead','cd_lead_gp','estates_lead','ig_lead',
    'reception_lead','nurse','hca','gp','reception','auditor','cleaner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE process_frequency AS ENUM (
    'daily','twice_daily','weekly','monthly','quarterly','six_monthly','annually'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE process_status AS ENUM (
    'pending','in_progress','complete','blocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE step_status AS ENUM (
    'pending','complete','not_complete'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM (
    'open','in_progress','resolved'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_type AS ENUM (
    'photo','note','signature','document','link'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE country_code AS ENUM (
    'wales','england','scotland'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clean_frequency AS ENUM (
    'daily','twice_daily','weekly','monthly','periodic'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE act_severity AS ENUM (
    'low','medium','high','critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE act_status AS ENUM (
    'pending','in_progress','completed','overdue'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- SECTION 2: NEW TABLES (do not exist in the live DB)
-- =============================================================================

-- 2a. auth_users — Supabase-compatible local auth user cache
CREATE TABLE IF NOT EXISTS auth_users (
  id            varchar(255)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         varchar(255)  UNIQUE,
  first_name    varchar(255),
  last_name     varchar(255),
  profile_image_url text,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

-- 2b. training_catalogue — master list of training courses
CREATE TABLE IF NOT EXISTS training_catalogue (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text          NOT NULL,
  category          text,
  provider          text,
  is_mandatory      boolean       NOT NULL DEFAULT false,
  validity_months   integer       NOT NULL DEFAULT 12,
  applicable_roles  text[],
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

-- 2c. fridge_units — replaces the live "fridges" table alias
--     (the live table is called "fridges"; schema expects "fridge_units")
--     We create fridge_units as a NEW table. The old "fridges" table is left
--     untouched so existing data is not lost.
CREATE TABLE IF NOT EXISTS fridge_units (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid          NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  name        text          NOT NULL,
  location    text,
  min_temp    numeric(4,1)  NOT NULL DEFAULT 2.0,
  max_temp    numeric(4,1)  NOT NULL DEFAULT 8.0,
  is_active   boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- 2d. fridge_readings
CREATE TABLE IF NOT EXISTS fridge_readings (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id     uuid          NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  fridge_id       uuid          NOT NULL REFERENCES fridge_units(id) ON DELETE CASCADE,
  reading_date    timestamptz   NOT NULL,
  temperature     numeric(4,1)  NOT NULL,
  recorded_by     uuid          REFERENCES users(id),
  is_out_of_range boolean       NOT NULL DEFAULT false,
  action_taken    text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- 2e. risk_register (live DB has "risk_assessments" with different columns)
CREATE TABLE IF NOT EXISTS risk_register (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid        NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  category     text,
  likelihood   integer     NOT NULL DEFAULT 3,
  impact       integer     NOT NULL DEFAULT 3,
  risk_score   integer,
  mitigations  text,
  owner_id     uuid        REFERENCES users(id),
  status       text        NOT NULL DEFAULT 'open',
  review_date  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 3: MISSING COLUMNS ON EXISTING TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 3.01  practices
-- Live has: id, name, logo_url, theme, created_at, updated_at, group_id,
--           country, timezone, address, sharepoint_site_id, sharepoint_drive_id,
--           sharepoint_root_path, audit_country, onboarding_stage,
--           onboarding_completed_at, initial_setup_by, is_active
-- Schema wants additionally: (all already present — nothing missing)
-- Note: "country" column exists but may be text; the enum cast is handled
--       by the application layer via Drizzle; no DDL change needed.
-- ---------------------------------------------------------------------------
-- No missing columns for practices.

-- ---------------------------------------------------------------------------
-- 3.02  users
-- Live has: id, practice_id, auth_user_id, name, is_active, created_at,
--           updated_at, is_practice_manager, is_master_user, mfa_enabled,
--           email, password_hash, role, last_login_at
-- Schema wants: all of the above — nothing missing.
-- ---------------------------------------------------------------------------
-- No missing columns for users.

-- ---------------------------------------------------------------------------
-- 3.03  sessions  (no changes needed — sid, sess, expire all present)
-- ---------------------------------------------------------------------------

-- Ensure the expire index exists (idempotent).
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- ---------------------------------------------------------------------------
-- 3.04  employees
-- Live has: id, practice_id, user_id, name, role, start_date, end_date,
--           manager_id, created_at, updated_at
-- Schema wants: all present — nothing missing.
-- ---------------------------------------------------------------------------
-- No missing columns for employees.

-- ---------------------------------------------------------------------------
-- 3.05  process_templates
-- Live has: id, practice_id, name, frequency, responsible_role, steps,
--           remedials, evidence_hint, storage_hints, active, created_at,
--           updated_at, start_date, sla_hours, custom_frequency,
--           regulatory_standards, compliance_metadata
-- Schema wants additionally:
--   module        (text)
--   description   (text)
--   is_active     (boolean) — live has "active" but schema uses "is_active"
-- ---------------------------------------------------------------------------
ALTER TABLE process_templates
  ADD COLUMN IF NOT EXISTS module      text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 3.06  process_instances — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.07  step_instances — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.08  evidence — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.09  evidence_v2
-- Live has: id, practice_id, submission_id, task_id, type, link_url,
--           storage_path, sharepoint_item_id, size_bytes, sha256, mime_type,
--           device_timestamp, server_timestamp, latitude, longitude,
--           location_accuracy, created_by, created_at, tags
-- Schema wants: all present — nothing missing.
-- ---------------------------------------------------------------------------
-- No missing columns for evidence_v2.

-- ---------------------------------------------------------------------------
-- 3.10  issues — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.11  audit_logs
-- Live has: id, practice_id, user_id, entity_type, entity_id, action,
--           before_data, after_data, created_at
-- Schema wants additionally:
--   ip_address   (text)
--   user_agent   (text)
-- ---------------------------------------------------------------------------
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Ensure indexes exist.
CREATE INDEX IF NOT EXISTS idx_audit_logs_practice_created
  ON audit_logs (practice_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs (user_id, created_at);

-- ---------------------------------------------------------------------------
-- 3.12  policy_documents
-- Live has: id, practice_id, title, version, owner_role, source, url,
--           sharepoint_item_id, storage_path, effective_from, review_due,
--           status, created_at, updated_at, file_size, file_mime_type,
--           uploaded_by, last_reviewed_at, last_reviewed_by
-- Schema wants additionally:
--   category          (text)
--   content           (text)
--   owner_id          (uuid → users)
--   next_review_date  (timestamptz)
--   approved_at       (timestamptz)
--   approved_by       (uuid → users)
-- ---------------------------------------------------------------------------
ALTER TABLE policy_documents
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS content          text,
  ADD COLUMN IF NOT EXISTS owner_id         uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS next_review_date timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      uuid REFERENCES users(id);

-- ---------------------------------------------------------------------------
-- 3.13  policy_acknowledgments
-- Live has: id, policy_id, user_id, practice_id, acknowledged_at,
--           version_acknowledged, ip_address, user_agent, created_at
-- Schema wants additionally:
--   reminder_sent_at  (timestamptz)
-- ---------------------------------------------------------------------------
ALTER TABLE policy_acknowledgments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3.14  training_records
-- Live has: id, employee_id, course_name, completion_date, expiry_date,
--           certificate_evidence_id, created_at, reminder_sent_at,
--           is_mandatory, training_provider, training_type_id
-- Schema wants additionally:
--   practice_id   (uuid → practices)
--   course_id     (uuid → training_catalogue)
--   completed_at  (timestamptz)  [live has "completion_date"]
--   evidence_id   (uuid)
--   updated_at    (timestamptz)
-- ---------------------------------------------------------------------------
ALTER TABLE training_records
  ADD COLUMN IF NOT EXISTS practice_id  uuid REFERENCES practices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id    uuid REFERENCES training_catalogue(id),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_id  uuid,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- 3.15  dbs_checks — all columns present, nothing missing.
-- Live has: id, employee_id, practice_id, check_date, certificate_number,
--           next_review_due, evidence_id, reminder_sent_at, created_at,
--           updated_at
-- ---------------------------------------------------------------------------
-- No missing columns for dbs_checks.

-- ---------------------------------------------------------------------------
-- 3.16  incidents
-- Live has: id, practice_id, incident_date, location, description, rag,
--           photos, themes, reported_by, actions, status, created_at,
--           updated_at
-- Schema wants additionally:
--   reported_by_id      (uuid → users)   [live has "reported_by" as text/uuid]
--   category            (text)
--   severity            (text default 'low')
--   date_occurred       (timestamptz)    [live has "incident_date"]
--   persons_involved    (jsonb default '[]')
--   immediate_actions   (text)
--   root_cause          (text)
--   preventive_actions  (text)
--   closed_at           (timestamptz)
--   closed_by_id        (uuid → users)
-- ---------------------------------------------------------------------------
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reported_by_id   uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS severity         text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS date_occurred    timestamptz,
  ADD COLUMN IF NOT EXISTS persons_involved jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS immediate_actions text,
  ADD COLUMN IF NOT EXISTS root_cause       text,
  ADD COLUMN IF NOT EXISTS preventive_actions text,
  ADD COLUMN IF NOT EXISTS closed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by_id     uuid REFERENCES users(id);

-- ---------------------------------------------------------------------------
-- 3.17  complaints
-- Live has: id, practice_id, emis_hash, received_at, channel, description,
--           status, ack_due, ack_sent_at, final_due, final_sent_at,
--           redactions, files, assigned_to, created_at, updated_at,
--           severity, complainant_name, sla_timescale, sla_status,
--           closed_at, category
-- Schema wants: all present — nothing missing.
-- ---------------------------------------------------------------------------
-- No missing columns for complaints.

-- ---------------------------------------------------------------------------
-- 3.18  rooms
-- Live has: id, practice_id, name, schedule_rule, created_at, updated_at,
--           room_type, floor
-- Schema wants additionally:
--   type       (text)   [live has "room_type"; schema uses "type"]
--   is_active  (boolean default true)
-- ---------------------------------------------------------------------------
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS type      text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 3.19  cleaning_zones — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.20  cleaning_tasks — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.21  cleaning_logs — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.22  fridge_units — new table created in Section 2 above.
--        Live table "fridges" is left intact.
--        New column for fridges: is_active (not in live "fridges" table).
-- ---------------------------------------------------------------------------
ALTER TABLE fridges
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 3.23  claim_runs — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.24  claim_items — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.25  fire_risk_assessments_v2 — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.26  fire_actions — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.27  coshh_assessments — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.28  ipc_audits
-- Live has: id, practice_id, period_month, period_year, location_scope,
--           completed_at, retained_until, completed_by, created_at, updated_at
-- Schema wants additionally:
--   audit_date     (timestamptz)
--   auditor_id     (uuid → users)
--   audit_type     (text default 'six_monthly')
--   overall_score  (numeric 5,2)
--   sections       (jsonb default '[]')
--   findings       (jsonb default '[]')
--   status         (text default 'draft')
-- ---------------------------------------------------------------------------
ALTER TABLE ipc_audits
  ADD COLUMN IF NOT EXISTS audit_date    timestamptz,
  ADD COLUMN IF NOT EXISTS auditor_id    uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS audit_type    text NOT NULL DEFAULT 'six_monthly',
  ADD COLUMN IF NOT EXISTS overall_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS sections      jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS findings      jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'draft';

-- ---------------------------------------------------------------------------
-- 3.29  ipc_actions
-- Live has: id, practice_id, audit_id, check_id, description, severity,
--           timeframe, assigned_to, status, due_date, completed_at,
--           created_at, updated_at
-- Schema wants additionally:
--   finding          (text)   [live has "description"]
--   action_required  (text)
--   priority         (text default 'medium')
--   completed_by     (uuid → users)
-- ---------------------------------------------------------------------------
ALTER TABLE ipc_actions
  ADD COLUMN IF NOT EXISTS finding         text,
  ADD COLUMN IF NOT EXISTS action_required text,
  ADD COLUMN IF NOT EXISTS priority        text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS completed_by    uuid REFERENCES users(id);

-- ---------------------------------------------------------------------------
-- 3.30  regulatory_frameworks
-- Live has: id, framework_code, framework_name, country, description,
--           active, created_at
-- Schema wants additionally:
--   code                (text unique)   [live has "framework_code"]
--   name                (text)          [live has "framework_name"]
--   applicable_countries (text[])       [live has "country" as scalar]
--   updated_at          (timestamptz)
-- ---------------------------------------------------------------------------
ALTER TABLE regulatory_frameworks
  ADD COLUMN IF NOT EXISTS code                 text,
  ADD COLUMN IF NOT EXISTS name                 text,
  ADD COLUMN IF NOT EXISTS applicable_countries text[],
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz NOT NULL DEFAULT now();

-- Add unique constraint on code if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'regulatory_frameworks_code_key'
      AND conrelid = 'regulatory_frameworks'::regclass
  ) THEN
    ALTER TABLE regulatory_frameworks
      ADD CONSTRAINT regulatory_frameworks_code_key UNIQUE (code);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3.31  regulatory_standards
-- Live has: id, framework_id, standard_code, standard_name, description,
--           category, active, created_at
-- Schema wants additionally:
--   code        (text)   [live has "standard_code"]
--   title       (text)   [live has "standard_name"]
--   guidance    (text)
--   sort_order  (integer default 0)
--   updated_at  (timestamptz)
-- ---------------------------------------------------------------------------
ALTER TABLE regulatory_standards
  ADD COLUMN IF NOT EXISTS code       text,
  ADD COLUMN IF NOT EXISTS title      text,
  ADD COLUMN IF NOT EXISTS guidance   text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- 3.32  compliance_status — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.33  tasks
-- Live has: id, practice_id, template_id, title, description, module,
--           status, due_at, scheduled_at, assigned_to_user_id,
--           assigned_to_role, priority, requires_photo, created_by,
--           created_at, updated_at, completed_at, completion_time_seconds,
--           returned_reason, returned_by, return_notes,
--           regulatory_standards, compliance_metadata, is_auditable,
--           audit_frameworks, evidence_min_count, fit_for_audit_weight,
--           search_vector
-- Schema wants additionally:
--   assignee_id  (uuid → users)   [live uses "assigned_to_user_id"]
--   metadata     (jsonb default '{}')
-- ---------------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS metadata    jsonb NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 3.34  notifications
-- Live has: id, practice_id, user_id, title, message, notification_type,
--           related_entity_type, related_entity_id, is_read, read_at,
--           priority, action_url, created_at, expires_at, metadata
-- Schema wants: all present — nothing missing.
-- ---------------------------------------------------------------------------
-- No missing columns for notifications.

-- ---------------------------------------------------------------------------
-- 3.35  notification_preferences — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.36  scheduled_reminders — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.37  organization_setup
-- Live has: id, practice_id, setup_completed, created_at, updated_at
-- Schema wants additionally:
--   setup_started_at      (timestamptz)
--   templates_seeded      (boolean default false)
--   roles_seeded          (boolean default false)
--   dashboards_seeded     (boolean default false)
--   notifications_seeded  (boolean default false)
--   setup_completed_at    (timestamptz)
-- ---------------------------------------------------------------------------
ALTER TABLE organization_setup
  ADD COLUMN IF NOT EXISTS setup_started_at     timestamptz,
  ADD COLUMN IF NOT EXISTS templates_seeded     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS roles_seeded         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dashboards_seeded    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_seeded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS setup_completed_at   timestamptz;

-- ---------------------------------------------------------------------------
-- 3.38  email_logs — all columns present, nothing missing.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3.39  role_assignments
-- Live has: id, practice_id, role, assigned_name, user_id, created_at,
--           updated_at
-- Schema wants additionally:
--   assigned_email  (text)
-- ---------------------------------------------------------------------------
ALTER TABLE role_assignments
  ADD COLUMN IF NOT EXISTS assigned_email text;

-- =============================================================================
-- SECTION 4: VERIFY / CREATE REMAINING INDEXES
-- =============================================================================

-- sessions expire index (also created in Section 3.03 above — IF NOT EXISTS
-- makes it safe to repeat).
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- audit_logs indexes (repeated here as a safety net).
CREATE INDEX IF NOT EXISTS idx_audit_logs_practice_created
  ON audit_logs (practice_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs (user_id, created_at);

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
