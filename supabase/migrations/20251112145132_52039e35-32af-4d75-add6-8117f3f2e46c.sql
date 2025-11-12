-- FORCE COMPLETE TYPE REGENERATION
-- This migration adds and immediately removes a test column to trigger full schema refresh

-- Add test column
ALTER TABLE practices ADD COLUMN IF NOT EXISTS force_types_refresh_v3 TEXT DEFAULT 'trigger';

-- Verify Phase 1 tables exist (they should from manual execution)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cleaning_tasks') THEN
    RAISE EXCEPTION 'Phase 1 tables missing - manual migration did not execute correctly';
  END IF;
END $$;

-- Remove test column
ALTER TABLE practices DROP COLUMN IF EXISTS force_types_refresh_v3;

-- Final comment
COMMENT ON TABLE practices IS 'v2.0 Phase 1 complete - all tables should be visible in types';