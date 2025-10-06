-- Add support for customizable task scheduling during organization setup

-- 1. Add new columns to process_templates for customizable scheduling
ALTER TABLE public.process_templates 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS sla_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS custom_frequency text;

-- 2. Update frequency enum to include twice daily
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'process_frequency' AND e.enumlabel = 'twice_daily'
  ) THEN
    ALTER TYPE process_frequency ADD VALUE 'twice_daily';
  END IF;
END $$;

-- 3. Add comments for new fields
COMMENT ON COLUMN public.process_templates.start_date IS 
'The date when this process should start generating instances';

COMMENT ON COLUMN public.process_templates.sla_hours IS 
'Hours after scheduled date that task must be completed for compliance';

COMMENT ON COLUMN public.process_templates.custom_frequency IS 
'Human-readable frequency display (e.g., "2 per day", "Daily", "Weekly")';

-- 4. Create a helper function to calculate next due date based on frequency and start date
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  _start_date date,
  _frequency process_frequency,
  _occurrence_count integer DEFAULT 0
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  next_date timestamp with time zone;
BEGIN
  next_date := _start_date::timestamp with time zone;
  
  CASE _frequency
    WHEN 'twice_daily' THEN
      -- For twice daily, alternate between morning (8am) and evening (8pm)
      IF _occurrence_count % 2 = 0 THEN
        next_date := next_date + ((_occurrence_count / 2) || ' days')::interval + '8 hours'::interval;
      ELSE
        next_date := next_date + ((_occurrence_count / 2) || ' days')::interval + '20 hours'::interval;
      END IF;
    WHEN 'daily' THEN
      next_date := next_date + (_occurrence_count || ' days')::interval;
    WHEN 'weekly' THEN
      next_date := next_date + ((_occurrence_count * 7) || ' days')::interval;
    WHEN 'monthly' THEN
      next_date := next_date + (_occurrence_count || ' months')::interval;
    WHEN 'quarterly' THEN
      next_date := next_date + ((_occurrence_count * 3) || ' months')::interval;
    WHEN 'annually' THEN
      next_date := next_date + (_occurrence_count || ' years')::interval;
    ELSE
      -- Default to weekly
      next_date := next_date + ((_occurrence_count * 7) || ' days')::interval;
  END CASE;
  
  RETURN next_date;
END;
$$;

COMMENT ON FUNCTION public.calculate_next_due_date IS 
'Calculates the next due date for a process instance based on start date, frequency, and occurrence count';

-- 5. Create a function to check compliance based on SLA
CREATE OR REPLACE FUNCTION public.is_task_compliant(
  _due_at timestamp with time zone,
  _completed_at timestamp with time zone,
  _sla_hours integer
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN _completed_at IS NULL THEN 
      -- Not yet completed, check if still within SLA window
      now() <= (_due_at + (_sla_hours || ' hours')::interval)
    ELSE
      -- Completed, check if it was within SLA
      _completed_at <= (_due_at + (_sla_hours || ' hours')::interval)
  END;
$$;

COMMENT ON FUNCTION public.is_task_compliant IS 
'Checks if a task is compliant based on SLA hours. Returns true if completed within SLA or still within window.';

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_next_due_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_compliant TO authenticated;