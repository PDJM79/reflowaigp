-- Fix search_path for database functions to prevent schema injection attacks

-- These functions already have search_path set, but let's ensure they're all consistent
-- and add it to any that might be missing it

-- Update search_tasks_secure
ALTER FUNCTION public.search_tasks_secure(text, text, text, text, boolean, integer, integer) 
SET search_path = public;

-- Update get_practice_scores_secure
ALTER FUNCTION public.get_practice_scores_secure(uuid, date, date, timestamp with time zone) 
SET search_path = public;

-- Update get_current_user_practice_id
ALTER FUNCTION public.get_current_user_practice_id() 
SET search_path = public;

-- Update get_user_id_from_auth
ALTER FUNCTION public.get_user_id_from_auth() 
SET search_path = public;

-- Update is_current_user_practice_manager
ALTER FUNCTION public.is_current_user_practice_manager() 
SET search_path = public;

-- Update is_current_user_master
ALTER FUNCTION public.is_current_user_master() 
SET search_path = public;

-- Update has_role
ALTER FUNCTION public.has_role(uuid, app_role) 
SET search_path = public;

-- Update has_any_role
ALTER FUNCTION public.has_any_role(uuid, app_role[]) 
SET search_path = public;

-- Update additional helper functions that may be missing search_path
ALTER FUNCTION public.get_user_practice_id(uuid) 
SET search_path = public;

ALTER FUNCTION public.get_user_practice_from_roles(uuid) 
SET search_path = public;

ALTER FUNCTION public.is_master_user(uuid) 
SET search_path = public;

ALTER FUNCTION public.is_practice_manager(uuid) 
SET search_path = public;

ALTER FUNCTION public.is_group_manager(uuid) 
SET search_path = public;

ALTER FUNCTION public.is_in_same_practice(uuid, uuid) 
SET search_path = public;

ALTER FUNCTION public.is_user_practice_manager_for_practice(uuid, uuid) 
SET search_path = public;

ALTER FUNCTION public.can_access_sensitive_user_field(uuid) 
SET search_path = public;

ALTER FUNCTION public.is_task_compliant(timestamp with time zone, timestamp with time zone, integer) 
SET search_path = public;

ALTER FUNCTION public.calculate_next_due_date(date, process_frequency, integer) 
SET search_path = public;

ALTER FUNCTION public.calculate_working_days(date, date) 
SET search_path = public;

ALTER FUNCTION public.add_working_days(date, integer) 
SET search_path = public;

ALTER FUNCTION public.get_unacknowledged_policies_count(uuid) 
SET search_path = public;

ALTER FUNCTION public.expire_old_notifications() 
SET search_path = public;