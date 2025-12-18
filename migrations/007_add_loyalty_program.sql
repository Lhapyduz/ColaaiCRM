-- Migration: Add Loyalty Program tables
-- This migration creates tables for customer loyalty points and rewards

-- Customers table (for loyalty tracking)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    total_points INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, phone)
);

-- Points transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('discount_percent', 'discount_fixed', 'free_product', 'free_delivery')),
    reward_value DECIMAL(10,2),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty settings table
CREATE TABLE IF NOT EXISTS loyalty_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    points_per_real DECIMAL(5,2) DEFAULT 1,
    min_points_to_redeem INTEGER DEFAULT 100,
    points_expiry_days INTEGER DEFAULT 365,
    tier_bronze_min INTEGER DEFAULT 0,
    tier_silver_min INTEGER DEFAULT 500,
    tier_gold_min INTEGER DEFAULT 2000,
    tier_platinum_min INTEGER DEFAULT 5000,
    silver_multiplier DECIMAL(3,2) DEFAULT 1.25,
    gold_multiplier DECIMAL(3,2) DEFAULT 1.50,
    platinum_multiplier DECIMAL(3,2) DEFAULT 2.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_id and points_used to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_discount DECIMAL(10,2) DEFAULT 0;

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view own customers"
    ON customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
    ON customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
    ON customers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
    ON customers FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for points_transactions
CREATE POLICY "Users can view own points transactions"
    ON points_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points transactions"
    ON points_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for loyalty_rewards
CREATE POLICY "Users can view own loyalty rewards"
    ON loyalty_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty rewards"
    ON loyalty_rewards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty rewards"
    ON loyalty_rewards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loyalty rewards"
    ON loyalty_rewards FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for loyalty_settings
CREATE POLICY "Users can view own loyalty settings"
    ON loyalty_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty settings"
    ON loyalty_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty settings"
    ON loyalty_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_points_transactions_customer ON points_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_order ON points_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active ON loyalty_rewards(user_id, is_active);

-- Function to update customer tier based on points
CREATE OR REPLACE FUNCTION update_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
    settings loyalty_settings%ROWTYPE;
BEGIN
    SELECT * INTO settings FROM loyalty_settings WHERE user_id = NEW.user_id;
    
    IF settings IS NULL THEN
        NEW.tier := 'bronze';
    ELSIF NEW.total_points >= settings.tier_platinum_min THEN
        NEW.tier := 'platinum';
    ELSIF NEW.total_points >= settings.tier_gold_min THEN
        NEW.tier := 'gold';
    ELSIF NEW.total_points >= settings.tier_silver_min THEN
        NEW.tier := 'silver';
    ELSE
        NEW.tier := 'bronze';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tier updates
DROP TRIGGER IF EXISTS customer_tier_update ON customers;
CREATE TRIGGER customer_tier_update
    BEFORE UPDATE OF total_points ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_tier();
