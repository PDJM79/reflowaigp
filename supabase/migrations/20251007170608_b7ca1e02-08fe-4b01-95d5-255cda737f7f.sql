-- Assign process instances to test operative users
UPDATE public.process_instances 
SET assignee_id = (
  SELECT id FROM public.users 
  WHERE email = 'hca@test.com' 
  AND practice_id IN (SELECT id FROM public.practices WHERE name = 'Test Medical Centre')
)
WHERE template_id IN (
  SELECT id FROM public.process_templates WHERE name = 'Fire Safety Weekly Check'
)
AND practice_id IN (SELECT id FROM public.practices WHERE name = 'Test Medical Centre');

UPDATE public.process_instances 
SET assignee_id = (
  SELECT id FROM public.users 
  WHERE email = 'nurse@test.com' 
  AND practice_id IN (SELECT id FROM public.practices WHERE name = 'Test Medical Centre')
)
WHERE template_id IN (
  SELECT id FROM public.process_templates WHERE name IN ('Infection Control Monthly Audit', 'Fridge Temperature Check')
)
AND practice_id IN (SELECT id FROM public.practices WHERE name = 'Test Medical Centre');

UPDATE public.process_instances 
SET assignee_id = (
  SELECT id FROM public.users 
  WHERE email = 'reception@test.com' 
  AND practice_id IN (SELECT id FROM public.practices WHERE name = 'Test Medical Centre')
)
WHERE template_id IN (
  SELECT id FROM public.process_templates WHERE name = 'Cleaning Standards Inspection'
)
AND practice_id IN (SELECT id FROM public.practices WHERE name = 'Test Medical Centre');