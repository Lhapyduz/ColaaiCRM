-- Migration: Add delivery fee configuration to user_settings
-- Run this in Supabase SQL Editor

-- Add delivery fee fields to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS delivery_fee_type VARCHAR(20) DEFAULT 'fixed' CHECK (delivery_fee_type IN ('fixed', 'neighborhood')),
ADD COLUMN IF NOT EXISTS delivery_fee_value DECIMAL(10, 2) DEFAULT 5.00;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.delivery_fee_type IS 'Type of delivery fee: fixed or neighborhood-based';
COMMENT ON COLUMN user_settings.delivery_fee_value IS 'Fixed delivery fee value in BRL';
