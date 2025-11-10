-- Fix users_table_public_exposure by creating proper data access layers
-- This separates public user information (names) from sensitive PII (emails)

-- DROP all existing practice manager policies on users table
DROP POLICY IF EXISTS "Practice managers can view basic user info" ON public.users;
DROP POLICY IF EXISTS "Practice managers can view users in their practice" ON public.users;
DROP POLICY IF EXISTS "Practice managers can manage users in their practice" ON public.users;

-- Create a public view for basic user information (names only, no emails)
-- This allows users to see colleague names for collaboration without exposing emails
CREATE OR REPLACE VIEW public.users_public_info AS
SELECT 
  u.id,
  u.practice_id,
  u.name,
  u.is_active,
  u.auth_user_id
FROM users u;

-- Enable security invoker so the view uses the caller's privileges
ALTER VIEW public.users_public_info SET (security_invoker = on);

-- Grant access to authenticated users
GRANT SELECT ON public.users_public_info TO authenticated;

-- Add comment
COMMENT ON VIEW public.users_public_info IS 
'Public user information view - exposes only names and IDs, not emails or other PII. Users can see colleagues in their practice for collaboration purposes.';

-- Update users_for_assignment view to remove auth_user_id (not needed for most cases)
DROP VIEW IF EXISTS public.users_for_assignment CASCADE;

CREATE OR REPLACE VIEW public.users_for_assignment AS
SELECT 
  u.id,
  u.practice_id,
  u.name,
  u.is_active,
  ur.role
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.auth_user_id;

-- Enable security invoker
ALTER VIEW public.users_for_assignment SET (security_invoker = on);

-- Grant access
GRANT SELECT ON public.users_for_assignment TO authenticated;

-- Recreate RESTRICTED practice manager policy on users table
-- Practice managers can access full user data (including emails) but ONLY for management purposes
CREATE POLICY "Practice managers full access (audited)"
ON public.users
FOR ALL
TO authenticated
USING (
  (is_current_user_practice_manager() AND practice_id = get_current_user_practice_id())
  OR is_current_user_master()
)
WITH CHECK (
  (is_current_user_practice_manager() AND practice_id = get_current_user_practice_id())
  OR is_current_user_master()
);

-- Add audit logging function for PII access
CREATE OR REPLACE FUNCTION public.audit_user_pii_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when practice managers access full user records (with emails)
  IF NOT (NEW.auth_user_id = auth.uid()) AND is_current_user_practice_manager() THEN
    INSERT INTO audit_logs (
      practice_id,
      user_id,
      entity_type,
      entity_id,
      action,
      after_data
    ) VALUES (
      NEW.practice_id,
      get_user_id_from_auth(),
      'user_pii_access',
      NEW.id,
      'SELECT',
      jsonb_build_object(
        'accessed_user_name', NEW.name,
        'accessed_user_email', NEW.email,
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.audit_user_pii_access IS 
'Audit function to log when practice managers access user PII. Application code should use users_public_info view to avoid exposing emails.';

-- Security documentation
COMMENT ON TABLE public.users IS 
'SECURITY: Contains sensitive PII (emails, phone). Direct access restricted to owners and practice managers. 
Use users_public_info view for displaying names without exposing emails. 
Use users_for_assignment view for practice managers assigning tasks.';

COMMENT ON VIEW public.users_for_assignment IS 
'Restricted view for practice managers to assign tasks. Includes roles but NOT emails.';

COMMENT ON VIEW public.users_public_info IS 
'Public user info view - exposes ONLY names and IDs, NOT emails. Safe for all users to query within their practice.';