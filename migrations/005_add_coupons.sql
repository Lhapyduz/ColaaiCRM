-- Migration: Add coupons/promotions system
-- Run this SQL in your Supabase SQL Editor

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    max_discount DECIMAL(10, 2) DEFAULT NULL, -- For percentage coupons
    usage_limit INTEGER DEFAULT NULL, -- NULL = unlimited
    usage_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL = no expiration
    active BOOLEAN DEFAULT true,
    first_order_only BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, code)
);

-- Track coupon usage per customer
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_phone VARCHAR(20),
    discount_applied DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add coupon field to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_user ON coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage(customer_phone);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Users can view own coupons" ON coupons
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coupons" ON coupons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coupons" ON coupons
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own coupons" ON coupons
    FOR DELETE USING (auth.uid() = user_id);

-- Allow public to check coupons for validation
CREATE POLICY "Anyone can check coupons" ON coupons
    FOR SELECT USING (active = true);

-- RLS Policies for coupon_usage
CREATE POLICY "Users can view own coupon usage" ON coupon_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM coupons
            WHERE coupons.id = coupon_usage.coupon_id
            AND coupons.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert coupon usage" ON coupon_usage
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM coupons
            WHERE coupons.id = coupon_usage.coupon_id
            AND coupons.user_id = auth.uid()
        )
    );

-- Allow anyone to record coupon usage (for public orders)
CREATE POLICY "Anyone can record coupon usage" ON coupon_usage
    FOR INSERT WITH CHECK (true);
