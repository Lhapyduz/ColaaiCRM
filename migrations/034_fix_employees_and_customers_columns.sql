-- Migration: Fix Employees and Customers Columns
-- Resolves remaining 400 Bad Request errors in sync

-- 1. Fix employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS salario_fixo DECIMAL(10, 2) DEFAULT 0;

-- 2. Fix customers table (assuming it exists from loyalty migration)
-- Adding columns typically queried by the frontend
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMP
WITH
    TIME ZONE;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Ensure customers has user_id for RLS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='user_id') THEN
        ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Re-enable RLS for customers just in case
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for customers
DROP POLICY IF EXISTS "Users can view own customers" ON customers;

CREATE POLICY "Users can view own customers" ON customers FOR
SELECT USING (auth.uid () = user_id);

DROP POLICY IF EXISTS "Users can insert own customers" ON customers;

CREATE POLICY "Users can insert own customers" ON customers FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

DROP POLICY IF EXISTS "Users can update own customers" ON customers;

CREATE POLICY "Users can update own customers" ON customers FOR
UPDATE USING (auth.uid () = user_id);

DROP POLICY IF EXISTS "Users can delete own customers" ON customers;

CREATE POLICY "Users can delete own customers" ON customers FOR DELETE USING (auth.uid () = user_id);