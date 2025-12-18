-- Migration: Add Employee/Staff Management tables
-- This migration creates tables for multi-user access control with roles

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'attendant' CHECK (role IN ('admin', 'manager', 'cashier', 'kitchen', 'attendant', 'delivery')),
    pin_code VARCHAR(6),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    working_hours JSONB DEFAULT '{}',
    hourly_rate DECIMAL(10,2),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee sessions (for PIN login tracking)
CREATE TABLE IF NOT EXISTS employee_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45),
    device_info TEXT
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Users can view own employees"
    ON employees FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employees"
    ON employees FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
    ON employees FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
    ON employees FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for employee_sessions
CREATE POLICY "Users can view own employee sessions"
    ON employee_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employee sessions"
    ON employee_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employee sessions"
    ON employee_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(user_id, role);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee ON employee_sessions(employee_id);

-- Comments
COMMENT ON TABLE employees IS 'Staff members with role-based access control';
COMMENT ON COLUMN employees.role IS 'Role: admin, manager, cashier, kitchen, attendant, delivery';
COMMENT ON COLUMN employees.permissions IS 'JSON object with granular permissions';
COMMENT ON COLUMN employees.pin_code IS 'Optional PIN for quick clock-in/clock-out';
COMMENT ON COLUMN employees.working_hours IS 'JSON object with schedule information';

-- Default permissions by role
COMMENT ON COLUMN employees.permissions IS '
Default permissions by role:
- admin: all permissions
- manager: orders, products, reports, employees (no settings)
- cashier: orders, payments, cash register
- kitchen: view orders, update order status (preparing, ready)
- attendant: create orders, view products
- delivery: view deliveries, update delivery status
';
