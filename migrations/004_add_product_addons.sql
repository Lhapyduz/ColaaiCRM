-- Migration: Add product add-ons/extras system
-- Run this SQL in your Supabase SQL Editor

-- Create product_addons table (add-ons that can be attached to products)
CREATE TABLE IF NOT EXISTS product_addons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create addon_groups table (for grouping addons like "Molhos", "Extras", etc.)
CREATE TABLE IF NOT EXISTS addon_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_selection INTEGER DEFAULT 0, -- Minimum required selections
    max_selection INTEGER DEFAULT 1, -- Maximum allowed selections (NULL = unlimited)
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link addons to groups
CREATE TABLE IF NOT EXISTS addon_group_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES addon_groups(id) ON DELETE CASCADE NOT NULL,
    addon_id UUID REFERENCES product_addons(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(group_id, addon_id)
);

-- Link addon groups to products
CREATE TABLE IF NOT EXISTS product_addon_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES addon_groups(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(product_id, group_id)
);

-- Store order item addons
CREATE TABLE IF NOT EXISTS order_item_addons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
    addon_id UUID REFERENCES product_addons(id) ON DELETE SET NULL,
    addon_name VARCHAR(255) NOT NULL, -- Store name at time of order
    addon_price DECIMAL(10, 2) NOT NULL, -- Store price at time of order
    quantity INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_addons_user ON product_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_addon_groups_user ON addon_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_product_addon_groups_product ON product_addon_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_order_item_addons_order_item ON order_item_addons(order_item_id);

-- Enable RLS
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_addons
CREATE POLICY "Users can view own addons" ON product_addons
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addons" ON product_addons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addons" ON product_addons
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addons" ON product_addons
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for addon_groups
CREATE POLICY "Users can view own addon groups" ON addon_groups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addon groups" ON addon_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addon groups" ON addon_groups
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addon groups" ON addon_groups
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for addon_group_items (based on addon ownership)
CREATE POLICY "Users can manage addon group items" ON addon_group_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM addon_groups 
            WHERE addon_groups.id = addon_group_items.group_id 
            AND addon_groups.user_id = auth.uid()
        )
    );

-- RLS Policies for product_addon_groups
CREATE POLICY "Users can manage product addon groups" ON product_addon_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_addon_groups.product_id 
            AND products.user_id = auth.uid()
        )
    );

-- RLS Policies for order_item_addons
CREATE POLICY "Users can manage order item addons" ON order_item_addons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.id = order_item_addons.order_item_id 
            AND o.user_id = auth.uid()
        )
    );
