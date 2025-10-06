-- Fix search path for compliance function

DROP FUNCTION IF EXISTS public.is_task_compliant(timestamp with time zone, timestamp with time zone, integer);

CREATE OR REPLACE FUNCTION public.is_task_compliant(
  _due_at timestamp with time zone,
  _completed_at timestamp with time zone,
  _sla_hours integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.is_task_compliant TO authenticated;