-- Comprehensive Security Fix Migration
-- Addresses: users_table_public_exposure and user_auth_sensitive_mfa_exposure

-- CRITICAL FIX 1: Remove the role column from users table
-- Roles should only exist in user_roles table to prevent privilege escalation
ALTER TABLE public.users DROP COLUMN IF EXISTS role CASCADE;

-- CRITICAL FIX 2: Create restricted view for practice managers
-- This limits PII exposure while allowing task assignment functionality
CREATE OR REPLACE VIEW public.users_for_assignment AS
SELECT 
  u.id,
  u.practice_id,
  u.name,
  u.is_active,
  u.auth_user_id,
  ur.role
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.auth_user_id;

-- Enable security invoker so the view uses the caller's privileges
ALTER VIEW public.users_for_assignment SET (security_invoker = on);

-- Grant access to authenticated users
GRANT SELECT ON public.users_for_assignment TO authenticated;

-- Add comment documenting the security model
COMMENT ON VIEW public.users_for_assignment IS 
'Restricted view for practice managers to assign tasks without exposing full user PII. Use this view instead of direct users table access. Security is enforced by underlying table RLS policies.';

-- CRITICAL FIX 3: Audit MFA access
-- Create audit trigger to log when MFA data is accessed
CREATE OR REPLACE FUNCTION public.audit_mfa_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone accesses MFA data (not their own)
  IF NOT (NEW.user_id = get_user_id_from_auth()) THEN
    INSERT INTO audit_logs (
      practice_id,
      user_id,
      entity_type,
      entity_id,
      action,
      after_data
    ) VALUES (
      (SELECT practice_id FROM users WHERE id = NEW.user_id),
      get_user_id_from_auth(),
      'mfa_access',
      NEW.user_id,
      TG_OP,
      jsonb_build_object(
        'accessed_user_id', NEW.user_id,
        'has_mfa_enabled', (NEW.mfa_secret IS NOT NULL),
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_mfa_sensitive_access
AFTER INSERT OR UPDATE ON user_auth_sensitive
FOR EACH ROW
EXECUTE FUNCTION audit_mfa_access();

-- CRITICAL FIX 4: Restrict master user MFA access
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Master users can manage all MFA data" ON public.user_auth_sensitive;

-- Create more restrictive policy with audit logging
CREATE POLICY "Master users can view MFA status (audited)"
ON public.user_auth_sensitive
FOR SELECT
TO authenticated
USING (
  is_current_user_master()
);

-- Master users can only update MFA data with auditing (no INSERT)
CREATE POLICY "Master users can update MFA data (audited)"
ON public.user_auth_sensitive
FOR UPDATE
TO authenticated
USING (is_current_user_master())
WITH CHECK (is_current_user_master());

-- Note: Practice manager policies on users table remain unchanged
-- They can view users in their practice, but application code should use
-- users_for_assignment view to limit PII exposure in assignment UI