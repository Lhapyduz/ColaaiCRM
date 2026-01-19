-- Migration: Add is_fixed column to employees table
-- This column identifies fixed employees that cannot be deleted and don't count towards plan limits

-- Add is_fixed column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false;

-- Create index for faster queries on fixed employees
CREATE INDEX IF NOT EXISTS idx_employees_is_fixed ON employees(user_id, is_fixed);

-- Comment explaining the column
COMMENT ON COLUMN employees.is_fixed IS 'Fixed employees cannot be deleted and do not count towards plan limits. E.g., the default ADM employee.';

-- Create ADM employee for all existing users who have subscriptions but no fixed employee
-- This ensures existing users also get the fixed ADM employee
INSERT INTO employees (user_id, name, role, pin_code, is_active, is_fixed, permissions)
SELECT DISTINCT 
    s.user_id,
    'ADM',
    'admin',
    '0001',
    true,
    true,
    '{"orders": true, "products": true, "categories": true, "customers": true, "reports": true, "settings": true, "employees": true, "finance": true}'::jsonb
FROM subscriptions s
WHERE NOT EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.user_id = s.user_id 
    AND e.is_fixed = true
);
