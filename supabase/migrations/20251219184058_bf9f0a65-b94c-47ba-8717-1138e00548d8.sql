-- Fix SECURITY DEFINER view warning by converting team_members to use invoker security
-- The view uses get_user_practice_id(auth.uid()) which correctly applies per-user filtering

-- Drop and recreate view with explicit SECURITY INVOKER (the default, but explicit is better)
DROP VIEW IF EXISTS public.team_members;

CREATE VIEW public.team_members 
WITH (security_invoker = true)
AS
SELECT 
  u.id,
  u.name,
  u.is_active,
  u.practice_id
FROM public.users u
WHERE u.practice_id = public.get_user_practice_id(auth.uid());

-- Re-grant access
GRANT SELECT ON public.team_members TO authenticated;

COMMENT ON VIEW public.team_members IS 'Secure view exposing only non-sensitive user fields (id, name, is_active, practice_id) for colleague listing. Uses SECURITY INVOKER to respect the querying user permissions.';