-- Bootstrap default practice roles for Test Medical Centre
-- This enables common roles from the role_catalog and assigns Practice Manager to the existing practice manager

-- Insert practice roles for Test Medical Centre (practice_id: 106328eb-bfaa-4760-a67d-43f2c9031b4e)
INSERT INTO practice_roles (practice_id, role_catalog_id, is_active)
VALUES
  -- Core management roles
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '2ba03f2e-4a16-4d3a-82d9-3babe063fab6', true),  -- Practice Manager
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '10876858-9f00-4cb3-8381-bb452257c4f4', true),  -- Deputy PM
  
  -- Clinical roles
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '054836ae-c170-4c33-bf7a-ac50f03be7d8', true),  -- GP Partner
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '5a96a1d1-0965-43bb-a5a1-820d71cc2a23', true),  -- Salaried GP
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '4b3d4826-9555-42b6-aa9c-0e1768434b30', true),  -- Practice Nurse
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '90356746-1b5b-4259-a1f2-60900d03ae49', true),  -- HCA/Phlebotomist
  
  -- Admin roles
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', 'dfbe35a9-900c-48ef-a8e0-8e53b575cf8b', true),  -- Receptionist
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '10f9e5a6-2e2c-4e80-86dd-ee23a4280d8e', true),  -- Medical Secretary
  
  -- Support roles
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', '275590f6-27b8-4a61-acc7-56719dd7afb5', true),  -- IT Lead
  ('106328eb-bfaa-4760-a67d-43f2c9031b4e', 'a7f24bb1-d5bd-4a48-ae14-867eac66d93c', true)   -- Estates/Cleaner
ON CONFLICT DO NOTHING;

-- Assign Practice Manager role to Sarah Manager (the user with is_practice_manager = true)
-- First get the practice_role_id for Practice Manager
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT 
  '2bab15e0-16ff-486c-8f56-e2e8d405fd0f',
  '106328eb-bfaa-4760-a67d-43f2c9031b4e',
  pr.id
FROM practice_roles pr
WHERE pr.practice_id = '106328eb-bfaa-4760-a67d-43f2c9031b4e'
  AND pr.role_catalog_id = '2ba03f2e-4a16-4d3a-82d9-3babe063fab6'  -- Practice Manager
ON CONFLICT DO NOTHING;