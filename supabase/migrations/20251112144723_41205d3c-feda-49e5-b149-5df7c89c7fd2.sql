-- Force full schema type regeneration by altering an existing table
-- Add a temporary column to trigger full type refresh
ALTER TABLE practices ADD COLUMN IF NOT EXISTS temp_regeneration_trigger BOOLEAN DEFAULT false;

-- Remove it immediately to keep schema clean
ALTER TABLE practices DROP COLUMN IF EXISTS temp_regeneration_trigger;

-- Add comment to verify migration ran
COMMENT ON TABLE practices IS 'Updated to force type regeneration - Phase 1 tables should now be visible';