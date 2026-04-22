-- Migration: Add coupon tracking to customers and global settings
-- Run this in Supabase SQL Editor

-- Add coupon tracking fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS coupons_used INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_discount_savings DECIMAL(10,2) DEFAULT 0;

-- Create global app settings table for feature toggles
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    loyalty_enabled BOOLEAN DEFAULT true,
    coupons_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own app settings" ON app_settings;
DROP POLICY IF EXISTS "Users can insert own app settings" ON app_settings;
DROP POLICY IF EXISTS "Users can update own app settings" ON app_settings;

-- RLS Policies
CREATE POLICY "Users can view own app settings"
    ON app_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app settings"
    ON app_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app settings"
    ON app_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_app_settings_user ON app_settings(user_id);
