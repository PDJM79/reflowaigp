-- Enable RLS on role_catalog with public read access (it's a global reference table)
ALTER TABLE public.role_catalog ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the role catalog
CREATE POLICY rc_select ON public.role_catalog 
  FOR SELECT TO authenticated USING (true);

-- Only service role can modify catalog (managed by system)
CREATE POLICY rc_modify ON public.role_catalog 
  FOR ALL TO service_role USING (true) WITH CHECK (true);