-- Create step instances for the process that's missing them
INSERT INTO step_instances (
  process_instance_id,
  step_index,
  title,
  status
) VALUES 
(
  '32d029c3-94f5-4e1e-97a2-84a8f701a1f7',
  0,
  'Review patient records',
  'pending'
),
(
  '32d029c3-94f5-4e1e-97a2-84a8f701a1f7', 
  1,
  'Document findings',
  'pending'
),
(
  '32d029c3-94f5-4e1e-97a2-84a8f701a1f7',
  2, 
  'Create action plan',
  'pending'
);