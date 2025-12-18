-- =========================================================
-- Auditable classification + scoring + search + audit trail
-- =========================================================

-- 1) Ensure extensions for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Add auditable fields to task_templates
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS is_auditable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audit_frameworks text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS evidence_min_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fit_for_audit_weight numeric NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.task_templates.is_auditable IS 'Whether this task type is subject to CQC/HIW/HIS audit';
COMMENT ON COLUMN public.task_templates.audit_frameworks IS 'Frameworks this task relates to: CQC, HIW, HIS, QOF, etc.';
COMMENT ON COLUMN public.task_templates.evidence_min_count IS 'Minimum evidence items required to pass audit';
COMMENT ON COLUMN public.task_templates.fit_for_audit_weight IS 'Weighting for fit-for-audit score calculation';

-- 3) Add auditable fields to tasks (denormalized snapshot for historical accuracy)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_auditable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audit_frameworks text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS evidence_min_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fit_for_audit_weight numeric NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.tasks.is_auditable IS 'Snapshot of template auditable flag at task creation';
COMMENT ON COLUMN public.tasks.audit_frameworks IS 'Snapshot of frameworks at task creation';
COMMENT ON COLUMN public.tasks.evidence_min_count IS 'Snapshot of min evidence requirement at task creation';

-- 4) Trigger: copy template audit fields onto task at creation
CREATE OR REPLACE FUNCTION public.apply_task_template_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.task_templates;
BEGIN
  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO t FROM public.task_templates WHERE id = NEW.template_id;

  IF FOUND THEN
    NEW.is_auditable := COALESCE(t.is_auditable, false);
    NEW.audit_frameworks := COALESCE(t.audit_frameworks, '{}'::text[]);
    NEW.evidence_min_count := COALESCE(t.evidence_min_count, 0);
    NEW.fit_for_audit_weight := COALESCE(t.fit_for_audit_weight, 1);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_task_template_audit_fields ON public.tasks;
CREATE TRIGGER trg_apply_task_template_audit_fields
BEFORE INSERT OR UPDATE OF template_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.apply_task_template_audit_fields();

-- Backfill existing tasks from their templates
UPDATE public.tasks t
SET
  is_auditable = COALESCE(tt.is_auditable, false),
  audit_frameworks = COALESCE(tt.audit_frameworks, '{}'::text[]),
  evidence_min_count = COALESCE(tt.evidence_min_count, 0),
  fit_for_audit_weight = COALESCE(tt.fit_for_audit_weight, 1)
FROM public.task_templates tt
WHERE t.template_id = tt.id;

-- 5) Full-text search for tasks (5-year horizon)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(module,'')), 'A')
    || setweight(to_tsvector('english', coalesce(description,'')), 'B')
    || setweight(to_tsvector('english', coalesce(return_notes,'')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_tasks_search_vector ON public.tasks USING gin(search_vector);

-- Helpful indexes for scoring and filtering
CREATE INDEX IF NOT EXISTS idx_tasks_practice_due_status ON public.tasks(practice_id, due_at, status);
CREATE INDEX IF NOT EXISTS idx_tasks_practice_auditable_due ON public.tasks(practice_id, is_auditable, due_at);

-- 6) Evidence counts performance index
CREATE INDEX IF NOT EXISTS idx_evidence_v2_task_id ON public.evidence_v2(task_id);

-- 7) Append-only task event log for strong auditability
CREATE TABLE IF NOT EXISTS public.task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  before jsonb,
  after jsonb
);

COMMENT ON TABLE public.task_events IS 'Append-only audit log for task changes';
COMMENT ON COLUMN public.task_events.event_type IS 'STATUS_CHANGED, EVIDENCE_ADDED, DUE_DATE_CHANGED, ASSIGNED, CREATED, RETURNED, COMMENT';

-- Enable RLS on task_events
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

-- RLS: only practice members can read
CREATE POLICY "task_events_select_practice"
ON public.task_events
FOR SELECT
USING (practice_id = public.get_current_user_practice_id());

