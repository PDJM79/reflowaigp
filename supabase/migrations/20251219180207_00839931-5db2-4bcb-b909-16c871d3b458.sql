-- Fix security: Remove public access policy from role_catalog
-- The rc_select policy already restricts to authenticated users, 
-- but role_catalog_select_policy allows anonymous access

DROP POLICY IF EXISTS "role_catalog_select_policy" ON public.role_catalog;

-- Verify rc_select remains (authenticated only)
-- If it doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.role_catalog'::regclass 
    AND polname = 'rc_select'
  ) THEN
    CREATE POLICY "rc_select" ON public.role_catalog
    FOR SELECT TO authenticated
    USING (true);
  END IF;
END $$;