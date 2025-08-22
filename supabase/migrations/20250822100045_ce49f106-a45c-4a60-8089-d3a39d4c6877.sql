-- Insert sample process templates for the practice
INSERT INTO process_templates (
  practice_id, 
  name, 
  responsible_role, 
  frequency, 
  steps, 
  evidence_hint,
  remedials
) VALUES 
(
  '08c7f1f4-e3bb-4a22-89bb-fad0bb7ee16c',
  'Monthly Clinical Audit',
  'gp',
  'monthly',
  '[
    {"title": "Review patient records", "description": "Review a sample of patient records for compliance"},
    {"title": "Document findings", "description": "Record any issues or areas for improvement"},
    {"title": "Create action plan", "description": "Develop remedial actions if needed"}
  ]'::jsonb,
  'Upload audit report and evidence files',
  '{
    "low_risk": "Continue current practices",
    "medium_risk": "Implement additional training",
    "high_risk": "Immediate review and corrective action required"
  }'::jsonb
),
(
  '08c7f1f4-e3bb-4a22-89bb-fad0bb7ee16c',
  'Infection Control Check',
  'nurse',
  'weekly',
  '[
    {"title": "Check hand hygiene stations", "description": "Ensure all stations are stocked and functional"},
    {"title": "Review PPE supplies", "description": "Check stock levels of protective equipment"},
    {"title": "Inspect clinical areas", "description": "Visual inspection of cleanliness and safety"}
  ]'::jsonb,
  'Photos of compliance areas and stock levels',
  '{
    "low_risk": "No action required",
    "medium_risk": "Restock supplies within 24 hours",
    "high_risk": "Immediate remedial action required"
  }'::jsonb
),
(
  '08c7f1f4-e3bb-4a22-89bb-fad0bb7ee16c',
  'Medication Review',
  'gp',
  'monthly',
  '[
    {"title": "Check expiry dates", "description": "Review all medication for expired items"},
    {"title": "Verify storage conditions", "description": "Ensure proper temperature and security"},
    {"title": "Update inventory", "description": "Record current stock levels"}
  ]'::jsonb,
  'Medication inventory report and disposal records',
  '{
    "low_risk": "Standard monitoring",
    "medium_risk": "Enhanced checks required",
    "high_risk": "Immediate medication safety review"
  }'::jsonb
);

-- Insert sample process instances
INSERT INTO process_instances (
  practice_id,
  template_id,
  assignee_id,
  status,
  period_start,
  period_end,
  due_at,
  started_at
) 
SELECT 
  pt.practice_id,
  pt.id,
  'c74ea6c7-c3f4-45c7-8338-78526d668a4b', -- Your user ID
  'in_progress',
  '2025-08-01'::timestamp,
  '2025-08-31'::timestamp,
  '2025-08-25'::timestamp,
  '2025-08-20'::timestamp
FROM process_templates pt 
WHERE pt.practice_id = '08c7f1f4-e3bb-4a22-89bb-fad0bb7ee16c'
  AND pt.name = 'Monthly Clinical Audit';

INSERT INTO process_instances (
  practice_id,
  template_id,
  assignee_id,
  status,
  period_start,
  period_end,
  due_at
) 
SELECT 
  pt.practice_id,
  pt.id,
  'c74ea6c7-c3f4-45c7-8338-78526d668a4b',
  'pending',
  '2025-08-19'::timestamp,
  '2025-08-25'::timestamp,
  '2025-08-24'::timestamp
FROM process_templates pt 
WHERE pt.practice_id = '08c7f1f4-e3bb-4a22-89bb-fad0bb7ee16c'
  AND pt.name = 'Infection Control Check';

INSERT INTO process_instances (
  practice_id,
  template_id,
  assignee_id,
  status,
  period_start,
  period_end,
  due_at,
  completed_at
) 
SELECT 
  pt.practice_id,
  pt.id,
  'c74ea6c7-c3f4-45c7-8338-78526d668a4b',
  'complete',
  '2025-07-01'::timestamp,
  '2025-07-31'::timestamp,
  '2025-07-25'::timestamp,
  '2025-07-23'::timestamp
FROM process_templates pt 
WHERE pt.practice_id = '08c7f1f4-e3bb-4a22-89bb-fad0bb7ee16c'
  AND pt.name = 'Medication Review';