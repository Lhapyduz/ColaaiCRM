'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiTrendingUp, FiTrendingDown, FiCalendar, FiRefreshCw, FiDollarSign, FiShoppingBag, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

interface CashFlowEntry {
    id: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    payment_method: string | null;
    transaction_date: string;
    created_at: string;
}

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

export default function FluxoCaixaPage() {
    const { user } = useAuth();
    const { canAccess, plan } = useSubscription();
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Novos estados para receita de pedidos e categorias
    const [ordersRevenue, setOrdersRevenue] = useState(0);
    const [loadingRevenue, setLoadingRevenue] = useState(false);
    const [showCategoryDetails, setShowCategoryDetails] = useState(true);
    const [dailyCategoryInfo, setDailyCategoryInfo] = useState<DailyCategoryInfo[]>([]);

    const hasAccess = canAccess('cashFlow');
    const toast = useToast();

    useEffect(() => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(to.toISOString().split('T')[0]);
    }, []);

    // Função para buscar receita de pedidos pagos
    const fetchOrdersRevenue = useCallback(async () => {
        if (!user || !dateFrom || !dateTo) return;
        setLoadingRevenue(true);
        try {
            const startDate = new Date(`${dateFrom}T00:00:00`);
            const endDate = new Date(`${dateTo}T23:59:59.999`);

            const { data: orders, error } = await supabase
                .from('orders')
                .select('id, total, payment_status, status, created_at')
                .eq('user_id', user.id)
                .eq('payment_status', 'paid')
                .neq('status', 'cancelled')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            if (error) throw error;

            const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
            setOrdersRevenue(totalRevenue);

            // Buscar detalhes de categorias por dia
            if (orders && orders.length > 0) {
                const orderIds = orders.map(o => o.id);

                const { data: orderItems } = await supabase
                    .from('order_items')
                    .select('order_id, product_id, quantity')
                    .in('order_id', orderIds);

                if (orderItems && orderItems.length > 0) {
                    const productIds = [...new Set(orderItems.map(item => item.product_id).filter(Boolean))];

                    const { data: products } = await supabase
                        .from('products')
                        .select('id, category_id')
                        .in('id', productIds);

                    const categoryIds = [...new Set(products?.map(p => p.category_id).filter(Boolean) || [])];

                    const { data: categories } = await supabase
                        .from('categories')
                        .select('id, name')
                        .in('id', categoryIds);

                    // Mapear produtos para categorias
                    const productCategoryMap = new Map<string, string>();
                    products?.forEach(p => {
                        if (p.category_id) {
                            const cat = categories?.find(c => c.id === p.category_id);
                            if (cat) productCategoryMap.set(p.id, cat.name);
                        }
                    });

                    // Agrupar por data
                    const dailyMap = new Map<string, { itemCount: number; categories: Map<string, number> }>();

                    orders.forEach(order => {
                        const date = order.created_at.split('T')[0];
                        if (!dailyMap.has(date)) {
                            dailyMap.set(date, { itemCount: 0, categories: new Map() });
                        }

                        const orderItemsForOrder = orderItems?.filter(item => item.order_id === order.id) || [];
                        orderItemsForOrder.forEach(item => {
                            const info = dailyMap.get(date)!;
                            info.itemCount += item.quantity;

                            const catName = productCategoryMap.get(item.product_id || '') || 'Outros';
                            info.categories.set(catName, (info.categories.get(catName) || 0) + item.quantity);
                        });
                    });

                    const categoryInfo: DailyCategoryInfo[] = Array.from(dailyMap.entries())
                        .map(([date, info]) => ({
                            date,
                            itemCount: info.itemCount,
                            categories: Array.from(info.categories.entries())
                                .map(([name, count]) => ({ name, count }))
                                .sort((a, b) => b.count - a.count)
                        }))
                        .sort((a, b) => b.date.localeCompare(a.date));

                    setDailyCategoryInfo(categoryInfo);
                }
            } else {
                setDailyCategoryInfo([]);
            }

            toast.success('Receita de pedidos importada!');
        } catch (error) {
            console.error('Erro ao buscar receita:', error);
            toast.error('Erro ao importar receita de pedidos');
        } finally {
            setLoadingRevenue(false);
        }
    }, [user, dateFrom, dateTo, toast]);

    if (!hasAccess) {
        return <UpgradePrompt feature="Fluxo de Caixa" requiredPlan="Avançado" currentPlan={plan} fullPage />;
    }

    const calculateDailySummaries = useCallback((data: CashFlowEntry[]) => {
        const summaryMap = new Map<string, { income: number; expense: number }>();
        data.forEach(entry => {
            if (!summaryMap.has(entry.transaction_date)) summaryMap.set(entry.transaction_date, { income: 0, expense: 0 });
            const s = summaryMap.get(entry.transaction_date)!;
            if (entry.type === 'income') s.income += entry.amount; else s.expense += entry.amount;
        });
        const summaries: DailySummary[] = Array.from(summaryMap.entries()).map(([date, { income, expense }]) => ({ date, income, expense, balance: income - expense })).sort((a, b) => b.date.localeCompare(a.date));
        setDailySummaries(summaries);
    }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase.from('cash_flow').select('*').eq('user_id', user.id).gte('transaction_date', dateFrom).lte('transaction_date', dateTo).order('transaction_date', { ascending: false });
        if (!error && data) { setEntries(data); calculateDailySummaries(data); }
        setLoading(false);
    }, [user, dateFrom, dateTo, calculateDailySummaries]);

    useEffect(() => {
        if (user && dateFrom && dateTo && hasAccess) fetchData();
    }, [user, dateFrom, dateTo, hasAccess, fetchData]);

    const setPeriodDates = (p: 'week' | 'month' | 'year') => {
        const now = new Date();
        let from: Date;
        if (p === 'week') from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (p === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
        else from = new Date(now.getFullYear(), 0, 1);
        setPeriod(p);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(now.toISOString().split('T')[0]);
        // Reset orders revenue when period changes
        setOrdersRevenue(0);
        setDailyCategoryInfo([]);
    };

    const formatDateShort = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

    const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totals = { income, expense, balance: income - expense };

    // Total combinado: entradas + receita de pedidos
    const totalCombined = totals.income + ordersRevenue;

    const categoryBreakdown = (type: 'income' | 'expense') => {
        const categories = new Map<string, number>();
        entries.filter(e => e.type === type).forEach(e => categories.set(e.category, (categories.get(e.category) || 0) + e.amount));
        return Array.from(categories.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    // Helper para obter info de categoria de um dia específico
    const getCategoryInfoForDate = (date: string) => {
        return dailyCategoryInfo.find(info => info.date === date);
    };

    return (
        <div className="max-w-[1200px] mx-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Fluxo de Caixa</h1>
                    <p className="text-text-secondary">Acompanhe entradas e saídas</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        leftIcon={<FiDollarSign />}
                        onClick={fetchOrdersRevenue}
                        isLoading={loadingRevenue}
                    >
                        Importar Receita
                    </Button>
                    <Button variant="outline" leftIcon={<FiRefreshCw />} onClick={fetchData}>Atualizar</Button>
                </div>
            </div>

            {/* Period Filter */}
            <div className="flex justify-between items-center mb-6 gap-4 flex-wrap max-md:flex-col max-md:items-stretch">
                <div className="flex gap-2">
                    {[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' }, { value: 'year', label: 'Ano' }].map(p => (
                        <button key={p.value} className={cn('px-5 py-2.5 bg-bg-tertiary border border-border rounded-md text-text-secondary text-sm font-medium cursor-pointer transition-all duration-fast hover:border-primary', period === p.value && 'bg-primary border-primary text-white')} onClick={() => setPeriodDates(p.value as 'week' | 'month' | 'year')}>{p.label}</button>
                    ))}
                </div>
                <div className="flex items-center gap-3 text-text-muted max-md:flex-wrap">
                    <FiCalendar />
                    <input type="date" className="px-3.5 py-2.5 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span>até</span>
                    <input type="date" className="px-3.5 py-2.5 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-1 max-lg:grid-cols-2">
                <Card className="flex items-center gap-4 p-6!">
                    <div className="w-12 h-12 flex items-center justify-center rounded-md text-2xl bg-[#27ae60]/10 text-[#27ae60]"><FiTrendingUp /></div>
                    <div className="flex flex-col"><span className="text-[0.8125rem] text-text-muted mb-1">Entradas</span><span className="text-2xl font-bold text-[#27ae60]">{formatCurrency(totals.income)}</span></div>
                </Card>
                <Card className="flex items-center gap-4 p-6!">
                    <div className="w-12 h-12 flex items-center justify-center rounded-md text-2xl bg-primary/10 text-primary"><FiShoppingBag /></div>
                    <div className="flex flex-col">
                        <span className="text-[0.8125rem] text-text-muted mb-1">Receita de Pedidos</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(ordersRevenue)}</span>
                        {ordersRevenue > 0 && <span className="text-xs text-text-muted mt-0.5">Total: {formatCurrency(totalCombined)}</span>}
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-6!">
                    <div className="w-12 h-12 flex items-center justify-center rounded-md text-2xl bg-error/10 text-error"><FiTrendingDown /></div>
                    <div className="flex flex-col"><span className="text-[0.8125rem] text-text-muted mb-1">Saídas</span><span className="text-2xl font-bold text-error">{formatCurrency(totals.expense)}</span></div>
                </Card>
                <Card className="flex items-center gap-4 p-6!">
                    <div className="flex flex-col"><span className="text-[0.8125rem] text-text-muted mb-1">Saldo do Período</span><span className={cn('text-2xl font-bold', totals.balance >= 0 ? 'text-[#27ae60]' : 'text-error')}>{totals.balance >= 0 ? '+' : ''}{formatCurrency(totals.balance)}</span></div>
                </Card>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-6 mb-6 max-[1024px]:grid-cols-1">
                {/* Daily Summary */}
                <Card className="max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold">Resumo Diário</h2>
                        {dailyCategoryInfo.length > 0 && (
                            <button
                                onClick={() => setShowCategoryDetails(!showCategoryDetails)}
                                className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
                                title={showCategoryDetails ? 'Ocultar categorias' : 'Mostrar categorias'}
                            >
                                {showCategoryDetails ? <FiToggleRight className="text-primary text-xl" /> : <FiToggleLeft className="text-xl" />}
                                <span className="max-md:hidden">Categorias</span>
                            </button>
                        )}
                    </div>
                    {loading ? <div className="p-8 text-center text-text-secondary">Carregando...</div> : dailySummaries.length === 0 ? <div className="p-8 text-center text-text-muted">Nenhuma movimentação no período</div> : (
                        <div className="flex flex-col">
                            {dailySummaries.map(day => {
                                const categoryInfo = getCategoryInfoForDate(day.date);
                                return (
                                    <div key={day.date} className="py-3 border-b border-border last:border-b-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium min-w-[100px]">{formatDateShort(day.date)}</span>
                                            <div className="flex gap-4"><span className="text-sm text-[#27ae60]">+{formatCurrency(day.income)}</span><span className="text-sm text-error">-{formatCurrency(day.expense)}</span></div>
                                            <span className={cn('font-semibold min-w-[100px] text-right', day.balance >= 0 ? 'text-[#27ae60]' : 'text-error')}>{day.balance >= 0 ? '+' : ''}{formatCurrency(day.balance)}</span>
                                        </div>
                                        {showCategoryDetails && categoryInfo && categoryInfo.itemCount > 0 && (
                                            <div className="mt-2 pl-4 text-xs text-text-muted flex flex-wrap gap-2 items-center">
                                                <span className="font-medium text-text-secondary">{categoryInfo.itemCount} {categoryInfo.itemCount === 1 ? 'item' : 'itens'} vendido{categoryInfo.itemCount === 1 ? '' : 's'}:</span>
                                                {categoryInfo.categories.map((cat, idx) => (
                                                    <span key={cat.name} className="bg-bg-tertiary px-2 py-0.5 rounded-full">
                                                        {cat.name}: {cat.count}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* Category Breakdown */}
                <div className="flex flex-col gap-4 max-[1024px]:flex-row max-md:flex-col">
                    <Card className="p-4! flex-1">
                        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3 text-text-secondary"><FiTrendingUp /> Top Entradas</h3>
                        <div className="flex flex-col gap-2">{categoryBreakdown('income').map(([category, amount]) => <div key={category} className="flex justify-between text-sm"><span>{category}</span><span className="font-medium">{formatCurrency(amount)}</span></div>)}{categoryBreakdown('income').length === 0 && <p className="text-text-muted text-sm text-center py-4">Sem dados</p>}</div>
                    </Card>
                    <Card className="p-4! flex-1">
                        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3 text-text-secondary"><FiTrendingDown /> Top Saídas</h3>
                        <div className="flex flex-col gap-2">{categoryBreakdown('expense').map(([category, amount]) => <div key={category} className="flex justify-between text-sm"><span>{category}</span><span className="font-medium">{formatCurrency(amount)}</span></div>)}{categoryBreakdown('expense').length === 0 && <p className="text-text-muted text-sm text-center py-4">Sem dados</p>}</div>
                    </Card>
                </div>
            </div>

            {/* Transactions */}
            <Card>
                <h2 className="text-base font-semibold mb-4">Movimentações</h2>
                {loading ? <div className="p-8 text-center text-text-secondary">Carregando...</div> : entries.length === 0 ? (
                    <div className="p-8 text-center text-text-muted"><p>Nenhuma movimentação registrada</p><small className="block mt-2 text-xs">As movimentações são criadas automaticamente ao marcar contas como pagas</small></div>
                ) : (
                    <div className="flex flex-col">
                        {entries.map(entry => (
                            <div key={entry.id} className="grid grid-cols-[40px_1fr_120px_120px] items-center gap-4 py-3 border-b border-border last:border-b-0 max-md:grid-cols-[40px_1fr_80px]">
                                <div className={cn('w-9 h-9 flex items-center justify-center rounded-full text-base', entry.type === 'income' ? 'bg-[#27ae60]/10 text-[#27ae60]' : 'bg-error/10 text-error')}>
                                    {entry.type === 'income' ? <FiTrendingUp /> : <FiTrendingDown />}
                                </div>
                                <div className="flex flex-col gap-0.5"><span className="font-medium">{entry.description}</span><span className="text-xs text-text-muted">{entry.category}</span></div>
                                <div className="flex flex-col items-end max-md:hidden"><span className="text-[0.8125rem]">{new Date(entry.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>{entry.payment_method && <span className="text-xs text-text-muted">{entry.payment_method}</span>}</div>
                                <span className={cn('font-semibold text-right', entry.type === 'income' ? 'text-[#27ae60]' : 'text-error')}>{entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
