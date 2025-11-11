-- Phase 2D: Fix Critical INSERT Policy Vulnerabilities
-- Addresses ERROR-level findings for audit_trail and practices tables
--
-- SECURITY ISSUES:
-- 1. audit_trail: ANY authenticated user can INSERT (allows audit trail manipulation)
-- 2. practices: Unrestricted INSERT allows privilege escalation attacks
--
-- SOLUTION:
-- 1. Restrict audit_trail inserts to master users only (automated logging uses service role)
-- 2. Restrict practice creation to master users only (setup uses security definer function)

-- ============================================================================
-- 1. FIX AUDIT_TRAIL INSERT POLICY
-- ============================================================================
-- Drop the overly permissive policy that allows any user to insert
DROP POLICY IF EXISTS "System can insert audit trail" ON public.audit_trail;

-- Only master users can manually insert audit logs
-- Automated audit logging from triggers/functions bypasses RLS via service role context
CREATE POLICY "Master users can insert audit logs"
ON public.audit_trail
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_master());

-- ============================================================================
-- 2. FIX PRACTICES INSERT POLICY
-- ============================================================================
-- Drop any existing permissive INSERT policies
DROP POLICY IF EXISTS "Users can create their own practice during setup" ON public.practices;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.practices;

-- Only master users can create practices
-- Organization setup will use a security definer edge function
CREATE POLICY "Only master users can create practices"
ON public.practices
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_master());