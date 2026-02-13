-- Fix search_path for trigger functions to prevent schema injection

-- set_cleaning_log_retention
CREATE OR REPLACE FUNCTION public.set_cleaning_log_retention()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.log_date IS NOT NULL AND NEW.retained_until IS NULL THEN
    NEW.retained_until := (NEW.log_date::DATE + INTERVAL '5 years')::TIMESTAMPTZ;
  END IF;
  RETURN NEW;
END;
$function$;

-- set_complaint_sla_dates
CREATE OR REPLACE FUNCTION public.set_complaint_sla_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Set acknowledgment due date (2 working days)
  IF NEW.date_received IS NOT NULL AND NEW.acknowledgment_due_date IS NULL THEN
    NEW.acknowledgment_due_date := public.add_working_days(NEW.date_received::DATE, 2);
  END IF;
  
  -- Set final response due date (30 working days)
  IF NEW.date_received IS NOT NULL AND NEW.final_response_due_date IS NULL THEN
    NEW.final_response_due_date := public.add_working_days(NEW.date_received::DATE, 30);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- set_coshh_next_review
CREATE OR REPLACE FUNCTION public.set_coshh_next_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.next_review_date IS NULL THEN
    NEW.next_review_date := (NEW.created_at::DATE + INTERVAL '1 year')::DATE;
  END IF;
  RETURN NEW;
END;
$function$;

-- set_fra_next_review
CREATE OR REPLACE FUNCTION public.set_fra_next_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.assessment_date IS NOT NULL AND NEW.next_review_date IS NULL THEN
    NEW.next_review_date := NEW.assessment_date + INTERVAL '1 year';
  END IF;
  RETURN NEW;
END;
$function$;

-- set_ipc_audit_retention
CREATE OR REPLACE FUNCTION public.set_ipc_audit_retention()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.retained_until IS NULL THEN
    NEW.retained_until := NEW.completed_at + INTERVAL '5 years';
  END IF;
  RETURN NEW;
END;
$function$;

-- set_risk_next_review
CREATE OR REPLACE FUNCTION public.set_risk_next_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.next_review_date IS NULL THEN
    NEW.next_review_date := (NEW.created_at::DATE + INTERVAL '1 year')::DATE;
  END IF;
  RETURN NEW;
END;
$function$;

-- set_room_assessment_next_due
CREATE OR REPLACE FUNCTION public.set_room_assessment_next_due()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.assessment_date IS NOT NULL AND NEW.next_due_date IS NULL THEN
    NEW.next_due_date := NEW.assessment_date + INTERVAL '1 year';
  END IF;
  RETURN NEW;
END;
$function$;