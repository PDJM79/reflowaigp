-- Drop overly permissive INSERT/UPDATE policies on email_logs
-- These use `true` conditions which are too permissive
-- Service role (used by edge functions) bypasses RLS anyway

DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "System can update email logs" ON public.email_logs;

-- Note: No replacement policies needed because:
-- 1. Edge functions use createServiceClient() which bypasses RLS
-- 2. The SELECT policy remains for users to view their practice's logs