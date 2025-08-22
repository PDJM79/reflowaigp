-- Create sample process templates for the existing practice
INSERT INTO process_templates (
  practice_id,
  name,
  responsible_role,
  frequency,
  steps,
  evidence_hint,
  storage_hints,
  remedials
) VALUES 
(
  '606ebd22-d3cc-46d5-a243-11552789dd9a',
  'Monthly Clinical Audit',
  'administrator',
  'monthly',
  '[
    {"title": "Review patient records", "description": "Review a sample of patient records for compliance"},
    {"title": "Document findings", "description": "Document any issues or compliance gaps found"},
    {"title": "Create action plan", "description": "Develop corrective actions for any identified issues"},
    {"title": "Submit audit report", "description": "Complete and submit the monthly audit report"}
  ]'::jsonb,
  'Clinical audit documentation, compliance checklists',
  '{"folder": "/clinical-audits", "system": "Practice Management System"}'::jsonb,
  '{"escalation": "Practice Manager", "deadline_extension": "5 days"}'::jsonb
),
(
  '606ebd22-d3cc-46d5-a243-11552789dd9a',
  'Weekly Staff Training Review',
  'administrator',
  'weekly',
  '[
    {"title": "Review training records", "description": "Check all staff have completed required training"},
    {"title": "Identify training gaps", "description": "Note any staff missing mandatory training"},
    {"title": "Schedule additional training", "description": "Book training sessions for staff as needed"},
    {"title": "Update training matrix", "description": "Update the staff training tracking matrix"}
  ]'::jsonb,
  'Training certificates, attendance records',
  '{"folder": "/staff-training", "system": "HR System"}'::jsonb,
  '{"escalation": "Practice Manager", "deadline_extension": "3 days"}'::jsonb
),
(
  '606ebd22-d3cc-46d5-a243-11552789dd9a',
  'Daily Equipment Check',
  'gp',
  'daily',
  '[
    {"title": "Check medical equipment", "description": "Verify all medical equipment is functioning properly"},
    {"title": "Test emergency equipment", "description": "Test defibrillator and emergency response equipment"},
    {"title": "Record readings", "description": "Log equipment readings and any issues found"},
    {"title": "Report issues", "description": "Report any equipment problems to maintenance"}
  ]'::jsonb,
  'Equipment log sheets, maintenance records',
  '{"folder": "/equipment-logs", "system": "Maintenance System"}'::jsonb,
  '{"escalation": "Practice Manager", "deadline_extension": "1 day"}'::jsonb
),
(
  '606ebd22-d3cc-46d5-a243-11552789dd9a',
  'Patient Safety Review',
  'nurse',
  'weekly',
  '[
    {"title": "Review incident reports", "description": "Review any patient safety incidents from the week"},
    {"title": "Assess risk levels", "description": "Evaluate the risk level of each incident"},
    {"title": "Implement improvements", "description": "Put in place any necessary safety improvements"},
    {"title": "Update safety protocols", "description": "Update safety protocols based on findings"}
  ]'::jsonb,
  'Incident reports, safety checklists',
  '{"folder": "/patient-safety", "system": "Incident Management System"}'::jsonb,
  '{"escalation": "Practice Manager", "deadline_extension": "2 days"}'::jsonb
);