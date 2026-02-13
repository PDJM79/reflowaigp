-- Migration: Ensure all is_practice_manager=true users have practice_manager role
-- This is part of the deprecation of the is_practice_manager flag

-- Step 1: Ensure practice_manager role exists in role_catalog (with proper capability[] cast)
INSERT INTO role_catalog (role_key, display_name, category, description, default_capabilities)
SELECT 
  'practice_manager',
  'Practice Manager',
  'admin',
  'Full administrative access to the practice',
  ARRAY['view_policies', 'ack_policies', 'manage_policies', 'approve_policies', 'manage_redactions',
        'manage_cleaning', 'complete_cleaning', 'manage_ipc', 'run_ipc_audit', 'manage_fire', 'run_fire_checks',
        'manage_hs', 'run_risk_assessment', 'manage_rooms', 'run_room_assessment',
        'manage_training', 'view_training', 'upload_certificate', 'manage_appraisals', 'run_appraisal', 'collect_360',
        'report_incident', 'manage_incident', 'log_complaint', 'manage_complaint',
        'record_script', 'manage_claims', 'manage_medical_requests', 'manage_fridges', 'record_fridge_temp',
        'manage_qof', 'run_reports', 'view_dashboards', 'manage_users', 'assign_roles', 'configure_practice', 'configure_notifications']::capability[]
WHERE NOT EXISTS (SELECT 1 FROM role_catalog WHERE role_key = 'practice_manager');

-- Step 2: Create practice_roles entries for each practice that has a practice_manager user
INSERT INTO practice_roles (practice_id, role_catalog_id, is_active)
SELECT DISTINCT 
  u.practice_id,
  rc.id,
  true
FROM users u
CROSS JOIN role_catalog rc
WHERE u.is_practice_manager = true
  AND u.practice_id IS NOT NULL
  AND rc.role_key = 'practice_manager'
  AND NOT EXISTS (
    SELECT 1 FROM practice_roles pr 
    WHERE pr.practice_id = u.practice_id 
    AND pr.role_catalog_id = rc.id
  );

-- Step 3: Assign practice_manager role to all users with is_practice_manager=true
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT 
  u.id,
  u.practice_id,
  pr.id
FROM users u
JOIN role_catalog rc ON rc.role_key = 'practice_manager'
JOIN practice_roles pr ON pr.practice_id = u.practice_id AND pr.role_catalog_id = rc.id
WHERE u.is_practice_manager = true
  AND u.practice_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr 
    WHERE upr.user_id = u.id 
    AND upr.practice_role_id = pr.id
  );

-- Step 4: Add comment to is_practice_manager column indicating deprecation
COMMENT ON COLUMN users.is_practice_manager IS 'DEPRECATED: Use user_practice_roles with practice_manager role instead. This column is kept for backward compatibility and will be removed in a future migration.';