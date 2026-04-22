-- Migration: Add Financial Management tables
-- This migration creates tables for bills (payables/receivables) and cash flow

-- Bills table (contas a pagar/receber)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('payable', 'receivable')),
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    recurrence VARCHAR(20) CHECK (recurrence IN ('none', 'weekly', 'monthly', 'yearly')),
    recurrence_end_date DATE,
    notes TEXT,
    supplier_customer VARCHAR(255),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash flow entries table
CREATE TABLE IF NOT EXISTS cash_flow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20),
    reference_type VARCHAR(20),
    reference_id UUID,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill categories table
CREATE TABLE IF NOT EXISTS bill_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('payable', 'receivable', 'both')),
    icon VARCHAR(10),
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name, type)
);

-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own bills" ON bills;
DROP POLICY IF EXISTS "Users can insert own bills" ON bills;
DROP POLICY IF EXISTS "Users can update own bills" ON bills;
DROP POLICY IF EXISTS "Users can delete own bills" ON bills;
DROP POLICY IF EXISTS "Users can view own cash flow" ON cash_flow;
DROP POLICY IF EXISTS "Users can insert own cash flow" ON cash_flow;
DROP POLICY IF EXISTS "Users can update own cash flow" ON cash_flow;
DROP POLICY IF EXISTS "Users can delete own cash flow" ON cash_flow;
DROP POLICY IF EXISTS "Users can view own bill categories" ON bill_categories;
DROP POLICY IF EXISTS "Users can insert own bill categories" ON bill_categories;
DROP POLICY IF EXISTS "Users can update own bill categories" ON bill_categories;
DROP POLICY IF EXISTS "Users can delete own bill categories" ON bill_categories;

-- RLS Policies for bills
CREATE POLICY "Users can view own bills"
    ON bills FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills"
    ON bills FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
    ON bills FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills"
    ON bills FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for cash_flow
CREATE POLICY "Users can view own cash flow"
    ON cash_flow FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cash flow"
    ON cash_flow FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cash flow"
    ON cash_flow FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cash flow"
    ON cash_flow FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for bill_categories
CREATE POLICY "Users can view own bill categories"
    ON bill_categories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bill categories"
    ON bill_categories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bill categories"
    ON bill_categories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bill categories"
    ON bill_categories FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bills_user_due ON bills(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_bills_user_status ON bills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_user_type ON bills(user_id, type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_user_date ON cash_flow(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_user_type ON cash_flow(user_id, type);

-- Function to auto-update bill status to overdue
CREATE OR REPLACE FUNCTION update_overdue_bills()
RETURNS void AS $$
BEGIN
    UPDATE bills
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Insert default bill categories
CREATE OR REPLACE FUNCTION create_default_bill_categories()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO bill_categories (user_id, name, type, icon, color) VALUES
        (NEW.user_id, 'Fornecedores', 'payable', '📦', '#e74c3c'),
        (NEW.user_id, 'Aluguel', 'payable', '🏠', '#9b59b6'),
        (NEW.user_id, 'Energia', 'payable', '⚡', '#f39c12'),
        (NEW.user_id, 'Água', 'payable', '💧', '#3498db'),
        (NEW.user_id, 'Internet', 'payable', '📶', '#1abc9c'),
        (NEW.user_id, 'Funcionários', 'payable', '👥', '#e67e22'),
        (NEW.user_id, 'Impostos', 'payable', '📋', '#95a5a6'),
        (NEW.user_id, 'Vendas', 'receivable', '💰', '#27ae60'),
        (NEW.user_id, 'Outros', 'both', '📝', '#7f8c8d')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
