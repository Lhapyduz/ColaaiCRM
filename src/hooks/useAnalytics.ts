'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/infra/persistence/supabase';

export interface DailyAnalytics {
    id: string;
    user_id: string;
    date: string;
    total_revenue: number;
    total_orders: number;
    cancelled_orders: number;
    paid_orders: number;
    avg_order_value: number;
    delivery_orders: number;
    pickup_orders: number;
    dine_in_orders: number;
    new_customers: number;
    returning_customers: number;
    total_customers: number;
    first_time_customers: number;
    total_products_sold: number;
    peak_hour: number;
    peak_hour_orders: number;
    hourly_distribution: Record<string, number>;
    created_at: string;
    updated_at: string;
}

export interface CohortAnalytics {
    id: string;
    user_id: string;
    cohort_month: string;
    cohort_size: number;
    month_0_retention: number;
    month_1_retention: number;
    month_2_retention: number;
    month_3_retention: number;
    month_6_retention: number;
    month_12_retention: number;
    total_revenue: number;
    avg_ltv: number;
    total_orders: number;
    avg_orders_per_customer: number;
    new_customers: number;
    returning_customers: number;
    at_risk_customers: number;
    churned_customers: number;
}

export function useDailyAnalytics(userId: string | undefined, days = 30) {
    const [data, setData] = useState<DailyAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: analytics, error: fetchError } = await supabase
                    .from('daily_analytics')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                    .order('date', { ascending: false });

                if (fetchError) throw fetchError;
                setData(analytics || []);
            } catch (err) {
                console.error('Error fetching daily analytics:', err);
                setError('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, days]);

    const totals = data.reduce((acc, day) => ({
        revenue: acc.revenue + (day.total_revenue || 0),
        orders: acc.orders + (day.total_orders || 0),
        customers: acc.customers + (day.new_customers || 0),
        products: acc.products + (day.total_products_sold || 0),
    }), { revenue: 0, orders: 0, customers: 0, products: 0 });

    const avgDailyRevenue = data.length > 0 ? totals.revenue / data.length : 0;
    const avgDailyOrders = data.length > 0 ? totals.orders / data.length : 0;

    return { data, loading, error, totals, avgDailyRevenue, avgDailyOrders };
}

export function useCohortAnalytics(userId: string | undefined) {
    const [data, setData] = useState<CohortAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: analytics, error: fetchError } = await supabase
                    .from('cohort_analytics')
                    .select('*')
                    .eq('user_id', userId)
                    .order('cohort_month', { ascending: false })
                    .limit(12);

                if (fetchError) throw fetchError;
                setData(analytics || []);
            } catch (err) {
                console.error('Error fetching cohort analytics:', err);
                setError('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const avgRetention = data.length > 0
        ? data.reduce((acc, c) => acc + (c.month_3_retention || 0), 0) / data.length
        : 0;

    const avgLTV = data.length > 0
        ? data.reduce((acc, c) => acc + (c.avg_ltv || 0), 0) / data.length
        : 0;

    return { data, loading, error, avgRetention, avgLTV };
}

export async function populateDailyAnalyticsForDate(userId: string, date: string) {
    const { error } = await supabase.rpc('populate_daily_analytics', {
        p_user_id: userId,
        p_date: date
    });
    
    if (error) {
        console.error('Error populating daily analytics:', error);
        throw error;
    }
}

export async function backfillDailyAnalytics(userId: string) {
    const { error } = await supabase.rpc('backfill_daily_analytics', {
        p_user_id: userId
    });
    
    if (error) {
        console.error('Error backfilling daily analytics:', error);
        throw error;
    }
}

export async function calculateCohortRetention(userId: string, cohortMonth: string) {
    const { error } = await supabase.rpc('calculate_cohort_retention', {
        p_user_id: userId,
        p_cohort_month: cohortMonth
    });
    
    if (error) {
        console.error('Error calculating cohort:', error);
        throw error;
    }
}

export async function backfillCohortAnalytics(userId: string) {
    const { error } = await supabase.rpc('backfill_cohort_analytics', {
        p_user_id: userId
    });
    
    if (error) {
        console.error('Error backfilling cohort analytics:', error);
        throw error;
    }
}