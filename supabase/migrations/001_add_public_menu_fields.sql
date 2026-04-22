-- Migration: Add WhatsApp and Public Slug fields to user_settings
-- Run this SQL in your Supabase SQL Editor

-- Add new columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS public_slug VARCHAR(100) UNIQUE;

-- Create index for public_slug lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_public_slug ON user_settings(public_slug);

-- Update RLS policy to allow public access to user_settings for menu page
CREATE POLICY "Anyone can view settings by public_slug" ON user_settings
  FOR SELECT USING (public_slug IS NOT NULL);

-- Update RLS policy for categories (public menu needs to read categories)
CREATE POLICY "Anyone can view categories for public menu" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_settings 
      WHERE user_settings.user_id = categories.user_id 
      AND user_settings.public_slug IS NOT NULL
    )
  );

-- Update RLS policy for products (public menu needs to read products)
CREATE POLICY "Anyone can view available products for public menu" ON products
  FOR SELECT USING (
    available = true AND
    EXISTS (
      SELECT 1 FROM user_settings 
      WHERE user_settings.user_id = products.user_id 
      AND user_settings.public_slug IS NOT NULL
    )
  );
