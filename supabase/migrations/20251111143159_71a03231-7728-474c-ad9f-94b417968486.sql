-- Phase 2B Part 3: Make MFA Secrets Write-Only
-- This migration addresses the ERROR-level finding: "Multi-Factor Authentication Secrets Could Be Compromised"
-- 
-- SECURITY ISSUE: The user_auth_sensitive table currently has SELECT policies that allow
-- users to read their own MFA secrets. This violates the principle that MFA secrets should
-- be write-only and never retrievable after initial setup.
--
-- SOLUTION: Drop all SELECT policies on user_auth_sensitive. All MFA status queries must
-- now use the secure get_user_mfa_status() function which only exposes metadata (mfa_enabled,
-- phone_configured) without exposing the actual secret values.

-- Drop all SELECT policies on user_auth_sensitive
DROP POLICY IF EXISTS "Users can view only their own MFA data" ON public.user_auth_sensitive;
DROP POLICY IF EXISTS "Master users can view MFA status (audited)" ON public.user_auth_sensitive;

-- Note: UPDATE policies remain unchanged - users can still update their own MFA settings
-- Note: INSERT policies remain unchanged - users can create their own MFA records
-- Note: Master users retain UPDATE access for administrative purposes

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================
-- After this migration:
-- 1. Direct SELECT queries on user_auth_sensitive will FAIL (no SELECT policies exist)
-- 2. MFA status checks must use: SELECT * FROM get_user_mfa_status()
-- 3. MFA token verification uses server-side function: verify_user_mfa_token()
-- 4. Users can still INSERT/UPDATE their own MFA data (write-only pattern)
-- 5. The mfa_secret field is now truly inaccessible via the API
--
-- Frontend code should already be using get_user_mfa_status() for status checks.
-- If any code tries direct SELECT on user_auth_sensitive, it will now fail with
-- a clear RLS policy violation error, making security issues immediately visible.