-- Add performance indexes for commonly queried columns
-- These indexes will speed up filtering and sorting operations

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_practice_status ON tasks(practice_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_practice_due_at ON tasks(practice_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON tasks(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(practice_id, module);

-- Complaints table indexes (using existing columns)
CREATE INDEX IF NOT EXISTS idx_complaints_practice_status ON complaints(practice_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_practice_received ON complaints(practice_id, received_at DESC);

-- Training records expiry tracking
CREATE INDEX IF NOT EXISTS idx_training_records_expiry ON training_records(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_records_employee ON training_records(employee_id);

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_practice ON employees(practice_id);

-- Cleaning logs indexes
CREATE INDEX IF NOT EXISTS idx_cleaning_logs_practice_date ON cleaning_logs(practice_id, log_date DESC);