'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    FiShoppingBag,
    FiDollarSign,
    FiTruck,
    FiClock,
    FiPlus,
    FiArrowRight,
    FiTrendingUp,
    FiTrendingDown,
    FiTarget,
    FiActivity
} from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge, type OrderStatus } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatRelativeTime } from '@/hooks/useFormatters';
import { predictRemainingToday, getConfidenceLabel } from '@/lib/salesPrediction';
import { cn } from '@/lib/utils';
import { TrialBanner } from '@/components/subscription/TrialBanner';

interface Stats {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    pendingDeliveries: number;
    yesterdayRevenue: number;
    yesterdayOrders: number;
}

interface RecentOrder {
    id: string;
    order_number: number;
    customer_name: string;
    total: number;
    status: string;
    created_at: string;
}

interface HistoricalData {
    date: string;
    dayOfWeek: number;
    revenue: number;
    orders: number;
}

interface Prediction {
    predictedRevenue: number;
    predictedOrders: number;
    confidence: 'low' | 'medium' | 'high';
    basedOn: string;
}

export default function DashboardPage() {
    const { user, userSettings } = useAuth();
    const { canAccess } = useSubscription();
    const [stats, setStats] = useState<Stats>({
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        pendingDeliveries: 0,
        yesterdayRevenue: 0,
        yesterdayOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [prediction, setPrediction] = useState<Prediction | null>(null);

    const appName = userSettings?.app_name || 'Cola Aí';
    const toast = useToast();

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });

            const { data: yesterdayOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', yesterday.toISOString())
                .lt('created_at', today.toISOString())
                .neq('status', 'cancelled');

            const { data: historicalOrders } = await supabase
                .from('orders')
                .select('created_at, total, payment_status')
                .eq('user_id', user.id)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .neq('status', 'cancelled');

            if (orders) {
                const totalRevenue = orders
                    .filter(o => o.payment_status === 'paid')
                    .reduce((sum, o) => sum + o.total, 0);

                const pendingOrders = orders.filter(
                    o => o.status === 'pending' || o.status === 'preparing'
                ).length;

                const pendingDeliveries = orders.filter(
                    o => o.status === 'delivering' || (o.status === 'ready' && o.is_delivery)
                ).length;

                const yesterdayRevenue = yesterdayOrders
                    ?.filter(o => o.payment_status === 'paid')
                    ?.reduce((sum, o) => sum + o.total, 0) || 0;

                setStats({
                    totalOrders: orders.length,
                    totalRevenue,
                    pendingOrders,
                    pendingDeliveries,
                    yesterdayRevenue,
                    yesterdayOrders: yesterdayOrders?.length || 0
                });

                setRecentOrders(orders.slice(0, 5));
            }

            if (historicalOrders && historicalOrders.length > 0) {
                const dailyData: Record<string, { revenue: number; orders: number }> = {};

                historicalOrders.forEach(order => {
                    const date = new Date(order.created_at).toISOString().split('T')[0];
                    if (!dailyData[date]) {
                        dailyData[date] = { revenue: 0, orders: 0 };
                    }
                    if (order.payment_status === 'paid') {
                        dailyData[date].revenue += order.total;
                    }
                    dailyData[date].orders++;
                });

                const historicalData: HistoricalData[] = Object.entries(dailyData).map(([date, data]) => ({
                    date,
                    dayOfWeek: new Date(date + 'T12:00:00').getDay(),
                    revenue: data.revenue,
                    orders: data.orders
                }));

                const pred = predictRemainingToday(
                    historicalData,
                    orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0) || 0,
                    orders?.length || 0
                );

                setPrediction(pred);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();

            // Subscribe to real-time updates for orders
            const subscription = supabase
                .channel('dashboard-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `user_id=eq.${user.id}`
                    },
                    () => {
                        fetchDashboardData();
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user, fetchDashboardData]);


    const revenueChange = useMemo(() => {
        if (stats.yesterdayRevenue === 0) return stats.totalRevenue > 0 ? 100 : 0;
        return ((stats.totalRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100;
    }, [stats.totalRevenue, stats.yesterdayRevenue]);

    const ordersChange = useMemo(() => {
        if (stats.yesterdayOrders === 0) return stats.totalOrders > 0 ? 100 : 0;
        return ((stats.totalOrders - stats.yesterdayOrders) / stats.yesterdayOrders) * 100;
    }, [stats.totalOrders, stats.yesterdayOrders]);

    const progressToGoal = useMemo(() => {
        if (!prediction) return 0;
        return Math.min(100, (stats.totalRevenue / prediction.predictedRevenue) * 100);
    }, [stats.totalRevenue, prediction]);

    return (
        <div className="max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-8 gap-5 max-md:flex-col">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Dashboard</h1>
                    <p className="text-text-secondary">
                        Bem-vindo ao {appName}! Aqui está o resumo de hoje.
                    </p>
                </div>
                <Link href="/pedidos/novo">
                    <Button leftIcon={<FiPlus />}>Novo Pedido</Button>
                </Link>
            </div>

            {/* Trial Banner - Shows only during trial period */}
            <TrialBanner className="mb-6" />

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-5 mb-8 max-[1200px]:grid-cols-2 max-md:grid-cols-1">
                <Card className="flex items-center gap-4 p-5! relative overflow-hidden" variant="gradient">
                    <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.05)_0%,transparent_70%)] rounded-full translate-x-[30%] -translate-y-[30%]" />
                    <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl shrink-0 bg-primary/10 text-primary">
                        <FiShoppingBag />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm text-text-secondary mb-1">Pedidos Hoje</span>
                        <span className="block text-2xl font-bold">{stats.totalOrders}</span>
                    </div>
                    <div className={cn('flex items-center gap-1 text-sm', ordersChange >= 0 ? 'text-accent' : 'text-error')}>
                        {ordersChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                        <span>{ordersChange >= 0 ? '+' : ''}{ordersChange.toFixed(0)}%</span>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-5! relative overflow-hidden" variant="gradient">
                    <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.05)_0%,transparent_70%)] rounded-full translate-x-[30%] -translate-y-[30%]" />
                    <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl shrink-0 bg-accent/10 text-accent">
                        <FiDollarSign />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm text-text-secondary mb-1">Receita do Dia</span>
                        <span className="block text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                    <div className={cn('flex items-center gap-1 text-sm', revenueChange >= 0 ? 'text-accent' : 'text-error')}>
                        {revenueChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                        <span>{revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(0)}%</span>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-5! relative overflow-hidden" variant="gradient">
                    <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.05)_0%,transparent_70%)] rounded-full translate-x-[30%] -translate-y-[30%]" />
                    <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl shrink-0 bg-info/10 text-info">
                        <GiCookingPot />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm text-text-secondary mb-1">Em Preparo</span>
                        <span className="block text-2xl font-bold">{stats.pendingOrders}</span>
                    </div>
                    {stats.pendingOrders > 0 && (
                        <Link href="/cozinha" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary transition-all duration-fast hover:bg-white/10 hover:text-text-primary">
                            <FiArrowRight />
                        </Link>
                    )}
                </Card>

                <Card className="flex items-center gap-4 p-5! relative overflow-hidden" variant="gradient">
                    <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.05)_0%,transparent_70%)] rounded-full translate-x-[30%] -translate-y-[30%]" />
                    <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl shrink-0 bg-warning/10 text-warning">
                        <FiTruck />
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm text-text-secondary mb-1">Para Entrega</span>
                        <span className="block text-2xl font-bold">{stats.pendingDeliveries}</span>
                    </div>
                    {stats.pendingDeliveries > 0 && (
                        <Link href="/entregas" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary transition-all duration-fast hover:bg-white/10 hover:text-text-primary">
                            <FiArrowRight />
                        </Link>
                    )}
                </Card>
            </div>

            {/* Sales Prediction Card */}
            {prediction && canAccess('salesPrediction') && (
                <Card className="p-6! mb-8 bg-linear-to-br from-[rgba(108,92,231,0.1)] to-[rgba(0,184,148,0.05)] border-[rgba(108,92,231,0.2)]">
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                        <div className="flex items-center gap-2.5">
                            <FiTarget className="text-xl text-[#6c5ce7]" />
                            <h2 className="text-lg font-semibold text-text-primary m-0">Previsão para Hoje</h2>
                        </div>
                        <div className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium uppercase',
                            prediction.confidence === 'high' && 'bg-accent/10 text-accent',
                            prediction.confidence === 'medium' && 'bg-warning/10 text-warning',
                            prediction.confidence === 'low' && 'bg-primary/10 text-primary'
                        )}>
                            <FiActivity />
                            {getConfidenceLabel(prediction.confidence)}
                        </div>
                    </div>

                    <div className="grid grid-cols-[auto_1fr] gap-8 items-center max-[900px]:grid-cols-1 max-[900px]:gap-5">
                        <div className="flex gap-8 max-[900px]:justify-around max-[480px]:flex-col max-[480px]:gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[0.8rem] text-text-secondary">Receita Prevista</span>
                                <span className="text-2xl font-bold text-text-primary">{formatCurrency(prediction.predictedRevenue)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[0.8rem] text-text-secondary">Pedidos Previstos</span>
                                <span className="text-2xl font-bold text-text-primary">{prediction.predictedOrders}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm text-text-secondary">
                                <span>Progresso do Dia</span>
                                <span className="font-semibold text-accent">{progressToGoal.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-[#6c5ce7] to-accent rounded-full transition-[width] duration-500 ease-out"
                                    style={{ width: `${progressToGoal}%` }}
                                />
                            </div>
                            <span className="text-xs text-text-muted">
                                Baseado em: {prediction.basedOn}
                            </span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-[1fr_400px] gap-6 max-[1200px]:grid-cols-1">
                {/* Recent Orders */}
                <Card className="p-6!">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold">Pedidos Recentes</h2>
                        <Link href="/pedidos" className="flex items-center gap-1.5 text-sm text-primary transition-opacity duration-fast hover:opacity-80">
                            Ver todos <FiArrowRight />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex flex-col gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-[60px] rounded-md bg-bg-tertiary animate-pulse" />
                            ))}
                        </div>
                    ) : recentOrders.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {recentOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    href={`/pedidos/${order.id}`}
                                    className="flex items-center justify-between px-4 py-3.5 bg-bg-tertiary rounded-md border border-transparent transition-all duration-fast hover:border-border hover:translate-x-1"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-primary">#{order.order_number}</span>
                                        <span className="text-text-primary">{order.customer_name}</span>
                                    </div>
                                    <div className="flex items-center gap-4 max-[480px]:flex-col max-[480px]:items-end max-[480px]:gap-1">
                                        <StatusBadge
                                            status={order.status as OrderStatus}
                                            size="sm"
                                            showIcon
                                        />
                                        <span className="font-semibold text-accent">
                                            {formatCurrency(order.total)}
                                        </span>
                                        <span className="flex items-center gap-1 text-sm text-text-muted">
                                            <FiClock /> {formatRelativeTime(order.created_at)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                            <span className="text-5xl mb-3">📋</span>
                            <p className="text-text-secondary mb-4">Nenhum pedido hoje</p>
                            <Link href="/pedidos/novo">
                                <Button variant="outline" size="sm" leftIcon={<FiPlus />}>
                                    Criar Pedido
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>

                {/* Quick Actions */}
                <Card className="p-6!">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold">Ações Rápidas</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-md:grid-cols-3 max-[480px]:grid-cols-2">
                        <Link href="/pedidos/novo" className="flex flex-col items-center gap-2.5 px-4 py-5 bg-bg-tertiary rounded-md border border-transparent transition-all duration-fast text-center hover:border-border hover:-translate-y-0.5 group">
                            <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl bg-primary/10">
                                <FiPlus className="text-primary" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary">Novo Pedido</span>
                        </Link>

                        <Link href="/cozinha" className="flex flex-col items-center gap-2.5 px-4 py-5 bg-bg-tertiary rounded-md border border-transparent transition-all duration-fast text-center hover:border-border hover:-translate-y-0.5 group">
                            <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl bg-info/10">
                                <GiCookingPot className="text-info" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary">Ver Cozinha</span>
                        </Link>

                        <Link href="/entregas" className="flex flex-col items-center gap-2.5 px-4 py-5 bg-bg-tertiary rounded-md border border-transparent transition-all duration-fast text-center hover:border-border hover:-translate-y-0.5 group">
                            <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl bg-warning/10">
                                <FiTruck className="text-warning" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary">Entregas</span>
                        </Link>

                        <Link href="/caixa" className="flex flex-col items-center gap-2.5 px-4 py-5 bg-bg-tertiary rounded-md border border-transparent transition-all duration-fast text-center hover:border-border hover:-translate-y-0.5 group">
                            <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl bg-accent/10">
                                <FiDollarSign className="text-accent" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary">Abrir Caixa</span>
                        </Link>

                        <Link href="/produtos" className="flex flex-col items-center gap-2.5 px-4 py-5 bg-bg-tertiary rounded-md border border-transparent transition-all duration-fast text-center hover:border-border hover:-translate-y-0.5 group">
                            <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl bg-[rgba(155,89,182,0.1)]">
                                <FiShoppingBag className="text-[#9b59b6]" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary">Produtos</span>
                        </Link>

                        <Link href="/relatorios" className="flex flex-col items-center gap-2.5 px-4 py-5 bg-bg-tertiary rounded-md border border-transparent transition-all duration-fast text-center hover:border-border hover:-translate-y-0.5 group">
                            <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl bg-[rgba(52,152,219,0.1)]">
                                <FiTrendingUp className="text-[#3498db]" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary">Relatórios</span>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
