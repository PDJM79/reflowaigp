-- =============================================================================
-- ReflowAI GP — Phase 1: Logbook schema foundation (UP)
-- =============================================================================
-- Adds the curated-logbook library, practice selections/closures, and the
-- scheduling columns on tasks / process_templates. Purely additive:
--   * existing rows are untouched (all new columns nullable or defaulted)
--   * no task auto-generation (that is Phase 2)
--   * the curated library is imported separately and is enabled for NO practice
-- Idempotent (safe to re-run). Reversible via the paired *.down.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: ENUM TYPES
-- -----------------------------------------------------------------------------

-- Base cadence dimension for curated logbooks. Deliberately a NEW enum rather
-- than an ALTER of process_frequency: Postgres cannot drop enum values, so a
-- separate type keeps this migration reversible.
DO $$ BEGIN
  CREATE TYPE base_cadence AS ENUM (
    'daily','weekly','fortnightly','monthly','termly','quarterly','six_monthly',
    'biennial','annual','triennial','five_yearly','periodic_review','ad_hoc'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Regulatory body / home nation. Distinct from the existing country_code enum
-- (which lacks Northern Ireland and is used for practice.country).
DO $$ BEGIN
  CREATE TYPE regulatory_body AS ENUM (
    'england','wales','scotland','northern_ireland'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Source-of-truth for a task row.
DO $$ BEGIN
  CREATE TYPE task_source_type AS ENUM (
    'adhoc','logbook','cleaning','fridge','system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- SECTION 2: NEW TABLES
-- -----------------------------------------------------------------------------

-- 2a. curated_sections — one row per GP module (module == section).
-- Module-level attributes (legislation, enforcing body, provenance) live here
-- because in the source JSON they are defined once per module, not per logbook.
CREATE TABLE IF NOT EXISTS curated_sections (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text        NOT NULL UNIQUE,          -- e.g. GP-MOD-001
  name                text        NOT NULL UNIQUE,          -- module_name
  slug                text        NOT NULL UNIQUE,          -- e.g. fire-safety
  sort_order          integer     NOT NULL DEFAULT 0,
  responsible_role    text,                                 -- free text (module-level, not the user_role enum)
  primary_legislation jsonb       NOT NULL DEFAULT '{}'::jsonb,
  enforcing_body      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  applicable_to       text[]      NOT NULL DEFAULT '{}',    -- all / branch / dispensing
  applicable_condition text,
  notes               text,
  provenance          jsonb       NOT NULL DEFAULT '{}'::jsonb, -- {source_school_module, comparison_status}
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2b. curated_logbooks — one row per logbook (92). Nation tagging lives inside
-- each step in the steps JSONB (per-step "nations"); there is deliberately NO
-- logbook-level nation column.
CREATE TABLE IF NOT EXISTS curated_logbooks (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id           uuid         NOT NULL REFERENCES curated_sections(id) ON DELETE CASCADE,
  code                 text         NOT NULL UNIQUE,        -- e.g. GP-LB-001-001
  title                text         NOT NULL,
  applicable_to        text[]       NOT NULL DEFAULT '{}',  -- all / branch / dispensing
  applicable_condition text,
  cadence              base_cadence NOT NULL,
  triggers             text[]       NOT NULL DEFAULT '{}',  -- event / on_change / onboarding
  frequency_raw        text,                                -- original JSON frequency string (traceability)
  frequency_detail     text,                                -- free-text advisory detail
  steps                jsonb        NOT NULL DEFAULT '[]'::jsonb, -- each step keeps its own "nations"
  -- Reserved scaffolding columns (absent in source JSON, populated in later phases):
  evidence_required    text,
  advisory_steps       text,
  importance           text,
  regulatory_standards jsonb,
  is_active            boolean      NOT NULL DEFAULT true,
  sort_order           integer      NOT NULL DEFAULT 0,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curated_logbooks_section ON curated_logbooks(section_id);
CREATE INDEX IF NOT EXISTS idx_curated_logbooks_cadence ON curated_logbooks(cadence);

-- 2c. practice_logbook_selections — which curated logbooks a practice has enabled.
-- Empty on ship: nothing is enabled for any practice, so nothing can generate.
CREATE TABLE IF NOT EXISTS practice_logbook_selections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id           uuid        NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  curated_logbook_id    uuid        NOT NULL REFERENCES curated_logbooks(id) ON DELETE CASCADE,
  is_enabled            boolean     NOT NULL DEFAULT true,
  ad_hoc_only           boolean     NOT NULL DEFAULT false,
  cadence_override      base_cadence,
  preferred_day         integer,                            -- 0-6 (weekly/fortnightly)
  preferred_date        integer,                            -- 1-28 (monthly+)
  due_window_hours      integer     NOT NULL DEFAULT 24,
  early_start_hours     integer     NOT NULL DEFAULT 12,
  importance            text,
  default_assignee_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  default_assignee_role user_role,
  requires_review       boolean     NOT NULL DEFAULT false,
  next_review_date      date,                               -- for periodic_review items
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_practice_logbook UNIQUE (practice_id, curated_logbook_id)
);
CREATE INDEX IF NOT EXISTS idx_practice_selections_practice ON practice_logbook_selections(practice_id);

-- 2d. practice_closure_dates — days a practice is closed (skipped by the Phase 2 scheduler).
CREATE TABLE IF NOT EXISTS practice_closure_dates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid        NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  closure_date date        NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_practice_closure UNIQUE (practice_id, closure_date)
);

-- -----------------------------------------------------------------------------
-- SECTION 3: COLUMNS ON EXISTING TABLES (all additive, IF NOT EXISTS)
-- -----------------------------------------------------------------------------

-- 3a. practices — home nation, timezone, practice type.
-- NOTE: the live DB already has a "timezone" column; IF NOT EXISTS makes this safe.
ALTER TABLE practices ADD COLUMN IF NOT EXISTS regulatory_body regulatory_body;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS timezone      text    NOT NULL DEFAULT 'Europe/London';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS is_dispensing boolean NOT NULL DEFAULT false;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS is_branch     boolean NOT NULL DEFAULT false;

-- 3b. tasks — source, curated linkage, scheduling window, review workflow.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_type task_source_type NOT NULL DEFAULT 'adhoc';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS selection_id uuid REFERENCES practice_logbook_selections(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visible_from timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS importance text NOT NULL DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejected_reason text;

-- Status stays free text (as in the Drizzle schema) so the new values
-- submitted_for_review / overdue / rejected / missed work alongside the existing
-- pending / in_progress / complete. If a legacy CHECK constraint is present on
-- the live DB, drop it so the widened value set is accepted (the app already
-- writes values the old CHECK did not permit — this removes that drift).
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 3c. process_templates — opt-in scheduling metadata (is_scheduled defaults false,
-- so existing templates are unaffected until explicitly enabled).
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS preferred_day integer;
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS preferred_date integer;
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS due_window_hours integer NOT NULL DEFAULT 24;
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS early_start_hours integer NOT NULL DEFAULT 12;
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS default_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS default_assignee_role user_role;
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false;
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS importance text NOT NULL DEFAULT 'medium';
ALTER TABLE process_templates ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- SECTION 4: INDEXES on tasks
-- -----------------------------------------------------------------------------

-- Idempotency guards for the Phase 2 scheduler: one curated occurrence per
-- (selection, date); one bespoke logbook occurrence per (template, date).
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_selection_occurrence
  ON tasks (selection_id, scheduled_date)
  WHERE selection_id IS NOT NULL AND scheduled_date IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_template_occurrence
  ON tasks (template_id, scheduled_date)
  WHERE template_id IS NOT NULL AND scheduled_date IS NOT NULL AND source_type = 'logbook';

CREATE INDEX IF NOT EXISTS idx_tasks_practice_status_due ON tasks (practice_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks (assignee_id, status);
