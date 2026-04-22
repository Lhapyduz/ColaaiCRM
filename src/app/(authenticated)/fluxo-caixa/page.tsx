'use client';

import React, { useState, useEffect } from 'react';
import { FiDollarSign } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useSubscription } from '@/contexts/SubscriptionContext';

import { useCashFlowAnalytics } from '@/hooks/useCashFlowAnalytics';
import { deleteCashFlowEntry } from '@/repositories/dataAccess';

// Components
import PeriodFilter from '@/components/fluxo-caixa/PeriodFilter';
import CashFlowSummaryCards from '@/components/fluxo-caixa/CashFlowSummaryCards';
import DailySummaryList from '@/components/fluxo-caixa/DailySummaryList';
import CategoryRevenueCard from '@/components/fluxo-caixa/CategoryRevenueCard';
import TopCategoriesCard from '@/components/fluxo-caixa/TopCategoriesCard';
import TransactionList from '@/components/fluxo-caixa/TransactionList';

export default function FluxoCaixaPage() {
    const { canAccess, plan } = useSubscription();
    const toast = useToast();

    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Analytics Hook
    const {
        entries,
        loading,
        loadingEntries,
        refetchEntries,
        totals,
        globalCategorySummary,
        dailySummaries,
        dailyCategoryInfo,
        topCategories,
        getCategoryInfoForDate
    } = useCashFlowAnalytics(dateFrom, dateTo);

    const hasAccess = canAccess('cashFlow');

    // Initial Dates
    useEffect(() => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(to.toISOString().split('T')[0]);
    }, []);

    const setPeriodDates = (p: 'week' | 'month' | 'year') => {
        const now = new Date();
        let from: Date;
        if (p === 'week') {
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (p === 'month') {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            from = new Date(now.getFullYear(), 0, 1);
        }
        setPeriod(p);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(now.toISOString().split('T')[0]);
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta movimentação? Essa ação não pode ser desfeita.')) return;

        try {
            await deleteCashFlowEntry(id);
            toast.success('Movimentação excluída com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir movimentação:', error);
            toast.error('Erro ao excluir movimentação');
        }
    };

    if (!hasAccess) {
        return <UpgradePrompt feature="Fluxo de Caixa" requiredPlan="Avançado" currentPlan={plan} fullPage />;
    }

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Fluxo de Caixa</h1>
                    <p className="text-text-secondary">Acompanhe entradas e saídas</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        leftIcon={<FiDollarSign />}
                        onClick={() => refetchEntries()}
                        isLoading={loadingEntries}
                        title="Isso é feito automaticamente, mas você pode forçar uma atualização da nuvem"
                    >
                        Atualizar
                    </Button>
                </div>
            </div>

            <PeriodFilter
                period={period}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPeriodChange={setPeriodDates}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
            />

            <CashFlowSummaryCards
                income={totals.income}
                expense={totals.expense}
                ordersRevenue={totals.ordersRevenue}
                balance={totals.balance}
            />

            <div className="grid grid-cols-[2fr_1fr] gap-6 mb-6 max-[1024px]:grid-cols-1">
                <DailySummaryList
                    loading={loading}
                    summaries={dailySummaries}
                    getCategoryInfo={getCategoryInfoForDate}
                    hasCategoryData={dailyCategoryInfo.length > 0}
                />

                <div className="flex flex-col gap-4 max-[1024px]:flex-row max-md:flex-col">
                    <TopCategoriesCard type="income" data={topCategories('income')} />
                    
                    <CategoryRevenueCard categories={globalCategorySummary} />

                    <TopCategoriesCard type="expense" data={topCategories('expense')} />
                </div>
            </div>

            <TransactionList
                loading={loading}
                entries={entries}
                onDelete={handleDeleteEntry}
            />
        </div>
    );
}
