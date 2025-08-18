-- Create some sample process templates for new practices
INSERT INTO process_templates (
  id,
  name,
  practice_id,
  responsible_role,
  frequency,
  steps,
  evidence_hint,
  storage_hints,
  remedials
) VALUES 
(
  gen_random_uuid(),
  'Daily Practice Review',
  (SELECT id FROM practices ORDER BY created_at DESC LIMIT 1),
  'practice_manager'::responsible_role,
  'daily'::frequency,
  '[
    {"title": "Review patient appointments", "description": "Check daily appointment schedule and prepare for patient visits"},
    {"title": "Check emergency protocols", "description": "Verify emergency contact numbers and procedures are up to date"},
    {"title": "Review staff assignments", "description": "Confirm staff coverage and responsibilities for the day"}
  ]'::jsonb,
  'Keep evidence in the practice management system',
  '{"location": "Practice Management System", "path": "/daily-reviews"}'::jsonb,
  '{"overdue": "Notify practice manager immediately", "missed": "Schedule emergency review within 24 hours"}'::jsonb
),
(
  gen_random_uuid(),
  'Weekly Safety Audit',
  (SELECT id FROM practices ORDER BY created_at DESC LIMIT 1),
  'nurse'::responsible_role,
  'weekly'::frequency,
  '[
    {"title": "Check medical equipment", "description": "Inspect and test all critical medical equipment"},
    {"title": "Review infection control procedures", "description": "Verify hygiene protocols are being followed"},
    {"title": "Update safety documentation", "description": "Complete weekly safety checklist and file reports"}
  ]'::jsonb,
  'Document with photos and signed checklists',
  '{"location": "Safety Documentation Folder", "path": "/safety-audits"}'::jsonb,
  '{"overdue": "Escalate to practice manager", "missed": "Complete within 48 hours and file incident report"}'::jsonb
),
(
  gen_random_uuid(),
  'Monthly Compliance Review',
  (SELECT id FROM practices ORDER BY created_at DESC LIMIT 1),
  'practice_manager'::responsible_role,
  'monthly'::frequency,
  '[
    {"title": "Review patient records compliance", "description": "Audit patient records for completeness and accuracy"},
    {"title": "Check staff certification status", "description": "Verify all staff certifications are current"},
    {"title": "Update practice policies", "description": "Review and update practice policies as needed"}
  ]'::jsonb,
  'Maintain compliance documentation and certificates',
  '{"location": "Compliance Archive", "path": "/monthly-reviews"}'::jsonb,
  '{"overdue": "Schedule immediate review meeting", "missed": "Contact regulatory body and file compliance report"}'::jsonb
);