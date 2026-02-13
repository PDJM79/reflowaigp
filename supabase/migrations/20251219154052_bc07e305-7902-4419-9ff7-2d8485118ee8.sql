-- Create has_capability function that checks user capabilities through new role system
-- with fallback to is_practice_manager for backward compatibility
CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _capability capability)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Fallback: is_practice_manager flag grants all capabilities (temporary)
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = _user_id 
      AND is_practice_manager = true
    )
    OR
    -- Master users have all capabilities
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = _user_id 
      AND is_master_user = true
    )
    OR
    -- Check role_catalog default_capabilities
    EXISTS (
      SELECT 1
      FROM user_practice_roles upr
      JOIN users u ON u.id = upr.user_id
      JOIN practice_roles pr ON pr.id = upr.practice_role_id
      JOIN role_catalog rc ON rc.id = pr.role_catalog_id
      WHERE u.auth_user_id = _user_id
        AND pr.is_active = true
        AND _capability = ANY(rc.default_capabilities)
    )
    OR
    -- Check practice_role_capabilities overrides
    EXISTS (
      SELECT 1
      FROM user_practice_roles upr
      JOIN users u ON u.id = upr.user_id
      JOIN practice_roles pr ON pr.id = upr.practice_role_id
      JOIN practice_role_capabilities prc ON prc.practice_role_id = pr.id
      WHERE u.auth_user_id = _user_id
        AND pr.is_active = true
        AND prc.capability = _capability
    )
$$;

-- Convenience function for current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_has_capability(_capability capability)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_capability(auth.uid(), _capability)
$$;

-- Practice-scoped capability check for multi-practice scenarios
CREATE OR REPLACE FUNCTION public.has_capability_for_practice(
  _user_id uuid, 
  _capability capability, 
  _practice_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Fallback: is_practice_manager for the same practice
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = _user_id 
      AND practice_id = _practice_id
      AND is_practice_manager = true
    )
    OR
    -- Master users have all capabilities
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = _user_id 
      AND is_master_user = true
    )
    OR
    -- Role-based capability for specific practice
    EXISTS (
      SELECT 1
      FROM user_practice_roles upr
      JOIN users u ON u.id = upr.user_id
      JOIN practice_roles pr ON pr.id = upr.practice_role_id
      JOIN role_catalog rc ON rc.id = pr.role_catalog_id
      WHERE u.auth_user_id = _user_id
        AND pr.practice_id = _practice_id
        AND pr.is_active = true
        AND _capability = ANY(rc.default_capabilities)
    )
    OR
    -- Override capabilities for specific practice
    EXISTS (
      SELECT 1
      FROM user_practice_roles upr
      JOIN users u ON u.id = upr.user_id
      JOIN practice_roles pr ON pr.id = upr.practice_role_id
      JOIN practice_role_capabilities prc ON prc.practice_role_id = pr.id
      WHERE u.auth_user_id = _user_id
        AND pr.practice_id = _practice_id
        AND pr.is_active = true
        AND prc.capability = _capability
    )
$$;

-- Performance index for capability lookups
CREATE INDEX IF NOT EXISTS idx_user_practice_roles_lookup 
ON user_practice_roles(user_id, practice_id, practice_role_id);

-- Add comments for documentation
COMMENT ON FUNCTION public.has_capability(_user_id uuid, _capability capability) IS 
'Checks if a user has a specific capability through the role system. Falls back to is_practice_manager flag for backward compatibility.';

COMMENT ON FUNCTION public.current_user_has_capability(_capability capability) IS 
'Convenience function to check if the current authenticated user has a capability.';

COMMENT ON FUNCTION public.has_capability_for_practice(_user_id uuid, _capability capability, _practice_id uuid) IS 
'Checks if a user has a specific capability within a specific practice.';