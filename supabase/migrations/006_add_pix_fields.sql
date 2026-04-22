-- Migration: Add PIX payment fields to user_settings
-- This migration adds PIX key configuration for QR code generation

-- Add PIX-related columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
ADD COLUMN IF NOT EXISTS merchant_city TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN user_settings.pix_key IS 'PIX key for receiving payments';
COMMENT ON COLUMN user_settings.pix_key_type IS 'Type of PIX key: cpf, cnpj, email, phone, or random';
COMMENT ON COLUMN user_settings.merchant_city IS 'City name for PIX QR code (max 15 chars)';

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_user_settings_pix_key ON user_settings(pix_key) WHERE pix_key IS NOT NULL;
