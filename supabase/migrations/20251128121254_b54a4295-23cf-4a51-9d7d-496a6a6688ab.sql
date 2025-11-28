-- Seed user roles for existing test users with practice_id
-- Join from users table to get practice_id automatically

-- Sarah Manager - Practice Manager
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'practice_manager', u.practice_id
FROM public.users u
WHERE u.id = '973e57da-7ffe-4b19-9d62-7c537378bb21'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '973e57da-7ffe-4b19-9d62-7c537378bb21' 
  AND role = 'practice_manager'
);

-- John Admin - Administrator
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'administrator', u.practice_id
FROM public.users u
WHERE u.id = 'c2c95e7b-1536-470b-ba30-0b0f42426d72'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'c2c95e7b-1536-470b-ba30-0b0f42426d72' 
  AND role = 'administrator'
);

-- Maria Lead - Nurse Lead
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'nurse_lead', u.practice_id
FROM public.users u
WHERE u.id = '8962d554-3337-4123-809d-a25685e8d8f5'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '8962d554-3337-4123-809d-a25685e8d8f5' 
  AND role = 'nurse_lead'
);

-- Dr. James Control - CD Lead GP
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'cd_lead_gp', u.practice_id
FROM public.users u
WHERE u.id = '69e0810a-417e-405b-afdb-d103947346b0'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '69e0810a-417e-405b-afdb-d103947346b0' 
  AND role = 'cd_lead_gp'
);

-- Dr. Emily Smith - GP
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'gp', u.practice_id
FROM public.users u
WHERE u.id = 'a3d0889f-e77d-4512-a952-c2d0dd8c6e95'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'a3d0889f-e77d-4512-a952-c2d0dd8c6e95' 
  AND role = 'gp'
);

-- Lisa Nurse - Nurse
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'nurse', u.practice_id
FROM public.users u
WHERE u.id = '89313889-c38a-4f2c-bec1-ac6f7e2fb690'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '89313889-c38a-4f2c-bec1-ac6f7e2fb690' 
  AND role = 'nurse'
);

-- David Care - Estates Lead
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'estates_lead', u.practice_id
FROM public.users u
WHERE u.id = '546852dd-01a3-4f51-93bf-61c85bf048e0'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '546852dd-01a3-4f51-93bf-61c85bf048e0' 
  AND role = 'estates_lead'
);

-- Anne Front - Reception Lead
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'reception_lead', u.practice_id
FROM public.users u
WHERE u.id = '7c8c752e-4805-4a31-b95d-083546202194'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '7c8c752e-4805-4a31-b95d-083546202194' 
  AND role = 'reception_lead'
);

-- Tom Reception - Reception
INSERT INTO public.user_roles (user_id, role, practice_id)
SELECT u.id, 'reception', u.practice_id
FROM public.users u
WHERE u.id = '83df643a-6562-42af-801f-55b58cd9a0e0'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '83df643a-6562-42af-801f-55b58cd9a0e0' 
  AND role = 'reception'
);