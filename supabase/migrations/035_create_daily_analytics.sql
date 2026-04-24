-- Creates daily_analytics aggregate table for faster report queries
-- Run this migration to create the table

-- Daily Analytics: aggregates order data per day for quick reporting
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Revenue metrics
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    paid_orders INTEGER DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Order type breakdown
    delivery_orders INTEGER DEFAULT 0,
    pickup_orders INTEGER DEFAULT 0,
    dine_in_orders INTEGER DEFAULT 0,
    
    -- Customer metrics
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    first_time_customers INTEGER DEFAULT 0,
    
    -- Product metrics
    total_products_sold INTEGER DEFAULT 0,
    unique_products_sold INTEGER DEFAULT 0,
    
    -- Time metrics
    avg_prep_time_minutes INTEGER DEFAULT 0,
    
    -- Peak hour data
    peak_hour INTEGER,
    peak_hour_orders INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Index for fast date range queries
CREATE INDEX IF NOT EXISTS daily_analytics_date_idx ON daily_analytics(user_id, date DESC);

-- RLS policy
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily_analytics"
ON daily_analytics FOR SELECT
USING (auth.uid() = user_id);

-- Function to populate daily_analytics from orders (simplified version)
CREATE OR REPLACE FUNCTION populate_daily_analytics(p_user_id UUID, p_date DATE)
RETURNS VOID AS $$
DECLARE
    v_order RECORD;
    v_total_revenue NUMERIC(10,2) := 0;
    v_total_orders INTEGER := 0;
    v_paid_orders INTEGER := 0;
    v_cancelled_orders INTEGER := 0;
    v_delivery_orders INTEGER := 0;
    v_pickup_orders INTEGER := 0;
    v_dine_in_orders INTEGER := 0;
    v_new_customers INTEGER := 0;
    v_returning_customers INTEGER := 0;
    v_total_customers INTEGER := 0;
    v_first_time_customers INTEGER := 0;
    v_total_products_sold INTEGER := 0;
    v_unique_products_sold INTEGER := 0;
    v_peak_hour INTEGER := 0;
    v_peak_hour_orders INTEGER := 0;
    v_hour_key TEXT;
    v_hour_val INTEGER;
    v_found_order DATE;
BEGIN
    -- Loop through orders for the day
    FOR v_order IN
        SELECT 
            o.id, o.total, o.status, o.payment_status, 
            COALESCE(o.is_delivery, false) AS is_delivery, 
            o.customer_id,
            EXTRACT(HOUR FROM o.created_at) AS hour
        FROM orders o
        WHERE o.user_id = p_user_id 
            AND DATE(o.created_at) = p_date
    LOOP
        v_total_orders := v_total_orders + 1;
        
        -- Revenue and status tracking
        IF v_order.payment_status = 'paid' THEN
            v_paid_orders := v_paid_orders + 1;
            v_total_revenue := v_total_revenue + COALESCE(v_order.total, 0);
            
            IF v_order.status = 'cancelled' THEN
                v_cancelled_orders := v_cancelled_orders + 1;
            ELSE
                IF v_order.is_delivery = true THEN
                    v_delivery_orders := v_delivery_orders + 1;
                ELSE
                    v_pickup_orders := v_pickup_orders + 1;
                END IF;
            END IF;
        END IF;
        
        -- Check for first order
        IF v_order.customer_id IS NOT NULL THEN
            SELECT MIN(DATE(o2.created_at)) INTO v_found_order
            FROM orders o2
            WHERE o2.user_id = p_user_id 
                AND o2.customer_id = v_order.customer_id
                AND DATE(o2.created_at) < p_date;
            
            IF v_found_order IS NULL THEN
                v_first_time_customers := v_first_time_customers + 1;
            ELSE
                v_returning_customers := v_returning_customers + 1;
            END IF;
        END IF;
        
        -- Track peak hour
        IF v_order.hour IS NOT NULL THEN
            IF v_order.hour > v_peak_hour_orders THEN
                v_peak_hour := v_order.hour;
                v_peak_hour_orders := 1;
            ELSIF v_order.hour = v_peak_hour THEN
                v_peak_hour_orders := v_peak_hour_orders + 1;
            END IF;
        END IF;
    END LOOP;

    -- Get unique customers count
    SELECT COUNT(DISTINCT customer_id) INTO v_total_customers
    FROM orders
    WHERE user_id = p_user_id 
        AND DATE(created_at) = p_date
        AND customer_id IS NOT NULL;

    -- Get product stats
    SELECT 
        COALESCE(SUM(oi.quantity), 0)::INTEGER,
        COUNT(DISTINCT oi.product_id)::INTEGER
    INTO v_total_products_sold, v_unique_products_sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = p_user_id 
        AND DATE(o.created_at) = p_date
        AND o.payment_status = 'paid';

    -- Upsert the daily record
    INSERT INTO daily_analytics (
        user_id, date,
        total_revenue, total_orders, cancelled_orders, paid_orders,
        delivery_orders, pickup_orders, dine_in_orders,
        new_customers, returning_customers, total_customers, first_time_customers,
        total_products_sold, unique_products_sold,
        peak_hour, peak_hour_orders
    )
    VALUES (
        p_user_id, p_date,
        v_total_revenue, v_total_orders, v_cancelled_orders, v_paid_orders,
        v_delivery_orders, v_pickup_orders, v_dine_in_orders,
        v_first_time_customers, v_returning_customers, v_total_customers, v_first_time_customers,
        v_total_products_sold, v_unique_products_sold,
        v_peak_hour, v_peak_hour_orders
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_orders = EXCLUDED.total_orders,
        cancelled_orders = EXCLUDED.cancelled_orders,
        paid_orders = EXCLUDED.paid_orders,
        delivery_orders = EXCLUDED.delivery_orders,
        pickup_orders = EXCLUDED.pickup_orders,
        dine_in_orders = EXCLUDED.dine_in_orders,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        total_customers = EXCLUDED.total_customers,
        first_time_customers = EXCLUDED.first_time_customers,
        total_products_sold = EXCLUDED.total_products_sold,
        unique_products_sold = EXCLUDED.unique_products_sold,
        peak_hour = EXCLUDED.peak_hour,
        peak_hour_orders = EXCLUDED.peak_hour_orders,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to backfill historical data
CREATE OR REPLACE FUNCTION backfill_daily_analytics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_date DATE;
BEGIN
    FOR v_date IN
        SELECT DISTINCT DATE(created_at)
        FROM orders
        WHERE user_id = p_user_id 
            AND created_at >= NOW() - INTERVAL '90 days'
            AND payment_status = 'paid'
    LOOP
        PERFORM populate_daily_analytics(p_user_id, v_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON daily_analytics TO authenticated;
GRANT ALL ON daily_analytics TO service_role;
GRANT ALL ON FUNCTION populate_daily_analytics TO service_role;
GRANT ALL ON FUNCTION backfill_daily_analytics TO service_role;