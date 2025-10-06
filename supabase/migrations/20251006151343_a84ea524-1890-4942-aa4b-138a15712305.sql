-- Phase 1: Emergency Security Lockdown (Fixed)
-- Create proper RBAC system to prevent privilege escalation

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM (
  'practice_manager',
  'gp',
  'nurse',
  'administrator',
  'nurse_lead',
  'cd_lead_gp',
  'estates_lead',
  'ig_lead',
  'reception_lead',
  'hca',
  'reception',
  'auditor',
  'group_manager'
);

-- 2. Create user_roles table with proper constraints
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  practice_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  UNIQUE(user_id, role, practice_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create helper function to get user's practice_id from user_roles
CREATE OR REPLACE FUNCTION public.get_user_practice_from_roles(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT practice_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 5. Migrate existing role data ONLY for users that exist in auth.users
INSERT INTO public.user_roles (user_id, role, practice_id, created_at)
SELECT 
  u.auth_user_id,
  u.role::text::app_role,
  u.practice_id,
  u.created_at
FROM public.users u
WHERE u.auth_user_id IS NOT NULL 
  AND u.role IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
ON CONFLICT (user_id, role, practice_id) DO NOTHING;

-- 6. Add practice_manager roles for valid auth users
INSERT INTO public.user_roles (user_id, role, practice_id, created_at)
SELECT 
  u.auth_user_id,
  'practice_manager'::app_role,
  u.practice_id,
  u.created_at
FROM public.users u
WHERE u.auth_user_id IS NOT NULL 
  AND u.is_practice_manager = true
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
ON CONFLICT (user_id, role, practice_id) DO NOTHING;

-- 7. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Practice managers can view roles in their practice"
ON public.user_roles
FOR SELECT
USING (
  practice_id IN (
    SELECT ur.practice_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'practice_manager'
  )
);

CREATE POLICY "Practice managers can assign roles in their practice"
ON public.user_roles
FOR INSERT
WITH CHECK (
  practice_id IN (
    SELECT ur.practice_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'practice_manager'
  )
);

CREATE POLICY "Practice managers can remove roles in their practice"
ON public.user_roles
FOR DELETE
USING (
  practice_id IN (
    SELECT ur.practice_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'practice_manager'
  )
);

-- 8. Update role_assignments table RLS
DROP POLICY IF EXISTS "Allow users to insert role assignments during setup" ON public.role_assignments;

CREATE POLICY "Practice managers can insert role assignments"
ON public.role_assignments
FOR INSERT
WITH CHECK (
  practice_id IN (
    SELECT ur.practice_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'practice_manager'
  )
);

-- 9. Add audit trigger for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (practice_id, user_id, entity_type, entity_id, action, after_data)
    VALUES (NEW.practice_id, auth.uid(), 'user_roles', NEW.id, 'INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (practice_id, user_id, entity_type, entity_id, action, before_data)
    VALUES (OLD.practice_id, auth.uid(), 'user_roles', OLD.id, 'DELETE', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_user_role_changes
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();

-- 10. Add comments
COMMENT ON TABLE public.user_roles IS 'SECURITY: User roles stored separately to prevent privilege escalation. All role checks must use has_role() security definer function.';
COMMENT ON FUNCTION public.has_role IS 'SECURITY: Security definer function that safely checks user roles without triggering RLS recursion.';

-- 11. Update security definer functions
CREATE OR REPLACE FUNCTION public.is_practice_manager(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(user_id, 'practice_manager');
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_practice_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'practice_manager');
$$;