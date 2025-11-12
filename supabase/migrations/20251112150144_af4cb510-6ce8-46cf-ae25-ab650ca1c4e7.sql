-- Force types regeneration v4 - aggressive approach
-- This migration temporarily adds and removes columns to force Lovable's type scanner

-- Add temporary columns to force schema detection
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_types_v4_temp1 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_types_v4_temp2 BOOLEAN DEFAULT false;

-- Immediately remove them
ALTER TABLE users DROP COLUMN IF EXISTS force_types_v4_temp1;
ALTER TABLE users DROP COLUMN IF EXISTS force_types_v4_temp2;

-- Add comment to track this regeneration attempt
COMMENT ON TABLE users IS 'Types regeneration forced v4 - 2025-11-12';