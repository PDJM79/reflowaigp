-- Reconstructed has_capability() for the current text/array-based capability model.
-- The working version lived only in the now-dead old prod DB; the repo's migrations
-- contained only the old ENUM-based has_capability (incompatible: schema.ts models
-- capabilities as text, not an enum). This reconstruction mirrors capabilities.ts.
--
-- Semantics (grant-by-presence; FAIL CLOSED):
--   TRUE iff the (JWT auth) user is active AND any of:
--     - a role of theirs has _capability in role_catalog.default_capabilities, OR
--     - a practice_role_capabilities override row exists for their role + _capability, OR
--     - they are a practice manager (is_practice_manager backward-compat fallback).
--   NULL/empty inputs, unknown capability, non-member, no roles -> false. Never NULL.
--
-- NOTE: the current practice_role_capabilities has NO is_granted/enabled column, so there
-- is no revoke path (grant-only). If a revoke mechanism is wanted, add is_granted and give
-- an explicit false precedence over the catalog default.
CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL OR _capability IS NULL OR _capability = '' THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_practice_roles upr
      JOIN public.users u          ON u.id = upr.user_id
      JOIN public.practice_roles pr ON pr.id = upr.practice_role_id
      JOIN public.role_catalog rc   ON rc.id = pr.role_catalog_id
      WHERE u.auth_user_id = _user_id
        AND u.is_active
        AND _capability = ANY(rc.default_capabilities)
      UNION ALL
      SELECT 1
      FROM public.user_practice_roles upr
      JOIN public.users u ON u.id = upr.user_id
      JOIN public.practice_role_capabilities prc ON prc.practice_role_id = upr.practice_role_id
      WHERE u.auth_user_id = _user_id
        AND u.is_active
        AND prc.capability = _capability
      UNION ALL
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = _user_id
        AND u.is_active
        AND u.is_practice_manager = true
    )
  END
$$;

REVOKE ALL ON FUNCTION public.has_capability(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated, service_role;
