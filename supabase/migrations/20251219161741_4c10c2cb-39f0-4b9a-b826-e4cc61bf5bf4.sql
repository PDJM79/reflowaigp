-- Seed initial role assignments for existing users based on their job functions
-- This assigns appropriate practice roles to users who don't have any roles yet

-- Assign GP Partner role to Dr. Emily Smith
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'Dr. Emily Smith'
  AND rc.role_key = 'gp_partner'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );

-- Assign Salaried GP role to Dr. James Control
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'Dr. James Control'
  AND rc.role_key = 'salaried_gp'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );

-- Assign Practice Nurse role to Lisa Nurse
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'Lisa Nurse'
  AND rc.role_key = 'practice_nurse'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );

-- Assign Receptionist role to Tom Reception
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'Tom Reception'
  AND rc.role_key = 'receptionist'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );

-- Assign Receptionist role to Anne Front
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'Anne Front'
  AND rc.role_key = 'receptionist'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );

-- Assign HCA role to David Care
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'David Care'
  AND rc.role_key = 'hca'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );

-- Assign Deputy PM role to John Admin
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'John Admin'
  AND rc.role_key = 'deputy_pm'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );

-- Assign Deputy PM role to Maria Lead
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'Maria Lead'
  AND rc.role_key = 'deputy_pm'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );