'use client';

import React, { useEffect, useState } from 'react';
import { StatsCard, ChartCard } from '@/components/admin';
import { supabase } from '@/lib/supabase';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { FiUsers, FiDollarSign, FiShoppingBag, FiTrendingUp } from 'react-icons/fi';

interface DashboardStats {
    activeStores: number;
    avgTicket: number;
    monthlyRevenue: number;
    mrrChange: number;
    activeChange: number;
    ticketChange: number;
}

interface MonthlyData {
    month: string;
    mrr: number;
    newSubscribers: number;
    cancellations: number;
    churnRate: number;
}

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        activeStores: 0,
        avgTicket: 0,
        monthlyRevenue: 0,
        mrrChange: 0,
        activeChange: 0,
        ticketChange: 0
    });
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

    useEffect(() => {
        async function fetchData() {

            try {
                // Fetch active stores count
                const { count: activeStores } = await supabase
                    .from('user_settings')
                    .select('*', { count: 'exact', head: true });

                // Fetch subscription data
                const { data: subscriptions } = await supabase
                    .from('subscriptions_cache')
                    .select('amount_cents, status, plan_name');

                interface SubscriptionRow {
                    amount_cents: number | null;
                    status: string;
                    plan_name: string;
                }

                // Calculate metrics
                const activeSubscriptions = (subscriptions as SubscriptionRow[] | null)?.filter((s: SubscriptionRow) => s.status === 'active') || [];
                const totalMRR = activeSubscriptions.reduce((sum: number, s: SubscriptionRow) => sum + (s.amount_cents || 0), 0);

                // Generate demo monthly data for charts
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const currentMonth = new Date().getMonth();
                const demoMonthlyData: MonthlyData[] = months.slice(0, currentMonth + 1).map((month, idx) => ({
                    month,
                    mrr: Math.floor(1000 + (idx * 500) + Math.random() * 200),
                    newSubscribers: Math.floor(5 + Math.random() * 10),
                    cancellations: Math.floor(Math.random() * 3),
                    churnRate: Number((Math.random() * 5).toFixed(1))
                }));

                setStats({
                    activeStores: activeStores || 0,
                    avgTicket: 45.90,
                    monthlyRevenue: totalMRR / 100,
                    mrrChange: 12.5,
                    activeChange: 8.3,
                    ticketChange: -2.1
                });
                setMonthlyData(demoMonthlyData);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                    <p className="text-gray-400 text-sm mb-2">{label}</p>
                    {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.name.includes('MRR') || entry.name.includes('Receita')
                                ? formatCurrency(entry.value)
                                : entry.name.includes('Rate') ? `${entry.value}%` : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard Executivo</h1>
                <p className="text-gray-400 mt-1">Visão macro do seu SaaS de gestão de lanchonetes</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Lojas Ativas"
                    value={stats.activeStores}
                    change={stats.activeChange}
                    icon={<FiUsers size={24} />}
                    loading={loading}
                />
                <StatsCard
                    title="Ticket Médio"
                    value={formatCurrency(stats.avgTicket)}
                    change={stats.ticketChange}
                    icon={<FiShoppingBag size={24} />}
                    loading={loading}
                />
                <StatsCard
                    title="Receita Mensal (MRR)"
                    value={formatCurrency(stats.monthlyRevenue)}
                    change={stats.mrrChange}
                    icon={<FiDollarSign size={24} />}
                    variant="success"
                    loading={loading}
                />
                <StatsCard
                    title="Crescimento Anual"
                    value="+156%"
                    change={23.5}
                    icon={<FiTrendingUp size={24} />}
                    variant="success"
                    loading={loading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* MRR Growth Chart */}
                <ChartCard
                    title="Crescimento do MRR"
                    subtitle="Receita recorrente mensal"
                    period="Últimos 12 meses"
                    loading={loading}
                >
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" tickFormatter={(v) => `R$${v}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="mrr"
                                    name="MRR"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    fill="url(#mrrGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Churn Rate Chart */}
                <ChartCard
                    title="Taxa de Churn"
                    subtitle="Percentual de cancelamentos"
                    period="Últimos 12 meses"
                    loading={loading}
                >
                    <div className="h-72 w-full"> {/* Ensure width is explicit */}
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" tickFormatter={(v) => `${v}%`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="churnRate"
                                    name="Churn Rate"
                                    fill="#ef4444"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* New vs Cancellations Chart */}
            <ChartCard
                title="Novos Assinantes vs Cancelamentos"
                subtitle="Comparativo mensal de aquisição e perda"
                period="Últimos 12 meses"
                loading={loading}
            >
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="newGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="cancelGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => <span className="text-gray-400">{value}</span>}
                            />
                            <Area
                                type="monotone"
                                dataKey="newSubscribers"
                                name="Novos Assinantes"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#newGradient)"
                            />
                            <Area
                                type="monotone"
                                dataKey="cancellations"
                                name="Cancelamentos"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fill="url(#cancelGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>
        </div>
    );
}
