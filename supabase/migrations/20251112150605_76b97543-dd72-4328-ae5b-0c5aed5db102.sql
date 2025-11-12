-- Force types regeneration v5 - most aggressive approach
-- This migration temporarily modifies multiple tables to force comprehensive schema detection

-- Add and remove temporary columns from practices table
ALTER TABLE practices ADD COLUMN IF NOT EXISTS force_types_v5_practices TEXT;
ALTER TABLE practices DROP COLUMN IF EXISTS force_types_v5_practices;

-- Add and remove temporary columns from users table  
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_types_v5_users BOOLEAN DEFAULT false;
ALTER TABLE users DROP COLUMN IF EXISTS force_types_v5_users;

-- Add and remove temporary columns from tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS force_types_v5_tasks INTEGER DEFAULT 0;
ALTER TABLE tasks DROP COLUMN IF EXISTS force_types_v5_tasks;

-- Add comment to track this regeneration attempt
COMMENT ON TABLE practices IS 'Types regeneration forced v5 - 2025-11-12 - comprehensive';