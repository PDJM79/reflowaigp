-- Drop existing problematic policies on user_roles
DROP POLICY IF EXISTS "Practice managers can assign roles in their practice" ON public.user_roles;
DROP POLICY IF EXISTS "Practice managers can remove roles in their practice" ON public.user_roles;
DROP POLICY IF EXISTS "Practice managers can view roles in their practice" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create security definer function to check if user is practice manager (without recursion)
CREATE OR REPLACE FUNCTION public.is_user_practice_manager_for_practice(_user_id uuid, _practice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = _user_id
      AND practice_id = _practice_id
      AND is_practice_manager = true
  )
$$;

-- Create new non-recursive policies for user_roles
CREATE POLICY "Practice managers can view roles in their practice"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    is_user_practice_manager_for_practice(auth.uid(), practice_id)
    OR user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Practice managers can assign roles in their practice"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    is_user_practice_manager_for_practice(auth.uid(), practice_id)
  );

CREATE POLICY "Practice managers can remove roles in their practice"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    is_user_practice_manager_for_practice(auth.uid(), practice_id)
  );

-- Grant execute on the new function
GRANT EXECUTE ON FUNCTION public.is_user_practice_manager_for_practice TO authenticated;