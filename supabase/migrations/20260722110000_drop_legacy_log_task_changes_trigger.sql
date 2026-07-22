-- The restore_functions_triggers migration reinstated log_task_changes()/trg_log_task_changes
-- from the historical schema. It is incompatible with the CURRENT tasks schema: it INSERTs into
-- a public.task_events table that does not exist, and references OLD.assigned_to_user_id /
-- OLD.assigned_to_role (the current schema uses assignee_id and has no task_events). As a result
-- it errors on every INSERT/UPDATE of tasks — which broke scheduler generation and any task write.
-- Task auditing is handled server-side (server/auditLogger.ts -> audit_logs), so drop this legacy
-- DB trigger + function rather than recreate the obsolete task_events table.
DROP TRIGGER IF EXISTS trg_log_task_changes ON public.tasks;
DROP FUNCTION IF EXISTS public.log_task_changes();
