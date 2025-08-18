-- Update users table to support the practice manager designation
ALTER TABLE users ADD COLUMN is_practice_manager BOOLEAN DEFAULT false;

-- Create organization setup tracking
CREATE TABLE organization_setup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES practices(id),
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organization_setup
ALTER TABLE organization_setup ENABLE ROW LEVEL SECURITY;

-- Create policy for organization setup
CREATE POLICY "Practice managers can manage organization setup" 
ON organization_setup 
FOR ALL 
USING (practice_id IN (
  SELECT practice_id 
  FROM users 
  WHERE auth_user_id = auth.uid() AND is_practice_manager = true
));

-- Create role assignments table
CREATE TABLE role_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID NOT NULL REFERENCES practices(id),
  role user_role NOT NULL,
  assigned_name TEXT NOT NULL,
  assigned_email TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(practice_id, role)
);

-- Enable RLS on role_assignments
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for role assignments
CREATE POLICY "Users can view role assignments in their practice" 
ON role_assignments 
FOR SELECT 
USING (practice_id IN (
  SELECT practice_id 
  FROM users 
  WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Practice managers can manage role assignments" 
ON role_assignments 
FOR ALL 
USING (practice_id IN (
  SELECT practice_id 
  FROM users 
  WHERE auth_user_id = auth.uid() AND is_practice_manager = true
));

-- Add trigger for role_assignments updated_at
CREATE TRIGGER update_role_assignments_updated_at
BEFORE UPDATE ON role_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();