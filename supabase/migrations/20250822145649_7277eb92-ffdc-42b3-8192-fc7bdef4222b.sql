-- Add master user capabilities to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master_user BOOLEAN DEFAULT FALSE;

-- Create master user account manually
DO $$
DECLARE
    master_auth_id UUID;
    existing_user_id UUID;
BEGIN
    -- Check if master user already exists in auth.users
    SELECT id INTO master_auth_id 
    FROM auth.users 
    WHERE email = 'phil@reflowai.co.uk';
    
    -- If not exists in auth.users, we'll need to create it via the admin API
    -- For now, let's prepare the users table entry assuming it will be created
    
    -- Check if user record exists in public.users
    SELECT id INTO existing_user_id 
    FROM users 
    WHERE email = 'phil@reflowai.co.uk';
    
    -- If no user record exists, we'll create a placeholder that will be updated
    -- when the actual auth user is created
    IF existing_user_id IS NULL THEN
        INSERT INTO users (
            email,
            name,
            role,
            is_master_user,
            is_practice_manager,
            practice_id,
            auth_user_id
        ) VALUES (
            'phil@reflowai.co.uk',
            'Phil Myers - Master Admin',
            'administrator',
            TRUE,
            FALSE,
            -- Use the first practice as default, but master user can access all
            (SELECT id FROM practices LIMIT 1),
            NULL -- Will be updated when auth user is created
        );
    ELSE
        -- Update existing user to be master user
        UPDATE users 
        SET 
            is_master_user = TRUE,
            name = 'Phil Myers - Master Admin'
        WHERE id = existing_user_id;
    END IF;
END $$;

-- Update RLS policies to allow master users to access all data
DROP POLICY IF EXISTS "Master users can access all practices" ON users;
CREATE POLICY "Master users can access all practices" 
ON users 
FOR ALL 
USING (
    -- Allow if user is a master user OR existing policies
    EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND is_master_user = TRUE
    )
    OR auth_user_id = auth.uid()
    OR (practice_id = get_user_practice_id(auth.uid()))
    OR ((practice_id = get_user_practice_id(auth.uid())) AND is_practice_manager(auth.uid()))
);

-- Add master user access to practices table
DROP POLICY IF EXISTS "Master users can view all practices" ON practices;
CREATE POLICY "Master users can view all practices" 
ON practices 
FOR SELECT 
USING (
    -- Existing policy OR master user access
    true OR EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND is_master_user = TRUE
    )
);

DROP POLICY IF EXISTS "Master users can manage all practices" ON practices;
CREATE POLICY "Master users can manage all practices" 
ON practices 
FOR ALL 
USING (
    -- Existing policies OR master user access
    EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND is_master_user = TRUE
    )
    OR id IN (
        SELECT users.practice_id
        FROM users
        WHERE users.auth_user_id = auth.uid() 
        AND users.is_practice_manager = true
    )
);

-- Add master user access to process instances
DROP POLICY IF EXISTS "Master users can access all process instances" ON process_instances;
CREATE POLICY "Master users can access all process instances" 
ON process_instances 
FOR ALL 
USING (
    -- Existing policies OR master user access
    EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND is_master_user = TRUE
    )
    OR practice_id = get_user_practice_id(auth.uid())
    OR ((practice_id = get_user_practice_id(auth.uid())) AND is_practice_manager(auth.uid()))
    OR assignee_id IN (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid())
);

-- Add master user access to process templates
DROP POLICY IF EXISTS "Master users can access all process templates" ON process_templates;
CREATE POLICY "Master users can access all process templates" 
ON process_templates 
FOR ALL 
USING (
    -- Existing policies OR master user access
    EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND is_master_user = TRUE
    )
    OR practice_id = get_user_practice_id(auth.uid())
    OR ((practice_id = get_user_practice_id(auth.uid())) AND is_practice_manager(auth.uid()))
);

-- Create function to check if user is master user
CREATE OR REPLACE FUNCTION public.is_master_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(is_master_user, false) FROM public.users WHERE auth_user_id = user_id;
$function$;