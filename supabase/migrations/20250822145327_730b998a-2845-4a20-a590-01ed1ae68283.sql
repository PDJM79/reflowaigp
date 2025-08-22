-- Create process instances from the templates for immediate visibility
-- Get the user ID for the administrator
WITH admin_user AS (
  SELECT id FROM users 
  WHERE auth_user_id = '144cced8-66d0-441c-b5da-5dce2bcf0b31'
),
templates AS (
  SELECT id, name, responsible_role, frequency 
  FROM process_templates 
  WHERE practice_id = '606ebd22-d3cc-46d5-a243-11552789dd9a'
)
INSERT INTO process_instances (
  practice_id,
  template_id,
  assignee_id,
  status,
  period_start,
  period_end,
  due_at,
  created_at
)
SELECT 
  '606ebd22-d3cc-46d5-a243-11552789dd9a' as practice_id,
  t.id as template_id,
  (CASE 
    WHEN t.responsible_role = 'administrator' THEN (SELECT id FROM admin_user)
    ELSE (SELECT id FROM users WHERE practice_id = '606ebd22-d3cc-46d5-a243-11552789dd9a' AND role = t.responsible_role LIMIT 1)
  END) as assignee_id,
  'pending' as status,
  CURRENT_DATE as period_start,
  (CASE 
    WHEN t.frequency = 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
    WHEN t.frequency = 'weekly' THEN CURRENT_DATE + INTERVAL '1 week'  
    WHEN t.frequency = 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
    ELSE CURRENT_DATE + INTERVAL '1 week'
  END) as period_end,
  (CASE 
    WHEN t.frequency = 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
    WHEN t.frequency = 'weekly' THEN CURRENT_DATE + INTERVAL '3 days'
    WHEN t.frequency = 'monthly' THEN CURRENT_DATE + INTERVAL '1 week'
    ELSE CURRENT_DATE + INTERVAL '3 days'
  END) as due_at,
  NOW() as created_at
FROM templates t;