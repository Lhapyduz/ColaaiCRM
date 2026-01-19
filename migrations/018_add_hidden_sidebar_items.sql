-- Migration: Add hidden_sidebar_items column for hiding sidebar menu items
-- This allows users to customize which items appear in their sidebar

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS hidden_sidebar_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_settings.hidden_sidebar_items IS 'Array of href strings for hidden sidebar items (e.g., ["/cozinha", "/estoque"])';
