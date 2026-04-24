'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { FiUsers, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import { useCohortAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/hooks/useFormatters';

interface CohortChartProps {
    userId: string;
}

interface CohortData {
    cohort_month: string;
    cohort_size: number;
    month_0: number;
    month_1: number;
    month_2: number;
    month_3: number;
    month_6: number;
    total_revenue: number;
    avg_ltv: number;
}

export function CohortChart({ userId }: CohortChartProps) {
    const { data, loading, avgRetention, avgLTV } = useCohortAnalytics(userId);

    if (loading) {
        return (
            <Card className="p-4">
                <div className="animate-pulse h-64 bg-bg-tertiary rounded-lg" />
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiUsers className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Análise de Cohortes</h3>
                </div>
                <div className="text-center text-text-muted py-8">
                    <FiCalendar className="mx-auto mb-2 text-3xl opacity-50" />
                    <p>Dados de coorte não disponíveis</p>
                    <p className="text-sm mt-1">Colete mais dados ao longo do tempo</p>
                </div>
            </Card>
        );
    }

    const chartData = data.map(c => ({
        name: new Date(c.cohort_month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        size: c.cohort_size,
        m0: c.month_0_retention || 100,
        m1: c.month_1_retention || 0,
        m2: c.month_2_retention || 0,
        m3: c.month_3_retention || 0,
        revenue: c.total_revenue,
        ltv: c.avg_ltv || 0
    })).reverse();

    const latestCohort = data[0];
    const retentionByMonth = [
        { name: 'Mês 0', value: latestCohort?.month_0_retention || 100 },
        { name: 'Mês 1', value: latestCohort?.month_1_retention || 0 },
        { name: 'Mês 2', value: latestCohort?.month_2_retention || 0 },
        { name: 'Mês 3', value: latestCohort?.month_3_retention || 0 },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiUsers className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Retenção por Coorte</h3>
                </div>

                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={retentionByMonth}>
                            <defs>
                                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="#888" fontSize={12} />
                            <YAxis stroke="#888" fontSize={12} unit="%" />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Retenção']}
                                contentStyle={{
                                    background: 'rgba(45,52,54,0.95)',
                                    border: 'none',
                                    borderRadius: '8px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#ff6b35"
                                fillOpacity={1}
                                fill="url(#colorRetention)"
                                name="Retenção"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-xs text-text-muted">Mês 1</div>
                        <div className="font-semibold text-primary">{latestCohort?.month_1_retention?.toFixed(1) || 0}%</div>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-xs text-text-muted">Mês 3</div>
                        <div className="font-semibold text-primary">{latestCohort?.month_3_retention?.toFixed(1) || 0}%</div>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-xs text-text-muted">Média</div>
                        <div className="font-semibold text-primary">{avgRetention.toFixed(1)}%</div>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FiTrendingUp className="text-primary" />
                    <h3 className="font-semibold text-text-primary">Receita por Coorte</h3>
                </div>

                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="#888" fontSize={12} />
                            <YAxis
                                stroke="#888"
                                fontSize={12}
                                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value: number) => [formatCurrency(value), 'Receita']}
                                contentStyle={{
                                    background: 'rgba(45,52,54,0.95)',
                                    border: 'none',
                                    borderRadius: '8px'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#00b894"
                                strokeWidth={2}
                                dot={{ fill: '#00b894' }}
                                name="Receita"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                    <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-xs text-text-muted">Total Coortes</div>
                        <div className="font-semibold text-text-primary">
                            {data.reduce((sum, c) => sum + c.cohort_size, 0)}
                        </div>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-xs text-text-muted">LTV Médio</div>
                        <div className="font-semibold text-text-primary">{formatCurrency(avgLTV)}</div>
                    </div>
                </div>
            </Card>
        </div>
    );
}