-- Move pg_trgm extension to dedicated schema
-- =====================================================
-- Note: pg_net does not support SET SCHEMA (PostgreSQL limitation)
-- pg_net functions are already isolated in the 'net' schema anyway

-- 1. Create dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Grant usage on extensions schema to all roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 3. Move pg_trgm to extensions schema
-- This moves all pg_trgm functions (similarity, show_trgm, gin_trgm_*, etc.)
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 4. Add extensions schema to default search_path for future sessions
-- This ensures functions like similarity() can be called without schema prefix
ALTER DATABASE postgres SET search_path TO public, extensions;