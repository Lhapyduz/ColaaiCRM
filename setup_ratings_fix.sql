-- setup_ratings_fix.sql
-- Run this in your Supabase SQL Editor to fix the ratings integration issues.

-- 1. Add reply and hidden columns to store_ratings
ALTER TABLE store_ratings
ADD COLUMN IF NOT EXISTS reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- 2. Add reply and hidden columns to product_ratings
ALTER TABLE product_ratings
ADD COLUMN IF NOT EXISTS reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- 3. Ensure 'store_open', 'delivery_time_min', 'delivery_time_max' exist in user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS store_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS delivery_time_min INTEGER,
ADD COLUMN IF NOT EXISTS delivery_time_max INTEGER,
ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(7);

-- 4. Update RLS policies to allow store owners to update ratings (replies and hiding)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_ratings' AND policyname = 'Users can update their own store ratings'
    ) THEN
        CREATE POLICY "Users can update their own store ratings" ON store_ratings
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'product_ratings' AND policyname = 'Users can update their own product ratings'
    ) THEN
        CREATE POLICY "Users can update their own product ratings" ON product_ratings
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Ensure Public can view non-hidden ratings
DROP POLICY IF EXISTS "Public can view store ratings" ON store_ratings;
CREATE POLICY "Public can view store ratings" ON store_ratings
FOR SELECT USING (hidden = false);

DROP POLICY IF EXISTS "Public can view product ratings" ON product_ratings;
CREATE POLICY "Public can view product ratings" ON product_ratings
FOR SELECT USING (hidden = false);
