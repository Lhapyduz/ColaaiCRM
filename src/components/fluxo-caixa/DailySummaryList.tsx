'use client';

import React, { useState } from 'react';
import { FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/utils/utils';

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

interface DailySummaryListProps {
    loading: boolean;
    summaries: DailySummary[];
    getCategoryInfo: (date: string) => DailyCategoryInfo | undefined;
    hasCategoryData: boolean;
}

export default function DailySummaryList({
    loading,
    summaries,
    getCategoryInfo,
    hasCategoryData
}: DailySummaryListProps) {
    const [showCategoryDetails, setShowCategoryDetails] = useState(true);

    const formatDateShort = (date: string) => 
        new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { 
            weekday: 'short', 
            day: '2-digit', 
            month: 'short' 
        });

    return (
        <Card className="max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Resumo Diário</h2>
                {hasCategoryData && (
                    <button
                        onClick={() => setShowCategoryDetails(!showCategoryDetails)}
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
                        title={showCategoryDetails ? 'Ocultar categorias' : 'Mostrar categorias'}
                    >
                        {showCategoryDetails ? (
                            <FiToggleRight className="text-primary text-xl" />
                        ) : (
                            <FiToggleLeft className="text-xl" />
                        )}
                        <span className="max-md:hidden">Categorias</span>
                    </button>
                )}
            </div>

            {loading ? (
                <div className="p-8 text-center text-text-secondary">Carregando...</div>
            ) : summaries.length === 0 ? (
                <div className="p-8 text-center text-text-muted">Nenhuma movimentação no período</div>
            ) : (
                <div className="flex flex-col">
                    {summaries.map(day => {
                        const categoryInfo = getCategoryInfo(day.date);
                        return (
                            <div key={day.date} className="py-3 border-b border-border last:border-b-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium min-w-[100px]">{formatDateShort(day.date)}</span>
                                    <div className="flex gap-4">
                                        <span className="text-sm text-[#27ae60]">+{formatCurrency(day.income)}</span>
                                        <span className="text-sm text-error">-{formatCurrency(day.expense)}</span>
                                    </div>
                                    <span className={cn(
                                        'font-semibold min-w-[100px] text-right',
                                        day.balance >= 0 ? 'text-[#27ae60]' : 'text-error'
                                    )}>
                                        {day.balance >= 0 ? '+' : ''}{formatCurrency(day.balance)}
                                    </span>
                                </div>
                                {showCategoryDetails && categoryInfo && categoryInfo.itemCount > 0 && (
                                    <div className="mt-2 pl-4 text-xs text-text-muted flex flex-wrap gap-2 items-center">
                                        <span className="font-medium text-text-secondary">
                                            {categoryInfo.itemCount} {categoryInfo.itemCount === 1 ? 'item' : 'itens'} vendido{categoryInfo.itemCount === 1 ? '' : 's'}:
                                        </span>
                                        {categoryInfo.categories.map((cat) => (
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
    );
}
