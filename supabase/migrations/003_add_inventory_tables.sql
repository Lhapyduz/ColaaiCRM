-- Migration: Add inventory/stock management tables
-- Run this SQL in your Supabase SQL Editor

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- kg, g, ml, L, unidade, etc.
    current_stock DECIMAL(10, 3) DEFAULT 0,
    min_stock DECIMAL(10, 3) DEFAULT 0, -- Alert threshold
    cost_per_unit DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_movements table for tracking changes
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL, -- Positive for additions, negative for deductions
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'adjustment', 'waste')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_ingredients table (linking products to ingredients)
CREATE TABLE IF NOT EXISTS product_ingredients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
    quantity_used DECIMAL(10, 3) NOT NULL, -- Amount used per product unit
    UNIQUE(product_id, ingredient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingredients
CREATE POLICY "Users can view own ingredients" ON ingredients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ingredients" ON ingredients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingredients" ON ingredients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingredients" ON ingredients
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for stock_movements
CREATE POLICY "Users can view own stock movements" ON stock_movements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock movements" ON stock_movements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for product_ingredients
CREATE POLICY "Users can view own product ingredients" ON product_ingredients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_ingredients.product_id 
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own product ingredients" ON product_ingredients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_ingredients.product_id 
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own product ingredients" ON product_ingredients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_ingredients.product_id 
            AND products.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own product ingredients" ON product_ingredients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_ingredients.product_id 
            AND products.user_id = auth.uid()
        )
    );

-- Function to update ingredient stock after order
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct stock for each ingredient used in ordered products
    UPDATE ingredients
    SET current_stock = current_stock - (
        SELECT COALESCE(SUM(pi.quantity_used * oi.quantity), 0)
        FROM order_items oi
        JOIN product_ingredients pi ON pi.product_id = oi.product_id
        WHERE oi.order_id = NEW.id
        AND pi.ingredient_id = ingredients.id
    ),
    updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
