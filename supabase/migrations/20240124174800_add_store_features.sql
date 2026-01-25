-- Add new columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS store_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS delivery_time_min INTEGER,
ADD COLUMN IF NOT EXISTS delivery_time_max INTEGER,
ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(7);

-- Create Opening Hours table
CREATE TABLE IF NOT EXISTS opening_hours (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day_of_week)
);

-- Create Store Ratings table
CREATE TABLE IF NOT EXISTS store_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The store owner being rated
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  customer_name VARCHAR(255), -- Optional, for anonymous ratings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Product Ratings table
CREATE TABLE IF NOT EXISTS product_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The store owner
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  customer_name VARCHAR(255), -- Optional
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

-- Opening Hours Policies
CREATE POLICY "Users can manage own opening hours" ON opening_hours
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view opening hours" ON opening_hours
  FOR SELECT USING (true);

-- Store Ratings Policies
CREATE POLICY "Store owners can view their ratings" ON store_ratings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public can insert store ratings" ON store_ratings
  FOR INSERT WITH CHECK (true);

-- Product Ratings Policies
CREATE POLICY "Store owners can view their product ratings" ON product_ratings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public can view product ratings" ON product_ratings
  FOR SELECT USING (true); -- Everyone can see product ratings

CREATE POLICY "Public can insert product ratings" ON product_ratings
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opening_hours_user ON opening_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_store_ratings_user ON store_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);
