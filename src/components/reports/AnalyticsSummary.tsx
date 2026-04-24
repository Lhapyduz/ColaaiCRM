'use client';

import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiUsers, FiShoppingBag, FiDollarSign, FiActivity } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import { useDailyAnalytics, useCohortAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/hooks/useFormatters';

interface AnalyticsSummaryProps {
    userId: string;
}

export function AnalyticsSummary({ userId }: AnalyticsSummaryProps) {
    const { data: daily, totals, avgDailyRevenue, avgDailyOrders, loading } = useDailyAnalytics(userId, 30);
    const { data: cohort, avgRetention, avgLTV } = useCohortAnalytics(userId);

    if (loading) {
        return (
            <Card className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-bg-tertiary rounded-lg" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    if (!daily || daily.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center text-text-muted py-4">
                    <FiActivity className="mx-auto mb-2 text-2xl" />
                    <p>Dados de analytics aún não disponíveis.</p>
                    <p className="text-sm mt-1">Volte em alguns dias para ver métricas.</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FiDollarSign className="text-primary" />
                    </div>
                    <div>
                        <div className="text-xs text-text-muted">Receita 30 dias</div>
                        <div className="text-lg font-bold text-text-primary">{formatCurrency(totals.revenue)}</div>
                        <div className="text-xs text-text-muted">Ø {formatCurrency(avgDailyRevenue)}/dia</div>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <FiShoppingBag className="text-green-600" />
                    </div>
                    <div>
                        <div className="text-xs text-text-muted">Pedidos 30 dias</div>
                        <div className="text-lg font-bold text-text-primary">{totals.orders}</div>
                        <div className="text-xs text-text-muted">Ø {avgDailyOrders.toFixed(1)}/dia</div>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FiUsers className="text-blue-600" />
                    </div>
                    <div>
                        <div className="text-xs text-text-muted">Novos Clientes</div>
                        <div className="text-lg font-bold text-text-primary">{totals.customers}</div>
                        <div className="text-xs text-text-muted">
                            {daily.length > 0 ? Math.round(totals.customers / daily.length) : 0}/dia
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <FiTrendingUp className="text-purple-600" />
                    </div>
                    <div>
                        <div className="text-xs text-text-muted">Retenção M3</div>
                        <div className="text-lg font-bold text-text-primary">{avgRetention.toFixed(1)}%</div>
                        <div className="text-xs text-text-muted">LTV Ø {formatCurrency(avgLTV)}</div>
                    </div>
                </div>
            </Card>

            {daily[0]?.peak_hour !== null && (
                <Card className="col-span-2 lg:col-span-4 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-text-muted">Horário de Pico</div>
                            <div className="text-2xl font-bold text-primary">
                                {daily[0].peak_hour.toString().padStart(2, '0')}:00
                            </div>
                            <div className="text-xs text-text-muted">
                                {daily[0].peak_hour_orders} pedidos
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-text-muted">Ticket Médio</div>
                            <div className="text-xl font-semibold text-text-primary">
                                {formatCurrency(avgDailyOrders > 0 ? avgDailyRevenue / avgDailyOrders : 0)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-text-muted">Produtos Vendidos</div>
                            <div className="text-xl font-semibold text-text-primary">
                                {totals.products}
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}