-- Migration: Add access_token for public access links
-- This token allows employees to access specific pages without owner login

-- Add access_token column
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT gen_random_uuid();

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_access_token 
ON user_settings(access_token);

COMMENT ON COLUMN user_settings.access_token IS 'Unique token for public access links (kitchen/delivery)';
