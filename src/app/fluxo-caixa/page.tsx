'use client';

import React, { useState, useEffect } from 'react';
import {
    FiTrendingUp,
    FiTrendingDown,
    FiCalendar,
    FiFilter,
    FiDownload,
    FiRefreshCw
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

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
        // Set default date range
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(to.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (user && dateFrom && dateTo && hasAccess) {
            fetchData();
        }
    }, [user, dateFrom, dateTo, hasAccess]);

    // Check access after hooks
    if (!hasAccess) {
        return (
            <MainLayout>
                <UpgradePrompt
                    feature="Fluxo de Caixa"
                    requiredPlan="Avançado"
                    currentPlan={plan}
                    fullPage
                />
            </MainLayout>
        );
    }

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('cash_flow')
            .select('*')
            .eq('user_id', user.id)
            .gte('transaction_date', dateFrom)
            .lte('transaction_date', dateTo)
            .order('transaction_date', { ascending: false });

        if (!error && data) {
            setEntries(data);
            calculateDailySummaries(data);
        }
        setLoading(false);
    };

    const calculateDailySummaries = (data: CashFlowEntry[]) => {
        const summaryMap = new Map<string, { income: number; expense: number }>();

        data.forEach(entry => {
            const date = entry.transaction_date;
            if (!summaryMap.has(date)) {
                summaryMap.set(date, { income: 0, expense: 0 });
            }
            const summary = summaryMap.get(date)!;
            if (entry.type === 'income') {
                summary.income += entry.amount;
            } else {
                summary.expense += entry.amount;
            }
        });

        const summaries: DailySummary[] = Array.from(summaryMap.entries())
            .map(([date, { income, expense }]) => ({
                date,
                income,
                expense,
                balance: income - expense
            }))
            .sort((a, b) => b.date.localeCompare(a.date));

        setDailySummaries(summaries);
    };

    const setPeriodDates = (p: 'week' | 'month' | 'year') => {
        const now = new Date();
        let from: Date;

        switch (p) {
            case 'week':
                from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                from = new Date(now.getFullYear(), 0, 1);
                break;
        }

        setPeriod(p);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(now.toISOString().split('T')[0]);
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (date: string) =>
        new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short'
        });

    const income = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totals = {
        income,
        expense,
        balance: income - expense
    };

    const categoryBreakdown = (type: 'income' | 'expense') => {
        const categories = new Map<string, number>();
        entries.filter(e => e.type === type).forEach(e => {
            categories.set(e.category, (categories.get(e.category) || 0) + e.amount);
        });
        return Array.from(categories.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Fluxo de Caixa</h1>
                        <p className={styles.subtitle}>Acompanhe entradas e saídas</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Button
                            variant="outline"
                            leftIcon={<FiRefreshCw />}
                            onClick={fetchData}
                        >
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Period Filter */}
                <div className={styles.periodFilter}>
                    <div className={styles.periodButtons}>
                        {[
                            { value: 'week', label: 'Semana' },
                            { value: 'month', label: 'Mês' },
                            { value: 'year', label: 'Ano' }
                        ].map(p => (
                            <button
                                key={p.value}
                                className={`${styles.periodBtn} ${period === p.value ? styles.active : ''}`}
                                onClick={() => setPeriodDates(p.value as 'week' | 'month' | 'year')}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className={styles.dateRange}>
                        <FiCalendar />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <span>até</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className={styles.summaryGrid}>
                    <Card className={`${styles.summaryCard} ${styles.income}`}>
                        <div className={styles.summaryIcon}>
                            <FiTrendingUp />
                        </div>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>Entradas</span>
                            <span className={styles.summaryValue}>{formatCurrency(totals.income)}</span>
                        </div>
                    </Card>
                    <Card className={`${styles.summaryCard} ${styles.expense}`}>
                        <div className={styles.summaryIcon}>
                            <FiTrendingDown />
                        </div>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>Saídas</span>
                            <span className={styles.summaryValue}>{formatCurrency(totals.expense)}</span>
                        </div>
                    </Card>
                    <Card className={`${styles.summaryCard} ${totals.balance >= 0 ? styles.positive : styles.negative}`}>
                        <div className={styles.summaryContent}>
                            <span className={styles.summaryLabel}>Saldo do Período</span>
                            <span className={styles.summaryValue}>
                                {totals.balance >= 0 ? '+' : ''}{formatCurrency(totals.balance)}
                            </span>
                        </div>
                    </Card>
                </div>

                <div className={styles.contentGrid}>
                    {/* Daily Summary */}
                    <Card className={styles.dailyCard}>
                        <h2 className={styles.cardTitle}>Resumo Diário</h2>
                        {loading ? (
                            <div className={styles.loading}>Carregando...</div>
                        ) : dailySummaries.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>Nenhuma movimentação no período</p>
                            </div>
                        ) : (
                            <div className={styles.dailyList}>
                                {dailySummaries.map(day => (
                                    <div key={day.date} className={styles.dailyRow}>
                                        <span className={styles.dailyDate}>{formatDate(day.date)}</span>
                                        <div className={styles.dailyValues}>
                                            <span className={styles.dailyIncome}>+{formatCurrency(day.income)}</span>
                                            <span className={styles.dailyExpense}>-{formatCurrency(day.expense)}</span>
                                        </div>
                                        <span className={`${styles.dailyBalance} ${day.balance >= 0 ? styles.positive : styles.negative}`}>
                                            {day.balance >= 0 ? '+' : ''}{formatCurrency(day.balance)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Category Breakdown */}
                    <div className={styles.breakdownCards}>
                        <Card className={styles.breakdownCard}>
                            <h3 className={styles.breakdownTitle}>
                                <FiTrendingUp /> Top Entradas
                            </h3>
                            <div className={styles.breakdownList}>
                                {categoryBreakdown('income').map(([category, amount]) => (
                                    <div key={category} className={styles.breakdownItem}>
                                        <span className={styles.breakdownCategory}>{category}</span>
                                        <span className={styles.breakdownAmount}>{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                                {categoryBreakdown('income').length === 0 && (
                                    <p className={styles.noData}>Sem dados</p>
                                )}
                            </div>
                        </Card>
                        <Card className={styles.breakdownCard}>
                            <h3 className={styles.breakdownTitle}>
                                <FiTrendingDown /> Top Saídas
                            </h3>
                            <div className={styles.breakdownList}>
                                {categoryBreakdown('expense').map(([category, amount]) => (
                                    <div key={category} className={styles.breakdownItem}>
                                        <span className={styles.breakdownCategory}>{category}</span>
                                        <span className={styles.breakdownAmount}>{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                                {categoryBreakdown('expense').length === 0 && (
                                    <p className={styles.noData}>Sem dados</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Transactions Table */}
                <Card>
                    <h2 className={styles.cardTitle}>Movimentações</h2>
                    {loading ? (
                        <div className={styles.loading}>Carregando...</div>
                    ) : entries.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>Nenhuma movimentação registrada</p>
                            <small>As movimentações são criadas automaticamente ao marcar contas como pagas</small>
                        </div>
                    ) : (
                        <div className={styles.transactionsList}>
                            {entries.map(entry => (
                                <div key={entry.id} className={styles.transactionRow}>
                                    <div className={`${styles.transactionType} ${entry.type === 'income' ? styles.income : styles.expense}`}>
                                        {entry.type === 'income' ? <FiTrendingUp /> : <FiTrendingDown />}
                                    </div>
                                    <div className={styles.transactionInfo}>
                                        <span className={styles.transactionDescription}>{entry.description}</span>
                                        <span className={styles.transactionCategory}>{entry.category}</span>
                                    </div>
                                    <div className={styles.transactionMeta}>
                                        <span className={styles.transactionDate}>
                                            {new Date(entry.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </span>
                                        {entry.payment_method && (
                                            <span className={styles.transactionMethod}>{entry.payment_method}</span>
                                        )}
                                    </div>
                                    <span className={`${styles.transactionAmount} ${entry.type === 'income' ? styles.income : styles.expense}`}>
                                        {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </MainLayout>
    );
}
