-- KF5 — per-room assessment register (additive, reversible).
-- room_id -> the real rooms table (id, practice_id, name, type, is_active).
CREATE TABLE IF NOT EXISTS public.room_assessments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id      uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  room_id          uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  assessed_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assessment_date  date NOT NULL,
  outcome          text,          -- 'pass' | 'issues' | 'fail'
  notes            text,
  next_due         date,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_assessments_practice_room
  ON public.room_assessments (practice_id, room_id, assessment_date DESC);
