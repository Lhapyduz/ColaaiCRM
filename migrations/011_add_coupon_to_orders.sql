-- Migration: Add coupon fields to orders table

-- Add discount and coupon tracking columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);

-- Create index for coupon tracking
CREATE INDEX IF NOT EXISTS idx_orders_coupon ON orders(coupon_id);
