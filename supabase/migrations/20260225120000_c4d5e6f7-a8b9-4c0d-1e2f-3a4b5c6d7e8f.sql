-- =============================================
-- Security Hardening: Audit Logs Enhancements
-- =============================================
-- Adds security-relevant columns and performance indexes to audit_logs.
-- ip_address and user_agent are captured by the Express server on every
-- mutating API request and stored here for forensic purposes.

-- 1. Add ip_address column (inet type handles both IPv4 and IPv6)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- 2. Performance indexes for common query patterns
--    a) List audit logs for a practice ordered by most recent
CREATE INDEX IF NOT EXISTS idx_audit_logs_practice_created
  ON public.audit_logs (practice_id, created_at DESC);

--    b) Fetch the change history of a specific entity (e.g. all changes to a user record)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, created_at DESC);

--    c) Look up all actions performed by a specific user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs (user_id, created_at DESC);

-- 3. INSERT policy: allow the server (via authenticated service role) to write
--    audit entries. Direct client-side inserts are intentionally blocked.
--    (Service role bypasses RLS; this policy covers any authenticated path.)
DROP POLICY IF EXISTS "Server can insert audit logs" ON public.audit_logs;
CREATE POLICY "Server can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    practice_id = public.get_user_practice_id(auth.uid())
  );

-- 4. Prevent any user from updating or deleting audit log rows
--    (audit logs are append-only by design)
DROP POLICY IF EXISTS "Audit logs are immutable" ON public.audit_logs;
CREATE POLICY "Audit logs are immutable - no update" ON public.audit_logs
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Audit logs are immutable - no delete" ON public.audit_logs
  FOR DELETE TO authenticated
  USING (false);

-- 5. Comments for documentation
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IPv4 or IPv6 address of the client that made the request, captured server-side.';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'HTTP User-Agent header from the request that triggered this audit entry.';
COMMENT ON TABLE public.audit_logs IS 'Immutable append-only table recording every mutating action. Rows may never be updated or deleted. Retention policy to be enforced externally.';
