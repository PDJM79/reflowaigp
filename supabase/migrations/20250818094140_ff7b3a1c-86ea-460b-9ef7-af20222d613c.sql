-- Add missing RLS policies for practices table
CREATE POLICY "Practice managers can manage their practice" ON public.practices
    FOR ALL USING (
        id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'practice_manager'
        )
    );

-- Add missing policies for process_instances table  
CREATE POLICY "Practice managers can manage instances" ON public.process_instances
    FOR ALL USING (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'practice_manager'
        )
    );

CREATE POLICY "Users can insert instances for their practice" ON public.process_instances
    FOR INSERT WITH CHECK (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Add missing policies for step_instances table
CREATE POLICY "Users can insert step instances" ON public.step_instances
    FOR INSERT WITH CHECK (
        process_instance_id IN (
            SELECT id FROM public.process_instances
            WHERE practice_id IN (
                SELECT practice_id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Add missing policy for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth_user_id = auth.uid());

-- Update users insertion policy for new user creation
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());