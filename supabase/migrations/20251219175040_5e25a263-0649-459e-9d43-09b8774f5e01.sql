-- Fix RLS recursion on public.users by ensuring helper functions bypass row security

CREATE OR REPLACE FUNCTION public.current_practice_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
  SELECT u.practice_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
  SELECT COALESCE(u.is_master_user, false)
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_master_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
  SELECT COALESCE(u.is_master_user, false)
  FROM public.users u
  WHERE u.auth_user_id = user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _capability capability)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
  SELECT 
    -- Fallback: is_practice_manager flag grants all capabilities (temporary)
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = _user_id 
      AND is_practice_manager = true
    )
    OR
    -- Master users have all capabilities
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = _user_id 
      AND is_master_user = true
    )
    OR
    -- Check role_catalog default_capabilities
    EXISTS (
      SELECT 1
      FROM public.user_practice_roles upr
      JOIN public.users u ON u.id = upr.user_id
      JOIN public.practice_roles pr ON pr.id = upr.practice_role_id
      JOIN public.role_catalog rc ON rc.id = pr.role_catalog_id
      WHERE u.auth_user_id = _user_id
        AND pr.is_active = true
        AND _capability = ANY(rc.default_capabilities)
    )
    OR
    -- Check practice_role_capabilities overrides
    EXISTS (
      SELECT 1
      FROM public.user_practice_roles upr
      JOIN public.users u ON u.id = upr.user_id
      JOIN public.practice_roles pr ON pr.id = upr.practice_role_id
      JOIN public.practice_role_capabilities prc ON prc.practice_role_id = pr.id
      WHERE u.auth_user_id = _user_id
        AND pr.is_active = true
        AND prc.capability = _capability
    );
$$;

CREATE OR REPLACE FUNCTION public.has_capability(cap capability, p_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_practice_roles upr
    JOIN public.practice_roles pr ON pr.id = upr.practice_role_id
    JOIN public.role_catalog rc ON rc.id = pr.role_catalog_id
    LEFT JOIN public.practice_role_capabilities prc ON prc.practice_role_id = pr.id AND prc.capability = cap
    WHERE upr.user_id = (
        SELECT u.id
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        LIMIT 1
      )
      AND pr.practice_id = COALESCE(p_id, public.current_practice_id())
      AND pr.is_active = true
      AND (prc.capability IS NOT NULL OR cap = ANY(rc.default_capabilities))
  );
$$;
