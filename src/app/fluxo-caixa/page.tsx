'use client';

import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
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

export default function FluxoCaixaPage() {
    const { user } = useAuth();
    const { canAccess, plan } = useSubscription();
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const hasAccess = canAccess('cashFlow');

    useEffect(() => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(to.toISOString().split('T')[0]);
    }, []);

    useEffect(() => { if (user && dateFrom && dateTo && hasAccess) fetchData(); }, [user, dateFrom, dateTo, hasAccess]);

    if (!hasAccess) {
        return (<MainLayout><UpgradePrompt feature="Fluxo de Caixa" requiredPlan="Avançado" currentPlan={plan} fullPage /></MainLayout>);
    }

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase.from('cash_flow').select('*').eq('user_id', user.id).gte('transaction_date', dateFrom).lte('transaction_date', dateTo).order('transaction_date', { ascending: false });
        if (!error && data) { setEntries(data); calculateDailySummaries(data); }
        setLoading(false);
    };

    const calculateDailySummaries = (data: CashFlowEntry[]) => {
        const summaryMap = new Map<string, { income: number; expense: number }>();
        data.forEach(entry => {
            if (!summaryMap.has(entry.transaction_date)) summaryMap.set(entry.transaction_date, { income: 0, expense: 0 });
            const s = summaryMap.get(entry.transaction_date)!;
            if (entry.type === 'income') s.income += entry.amount; else s.expense += entry.amount;
        });
        const summaries: DailySummary[] = Array.from(summaryMap.entries()).map(([date, { income, expense }]) => ({ date, income, expense, balance: income - expense })).sort((a, b) => b.date.localeCompare(a.date));
        setDailySummaries(summaries);
    };

    const setPeriodDates = (p: 'week' | 'month' | 'year') => {
        const now = new Date();
        let from: Date;
        if (p === 'week') from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (p === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
        else from = new Date(now.getFullYear(), 0, 1);
        setPeriod(p);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(now.toISOString().split('T')[0]);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const formatDate = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

    const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totals = { income, expense, balance: income - expense };

    const categoryBreakdown = (type: 'income' | 'expense') => {
        const categories = new Map<string, number>();
        entries.filter(e => e.type === type).forEach(e => categories.set(e.category, (categories.get(e.category) || 0) + e.amount));
        return Array.from(categories.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    return (
        <MainLayout>
            <div className="max-w-[1200px] mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-[2rem] font-bold mb-2">Fluxo de Caixa</h1>
                        <p className="text-text-secondary">Acompanhe entradas e saídas</p>
                    </div>
                    <div className="flex gap-3">
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
                <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-1">
                    <Card className="flex items-center gap-4 p-6!">
                        <div className="w-12 h-12 flex items-center justify-center rounded-md text-2xl bg-[#27ae60]/10 text-[#27ae60]"><FiTrendingUp /></div>
                        <div className="flex flex-col"><span className="text-[0.8125rem] text-text-muted mb-1">Entradas</span><span className="text-2xl font-bold text-[#27ae60]">{formatCurrency(totals.income)}</span></div>
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
                        <h2 className="text-base font-semibold mb-4">Resumo Diário</h2>
                        {loading ? <div className="p-8 text-center text-text-secondary">Carregando...</div> : dailySummaries.length === 0 ? <div className="p-8 text-center text-text-muted">Nenhuma movimentação no período</div> : (
                            <div className="flex flex-col">
                                {dailySummaries.map(day => (
                                    <div key={day.date} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                                        <span className="font-medium min-w-[100px]">{formatDate(day.date)}</span>
                                        <div className="flex gap-4"><span className="text-sm text-[#27ae60]">+{formatCurrency(day.income)}</span><span className="text-sm text-error">-{formatCurrency(day.expense)}</span></div>
                                        <span className={cn('font-semibold min-w-[100px] text-right', day.balance >= 0 ? 'text-[#27ae60]' : 'text-error')}>{day.balance >= 0 ? '+' : ''}{formatCurrency(day.balance)}</span>
                                    </div>
                                ))}
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
        </MainLayout>
    );
}
