-- =============================================================================
-- ReflowAI GP — Phase 1: Logbook schema foundation (DOWN)
-- =============================================================================
-- Reverses 20260705_phase1_logbook_schema.up.sql. Idempotent (safe to re-run).
--
-- NOTE ON tasks_status_check: the up migration DROPs a legacy status CHECK
-- constraint (if present) to widen the allowed status set. The down migration
-- intentionally does NOT recreate it: the legacy constraint was already
-- inconsistent with values the application writes (e.g. 'complete', 'pending'),
-- so restoring it would reintroduce drift and could reject existing rows. The
-- Drizzle schema models status as free text, which the down state matches.
-- This is the one deliberate, documented asymmetry in the rollback.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 4/1: DROP INDEXES on tasks
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS uq_tasks_selection_occurrence;
DROP INDEX IF EXISTS uq_tasks_template_occurrence;
DROP INDEX IF EXISTS idx_tasks_practice_status_due;
DROP INDEX IF EXISTS idx_tasks_assignee_status;

-- -----------------------------------------------------------------------------
-- SECTION 3c: process_templates columns
-- -----------------------------------------------------------------------------
ALTER TABLE process_templates DROP COLUMN IF EXISTS is_scheduled;
ALTER TABLE process_templates DROP COLUMN IF EXISTS importance;
ALTER TABLE process_templates DROP COLUMN IF EXISTS requires_review;
ALTER TABLE process_templates DROP COLUMN IF EXISTS default_assignee_role;
ALTER TABLE process_templates DROP COLUMN IF EXISTS default_assignee_id;
ALTER TABLE process_templates DROP COLUMN IF EXISTS early_start_hours;
ALTER TABLE process_templates DROP COLUMN IF EXISTS due_window_hours;
ALTER TABLE process_templates DROP COLUMN IF EXISTS preferred_date;
ALTER TABLE process_templates DROP COLUMN IF EXISTS preferred_day;

-- -----------------------------------------------------------------------------
-- SECTION 3b: tasks columns (selection_id FK dropped before its target table)
-- -----------------------------------------------------------------------------
ALTER TABLE tasks DROP COLUMN IF EXISTS rejected_reason;
ALTER TABLE tasks DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE tasks DROP COLUMN IF EXISTS submitted_for_review_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS importance;
ALTER TABLE tasks DROP COLUMN IF EXISTS visible_from;
ALTER TABLE tasks DROP COLUMN IF EXISTS scheduled_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS selection_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS source_type;

-- -----------------------------------------------------------------------------
-- SECTION 3a: practices columns
-- -----------------------------------------------------------------------------
ALTER TABLE practices DROP COLUMN IF EXISTS is_branch;
ALTER TABLE practices DROP COLUMN IF EXISTS is_dispensing;
-- timezone is intentionally NOT dropped: it pre-exists on the live DB independent
-- of this migration. Dropping it would remove a column this migration did not
-- truly create there. On a throwaway DB built without it this leaves a harmless
-- extra column; the reserved-column note in the report covers this.
ALTER TABLE practices DROP COLUMN IF EXISTS regulatory_body;

-- -----------------------------------------------------------------------------
-- SECTION 2: DROP NEW TABLES (children before parents)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS practice_closure_dates;
DROP TABLE IF EXISTS practice_logbook_selections;
DROP TABLE IF EXISTS curated_logbooks;
DROP TABLE IF EXISTS curated_sections;

-- -----------------------------------------------------------------------------
-- SECTION 1: DROP ENUM TYPES (after all columns using them are gone)
-- -----------------------------------------------------------------------------
DROP TYPE IF EXISTS task_source_type;
DROP TYPE IF EXISTS regulatory_body;
DROP TYPE IF EXISTS base_cadence;
