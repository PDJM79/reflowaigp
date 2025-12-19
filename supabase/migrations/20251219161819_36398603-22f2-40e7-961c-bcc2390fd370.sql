-- Assign HCA/Phlebotomist role to David Care
INSERT INTO user_practice_roles (user_id, practice_id, practice_role_id)
SELECT u.id, e.practice_id, pr.id
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN practice_roles pr ON pr.practice_id = e.practice_id
JOIN role_catalog rc ON rc.id = pr.role_catalog_id
WHERE e.name = 'David Care'
  AND rc.role_key = 'hca_phleb'
  AND NOT EXISTS (
    SELECT 1 FROM user_practice_roles upr WHERE upr.user_id = u.id AND upr.practice_role_id = pr.id
  );