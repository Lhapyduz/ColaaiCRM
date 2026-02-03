-- Migration: Add AbacatePay integration fields
-- Date: 2026-02-03
-- Description: Adds fields for AbacatePay PIX payment integration

-- Add AbacatePay billing ID column
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS abacatepay_billing_id TEXT;

-- Add AbacatePay customer ID column (for future use)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS abacatepay_customer_id TEXT;

-- Create index for fast lookup by billing ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_abacatepay_billing_id 
ON subscriptions(abacatepay_billing_id);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.abacatepay_billing_id IS 'AbacatePay billing ID for PIX payment tracking';
COMMENT ON COLUMN subscriptions.abacatepay_customer_id IS 'AbacatePay customer ID for recurring payments';
