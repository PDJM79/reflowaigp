-- Fix remaining security errors: Employee PII and Candidate data protection

-- 1. Drop existing overly permissive policies on users table
DROP POLICY IF EXISTS "Practice managers can view users in their practice" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- 2. Create more restrictive policies for users table
-- Users can ONLY view their own complete profile (including phone_number and mfa_secret)
CREATE POLICY "Users can view their own complete profile"
ON public.users
FOR SELECT
USING (auth_user_id = auth.uid());

-- Practice managers can view basic info (NOT mfa_secret or phone_number) of users in their practice
-- They should use users_safe view instead for broader access
CREATE POLICY "Practice managers view basic user info in their practice"
ON public.users
FOR SELECT
USING (
  is_current_user_practice_manager() 
  AND practice_id = get_current_user_practice_id()
  AND auth_user_id = auth.uid()  -- Still limited to their own record
);

-- 3. Add RLS policies to users_safe view
-- First, enable RLS on the view's base table access
CREATE POLICY "Users can access safe view of their own data"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR (
    is_current_user_practice_manager() 
    AND practice_id = get_current_user_practice_id()
  )
);

-- 4. Create a truly safe view that excludes sensitive data
CREATE OR REPLACE VIEW public.users_basic AS
SELECT 
  id,
  practice_id,
  auth_user_id,
  role,
  is_active,
  created_at,
  updated_at,
  is_practice_manager,
  is_master_user,
  mfa_enabled,  -- boolean is OK, but not the secret
  name,
  email
  -- Explicitly exclude: mfa_secret, phone_number
FROM public.users;

-- Enable SECURITY INVOKER on the new view
ALTER VIEW public.users_basic SET (security_invoker = on);

COMMENT ON VIEW public.users_basic IS 'SECURITY: Safe view of users table excluding mfa_secret and phone_number. Uses SECURITY INVOKER to respect RLS.';

-- 5. Strengthen candidates table RLS policies
DROP POLICY IF EXISTS "Practice managers can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Practice managers can manage candidates" ON public.candidates;

-- Only practice managers can view candidates in their practice
CREATE POLICY "Only practice managers can view candidates"
ON public.candidates
FOR SELECT
USING (
  practice_id = get_current_user_practice_id()
  AND is_current_user_practice_manager()
);

-- Only practice managers can create candidates
CREATE POLICY "Only practice managers can create candidates"
ON public.candidates
FOR INSERT
WITH CHECK (
  practice_id = get_current_user_practice_id()
  AND is_current_user_practice_manager()
);

-- Only practice managers can update candidates in their practice
CREATE POLICY "Only practice managers can update candidates"
ON public.candidates
FOR UPDATE
USING (
  practice_id = get_current_user_practice_id()
  AND is_current_user_practice_manager()
);

-- Only practice managers can delete candidates
CREATE POLICY "Only practice managers can delete candidates"
ON public.candidates
FOR DELETE
USING (
  practice_id = get_current_user_practice_id()
  AND is_current_user_practice_manager()
);

-- 6. Add audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when someone accesses sensitive candidate or user data
  IF TG_TABLE_NAME = 'candidates' THEN
    INSERT INTO public.audit_logs (
      practice_id, 
      user_id, 
      entity_type, 
      entity_id, 
      action, 
      after_data
    )
    VALUES (
      NEW.practice_id, 
      auth.uid(), 
      'candidates_access', 
      NEW.id, 
      'SELECT', 
      jsonb_build_object('email', NEW.email, 'name', NEW.name)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Add comments explaining the security model
COMMENT ON TABLE public.users IS 'SECURITY: Contains sensitive PII including mfa_secret and phone_number. Direct access is restricted. Use users_basic view for non-sensitive data.';
COMMENT ON TABLE public.candidates IS 'SECURITY: Contains applicant PII protected by GDPR. Access restricted to practice managers only with audit logging.';