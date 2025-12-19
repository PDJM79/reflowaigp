-- Fix security: Set security_invoker on employee_self_service_data view
-- This ensures the view respects RLS policies of underlying tables

ALTER VIEW public.employee_self_service_data SET (security_invoker = true);

-- Also fix employees table policies that allow anonymous access
-- by updating them to require authentication

DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  practice_id = current_practice_id() 
  AND (has_capability('view_training'::capability) OR has_capability('manage_training'::capability))
);

DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
CREATE POLICY "employees_update_policy" ON public.employees
FOR UPDATE TO authenticated
USING (
  practice_id = current_practice_id() 
  AND has_capability('manage_training'::capability)
);

DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;
CREATE POLICY "employees_delete_policy" ON public.employees
FOR DELETE TO authenticated
USING (
  practice_id = current_practice_id() 
  AND has_capability('manage_training'::capability)
);

DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees;
CREATE POLICY "employees_insert_policy" ON public.employees
FOR INSERT TO authenticated
WITH CHECK (
  practice_id = current_practice_id() 
  AND has_capability('manage_training'::capability)
);

DROP POLICY IF EXISTS "Practice managers can manage employees" ON public.employees;
CREATE POLICY "Practice managers can manage employees" ON public.employees
FOR ALL TO authenticated
USING (
  practice_id = get_current_user_practice_id() 
  AND is_current_user_practice_manager()
);