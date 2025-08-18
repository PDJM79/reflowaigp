-- Fix missing RLS policies for issues table
CREATE POLICY "Users can insert issues in their practice" ON public.issues
    FOR INSERT WITH CHECK (
        process_instance_id IN (
            SELECT id FROM public.process_instances
            WHERE practice_id IN (
                SELECT practice_id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Practice managers can manage issues" ON public.issues
    FOR ALL USING (
        process_instance_id IN (
            SELECT id FROM public.process_instances
            WHERE practice_id IN (
                SELECT practice_id FROM public.users 
                WHERE auth_user_id = auth.uid() AND role = 'practice_manager'
            )
        )
    );

-- Fix missing RLS policies for audit_logs table
CREATE POLICY "Users can insert audit logs in their practice" ON public.audit_logs
    FOR INSERT WITH CHECK (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Update the handle_new_user function with proper security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- This trigger will be used when we implement auth
  -- For now, users will be created manually
  RETURN NEW;
END;
$$;