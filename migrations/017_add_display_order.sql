-- Migration: Add display_order column to content tables
-- This allows custom ordering of categories, products, addon_groups, and addon_group_items

-- Add display_order to categories
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add display_order to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add display_order to addon_groups
ALTER TABLE addon_groups 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add display_order to addon_group_items (individual addons)
ALTER TABLE addon_group_items 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_addon_groups_display_order ON addon_groups(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_addon_group_items_display_order ON addon_group_items(group_id, display_order);

-- Comments
COMMENT ON COLUMN categories.display_order IS 'Custom display order for drag-and-drop reordering';
COMMENT ON COLUMN products.display_order IS 'Custom display order for drag-and-drop reordering';
COMMENT ON COLUMN addon_groups.display_order IS 'Custom display order for drag-and-drop reordering';
COMMENT ON COLUMN addon_group_items.display_order IS 'Custom display order for drag-and-drop reordering';
