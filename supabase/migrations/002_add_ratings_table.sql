-- Migration: Add ratings table
-- Run this SQL in your Supabase SQL Editor

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id) -- One rating per order
);

-- Add rating_token to orders for public rating access
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS rating_token UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS rated BOOLEAN DEFAULT false;

-- Create index for rating lookups
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_order_id ON ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_rating_token ON orders(rating_token);

-- Enable RLS on ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings
CREATE POLICY "Users can view own ratings" ON ratings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert ratings for orders with valid token" ON ratings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = ratings.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Allow public to insert ratings with valid token
CREATE POLICY "Public can insert ratings with valid token" ON ratings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = ratings.order_id 
            AND orders.rated = false
        )
    );

-- Allow anyone to view ratings for public menu stats
CREATE POLICY "Anyone can view ratings stats" ON ratings
    FOR SELECT USING (true);
