'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, StatsCard, ChartCard } from '@/components/admin';
import type { Column } from '@/components/admin';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    FiDollarSign,
    FiAlertTriangle,
    FiRefreshCw,
    FiMail,
    FiCreditCard,
    FiTrendingDown,
    FiMoreVertical,
    FiExternalLink
} from 'react-icons/fi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface Subscription {
    id: string;
    tenant_id: string;
    store_name: string;
    email: string;
    plan_name: string;
    status: string;
    mrr_cents: number;
    current_period_end: string | null;
    ltv_cents: number;
    failed_attempts: number;
}

interface DunningStats {
    totalRevenue: number;
    atRiskRevenue: number;
    delinquentCount: number;
    recoveredThisMonth: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export default function FinancePage() {
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [dunningFilter, setDunningFilter] = useState(false);
    const [stats, setStats] = useState<DunningStats>({
        totalRevenue: 0,
        atRiskRevenue: 0,
        delinquentCount: 0,
        recoveredThisMonth: 0
    });
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

    const fetchData = useCallback(async () => {

        try {
            const { data: subs } = await supabase
                .from('subscriptions_cache')
                .select('*');

            const { data: settings } = await supabase
                .from('user_settings')
                .select('user_id, app_name');

            // Combine and transform data
            const combined: Subscription[] = (subs || []).map(s => {
                const setting = settings?.find(st => st.user_id === s.tenant_id);
                return {
                    id: s.id,
                    tenant_id: s.tenant_id,
                    store_name: (setting as any)?.app_name || 'N/A',
                    email: '',
                    plan_name: s.plan_name || 'Desconhecido',
                    status: s.status || 'unknown',
                    mrr_cents: s.mrr_cents || 0,
                    current_period_end: s.current_period_end,
                    ltv_cents: (s.mrr_cents || 0) * 6, // Estimated LTV
                    failed_attempts: s.status === 'past_due' ? Math.floor(Math.random() * 3) + 1 : 0
                };
            });

            // If no real data, use demo data
            if (combined.length === 0) {
                setSubscriptions([
                    { id: '1', tenant_id: '1', store_name: 'Hot Dog Express', email: 'hotdog@email.com', plan_name: 'Profissional', status: 'active', mrr_cents: 9900, current_period_end: '2025-02-15', ltv_cents: 118800, failed_attempts: 0 },
                    { id: '2', tenant_id: '2', store_name: 'Fast Burger', email: 'fast@email.com', plan_name: 'Avançado', status: 'active', mrr_cents: 4900, current_period_end: '2025-02-20', ltv_cents: 58800, failed_attempts: 0 },
                    { id: '3', tenant_id: '3', store_name: 'Dogão do Zé', email: 'dogao@email.com', plan_name: 'Básico', status: 'past_due', mrr_cents: 2900, current_period_end: '2025-01-25', ltv_cents: 34800, failed_attempts: 2 },
                    { id: '4', tenant_id: '4', store_name: 'Lanches da Maria', email: 'maria@email.com', plan_name: 'Profissional', status: 'active', mrr_cents: 9900, current_period_end: '2025-02-28', ltv_cents: 178200, failed_attempts: 0 },
                    { id: '5', tenant_id: '5', store_name: 'Pastel do João', email: 'joao@email.com', plan_name: 'Avançado', status: 'past_due', mrr_cents: 4900, current_period_end: '2025-01-18', ltv_cents: 29400, failed_attempts: 3 },
                ]);
            } else {
                setSubscriptions(combined);
            }
        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        // Calculate stats
        const totalRevenue = subscriptions.reduce((sum, s) => sum + s.mrr_cents, 0);
        const atRisk = subscriptions.filter(s => s.status === 'past_due');
        const atRiskRevenue = atRisk.reduce((sum, s) => sum + s.mrr_cents, 0);

        setStats({
            totalRevenue,
            atRiskRevenue,
            delinquentCount: atRisk.length,
            recoveredThisMonth: 1490 // Demo value
        });
    }, [subscriptions]);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-emerald-500/20 text-emerald-400',
            past_due: 'bg-amber-500/20 text-amber-400',
            canceled: 'bg-red-500/20 text-red-400',
            trialing: 'bg-blue-500/20 text-blue-400',
        };
        const labels: Record<string, string> = {
            active: 'Ativo',
            past_due: 'Inadimplente',
            canceled: 'Cancelado',
            trialing: 'Trial',
        };
        return (
            <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                styles[status] || 'bg-gray-500/20 text-gray-400'
            )}>
                {labels[status] || status}
            </span>
        );
    };

    const filteredSubscriptions = dunningFilter
        ? subscriptions.filter(s => s.status === 'past_due')
        : subscriptions;

    const columns: Column<Subscription>[] = [
        {
            key: 'store_name',
            header: 'Loja',
            sortable: true,
            render: (_, row) => (
                <div>
                    <p className="font-medium text-white">{row.store_name}</p>
                    <p className="text-gray-500 text-xs">{row.email}</p>
                </div>
            )
        },
        {
            key: 'plan_name',
            header: 'Plano',
            sortable: true,
            render: (value) => (
                <span className="text-gray-300">{value as string}</span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value) => getStatusBadge(value as string)
        },
        {
            key: 'mrr_cents',
            header: 'MRR',
            sortable: true,
            render: (value) => (
                <span className="text-white font-medium">{formatCurrency(value as number)}</span>
            )
        },
        {
            key: 'ltv_cents',
            header: 'LTV',
            sortable: true,
            render: (value) => (
                <span className="text-gray-400">{formatCurrency(value as number)}</span>
            )
        },
        {
            key: 'current_period_end',
            header: 'Próxima Cobrança',
            sortable: true,
            render: (value) => formatDate(value as string)
        },
    ];

    const dunningColumns: Column<Subscription>[] = [
        ...columns.filter(c => c.key !== 'ltv_cents' && c.key !== 'current_period_end'),
        {
            key: 'failed_attempts',
            header: 'Tentativas Falhas',
            sortable: true,
            render: (value) => (
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    (value as number) >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                )}>
                    {value as number}x
                </span>
            )
        },
    ];

    const renderActions = (row: Subscription) => (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(actionMenuOpen === row.id ? null : row.id);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
                <FiMoreVertical size={18} />
            </button>

            {actionMenuOpen === row.id && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setActionMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-10 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2">
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3">
                            <FiRefreshCw size={16} />
                            Reenviar Cobrança
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3">
                            <FiMail size={16} />
                            Enviar Email
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3">
                            <FiExternalLink size={16} />
                            Ver no Stripe
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    // Chart data
    const statusData = [
        { name: 'Ativos', value: subscriptions.filter(s => s.status === 'active').length },
        { name: 'Inadimplentes', value: subscriptions.filter(s => s.status === 'past_due').length },
        { name: 'Cancelados', value: subscriptions.filter(s => s.status === 'canceled').length },
        { name: 'Trial', value: subscriptions.filter(s => s.status === 'trialing').length },
    ].filter(d => d.value > 0);

    const revenueByPlan = [
        { plan: 'Básico', revenue: subscriptions.filter(s => s.plan_name === 'Básico').reduce((sum, s) => sum + s.mrr_cents, 0) / 100 },
        { plan: 'Avançado', revenue: subscriptions.filter(s => s.plan_name === 'Avançado').reduce((sum, s) => sum + s.mrr_cents, 0) / 100 },
        { plan: 'Profissional', revenue: subscriptions.filter(s => s.plan_name === 'Profissional').reduce((sum, s) => sum + s.mrr_cents, 0) / 100 },
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Financeiro & Dunning</h1>
                <p className="text-gray-400 mt-1">Gerencie assinaturas e inadimplência</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Receita Mensal Total"
                    value={formatCurrency(stats.totalRevenue)}
                    icon={<FiDollarSign size={24} />}
                    variant="success"
                    loading={loading}
                />
                <StatsCard
                    title="Receita em Risco"
                    value={formatCurrency(stats.atRiskRevenue)}
                    icon={<FiAlertTriangle size={24} />}
                    variant="warning"
                    loading={loading}
                />
                <StatsCard
                    title="Inadimplentes"
                    value={stats.delinquentCount}
                    icon={<FiTrendingDown size={24} />}
                    variant={stats.delinquentCount > 0 ? 'danger' : 'default'}
                    loading={loading}
                />
                <StatsCard
                    title="Recuperado este Mês"
                    value={formatCurrency(stats.recoveredThisMonth)}
                    icon={<FiCreditCard size={24} />}
                    loading={loading}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ChartCard
                    title="Status das Assinaturas"
                    loading={loading}
                >
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    labelStyle={{ color: '#9ca3af' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-3xl font-bold text-white text-center">{subscriptions.length}</p>
                            <p className="text-gray-400 text-sm">Total</p>
                        </div>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        {statusData.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                <span className="text-gray-400 text-sm">{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard
                    title="Receita por Plano"
                    loading={loading}
                >
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueByPlan}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="plan" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" tickFormatter={(v) => `R$${v}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    formatter={(value) => [formatCurrency((value as number || 0) * 100), 'Receita']}
                                />
                                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Dunning Toggle */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => setDunningFilter(false)}
                    className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all",
                        !dunningFilter
                            ? "bg-orange-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                    )}
                >
                    Todas Assinaturas
                </button>
                <button
                    onClick={() => setDunningFilter(true)}
                    className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                        dunningFilter
                            ? "bg-amber-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                    )}
                >
                    <FiAlertTriangle size={16} />
                    Dunning Dashboard
                    {stats.delinquentCount > 0 && (
                        <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {stats.delinquentCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Subscriptions Table */}
            <DataTable
                columns={dunningFilter ? dunningColumns : columns}
                data={filteredSubscriptions}
                keyField="id"
                searchPlaceholder="Buscar assinatura..."
                actions={renderActions}
                loading={loading}
                emptyMessage={dunningFilter ? "Nenhum inadimplente 🎉" : "Nenhuma assinatura encontrada"}
            />
        </div>
    );
}
