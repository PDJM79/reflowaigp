-- Fix Security Definer View issue
-- Enable SECURITY INVOKER on users_safe view to respect RLS policies

-- PostgreSQL views default to SECURITY DEFINER, which means they use the creator's
-- permissions rather than the querying user's permissions. This can bypass RLS.
-- We need to explicitly enable SECURITY INVOKER mode.

ALTER VIEW public.users_safe SET (security_invoker = on);

-- Add comment explaining the security model
COMMENT ON VIEW public.users_safe IS 'SECURITY: This view uses SECURITY INVOKER mode to respect RLS policies. It excludes mfa_secret and restricts phone_number access to the user themselves or master users.';