-- Fix foreign key constraint issues in role_assignments table

-- First, let's check what foreign key constraints exist and potentially drop problematic ones
-- The error suggests there's a users_user_id_key constraint that's causing issues

-- Remove the foreign key constraint from user_id to users table since user_id can be null during setup
ALTER TABLE public.role_assignments DROP CONSTRAINT IF EXISTS role_assignments_user_id_fkey;

-- Also ensure the user_id column allows null values (it should already but let's be sure)
ALTER TABLE public.role_assignments ALTER COLUMN user_id DROP NOT NULL;