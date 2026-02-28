-- Demo seed: Minfor Surgery
-- Practice ID : a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- Users       : Sarah (11111111), Tom (22222222), Emma (33333333), James (44444444)
-- Run once; uses ON CONFLICT DO NOTHING so it is safe to re-run.

DO $$
DECLARE
  pid  uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  u1   uuid := '11111111-1111-1111-1111-111111111111'; -- Sarah (manager)
  u2   uuid := '22222222-2222-2222-2222-222222222222'; -- Tom   (GP)
  u3   uuid := '33333333-3333-3333-3333-333333333333'; -- Emma  (nurse)
  u4   uuid := '44444444-4444-4444-4444-444444444444'; -- James (admin)
BEGIN

-- ─── PRACTICE ────────────────────────────────────────────────────────────────
INSERT INTO practices (id, name, country)
VALUES (pid, 'Minfor Surgery', 'Wales')
ON CONFLICT (id) DO NOTHING;

-- ─── USERS ───────────────────────────────────────────────────────────────────
INSERT INTO users (id, practice_id, name, email, role, is_practice_manager, password_hash)
VALUES
  (u1, pid, 'Sarah Ahmed',   'sarah@minforsurgery.nhs.uk', 'practice_manager', true,  'demo-hash'),
  (u2, pid, 'Tom Blackwell', 'tom@minforsurgery.nhs.uk',   'gp',               false, 'demo-hash'),
  (u3, pid, 'Emma Clarke',   'emma@minforsurgery.nhs.uk',  'nurse',            false, 'demo-hash'),
  (u4, pid, 'James Davies',  'james@minforsurgery.nhs.uk', 'admin',            false, 'demo-hash')
ON CONFLICT (id) DO NOTHING;

-- ─── ROOMS ───────────────────────────────────────────────────────────────────
INSERT INTO rooms (id, practice_id, name, type, is_active)
VALUES
  (gen_random_uuid(), pid, 'Reception',          'reception',        true),
  (gen_random_uuid(), pid, 'Consulting Room 1',  'consulting',       true),
  (gen_random_uuid(), pid, 'Consulting Room 2',  'consulting',       true),
  (gen_random_uuid(), pid, 'Treatment Room',     'treatment',        true),
  (gen_random_uuid(), pid, 'Waiting Area',       'waiting',          true),
  (gen_random_uuid(), pid, 'Staff Room',         'staff',            true)
ON CONFLICT DO NOTHING;

-- ─── TASKS ───────────────────────────────────────────────────────────────────
-- Past tasks (due_at in last 30 days) drive audit scoring:
--   4 closed on-time, 1 closed late, 2 overdue  →  compliance ~67%, fit-for-audit ~80%
-- Future tasks appear on the task list / upcoming work.
INSERT INTO tasks (id, practice_id, title, description, priority, status, assignee_id,
                   due_at, completed_at, module, is_auditable, evidence_min_count)
VALUES
  -- ── In-window: closed on time ──────────────────────────────────────────────
  (gen_random_uuid(), pid,
   'Fridge temperature log review',
   'Review last month''s vaccine fridge temperature logs',
   'high', 'closed', u3,
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '11 days',
   'ipc', true, 0),

  (gen_random_uuid(), pid,
   'Sharps disposal audit',
   'Check sharps bins in all clinical rooms are within date',
   'high', 'closed', u2,
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days',
   'ipc', true, 0),

  (gen_random_uuid(), pid,
   'Review infection control policy',
   'Annual review of the IPC policy document',
   'high', 'closed', u1,
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '9 days',
   'policies', true, 0),

  (gen_random_uuid(), pid,
   'Update staff training records',
   'Upload Q1 training certificates for clinical staff',
   'medium', 'closed', u3,
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '16 days',
   'training', false, 0),

  -- ── In-window: closed late (completed_at > due_at) ─────────────────────────
  (gen_random_uuid(), pid,
   'Patient complaints quarterly review',
   'Summarise Q4 complaints and share with partners',
   'medium', 'closed', u2,
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days',
   'complaints', true, 0),

  -- ── In-window: overdue (not completed) ────────────────────────────────────
  (gen_random_uuid(), pid,
   'Staff DBS check renewals',
   'Identify staff with DBS renewals due in next 90 days',
   'medium', 'overdue', u4,
   NOW() - INTERVAL '3 days', NULL,
   'hr', false, 0),

  (gen_random_uuid(), pid,
   'Risk assessment annual review',
   'Review and update the practice risk register',
   'high', 'overdue', u1,
   NOW() - INTERVAL '8 days', NULL,
   'incidents', true, 0),

  -- ── Future tasks (task list / upcoming work) ───────────────────────────────
  (gen_random_uuid(), pid,
   'Fire safety walkthrough',
   'Quarterly fire safety inspection of all rooms',
   'high', 'in_progress', u4,
   NOW() + INTERVAL '3 days', NULL,
   'compliance', false, 0),

  (gen_random_uuid(), pid,
   'Submit CQC registration renewal',
   'Annual CQC registration renewal documentation',
   'high', 'in_progress', u1,
   NOW() + INTERVAL '14 days', NULL,
   'compliance', false, 0),

  (gen_random_uuid(), pid,
   'Annual appraisals schedule',
   'Set up annual appraisal meetings for all clinical staff',
   'medium', 'pending', u1,
   NOW() + INTERVAL '21 days', NULL,
   'hr', false, 0)
ON CONFLICT DO NOTHING;

-- ─── POLICY DOCUMENTS ────────────────────────────────────────────────────────
INSERT INTO policy_documents (id, practice_id, title, category, version, status, owner_id, next_review_date, approved_at, approved_by)
VALUES
  (gen_random_uuid(), pid,
   'Infection Prevention & Control Policy', 'clinical', '3.1', 'approved',
   u1, NOW() + INTERVAL '12 months', NOW() - INTERVAL '30 days', u1),

  (gen_random_uuid(), pid,
   'Significant Event Analysis Policy', 'clinical', '2.0', 'approved',
   u2, NOW() + INTERVAL '12 months', NOW() - INTERVAL '60 days', u1),

  (gen_random_uuid(), pid,
   'Information Governance & Data Security Policy', 'governance', '4.2', 'under_review',
   u1, NOW() + INTERVAL '3 months', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ─── INCIDENTS ───────────────────────────────────────────────────────────────
INSERT INTO incidents (id, practice_id, reported_by_id, category, severity, description, date_occurred,
                       location, immediate_actions, root_cause, preventive_actions, status, closed_at, closed_by_id)
VALUES
  (gen_random_uuid(), pid, u3, 'clinical', 'low',
   'Needle-stick injury during blood draw in Treatment Room. Gloves worn; site cleaned and incident reported immediately.',
   NOW() - INTERVAL '45 days',
   'Treatment Room',
   'Wound cleaned, occupational health notified, blood tests arranged.',
   'Sharps bin positioned awkwardly on trolley.',
   'Sharps bin relocated to fixed wall bracket; refresher training completed.',
   'closed', NOW() - INTERVAL '30 days', u1),

  (gen_random_uuid(), pid, u4, 'administrative', 'medium',
   'Patient data sent to incorrect email address. One record affected. Patient notified same day.',
   NOW() - INTERVAL '3 days',
   'Reception',
   'Email recalled where possible; patient and DPO notified.',
   NULL, NULL,
   'open', NULL, NULL)
ON CONFLICT DO NOTHING;

END $$;
