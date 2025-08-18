-- Create sample process templates and instances for testing
-- This will provide real data for the task navigation to work

-- Insert a sample process template
INSERT INTO public.process_templates (
  practice_id,
  name,
  responsible_role,
  frequency,
  evidence_hint,
  steps
) VALUES (
  '13857f81-3bef-4fbe-9f75-3704ac1a4ff6',
  'Weekly Staff Meeting Documentation',
  'practice_manager',
  'weekly',
  'Document meeting minutes, action items, and attendance',
  '[
    {"title": "Prepare Agenda", "description": "Create meeting agenda with key items to discuss"},
    {"title": "Conduct Meeting", "description": "Run the meeting and take notes"},
    {"title": "Document Minutes", "description": "Write up formal meeting minutes with action items"}
  ]'::jsonb
);

-- Insert a sample process instance
INSERT INTO public.process_instances (
  practice_id,
  template_id,
  assignee_id,
  status,
  period_start,
  period_end,
  due_at
) VALUES (
  '13857f81-3bef-4fbe-9f75-3704ac1a4ff6',
  (SELECT id FROM public.process_templates WHERE name = 'Weekly Staff Meeting Documentation' LIMIT 1),
  'c74ea6c7-c3f4-45c7-8338-78526d668a4b',
  'pending',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '2 days'
);