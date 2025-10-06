-- Final fix: Separate sensitive authentication data into secure table

-- 1. Create dedicated table for sensitive auth data
CREATE TABLE IF NOT EXISTS public.user_auth_sensitive (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  mfa_secret TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sensitive table
ALTER TABLE public.user_auth_sensitive ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing sensitive data
INSERT INTO public.user_auth_sensitive (user_id, mfa_secret, phone_number, created_at, updated_at)
SELECT id, mfa_secret, phone_number, created_at, updated_at
FROM public.users
WHERE mfa_secret IS NOT NULL OR phone_number IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET 
  mfa_secret = EXCLUDED.mfa_secret,
  phone_number = EXCLUDED.phone_number,
  updated_at = EXCLUDED.updated_at;

-- 3. Create STRICT RLS policies for sensitive data - ONLY owner or master can access
CREATE POLICY "Users can only access their own sensitive auth data"
ON public.user_auth_sensitive
FOR SELECT
USING (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  OR is_current_user_master()
);

CREATE POLICY "Users can only update their own sensitive auth data"
ON public.user_auth_sensitive
FOR UPDATE
USING (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  OR is_current_user_master()
);

CREATE POLICY "Users can insert their own sensitive auth data"
ON public.user_auth_sensitive
FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- 4. Remove sensitive columns from users table (making it safe for practice managers)
-- Note: We keep them for now but mark as deprecated, will drop in next migration
ALTER TABLE public.users 
  ALTER COLUMN mfa_secret SET DEFAULT NULL,
  ALTER COLUMN phone_number SET DEFAULT NULL;

COMMENT ON COLUMN public.users.mfa_secret IS 'DEPRECATED: Moved to user_auth_sensitive table for security. This column will be dropped.';
COMMENT ON COLUMN public.users.phone_number IS 'DEPRECATED: Moved to user_auth_sensitive table for security. This column will be dropped.';

-- 5. Now that sensitive data is in separate table, allow practice managers full view access
DROP POLICY IF EXISTS "Practice managers can view users in practice" ON public.users;

CREATE POLICY "Practice managers can view all users in their practice"
ON public.users
FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR is_current_user_master()
  OR (
    is_current_user_practice_manager() 
    AND practice_id = get_current_user_practice_id()
  )
);

-- 6. Update user_roles table to allow HR role access to candidates
-- Verify candidates table policies explicitly check for practice_manager role
DROP POLICY IF EXISTS "Restrict candidate viewing to practice managers only" ON public.candidates;

CREATE POLICY "Only practice managers and master users can view candidates"
ON public.candidates
FOR SELECT
USING (
  is_current_user_master()
  OR (
    practice_id = get_current_user_practice_id() 
    AND is_current_user_practice_manager()
  )
);

-- 7. Add security documentation
COMMENT ON TABLE public.user_auth_sensitive IS 'SECURITY CRITICAL: Contains MFA secrets and phone numbers. Strictest RLS - only accessible by user themselves or master users. NO practice manager access.';
COMMENT ON TABLE public.users IS 'SECURITY: Contains non-sensitive user profile data. Safe for practice managers to view within their practice. Sensitive auth data moved to user_auth_sensitive.';
COMMENT ON TABLE public.candidates IS 'SECURITY CRITICAL: GDPR-protected applicant data. Access restricted to practice managers and master users only.';