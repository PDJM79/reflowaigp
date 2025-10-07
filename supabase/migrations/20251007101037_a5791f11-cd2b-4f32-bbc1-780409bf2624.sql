-- Add SELECT policy for organization_setup so users can check setup status
-- Without this, the useOrganizationSetup hook can't read the setup_completed flag

CREATE POLICY "Users can view their practice setup status"
  ON public.organization_setup FOR SELECT
  TO authenticated
  USING (
    practice_id IN (
      SELECT practice_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );