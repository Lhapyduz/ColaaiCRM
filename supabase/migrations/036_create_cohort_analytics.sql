-- Creates cohort_analytics table for retention analysis
-- Run this migration to create the table

-- Cohort Analytics: tracks customer retention by acquisition month
CREATE TABLE IF NOT EXISTS cohort_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_month DATE NOT NULL,
    
    -- Cohort size
    cohort_size INTEGER DEFAULT 0,
    
    -- Retention rates
    month_0_retention DECIMAL(5,2) DEFAULT 100,
    month_1_retention DECIMAL(5,2) DEFAULT 0,
    month_2_retention DECIMAL(5,2) DEFAULT 0,
    month_3_retention DECIMAL(5,2) DEFAULT 0,
    month_6_retention DECIMAL(5,2) DEFAULT 0,
    month_12_retention DECIMAL(5,2) DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_ltv DECIMAL(10,2) DEFAULT 0,
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    avg_orders_per_customer DECIMAL(5,2) DEFAULT 0,
    
    -- Customer breakdown
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    at_risk_customers INTEGER DEFAULT 0,
    churned_customers INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, cohort_month)
);

-- Index for cohort queries
CREATE INDEX IF NOT EXISTS cohort_analytics_month_idx ON cohort_analytics(user_id, cohort_month DESC);

-- RLS policy
ALTER TABLE cohort_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cohort_analytics"
ON cohort_analytics FOR SELECT
USING (auth.uid() = user_id);

-- Function to calculate cohort retention
CREATE OR REPLACE FUNCTION calculate_cohort_retention(p_user_id UUID, p_cohort_month DATE)
RETURNS VOID AS $$
DECLARE
    v_cohort_size INTEGER := 0;
    v_retentions DECIMAL(5,2)[] := ARRAY[100, 0, 0, 0, 0, 0];
    v_total_revenue NUMERIC(12,2) := 0;
    v_total_orders INTEGER := 0;
    v_new_customers INTEGER := 0;
    v_returning_customers INTEGER := 0;
    v_order_month INTEGER;
    v_cust RECORD;
BEGIN
    -- Get customers who first ordered in the cohort month
    FOR v_cust IN
        SELECT 
            c.id,
            MIN(DATE(o.created_at)) AS first_order,
            ARRAY_AGG(EXTRACT(MONTH FROM DATE(o.created_at) - p_cohort_month)::INTEGER) AS order_months,
            SUM(o.total) AS customer_revenue,
            COUNT(o.id) AS customer_orders
        FROM customers c
        JOIN orders o ON o.customer_id = c.id AND o.payment_status = 'paid'
        WHERE c.user_id = p_user_id
            AND DATE(o.created_at) >= p_cohort_month
            AND DATE(o.created_at) < p_cohort_month + INTERVAL '1 month'
        GROUP BY c.id
        HAVING MIN(DATE(o.created_at)) >= p_cohort_month
            AND MIN(DATE(o.created_at)) < p_cohort_month + INTERVAL '1 month'
    LOOP
        v_cohort_size := v_cohort_size + 1;
        v_total_revenue := v_total_revenue + COALESCE(v_cust.customer_revenue, 0);
        v_total_orders := v_total_orders + v_cust.customer_orders;
        
        -- Calculate retention for each month
        IF v_cust.order_months IS NOT NULL THEN
            FOREACH v_order_month IN ARRAY v_cust.order_months LOOP
                IF v_order_month >= 1 AND v_order_month <= 12 THEN
                    v_retentions[v_order_month] := v_retentions[v_order_month] + 1;
                END IF;
            END LOOP;
        END IF;
        
        -- Customer status
        IF v_cust.order_months IS NULL OR array_position(v_cust.order_months, 0) IS NULL THEN
            v_new_customers := v_new_customers + 1;
        ELSIF array_length(v_cust.order_months, 1) > 1 THEN
            v_returning_customers := v_returning_customers + 1;
        END IF;
    END LOOP;

    -- Calculate retention percentages
    IF v_cohort_size > 0 THEN
        v_retentions[2] := (v_retentions[2]::NUMERIC / v_cohort_size) * 100;
        v_retentions[3] := (v_retentions[3]::NUMERIC / v_cohort_size) * 100;
        v_retentions[4] := (v_retentions[4]::NUMERIC / v_cohort_size) * 100;
        v_retentions[5] := (v_retentions[5]::NUMERIC / v_cohort_size) * 100;
        v_retentions[6] := (v_retentions[6]::NUMERIC / v_cohort_size) * 100;
    END IF;

    -- Upsert cohort data
    INSERT INTO cohort_analytics (
        user_id, cohort_month,
        cohort_size,
        month_0_retention, month_1_retention, month_2_retention,
        month_3_retention, month_6_retention, month_12_retention,
        total_revenue, avg_ltv,
        total_orders, avg_orders_per_customer,
        new_customers, returning_customers
    )
    VALUES (
        p_user_id, p_cohort_month,
        v_cohort_size,
        v_retentions[1], v_retentions[2], v_retentions[3],
        v_retentions[4], v_retentions[5], v_retentions[6],
        v_total_revenue, CASE WHEN v_cohort_size > 0 THEN v_total_revenue / v_cohort_size ELSE 0 END,
        v_total_orders, CASE WHEN v_cohort_size > 0 THEN v_total_orders::NUMERIC / v_cohort_size ELSE 0 END,
        v_new_customers, v_returning_customers
    )
    ON CONFLICT (user_id, cohort_month) DO UPDATE SET
        cohort_size = EXCLUDED.cohort_size,
        month_0_retention = EXCLUDED.month_0_retention,
        month_1_retention = EXCLUDED.month_1_retention,
        month_2_retention = EXCLUDED.month_2_retention,
        month_3_retention = EXCLUDED.month_3_retention,
        month_6_retention = EXCLUDED.month_6_retention,
        month_12_retention = EXCLUDED.month_12_retention,
        total_revenue = EXCLUDED.total_revenue,
        avg_ltv = EXCLUDED.avg_ltv,
        total_orders = EXCLUDED.total_orders,
        avg_orders_per_customer = EXCLUDED.avg_orders_per_customer,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to backfill all cohorts
CREATE OR REPLACE FUNCTION backfill_cohort_analytics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_months DATE[];
    v_month DATE;
BEGIN
    SELECT ARRAY_AGG(DISTINCT DATE_TRUNC('month', created_at))
    INTO v_months
    FROM orders
    WHERE user_id = p_user_id 
        AND created_at >= NOW() - INTERVAL '12 months'
        AND payment_status = 'paid';

    IF v_months IS NOT NULL THEN
        FOREACH v_month IN ARRAY v_months LOOP
            PERFORM calculate_cohort_retention(p_user_id, v_month);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON cohort_analytics TO authenticated;
GRANT ALL ON cohort_analytics TO service_role;
GRANT ALL ON FUNCTION calculate_cohort_retention TO service_role;
GRANT ALL ON FUNCTION backfill_cohort_analytics TO service_role;