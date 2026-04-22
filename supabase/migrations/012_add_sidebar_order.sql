-- Migration: Add sidebar_order column to user_settings
-- This column stores the custom order of sidebar menu items per user

-- Add sidebar_order column (JSONB array of href strings)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS sidebar_order JSONB DEFAULT NULL;

-- Comment explaining the column
COMMENT ON COLUMN user_settings.sidebar_order IS 'Custom order of sidebar menu items as an array of href strings (e.g., ["/dashboard", "/pedidos", "/produtos"])';
