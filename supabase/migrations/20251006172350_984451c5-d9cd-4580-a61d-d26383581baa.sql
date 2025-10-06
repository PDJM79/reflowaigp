-- Fix search path and add security definer for calculate_next_due_date function

DROP FUNCTION IF EXISTS public.calculate_next_due_date(date, process_frequency, integer);

CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  _start_date date,
  _frequency process_frequency,
  _occurrence_count integer DEFAULT 0
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.calculate_next_due_date TO authenticated;