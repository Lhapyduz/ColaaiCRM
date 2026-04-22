'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCashFlowCache, useOrdersCache, useProductsCache, useCategoriesCache } from '@/hooks/useDataCache';

interface DailySummary {
    date: string;
    income: number;
    expense: number;
    balance: number;
}

interface CategoryDetail {
    name: string;
    count: number;
}

interface DailyCategoryInfo {
    date: string;
    itemCount: number;
    categories: CategoryDetail[];
}

interface GlobalCategoryRevenue {
    name: string;
    total: number;
    count: number;
}

export function useCashFlowAnalytics(dateFrom: string, dateTo: string) {
    const { entries, loading: loadingEntries, refetch: refetchEntries } = useCashFlowCache(dateFrom, dateTo);
    const { orders, loading: loadingOrders } = useOrdersCache();
    const { products } = useProductsCache();
    const { categories } = useCategoriesCache();

    const [ordersRevenue, setOrdersRevenue] = useState(0);
    const [dailyCategoryInfo, setDailyCategoryInfo] = useState<DailyCategoryInfo[]>([]);
    const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);

    const loading = loadingEntries || loadingOrders;

    const income = useMemo(() => 
        entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0), 
    [entries]);

    const expense = useMemo(() => 
        entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0), 
    [entries]);

    const globalCategorySummary = useMemo(() => {
        const catMap = new Map<string, { total: number; count: number }>();
        
        orders.forEach(order => {
            const date = (order.created_at || '').split('T')[0];
            if (order.payment_status === 'paid' && date && date >= dateFrom && date <= dateTo) {
                order.order_items?.forEach(item => {
                    const product = products.find(p => p.id === item.product_id);
                    const category = categories.find(c => c.id === product?.category_id);
                    const catName = category?.name || 'Outros';
                    
                    if (!catMap.has(catName)) catMap.set(catName, { total: 0, count: 0 });
                    const val = catMap.get(catName)!;
                    val.total += (item.total || (item.quantity * item.unit_price));
                    val.count += (item.quantity || 1);
                });
            }
        });

        return Array.from(catMap.entries())
            .map(([name, { total, count }]) => ({ name, total, count }))
            .sort((a, b) => b.total - a.total);
    }, [orders, products, categories, dateFrom, dateTo]);

    const topCategories = (type: 'income' | 'expense'): [string, number][] => {
        const counts = new Map<string, number>();
        entries.filter(e => e.type === type).forEach(e => {
            counts.set(e.category, (counts.get(e.category) || 0) + e.amount);
        });
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    const getCategoryInfoForDate = (date: string) => {
        return dailyCategoryInfo.find(info => info.date === date);
    };

    // Calculate order revenue and daily category info
    useEffect(() => {
        if (!orders || !dateFrom || !dateTo) return;
        
        const startDate = new Date(`${dateFrom}T00:00:00`);
        const endDate = new Date(`${dateTo}T23:59:59.999`);

        const filteredOrders = orders.filter(o => {
            const date = new Date(o.created_at || '');
            return o.payment_status === 'paid' && 
                   o.status !== 'cancelled' && 
                   date >= startDate && 
                   date <= endDate;
        });

        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        const frame = requestAnimationFrame(() => {
            setOrdersRevenue(totalRevenue);
            
            if (filteredOrders.length > 0) {
                const productCategoryMap = new Map<string, string>();
                products.forEach(p => {
                    if (p.category_id) {
                        const cat = categories.find(c => c.id === p.category_id);
                        if (cat) productCategoryMap.set(p.id, cat.name);
                    }
                });

                const dailyMap = new Map<string, { itemCount: number; categories: Map<string, number> }>();

                filteredOrders.forEach(order => {
                    const date = (order.created_at || '').split('T')[0];
                    if (!dailyMap.has(date)) {
                        dailyMap.set(date, { itemCount: 0, categories: new Map() });
                    }
                    const info = dailyMap.get(date)!;

                    order.order_items?.forEach(item => {
                        const quantity = item.quantity || 1;
                        info.itemCount += quantity;
                        
                        const categoryName = (item.product_id ? productCategoryMap.get(item.product_id) : null) || 'Sem Categoria';
                        const currentCatCount = info.categories.get(categoryName) || 0;
                        info.categories.set(categoryName, currentCatCount + quantity);
                    });
                });

                const result: DailyCategoryInfo[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
                    date,
                    itemCount: data.itemCount,
                    categories: Array.from(data.categories.entries()).map(([name, count]) => ({
                        name,
                        count
                    })).sort((a, b) => b.count - a.count)
                })).sort((a, b) => b.date.localeCompare(a.date));

                setDailyCategoryInfo(result);
            } else {
                setDailyCategoryInfo([]);
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [orders, products, categories, dateFrom, dateTo]);

    // Calculate daily summaries
    useEffect(() => {
        const summaryMap = new Map<string, { income: number; expense: number; orderRevenue: number }>();
        
        entries.forEach(entry => {
            if (!summaryMap.has(entry.transaction_date)) {
                summaryMap.set(entry.transaction_date, { income: 0, expense: 0, orderRevenue: 0 });
            }
            const s = summaryMap.get(entry.transaction_date)!;
            if (entry.type === 'income') s.income += entry.amount; else s.expense += entry.amount;
        });

        orders.filter(o => o.payment_status === 'paid' && o.created_at).forEach(order => {
            const date = (order.created_at || '').split('T')[0];
            if (date >= dateFrom && date <= dateTo) {
                if (!summaryMap.has(date)) {
                    summaryMap.set(date, { income: 0, expense: 0, orderRevenue: 0 });
                }
                const s = summaryMap.get(date)!;
                s.orderRevenue += (order.total || 0);
            }
        });

        const summaries: DailySummary[] = Array.from(summaryMap.entries()).map(([date, { income, expense, orderRevenue }]) => ({ 
            date, 
            income: income + orderRevenue, 
            expense, 
            balance: (income + orderRevenue) - expense 
        })).sort((a, b) => b.date.localeCompare(a.date));
        
        const frame = requestAnimationFrame(() => {
            setDailySummaries(summaries);
        });
        return () => cancelAnimationFrame(frame);
    }, [entries, orders, dateFrom, dateTo]);

    return {
        entries,
        loading,
        loadingEntries,
        refetchEntries,
        income,
        expense,
        ordersRevenue,
        globalCategorySummary,
        dailySummaries,
        dailyCategoryInfo,
        topCategories,
        getCategoryInfoForDate,
        totals: {
            income,
            expense,
            ordersRevenue,
            balance: (income + ordersRevenue) - expense
        }
    };
}