-- Revoke direct insert/update/delete from app users (inserts done via triggers)
REVOKE INSERT, UPDATE, DELETE ON public.task_events FROM anon, authenticated;

-- Create index for task event queries
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON public.task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_practice_event_at ON public.task_events(practice_id, event_at DESC);

-- 8) Trigger to log task changes into task_events
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := public.get_user_id_from_auth();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_events(practice_id, task_id, actor_user_id, event_type, after)
    VALUES (NEW.practice_id, NEW.id, actor, 'CREATED', jsonb_build_object('title', NEW.title, 'status', NEW.status, 'due_at', NEW.due_at));
    RETURN NEW;
  END IF;

  -- Status change
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.task_events(practice_id, task_id, actor_user_id, event_type, before, after)
    VALUES (NEW.practice_id, NEW.id, actor, 'STATUS_CHANGED', jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  END IF;

  -- Due date change
  IF (OLD.due_at IS DISTINCT FROM NEW.due_at) THEN
    INSERT INTO public.task_events(practice_id, task_id, actor_user_id, event_type, before, after)
    VALUES (NEW.practice_id, NEW.id, actor, 'DUE_DATE_CHANGED', jsonb_build_object('due_at', OLD.due_at), jsonb_build_object('due_at', NEW.due_at));
  END IF;

  -- Assignment change
  IF (OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id) OR (OLD.assigned_to_role IS DISTINCT FROM NEW.assigned_to_role) THEN
    INSERT INTO public.task_events(practice_id, task_id, actor_user_id, event_type, before, after)
    VALUES (
      NEW.practice_id, NEW.id, actor, 'ASSIGNED',
      jsonb_build_object('assigned_to_user_id', OLD.assigned_to_user_id, 'assigned_to_role', OLD.assigned_to_role),
      jsonb_build_object('assigned_to_user_id', NEW.assigned_to_user_id, 'assigned_to_role', NEW.assigned_to_role)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_changes ON public.tasks;
CREATE TRIGGER trg_log_task_changes
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.log_task_changes();

-- 9) Search RPC (secure: derives practice from auth)
CREATE OR REPLACE FUNCTION public.search_tasks_secure(
  p_query text DEFAULT '',
  p_module text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_only_my_tasks boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  module text,
  status text,
  priority text,
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to_user_id uuid,
  assigned_to_role public.user_role,
  is_auditable boolean,
  evidence_min_count integer,
  evidence_count integer,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practice_id uuid := public.get_current_user_practice_id();
  v_user_id uuid := public.get_user_id_from_auth();
  q tsquery;
BEGIN
  IF v_practice_id IS NULL THEN
    RAISE EXCEPTION 'No practice for user';
  END IF;

  IF coalesce(p_query,'') = '' THEN
    q := NULL;
  ELSE
    q := websearch_to_tsquery('english', p_query);
  END IF;

  RETURN QUERY
  SELECT
    t.id, t.title, t.description, t.module, t.status, t.priority, t.due_at, t.completed_at,
    t.assigned_to_user_id, t.assigned_to_role, t.is_auditable, t.evidence_min_count,
    (SELECT count(*)::int FROM public.evidence_v2 e WHERE e.task_id = t.id) AS evidence_count,
    CASE WHEN q IS NULL THEN NULL ELSE ts_rank_cd(t.search_vector, q) END AS rank
  FROM public.tasks t
  WHERE t.practice_id = v_practice_id
    AND (q IS NULL OR t.search_vector @@ q)
    AND (p_module IS NULL OR p_module = 'all' OR t.module = p_module)
    AND (p_status IS NULL OR p_status = 'all' OR t.status = p_status)
    AND (p_priority IS NULL OR p_priority = 'all' OR t.priority = p_priority)
    AND (NOT p_only_my_tasks OR t.assigned_to_user_id = v_user_id)
  ORDER BY rank DESC NULLS LAST, t.due_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_tasks_secure TO authenticated;

-- 10) Scoring RPC (secure + performant)
CREATE OR REPLACE FUNCTION public.get_practice_scores_secure(
  p_practice_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_as_of timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_as_of timestamptz := COALESCE(p_as_of, now());
  v_start timestamptz;
  v_end timestamptz;
  total_due int;
  completed_on_time int;
  completed_late int;
  incomplete_due int;

  aud_total_due int;
  aud_pass int;

  compliance_score numeric;
  fit_score numeric;
BEGIN
  -- Authorize: caller must be in same practice as p_practice_id
  IF public.get_current_user_practice_id() IS NULL OR public.get_current_user_practice_id() <> p_practice_id THEN
    RAISE EXCEPTION 'Unauthorized practice';
  END IF;

  IF p_start_date IS NULL THEN
    v_start := (v_as_of - interval '30 days');
  ELSE
    v_start := p_start_date::timestamptz;
  END IF;

  IF p_end_date IS NULL THEN
    v_end := v_as_of;
  ELSE
    v_end := (p_end_date::timestamptz + interval '1 day') - interval '1 second';
  END IF;

  -- Compliance window: tasks with due_at in [v_start, v_end] and due_at <= as_of
  SELECT count(*) INTO total_due
  FROM public.tasks
  WHERE practice_id = p_practice_id
    AND due_at >= v_start AND due_at <= v_end
    AND due_at <= v_as_of;

  SELECT count(*) INTO completed_on_time
  FROM public.tasks
  WHERE practice_id = p_practice_id
    AND due_at >= v_start AND due_at <= v_end
    AND due_at <= v_as_of
    AND status = 'closed'
    AND completed_at IS NOT NULL
    AND completed_at <= due_at;

  SELECT count(*) INTO completed_late
  FROM public.tasks
  WHERE practice_id = p_practice_id
    AND due_at >= v_start AND due_at <= v_end
    AND due_at <= v_as_of
    AND status = 'closed'
    AND completed_at IS NOT NULL
    AND completed_at > due_at;

  SELECT count(*) INTO incomplete_due
  FROM public.tasks
  WHERE practice_id = p_practice_id
    AND due_at >= v_start AND due_at <= v_end
    AND due_at <= v_as_of
    AND status <> 'closed';

  -- Compliance scoring: on-time = 1.0, late = 0.7, incomplete = 0.0
  IF total_due = 0 THEN
    compliance_score := 100;
  ELSE
    compliance_score := round(((completed_on_time * 1.0 + completed_late * 0.7) / total_due) * 100, 2);
  END IF;

  -- Fit-for-audit: auditable tasks due up to as_of
  SELECT count(*) INTO aud_total_due
  FROM public.tasks
  WHERE practice_id = p_practice_id
    AND is_auditable = true
    AND due_at <= v_as_of
    AND (p_start_date IS NULL OR due_at >= v_start)
    AND (p_end_date IS NULL OR due_at <= v_end);

  SELECT count(*) INTO aud_pass
  FROM public.tasks t
  WHERE t.practice_id = p_practice_id
    AND t.is_auditable = true
    AND t.due_at <= v_as_of
    AND (p_start_date IS NULL OR t.due_at >= v_start)
    AND (p_end_date IS NULL OR t.due_at <= v_end)
    AND t.status = 'closed'
    AND (SELECT count(*) FROM public.evidence_v2 e WHERE e.task_id = t.id) >= t.evidence_min_count;

  IF aud_total_due = 0 THEN
    fit_score := 100;
  ELSE
    fit_score := round((aud_pass::numeric / aud_total_due::numeric) * 100, 2);
  END IF;

  RETURN jsonb_build_object(
    'asOf', v_as_of,
    'window', jsonb_build_object('start', v_start, 'end', v_end),
    'compliance', jsonb_build_object(
      'score', compliance_score,
      'totalDue', total_due,
      'completedOnTime', completed_on_time,
      'completedLate', completed_late,
      'incompleteDue', incomplete_due
    ),
    'fitForAudit', jsonb_build_object(
      'score', fit_score,
      'auditableDue', aud_total_due,
      'auditablePass', aud_pass
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_practice_scores_secure TO authenticated;