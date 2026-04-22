-- Migration: Add image_url to products table
-- This stores the URL of the product image in Supabase Storage

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

COMMENT ON COLUMN products.image_url IS 'URL of the product image stored in Supabase Storage';
