'use client';

import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiShoppingBag } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/utils/utils';

interface CashFlowSummaryCardsProps {
    income: number;
    expense: number;
    ordersRevenue: number;
    balance: number;
}

export default function CashFlowSummaryCards({
    income,
    expense,
    ordersRevenue,
    balance
}: CashFlowSummaryCardsProps) {
    const totalCombined = income + ordersRevenue;

    return (
        <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-1 max-lg:grid-cols-2">
            <Card className="flex items-center gap-4 p-6!">
                <div className="w-12 h-12 flex items-center justify-center rounded-md text-2xl bg-[#27ae60]/10 text-[#27ae60]">
                    <FiTrendingUp />
                </div>
                <div className="flex flex-col">
                    <span className="text-[0.8125rem] text-text-muted mb-1">Entradas</span>
                    <span className="text-2xl font-bold text-[#27ae60]">{formatCurrency(income)}</span>
                </div>
            </Card>

            <Card className="flex items-center gap-4 p-6!">
                <div className="w-12 h-12 flex items-center justify-center rounded-md text-2xl bg-primary/10 text-primary">
                    <FiShoppingBag />
                </div>
                <div className="flex flex-col">
                    <span className="text-[0.8125rem] text-text-muted mb-1">Receita de Pedidos</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(ordersRevenue)}</span>
                    {ordersRevenue > 0 && (
                        <span className="text-xs text-text-muted mt-0.5">
                            Total: {formatCurrency(totalCombined)}
                        </span>
                    )}
                </div>
            </Card>

            <Card className="flex items-center gap-4 p-6!">
                <div className="w-12 h-12 flex items-center justify-center rounded-md text-2xl bg-error/10 text-error">
                    <FiTrendingDown />
                </div>
                <div className="flex flex-col">
                    <span className="text-[0.8125rem] text-text-muted mb-1">Saídas</span>
                    <span className="text-2xl font-bold text-error">{formatCurrency(expense)}</span>
                </div>
            </Card>

            <Card className="flex items-center gap-4 p-6!">
                <div className="flex flex-col">
                    <span className="text-[0.8125rem] text-text-muted mb-1">Saldo do Período</span>
                    <span className={cn(
                        'text-2xl font-bold',
                        balance >= 0 ? 'text-[#27ae60]' : 'text-error'
                    )}>
                        {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                    </span>
                </div>
            </Card>
        </div>
    );
}
