-- Wipe all data from the system (preserving table structure)
-- Delete in order to respect foreign key constraints

-- Delete evidence first
DELETE FROM evidence;

-- Delete step instances
DELETE FROM step_instances;

-- Delete issues
DELETE FROM issues;

-- Delete process instances
DELETE FROM process_instances;

-- Delete process templates
DELETE FROM process_templates;

-- Delete audit logs
DELETE FROM audit_logs;

-- Delete role assignments
DELETE FROM role_assignments;

-- Delete organization setup
DELETE FROM organization_setup;

-- Delete users
DELETE FROM users;

-- Delete practices
DELETE FROM practices;