-- Enable RLS for all tables
-- Create enums for better type safety
CREATE TYPE public.user_role AS ENUM ('practice_manager', 'nurse_lead', 'cd_lead_gp', 'estates_lead', 'ig_lead', 'reception_lead', 'nurse', 'hca', 'gp', 'reception', 'auditor');
CREATE TYPE public.process_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'six_monthly', 'annual');
CREATE TYPE public.process_status AS ENUM ('pending', 'in_progress', 'complete', 'blocked');
CREATE TYPE public.step_status AS ENUM ('pending', 'complete', 'not_complete');
CREATE TYPE public.issue_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE public.evidence_type AS ENUM ('photo', 'note', 'signature');

-- Practices table (multi-tenant)
CREATE TABLE public.practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    theme JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Users table with practice association
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID REFERENCES public.practices(id) ON DELETE CASCADE NOT NULL,
    auth_user_id UUID UNIQUE, -- Reference to auth.users
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role public.user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(practice_id, email)
);

-- Process Templates
CREATE TABLE public.process_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID REFERENCES public.practices(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    frequency public.process_frequency NOT NULL,
    responsible_role public.user_role NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]', -- Array of step objects
    remedials JSONB NOT NULL DEFAULT '{}', -- Remedial actions per step
    evidence_hint TEXT,
    storage_hints JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Process Instances (actual work items)
CREATE TABLE public.process_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.process_templates(id) ON DELETE CASCADE NOT NULL,
    practice_id UUID REFERENCES public.practices(id) ON DELETE CASCADE NOT NULL,
    assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status public.process_status DEFAULT 'pending',
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step Instances (individual steps within a process)
CREATE TABLE public.step_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_instance_id UUID REFERENCES public.process_instances(id) ON DELETE CASCADE NOT NULL,
    step_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    status public.step_status DEFAULT 'pending',
    notes TEXT,
    device_timestamp TIMESTAMP WITH TIME ZONE,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    three_words TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(process_instance_id, step_index)
);

-- Evidence (photos, notes, signatures)
CREATE TABLE public.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_instance_id UUID REFERENCES public.step_instances(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    type public.evidence_type NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    exif_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Issues (remedial tasks)
CREATE TABLE public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_instance_id UUID REFERENCES public.process_instances(id) ON DELETE CASCADE NOT NULL,
    step_instance_id UUID REFERENCES public.step_instances(id) ON DELETE CASCADE,
    raised_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    assigned_to_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status public.issue_status DEFAULT 'open',
    summary TEXT NOT NULL,
    details TEXT,
    sla_due_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Audit Log
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID REFERENCES public.practices(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenant isolation
-- Practices
CREATE POLICY "Users can view their own practice" ON public.practices
    FOR SELECT USING (
        id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Users
CREATE POLICY "Users can view users in their practice" ON public.users
    FOR SELECT USING (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Practice managers can manage users in their practice" ON public.users
    FOR ALL USING (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'practice_manager'
        )
    );

-- Process Templates
CREATE POLICY "Users can view templates in their practice" ON public.process_templates
    FOR SELECT USING (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Practice managers can manage templates" ON public.process_templates
    FOR ALL USING (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'practice_manager'
        )
    );

-- Process Instances
CREATE POLICY "Users can view instances in their practice" ON public.process_instances
    FOR SELECT USING (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their assigned instances" ON public.process_instances
    FOR UPDATE USING (
        assignee_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Step Instances  
CREATE POLICY "Users can view steps in their practice" ON public.step_instances
    FOR SELECT USING (
        process_instance_id IN (
            SELECT id FROM public.process_instances
            WHERE practice_id IN (
                SELECT practice_id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update steps they're assigned to" ON public.step_instances
    FOR UPDATE USING (
        process_instance_id IN (
            SELECT id FROM public.process_instances
            WHERE assignee_id IN (
                SELECT id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Evidence
CREATE POLICY "Users can view evidence in their practice" ON public.evidence
    FOR SELECT USING (
        step_instance_id IN (
            SELECT si.id FROM public.step_instances si
            JOIN public.process_instances pi ON si.process_instance_id = pi.id
            WHERE pi.practice_id IN (
                SELECT practice_id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert evidence for their steps" ON public.evidence
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Issues
CREATE POLICY "Users can view issues in their practice" ON public.issues
    FOR SELECT USING (
        process_instance_id IN (
            SELECT id FROM public.process_instances
            WHERE practice_id IN (
                SELECT practice_id FROM public.users 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Audit Logs
CREATE POLICY "Users can view audit logs in their practice" ON public.audit_logs
    FOR SELECT USING (
        practice_id IN (
            SELECT practice_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_practices_updated_at
    BEFORE UPDATE ON public.practices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_templates_updated_at
    BEFORE UPDATE ON public.process_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_instances_updated_at
    BEFORE UPDATE ON public.process_instances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_step_instances_updated_at
    BEFORE UPDATE ON public.step_instances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);

-- Storage policies for evidence files
CREATE POLICY "Users can view evidence files in their practice" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'evidence' AND
        name ~ '^[0-9a-f-]{36}/' AND -- practice_id pattern
        substring(name, 1, 36) IN (
            SELECT practice_id::text FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload evidence files to their practice" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'evidence' AND
        name ~ '^[0-9a-f-]{36}/' AND -- practice_id pattern
        substring(name, 1, 36) IN (
            SELECT practice_id::text FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- This trigger will be used when we implement auth
  -- For now, users will be created manually
  RETURN NEW;
END;
$$;