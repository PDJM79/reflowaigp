-- Add new columns to complaints table for enhanced logging
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS complainant_name TEXT,
ADD COLUMN IF NOT EXISTS sla_timescale TEXT DEFAULT 'month',
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'on_track',
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add constraint for severity values
ALTER TABLE public.complaints 
ADD CONSTRAINT complaints_severity_check 
CHECK (severity IN ('low', 'medium', 'high'));

-- Add constraint for sla_timescale values
ALTER TABLE public.complaints 
ADD CONSTRAINT complaints_sla_timescale_check 
CHECK (sla_timescale IN ('day', 'week', 'month'));

-- Add constraint for sla_status values
ALTER TABLE public.complaints 
ADD CONSTRAINT complaints_sla_status_check 
CHECK (sla_status IN ('on_track', 'at_risk', 'overdue', 'completed'));

-- Add constraint for category values
ALTER TABLE public.complaints 
ADD CONSTRAINT complaints_category_check 
CHECK (category IN ('clinical_care', 'staff_attitude', 'waiting_times', 'communication', 'prescriptions', 'other'));

-- Create index for better query performance on common filters
CREATE INDEX IF NOT EXISTS idx_complaints_sla_status ON public.complaints(sla_status);
CREATE INDEX IF NOT EXISTS idx_complaints_severity ON public.complaints(severity);
CREATE INDEX IF NOT EXISTS idx_complaints_closed_at ON public.complaints(closed_at);