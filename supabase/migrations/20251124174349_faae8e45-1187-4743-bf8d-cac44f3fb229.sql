
-- Fix the foreign key constraint on user_roles
-- Drop the incorrect constraint
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Add the correct constraint referencing users.id
ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Now fix orphaned auth users
CREATE OR REPLACE FUNCTION fix_orphaned_auth_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practice_id uuid := '538f42bf-b7f0-493b-992c-0952b80932f3';
  v_user_record record;
  v_new_user_id uuid;
BEGIN
  FOR v_user_record IN 
    SELECT au.id as auth_id, au.email
    FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE auth_user_id = au.id)
  LOOP
    INSERT INTO users (auth_user_id, practice_id, name, is_active, is_practice_manager, is_master_user)
    VALUES (v_user_record.auth_id, v_practice_id, split_part(v_user_record.email, '@', 1), true, true, false)
    RETURNING id INTO v_new_user_id;
    
    INSERT INTO user_roles (user_id, role, practice_id, created_by)
    VALUES (v_new_user_id, 'practice_manager', v_practice_id, v_new_user_id);
    
    INSERT INTO user_contact_details (user_id, email)
    VALUES (v_new_user_id, v_user_record.email);
  END LOOP;
  
  UPDATE practices SET onboarding_stage = 'live' WHERE id = v_practice_id;
END;
$$;

SELECT fix_orphaned_auth_users();
DROP FUNCTION fix_orphaned_auth_users();
