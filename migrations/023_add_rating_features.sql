-- Add reply and hidden columns to store_ratings
ALTER TABLE store_ratings
ADD COLUMN IF NOT EXISTS reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Add reply and hidden columns to product_ratings
ALTER TABLE product_ratings
ADD COLUMN IF NOT EXISTS reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Update RLS policies to allow updating ratings (for replies and hiding) by the store owner
-- Assuming there is a policy for owner to update, but if not we ensure it.
-- Usually RLS is set on the table. Let's ensure the owner can UPDATE.

-- For store_ratings
CREATE POLICY "Users can update their own store ratings" ON store_ratings
FOR UPDATE USING (auth.uid() = user_id);

-- For product_ratings
CREATE POLICY "Users can update their own product ratings" ON product_ratings
FOR UPDATE USING (auth.uid() = user_id);
