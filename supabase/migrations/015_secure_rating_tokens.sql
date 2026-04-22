-- Migration 015: Secure Rating Tokens
-- Adds expiration to rating tokens for security

-- Add token expiration column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours');

-- Update existing orders to have expiration set (48h from now for future access)
UPDATE orders 
SET token_expires_at = created_at + INTERVAL '48 hours'
WHERE token_expires_at IS NULL AND rating_token IS NOT NULL;

-- Create index for faster token lookups with expiration check
CREATE INDEX IF NOT EXISTS idx_orders_rating_token_expires 
ON orders(rating_token, token_expires_at) 
WHERE rating_token IS NOT NULL;

-- Function to generate new rating token with expiration when order is created
-- This will automatically set token_expires_at when a new order is inserted
CREATE OR REPLACE FUNCTION set_rating_token_expiration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rating_token IS NOT NULL AND NEW.token_expires_at IS NULL THEN
        NEW.token_expires_at := NOW() + INTERVAL '48 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set expiration on insert
DROP TRIGGER IF EXISTS trigger_set_rating_token_expiration ON orders;
CREATE TRIGGER trigger_set_rating_token_expiration
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_rating_token_expiration();

-- Comment explaining the security enhancement
COMMENT ON COLUMN orders.token_expires_at IS 'Expiration time for rating_token (default 48h from order creation). Prevents indefinite access to rating page.';
