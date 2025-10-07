-- Clean up all Test Medical Centre practices and related data
-- Delete in correct order to handle all foreign key constraints

-- First, get the practice IDs we'll be deleting
DO $$
DECLARE
  practice_ids uuid[];
BEGIN
  -- Get all Test Medical Centre practice IDs
  SELECT ARRAY_AGG(id) INTO practice_ids
  FROM public.practices 
  WHERE name = 'Test Medical Centre';

  -- Delete in order to respect foreign key constraints
  -- Start with most dependent tables
  DELETE FROM public.temp_logs WHERE fridge_id IN (
    SELECT id FROM public.fridges WHERE practice_id = ANY(practice_ids)
  );
  
  DELETE FROM public.training_records WHERE employee_id IN (
    SELECT id FROM public.employees WHERE practice_id = ANY(practice_ids)
  );
  
  DELETE FROM public.appraisals WHERE employee_id IN (
    SELECT id FROM public.employees WHERE practice_id = ANY(practice_ids)
  );
  
  DELETE FROM public.leave_requests WHERE employee_id IN (
    SELECT id FROM public.employees WHERE practice_id = ANY(practice_ids)
  );
  
  -- Delete employees before users
  DELETE FROM public.employees WHERE practice_id = ANY(practice_ids);
  
  DELETE FROM public.evidence_v2 WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.form_submissions WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.tasks WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.task_templates WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.incidents WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.complaints WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.medical_requests WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.fridges WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.process_instances WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.score_current WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.score_snapshot WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.practice_targets WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.policy_documents WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.month_end_scripts WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.generated_reports WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.claim_runs WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.audit_logs WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.leave_policies WHERE practice_id = ANY(practice_ids);
  
  -- Delete user-related tables
  DELETE FROM public.user_roles WHERE practice_id = ANY(practice_ids);
  DELETE FROM public.role_assignments WHERE practice_id = ANY(practice_ids);
  
  -- Delete from user_auth_sensitive for users in these practices
  DELETE FROM public.user_auth_sensitive WHERE user_id IN (
    SELECT id FROM public.users WHERE practice_id = ANY(practice_ids)
  );
  
  -- Delete users
  DELETE FROM public.users WHERE practice_id = ANY(practice_ids);
  
  -- Delete organization setup
  DELETE FROM public.organization_setup WHERE practice_id = ANY(practice_ids);
  
  -- Finally delete the practices
  DELETE FROM public.practices WHERE id = ANY(practice_ids);
END $$;