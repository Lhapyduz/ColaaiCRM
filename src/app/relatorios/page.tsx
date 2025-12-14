'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    FiCalendar,
    FiDownload,
    FiTrendingUp,
    FiTrendingDown,
    FiShoppingBag,
    FiDollarSign,
    FiClock,
    FiTruck,
    FiBarChart2,
    FiPieChart,
    FiUsers,
    FiPackage
} from 'react-icons/fi';
import { BsCash } from 'react-icons/bs';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

type PeriodType = 'today' | 'week' | 'month' | '30days' | 'custom';

interface Order {
    id: string;
    order_number: number;
    customer_name: string;
    status: string;
    payment_method: string;
    payment_status: string;
    total: number;
    is_delivery: boolean;
    created_at: string;
}

interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
}

interface Product {
    id: string;
    name: string;
    category_id: string;
}

interface ReportStats {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
    previousRevenue: number;
    previousOrders: number;
    deliveryCount: number;
    pickupCount: number;
    byPaymentMethod: { [key: string]: number };
    byStatus: { [key: string]: number };
    byHour: { [key: number]: number };
    byDay: { [key: string]: number };
    topProducts: { name: string; quantity: number; revenue: number }[];
    byCategory: { categoryId: string; name: string; icon: string; color: string; total: number }[];
}

