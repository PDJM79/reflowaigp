DROP TRIGGER IF EXISTS ai_usage_no_truncate      ON public.ai_usage;
DROP TRIGGER IF EXISTS ai_usage_no_update_delete ON public.ai_usage;
DROP FUNCTION IF EXISTS public.ai_usage_append_only();
DROP TABLE IF EXISTS public.ai_usage;
