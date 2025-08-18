-- Remove the unique constraint on practice_id + role to allow multiple people per role
ALTER TABLE public.role_assignments DROP CONSTRAINT IF EXISTS role_assignments_practice_id_role_key;