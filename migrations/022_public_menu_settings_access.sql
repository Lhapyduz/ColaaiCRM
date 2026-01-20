-- Migration: Allow public read access for menu features
-- Required for: coupon validation, loyalty display, and customer lookup on public menu

-- Allow anyone to read app_settings (for coupons_enabled, loyalty_enabled)
DROP POLICY IF EXISTS "Public can view app settings for menus" ON app_settings;
CREATE POLICY "Public can view app settings for menus" ON app_settings
    FOR SELECT USING (true);

-- Allow anyone to read loyalty_settings (for points display)
DROP POLICY IF EXISTS "Public can view loyalty settings for menus" ON loyalty_settings;
CREATE POLICY "Public can view loyalty settings for menus" ON loyalty_settings
    FOR SELECT USING (true);

-- Allow anyone to read coupons for validation (drop first to avoid conflict)
DROP POLICY IF EXISTS "Anyone can check coupons" ON coupons;
CREATE POLICY "Anyone can check coupons" ON coupons
    FOR SELECT USING (active = true);

-- Allow anyone to read customers by phone for loyalty lookup
DROP POLICY IF EXISTS "Public can lookup customers by phone" ON customers;
CREATE POLICY "Public can lookup customers by phone" ON customers
    FOR SELECT USING (true);

-- Allow public insert/update on customers for registration
DROP POLICY IF EXISTS "Public can create customers" ON customers;
CREATE POLICY "Public can create customers" ON customers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update customers" ON customers;
CREATE POLICY "Public can update customers" ON customers
    FOR UPDATE USING (true);
