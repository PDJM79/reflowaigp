-- Remove unique constraint on email from role_assignments table to allow same person to have multiple roles
ALTER TABLE public.role_assignments DROP CONSTRAINT IF EXISTS role_assignments_assigned_email_key;

-- Remove unique constraint on name from role_assignments table to allow same person to have multiple roles  
ALTER TABLE public.role_assignments DROP CONSTRAINT IF EXISTS role_assignments_assigned_name_key;

-- Keep the unique constraint on practice_id + role to ensure each role is only assigned once per practice
ALTER TABLE public.role_assignments DROP CONSTRAINT IF EXISTS role_assignments_practice_id_role_key;
ALTER TABLE public.role_assignments ADD CONSTRAINT role_assignments_practice_id_role_key UNIQUE (practice_id, role);