export default function RelatoriosPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState<PeriodType>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ReportStats>({
        totalRevenue: 0,
        totalOrders: 0,
        averageTicket: 0,
        previousRevenue: 0,
        previousOrders: 0,
        deliveryCount: 0,
        pickupCount: 0,
        byPaymentMethod: {},
        byStatus: {},
        byHour: {},
        byDay: {},
        topProducts: [],
        byCategory: []
    });

    // Calculate date range based on selected period
    const dateRange = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate = new Date(now);
        let previousStartDate: Date;
        let previousEndDate: Date;

        switch (period) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                previousEndDate = new Date(previousStartDate);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case '30days':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 30);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    startDate = new Date(`${customStartDate}T00:00:00`);
                    endDate = new Date(`${customEndDate}T23:59:59.999`);
                    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    previousEndDate = new Date(startDate);
                    previousEndDate.setDate(previousEndDate.getDate() - 1);
                    previousEndDate.setHours(23, 59, 59, 999);
                    previousStartDate = new Date(previousEndDate);
                    previousStartDate.setDate(previousStartDate.getDate() - diffDays + 1);
                    previousStartDate.setHours(0, 0, 0, 0);
                } else {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                }
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        return { startDate, endDate, previousStartDate, previousEndDate };
    }, [period, customStartDate, customEndDate]);

    useEffect(() => {
        if (user) {
            fetchReportData();
        }
    }, [user, dateRange]);

    const fetchReportData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { startDate, endDate, previousStartDate, previousEndDate } = dateRange;

            // Fetch current period orders
            const { data: currentOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .neq('status', 'cancelled');

            // Fetch previous period orders for comparison
            const { data: previousOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', previousStartDate.toISOString())
                .lte('created_at', previousEndDate.toISOString())
                .neq('status', 'cancelled');

            // Fetch order items for current period
            const orderIds = currentOrders?.map(o => o.id) || [];
            let orderItems: OrderItem[] = [];
            if (orderIds.length > 0) {
                const { data: items } = await supabase
                    .from('order_items')
                    .select('*')
                    .in('order_id', orderIds);
                orderItems = items || [];
            }

            // Fetch categories
            const { data: categories } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id);

            // Fetch products
            const { data: products } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id);

            // Calculate stats
            const orders = currentOrders || [];
            const prevOrders = previousOrders || [];
            const cats = categories || [];
            const prods = products || [];

            // Basic stats
            const paidOrders = orders.filter(o => o.payment_status === 'paid');
            const totalRevenue = paidOrders.reduce((sum: number, o: Order) => sum + o.total, 0);
            const previousRevenue = prevOrders
                .filter((o: Order) => o.payment_status === 'paid')
                .reduce((sum: number, o: Order) => sum + o.total, 0);

            // By payment method
            const byPaymentMethod: { [key: string]: number } = {};
            paidOrders.forEach((o: Order) => {
                byPaymentMethod[o.payment_method] = (byPaymentMethod[o.payment_method] || 0) + o.total;
            });

            // By status
            const byStatus: { [key: string]: number } = {};
            orders.forEach((o: Order) => {
                byStatus[o.status] = (byStatus[o.status] || 0) + 1;
            });

            // By hour
            const byHour: { [key: number]: number } = {};
            orders.forEach((o: Order) => {
                const hour = new Date(o.created_at).getHours();
                byHour[hour] = (byHour[hour] || 0) + 1;
            });

            // By day
            const byDay: { [key: string]: number } = {};
            paidOrders.forEach((o: Order) => {
                const day = new Date(o.created_at).toISOString().split('T')[0];
                byDay[day] = (byDay[day] || 0) + o.total;
            });

            // Delivery vs Pickup
            const deliveryCount = orders.filter((o: Order) => o.is_delivery).length;
            const pickupCount = orders.filter((o: Order) => !o.is_delivery).length;

            // Top products
            const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
            orderItems.forEach((item: OrderItem) => {
                const key = item.product_name;
                if (!productSales[key]) {
                    productSales[key] = { name: key, quantity: 0, revenue: 0 };
                }
                productSales[key].quantity += item.quantity;
                productSales[key].revenue += item.total;
            });
            const topProducts = Object.values(productSales)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);

            // By category
            const productCategoryMap: { [key: string]: string } = {};
            prods.forEach((p: Product) => {
                productCategoryMap[p.id] = p.category_id;
            });

            const categorySales: { [key: string]: number } = {};
            orderItems.forEach((item: OrderItem) => {
                const catId = productCategoryMap[item.product_id] || 'uncategorized';
                categorySales[catId] = (categorySales[catId] || 0) + item.total;
            });

            const byCategory = cats.map((cat: Category) => ({
                categoryId: cat.id,
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                total: categorySales[cat.id] || 0
            })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

            setStats({
                totalRevenue,
                totalOrders: orders.length,
                averageTicket: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
                previousRevenue,
                previousOrders: prevOrders.length,
                deliveryCount,
                pickupCount,
                byPaymentMethod,
                byStatus,
                byHour,
                byDay,
                topProducts,
                byCategory
            });
        } catch (error) {
            console.error('Error fetching report data:', error);
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

    const getPercentChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const revenueChange = getPercentChange(stats.totalRevenue, stats.previousRevenue);
    const ordersChange = getPercentChange(stats.totalOrders, stats.previousOrders);

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            money: 'Dinheiro',
            pix: 'PIX',
            credit: 'Crédito',
            debit: 'Débito'
        };
        return labels[method] || method;
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

    const getPeakHours = () => {
        const hours = Object.entries(stats.byHour)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        return hours;
    };

    const getDailySales = () => {
        const days = Object.entries(stats.byDay)
            .map(([day, total]) => ({ day, total }))
            .sort((a, b) => a.day.localeCompare(b.day));
        const maxValue = Math.max(...days.map(d => d.total), 1);
        return { days, maxValue };
    };

    const handleExportPDF = () => {
        // For now, just print the page
        window.print();
    };

    const periodLabels: Record<PeriodType, string> = {
        today: 'Hoje',
        week: 'Esta Semana',
        month: 'Este Mês',
        '30days': 'Últimos 30 dias',
        custom: 'Personalizado'
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Relatórios</h1>
                        <p className={styles.subtitle}>Análise detalhada do desempenho do seu negócio</p>
                    </div>
                    <Button leftIcon={<FiDownload />} onClick={handleExportPDF}>
                        Exportar PDF
                    </Button>
                </div>

                {/* Period Selector */}
                <div className={styles.periodSelector}>
                    <div className={styles.periodTabs}>
                        {(['today', 'week', 'month', '30days', 'custom'] as PeriodType[]).map((p) => (
                            <button
                                key={p}
                                className={`${styles.periodTab} ${period === p ? styles.active : ''}`}
                                onClick={() => setPeriod(p)}
                            >
                                {periodLabels[p]}
                            </button>
                        ))}
                    </div>
                    {period === 'custom' && (
                        <div className={styles.customDates}>
                            <div className={styles.dateInputGroup}>
                                <FiCalendar />
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className={styles.dateInput}
                                />
                            </div>
                            <span className={styles.dateSeparator}>até</span>
                            <div className={styles.dateInputGroup}>
                                <FiCalendar />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className={styles.dateInput}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className={styles.loadingGrid}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`${styles.loadingCard} skeleton`} />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Main Stats */}
                        <div className={styles.statsGrid}>
                            <Card className={styles.statCard}>
                                <div className={styles.statIconWrapper} style={{ background: 'rgba(0, 184, 148, 0.1)' }}>
                                    <FiDollarSign style={{ color: 'var(--accent)' }} />
                                </div>
                                <div className={styles.statContent}>
                                    <span className={styles.statLabel}>Receita Total</span>
                                    <span className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
                                    <div className={`${styles.statChange} ${revenueChange >= 0 ? styles.positive : styles.negative}`}>
                                        {revenueChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                                        <span>{Math.abs(revenueChange).toFixed(1)}%</span>
                                        <span className={styles.changeLabel}>vs período anterior</span>
                                    </div>
                                </div>
                            </Card>

                            <Card className={styles.statCard}>
                                <div className={styles.statIconWrapper} style={{ background: 'rgba(255, 107, 53, 0.1)' }}>
                                    <FiShoppingBag style={{ color: 'var(--primary)' }} />
                                </div>
                                <div className={styles.statContent}>
                                    <span className={styles.statLabel}>Total de Pedidos</span>
                                    <span className={styles.statValue}>{stats.totalOrders}</span>
                                    <div className={`${styles.statChange} ${ordersChange >= 0 ? styles.positive : styles.negative}`}>
                                        {ordersChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                                        <span>{Math.abs(ordersChange).toFixed(1)}%</span>
                                        <span className={styles.changeLabel}>vs período anterior</span>
                                    </div>
                                </div>
                            </Card>

                            <Card className={styles.statCard}>
                                <div className={styles.statIconWrapper} style={{ background: 'rgba(9, 132, 227, 0.1)' }}>
                                    <FiBarChart2 style={{ color: 'var(--info)' }} />
                                </div>
                                <div className={styles.statContent}>
                                    <span className={styles.statLabel}>Ticket Médio</span>
                                    <span className={styles.statValue}>{formatCurrency(stats.averageTicket)}</span>
                                    <span className={styles.statMeta}>por pedido</span>
                                </div>
                            </Card>

                            <Card className={styles.statCard}>
                                <div className={styles.statIconWrapper} style={{ background: 'rgba(253, 203, 110, 0.1)' }}>
                                    <FiTruck style={{ color: 'var(--warning)' }} />
                                </div>
                                <div className={styles.statContent}>
                                    <span className={styles.statLabel}>Entregas / Balcão</span>
                                    <span className={styles.statValue}>{stats.deliveryCount} / {stats.pickupCount}</span>
                                    <div className={styles.deliveryBar}>
                                        <div
                                            className={styles.deliveryProgress}
                                            style={{
                                                width: `${(stats.deliveryCount / (stats.deliveryCount + stats.pickupCount || 1)) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Sales Chart */}
                        <Card className={styles.chartCard}>
                            <div className={styles.cardHeader}>
                                <h2><FiBarChart2 /> Vendas por Dia</h2>
                            </div>
                            <div className={styles.barChart}>
                                {getDailySales().days.length > 0 ? (
                                    getDailySales().days.map(({ day, total }) => (
                                        <div key={day} className={styles.barWrapper}>
                                            <div
                                                className={styles.bar}
                                                style={{
                                                    height: `${(total / getDailySales().maxValue) * 100}%`
                                                }}
                                            >
                                                <span className={styles.barTooltip}>{formatCurrency(total)}</span>
                                            </div>
                                            <span className={styles.barLabel}>
                                                {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.noData}>
                                        <span>📊</span>
                                        <p>Nenhuma venda no período selecionado</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Two Column Layout */}
                        <div className={styles.twoColumns}>
                            {/* Top Products */}
                            <Card className={styles.sectionCard}>
                                <div className={styles.cardHeader}>
                                    <h2><FiPackage /> Produtos Mais Vendidos</h2>
                                </div>
                                {stats.topProducts.length > 0 ? (
                                    <div className={styles.productList}>
                                        {stats.topProducts.map((product, index) => {
                                            const maxQty = stats.topProducts[0]?.quantity || 1;
                                            return (
                                                <div key={product.name} className={styles.productItem}>
                                                    <span className={styles.productRank}>#{index + 1}</span>
                                                    <div className={styles.productInfo}>
                                                        <span className={styles.productName}>{product.name}</span>
                                                        <div className={styles.productBar}>
                                                            <div
                                                                className={styles.productProgress}
                                                                style={{ width: `${(product.quantity / maxQty) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.productStats}>
                                                        <span className={styles.productQty}>{product.quantity}x</span>
                                                        <span className={styles.productRevenue}>{formatCurrency(product.revenue)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.noDataSmall}>
                                        <p>Nenhum produto vendido</p>
                                    </div>
                                )}
                            </Card>

                            {/* Categories */}
                            <Card className={styles.sectionCard}>
                                <div className={styles.cardHeader}>
                                    <h2><FiPieChart /> Vendas por Categoria</h2>
                                </div>
                                {stats.byCategory.length > 0 ? (
                                    <div className={styles.categoryGrid}>
                                        {stats.byCategory.map((cat) => {
                                            const totalCategorySales = stats.byCategory.reduce((sum, c) => sum + c.total, 0);
                                            const percentage = totalCategorySales > 0 ? (cat.total / totalCategorySales) * 100 : 0;
                                            return (
                                                <div
                                                    key={cat.categoryId}
                                                    className={styles.categoryCard}
                                                    style={{ borderColor: cat.color }}
                                                >
                                                    <span className={styles.categoryIcon}>{cat.icon}</span>
                                                    <span className={styles.categoryName}>{cat.name}</span>
                                                    <span className={styles.categoryValue}>{formatCurrency(cat.total)}</span>
                                                    <span className={styles.categoryPercent}>{percentage.toFixed(1)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.noDataSmall}>
                                        <p>Nenhuma categoria com vendas</p>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Three Column Layout */}
                        <div className={styles.threeColumns}>
                            {/* Payment Methods */}
                            <Card className={styles.miniCard}>
                                <div className={styles.cardHeaderMini}>
                                    <h3><BsCash /> Formas de Pagamento</h3>
                                </div>
                                <div className={styles.paymentList}>
                                    {Object.entries(stats.byPaymentMethod).length > 0 ? (
                                        Object.entries(stats.byPaymentMethod)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([method, total]) => {
                                                const maxPayment = Math.max(...Object.values(stats.byPaymentMethod), 1);
                                                return (
                                                    <div key={method} className={styles.paymentItem}>
                                                        <div className={styles.paymentHeader}>
                                                            <span className={styles.paymentMethod}>{getPaymentMethodLabel(method)}</span>
                                                            <span className={styles.paymentValue}>{formatCurrency(total)}</span>
                                                        </div>
                                                        <div className={styles.paymentBar}>
                                                            <div
                                                                className={styles.paymentProgress}
                                                                style={{ width: `${(total / maxPayment) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <p className={styles.noDataText}>Nenhum pagamento</p>
                                    )}
                                </div>
                            </Card>

                            {/* Status Distribution */}
                            <Card className={styles.miniCard}>
                                <div className={styles.cardHeaderMini}>
                                    <h3><FiUsers /> Status dos Pedidos</h3>
                                </div>
                                <div className={styles.statusList}>
                                    {Object.entries(stats.byStatus).length > 0 ? (
                                        Object.entries(stats.byStatus)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([status, count]) => (
                                                <div key={status} className={styles.statusItem}>
                                                    <span className={`${styles.statusDot} status-${status}`}></span>
                                                    <span className={styles.statusLabel}>{getStatusLabel(status)}</span>
                                                    <span className={styles.statusCount}>{count}</span>
                                                </div>
                                            ))
                                    ) : (
                                        <p className={styles.noDataText}>Nenhum pedido</p>
                                    )}
                                </div>
                            </Card>

                            {/* Peak Hours */}
                            <Card className={styles.miniCard}>
                                <div className={styles.cardHeaderMini}>
                                    <h3><FiClock /> Horários de Pico</h3>
                                </div>
                                <div className={styles.peakList}>
                                    {getPeakHours().length > 0 ? (
                                        getPeakHours().map(({ hour, count }, index) => (
                                            <div key={hour} className={styles.peakItem}>
                                                <span className={styles.peakMedal}>
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                                </span>
                                                <span className={styles.peakHour}>
                                                    {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                                                </span>
                                                <span className={styles.peakCount}>{count} pedidos</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={styles.noDataText}>Sem dados de horário</p>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
