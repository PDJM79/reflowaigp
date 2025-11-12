-- Force types regeneration v6 by modifying core tables
ALTER TABLE practices ADD COLUMN IF NOT EXISTS force_types_refresh_v6 TEXT DEFAULT NULL;
ALTER TABLE practices DROP COLUMN IF EXISTS force_types_refresh_v6;

ALTER TABLE users ADD COLUMN IF NOT EXISTS force_types_refresh_v6 TEXT DEFAULT NULL;
ALTER TABLE users DROP COLUMN IF EXISTS force_types_refresh_v6;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS force_types_refresh_v6 TEXT DEFAULT NULL;
ALTER TABLE employees DROP COLUMN IF EXISTS force_types_refresh_v6;