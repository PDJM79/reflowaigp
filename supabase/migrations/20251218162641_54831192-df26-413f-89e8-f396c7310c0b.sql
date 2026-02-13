-- Create employee records for existing users without one
INSERT INTO employees (practice_id, user_id, name, start_date)
SELECT u.practice_id, u.id, u.name, COALESCE(u.created_at::date, CURRENT_DATE)
FROM users u
WHERE u.practice_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id);

-- Create trigger for auto-creating employee records for new users
CREATE OR REPLACE FUNCTION create_employee_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.practice_id IS NOT NULL THEN
    INSERT INTO employees (practice_id, user_id, name, start_date)
    VALUES (NEW.practice_id, NEW.id, NEW.name, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_user_created_create_employee ON users;

CREATE TRIGGER on_user_created_create_employee
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_employee_for_new_user();