-- Clear all user data to start fresh
-- This will remove all users, practices, processes, evidence, and related data

-- First delete all dependent data in the correct order to avoid foreign key conflicts

-- Delete evidence files
DELETE FROM public.evidence;

-- Delete step instances
DELETE FROM public.step_instances;

-- Delete process instances  
DELETE FROM public.process_instances;

-- Delete issues
DELETE FROM public.issues;

-- Delete audit logs
DELETE FROM public.audit_logs;

-- Delete process templates
DELETE FROM public.process_templates;

-- Delete role assignments
DELETE FROM public.role_assignments;

-- Delete organization setup records
DELETE FROM public.organization_setup;

-- Delete user records
DELETE FROM public.users;

-- Delete practices
DELETE FROM public.practices;

-- Clear authentication users (this will also trigger cascading deletes)
-- Note: This uses the auth schema which requires service role permissions
DELETE FROM auth.users;