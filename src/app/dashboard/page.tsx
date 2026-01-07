'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { predictRemainingToday, predictSalesForDate, getConfidenceLabel, getConfidencePercentage } from '@/lib/salesPrediction';
import styles from './page.module.css';

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

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            // Fetch today's orders
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Get 30 days ago for prediction
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });

            // Fetch yesterday's orders
            const { data: yesterdayOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', yesterday.toISOString())
                .lt('created_at', today.toISOString())
                .neq('status', 'cancelled');

            // Fetch historical data for prediction (last 30 days)
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

            // Calculate prediction
            if (historicalOrders && historicalOrders.length > 0) {
                // Process historical data by day
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

                // Get prediction for remaining day
                const pred = predictRemainingToday(
                    historicalData,
                    orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0) || 0,
                    orders?.length || 0
                );

                setPrediction(pred);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Aguardando',
            preparing: 'Preparando',
            ready: 'Pronto',
            delivering: 'Entregando',
            delivered: 'Entregue',
            cancelled: 'Cancelado'
        };
        return labels[status] || status;
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return `${Math.floor(diffHours / 24)}d`;
    };

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
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Dashboard</h1>
                        <p className={styles.subtitle}>
                            Bem-vindo ao {appName}! Aqui está o resumo de hoje.
                        </p>
                    </div>
                    <Link href="/pedidos/novo">
                        <Button leftIcon={<FiPlus />}>Novo Pedido</Button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <Card className={styles.statCard} variant="gradient">
                        <div className={styles.statIcon} style={{ background: 'rgba(255, 107, 53, 0.1)', color: 'var(--primary)' }}>
                            <FiShoppingBag />
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statLabel}>Pedidos Hoje</span>
                            <span className={styles.statValue}>{stats.totalOrders}</span>
                        </div>
                        <div className={`${styles.statTrend} ${ordersChange >= 0 ? styles.positive : styles.negative}`}>
                            {ordersChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                            <span>{ordersChange >= 0 ? '+' : ''}{ordersChange.toFixed(0)}%</span>
                        </div>
                    </Card>

                    <Card className={styles.statCard} variant="gradient">
                        <div className={styles.statIcon} style={{ background: 'rgba(0, 184, 148, 0.1)', color: 'var(--accent)' }}>
                            <FiDollarSign />
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statLabel}>Receita do Dia</span>
                            <span className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
                        </div>
                        <div className={`${styles.statTrend} ${revenueChange >= 0 ? styles.positive : styles.negative}`}>
                            {revenueChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                            <span>{revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(0)}%</span>
                        </div>
                    </Card>

                    <Card className={styles.statCard} variant="gradient">
                        <div className={styles.statIcon} style={{ background: 'rgba(9, 132, 227, 0.1)', color: 'var(--info)' }}>
                            <GiCookingPot />
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statLabel}>Em Preparo</span>
                            <span className={styles.statValue}>{stats.pendingOrders}</span>
                        </div>
                        {stats.pendingOrders > 0 && (
                            <Link href="/cozinha" className={styles.statLink}>
                                <FiArrowRight />
                            </Link>
                        )}
                    </Card>

                    <Card className={styles.statCard} variant="gradient">
                        <div className={styles.statIcon} style={{ background: 'rgba(253, 203, 110, 0.1)', color: 'var(--warning)' }}>
                            <FiTruck />
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statLabel}>Para Entrega</span>
                            <span className={styles.statValue}>{stats.pendingDeliveries}</span>
                        </div>
                        {stats.pendingDeliveries > 0 && (
                            <Link href="/entregas" className={styles.statLink}>
                                <FiArrowRight />
                            </Link>
                        )}
                    </Card>
                </div>

                {/* Sales Prediction Card - Only for Professional plan */}
                {prediction && canAccess('salesPrediction') && (
                    <Card className={styles.predictionCard}>
                        <div className={styles.predictionHeader}>
                            <div className={styles.predictionTitle}>
                                <FiTarget className={styles.predictionIcon} />
                                <h2>Previsão para Hoje</h2>
                            </div>
                            <div className={styles.confidenceBadge} data-confidence={prediction.confidence}>
                                <FiActivity />
                                {getConfidenceLabel(prediction.confidence)}
                            </div>
                        </div>

                        <div className={styles.predictionContent}>
                            <div className={styles.predictionStats}>
                                <div className={styles.predictionStat}>
                                    <span className={styles.predictionStatLabel}>Receita Prevista</span>
                                    <span className={styles.predictionStatValue}>{formatCurrency(prediction.predictedRevenue)}</span>
                                </div>
                                <div className={styles.predictionStat}>
                                    <span className={styles.predictionStatLabel}>Pedidos Previstos</span>
                                    <span className={styles.predictionStatValue}>{prediction.predictedOrders}</span>
                                </div>
                            </div>

                            <div className={styles.predictionProgress}>
                                <div className={styles.progressHeader}>
                                    <span>Progresso do Dia</span>
                                    <span className={styles.progressPercent}>{progressToGoal.toFixed(0)}%</span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progressToGoal}%` }}
                                    />
                                </div>
                                <span className={styles.predictionMeta}>
                                    Baseado em: {prediction.basedOn}
                                </span>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Content Grid */}
                <div className={styles.contentGrid}>
                    {/* Recent Orders */}
                    <Card className={styles.recentOrdersCard}>
                        <div className={styles.cardHeader}>
                            <h2>Pedidos Recentes</h2>
                            <Link href="/pedidos" className={styles.viewAll}>
                                Ver todos <FiArrowRight />
                            </Link>
                        </div>

                        {loading ? (
                            <div className={styles.loading}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`${styles.orderItem} skeleton`} style={{ height: 60 }} />
                                ))}
                            </div>
                        ) : recentOrders.length > 0 ? (
                            <div className={styles.ordersList}>
                                {recentOrders.map((order) => (
                                    <Link
                                        key={order.id}
                                        href={`/pedidos/${order.id}`}
                                        className={styles.orderItem}
                                    >
                                        <div className={styles.orderInfo}>
                                            <span className={styles.orderNumber}>#{order.order_number}</span>
                                            <span className={styles.orderCustomer}>{order.customer_name}</span>
                                        </div>
                                        <div className={styles.orderMeta}>
                                            <span className={`${styles.orderStatus} status-${order.status}`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                            <span className={styles.orderTotal}>
                                                {formatCurrency(order.total)}
                                            </span>
                                            <span className={styles.orderTime}>
                                                <FiClock /> {getTimeAgo(order.created_at)}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>📋</span>
                                <p>Nenhum pedido hoje</p>
                                <Link href="/pedidos/novo">
                                    <Button variant="outline" size="sm" leftIcon={<FiPlus />}>
                                        Criar Pedido
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </Card>

                    {/* Quick Actions */}
                    <Card className={styles.quickActionsCard}>
                        <div className={styles.cardHeader}>
                            <h2>Ações Rápidas</h2>
                        </div>

                        <div className={styles.quickActions}>
                            <Link href="/pedidos/novo" className={styles.quickAction}>
                                <div className={styles.quickActionIcon} style={{ background: 'rgba(255, 107, 53, 0.1)' }}>
                                    <FiPlus style={{ color: 'var(--primary)' }} />
                                </div>
                                <span>Novo Pedido</span>
                            </Link>

                            <Link href="/cozinha" className={styles.quickAction}>
                                <div className={styles.quickActionIcon} style={{ background: 'rgba(9, 132, 227, 0.1)' }}>
                                    <GiCookingPot style={{ color: 'var(--info)' }} />
                                </div>
                                <span>Ver Cozinha</span>
                            </Link>

                            <Link href="/entregas" className={styles.quickAction}>
                                <div className={styles.quickActionIcon} style={{ background: 'rgba(253, 203, 110, 0.1)' }}>
                                    <FiTruck style={{ color: 'var(--warning)' }} />
                                </div>
                                <span>Entregas</span>
                            </Link>

                            <Link href="/caixa" className={styles.quickAction}>
                                <div className={styles.quickActionIcon} style={{ background: 'rgba(0, 184, 148, 0.1)' }}>
                                    <FiDollarSign style={{ color: 'var(--accent)' }} />
                                </div>
                                <span>Abrir Caixa</span>
                            </Link>

                            <Link href="/produtos" className={styles.quickAction}>
                                <div className={styles.quickActionIcon} style={{ background: 'rgba(155, 89, 182, 0.1)' }}>
                                    <FiShoppingBag style={{ color: '#9b59b6' }} />
                                </div>
                                <span>Produtos</span>
                            </Link>

                            <Link href="/relatorios" className={styles.quickAction}>
                                <div className={styles.quickActionIcon} style={{ background: 'rgba(52, 152, 219, 0.1)' }}>
                                    <FiTrendingUp style={{ color: '#3498db' }} />
                                </div>
                                <span>Relatórios</span>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
