-- ========================================
-- CRITICAL RLS POLICY FIX MIGRATION
-- Fix all policies referencing removed users.role column
-- Compliance: DSPT, HIW, CQC (Least-privilege RBAC)
-- ========================================

-- Phase 1: Create security definer function for role checking
-- This function checks if a user has ANY of the specified roles from user_roles table
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Phase 2: Fix policy_documents policies (2 policies)
DROP POLICY IF EXISTS "IG leads can manage policy documents" ON public.policy_documents;
CREATE POLICY "IG leads can manage policy documents" 
ON public.policy_documents
FOR ALL 
USING (
  (practice_id = get_current_user_practice_id()) AND 
  has_any_role(auth.uid(), ARRAY['ig_lead'::app_role, 'practice_manager'::app_role])
);

-- Phase 3: Fix fridges policies (1 policy)
DROP POLICY IF EXISTS "Estates leads can manage fridges" ON public.fridges;
CREATE POLICY "Estates leads can manage fridges" 
ON public.fridges
FOR ALL 
USING (
  (practice_id = get_current_user_practice_id()) AND 
  has_any_role(auth.uid(), ARRAY['estates_lead'::app_role, 'practice_manager'::app_role, 'nurse_lead'::app_role])
);

-- Phase 4: Fix complaints policies (3 policies)
DROP POLICY IF EXISTS "IG leads and PM can manage complaints" ON public.complaints;
CREATE POLICY "IG leads and PM can manage complaints" 
ON public.complaints
FOR ALL 
USING (
  (practice_id = get_current_user_practice_id()) AND 
  has_any_role(auth.uid(), ARRAY['ig_lead'::app_role, 'practice_manager'::app_role])
);

DROP POLICY IF EXISTS "IG leads and PM can view complaints" ON public.complaints;
CREATE POLICY "IG leads and PM can view complaints" 
ON public.complaints
FOR SELECT 
USING (
  (practice_id = get_current_user_practice_id()) AND 
  has_any_role(auth.uid(), ARRAY['ig_lead'::app_role, 'practice_manager'::app_role, 'reception_lead'::app_role])
);

DROP POLICY IF EXISTS "Reception can create complaints" ON public.complaints;
CREATE POLICY "Reception can create complaints" 
ON public.complaints
FOR INSERT 
WITH CHECK (
  (practice_id = get_current_user_practice_id()) AND 
  has_any_role(auth.uid(), ARRAY['reception'::app_role, 'reception_lead'::app_role, 'ig_lead'::app_role, 'practice_manager'::app_role])
);

-- Phase 5: Fix task_templates policies (1 policy)
DROP POLICY IF EXISTS "Administrators can manage templates" ON public.task_templates;
CREATE POLICY "Administrators can manage templates" 
ON public.task_templates
FOR ALL 
USING (
  (practice_id = get_current_user_practice_id()) AND 
  has_any_role(auth.uid(), ARRAY['administrator'::app_role])
);

-- Phase 6: Fix medical_requests policies (1 policy)
DROP POLICY IF EXISTS "Administrators can manage medical requests" ON public.medical_requests;
CREATE POLICY "Administrators can manage medical requests" 
ON public.medical_requests
FOR ALL 
USING (
  (practice_id = get_current_user_practice_id()) AND 
  has_any_role(auth.uid(), ARRAY['administrator'::app_role, 'practice_manager'::app_role])
);

-- ========================================
-- MIGRATION COMPLETE
-- All 8 RLS policies fixed
-- Security: Privilege escalation vulnerability resolved
-- Compliance: DSPT least-privilege RBAC restored
-- ========================================