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
    FiPackage,
    FiActivity,
    FiFileText
} from 'react-icons/fi';
import { BsCash } from 'react-icons/bs';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatCurrencyShort } from '@/hooks/useFormatters';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
import RelatorioPDFCompleto from '@/components/reports/RelatorioPDFCompleto';

const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    { ssr: false }
);


type PeriodType = 'today' | 'week' | 'month' | '30days' | 'custom';
type ComparisonType = 'previous' | 'lastWeek' | 'lastMonth' | 'lastYear';

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
    // Comparison data
    comparisonRevenue: number;
    comparisonOrders: number;
    comparisonByDay: { [key: string]: number };
}

// Colors for charts
const CHART_COLORS = ['#ff6b35', '#00b894', '#0984e3', '#fdcb6e', '#e84393', '#6c5ce7', '#00cec9', '#fd79a8'];
const PAYMENT_COLORS: Record<string, string> = {
    money: '#00b894',
    pix: '#0984e3',
    credit: '#fdcb6e',
    debit: '#e84393'
};

export default function RelatoriosPage() {
    const { user, userSettings } = useAuth();
    const { canAccess, plan } = useSubscription();
    const toast = useToast();
    const [period, setPeriod] = useState<PeriodType>('month');
    const [comparison, setComparison] = useState<ComparisonType>('previous');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
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
        byCategory: [],
        comparisonRevenue: 0,
        comparisonOrders: 0,
        comparisonByDay: {}
    });

    // Calculate date range based on selected period
    const dateRange = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate = new Date(now);
        let previousStartDate: Date;
        let previousEndDate: Date;
        let comparisonStartDate: Date;
        let comparisonEndDate: Date;

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

        // Calculate comparison period based on comparison type
        switch (comparison) {
            case 'lastWeek':
                comparisonStartDate = new Date(startDate);
                comparisonStartDate.setDate(comparisonStartDate.getDate() - 7);
                comparisonEndDate = new Date(endDate);
                comparisonEndDate.setDate(comparisonEndDate.getDate() - 7);
                break;
            case 'lastMonth':
                comparisonStartDate = new Date(startDate);
                comparisonStartDate.setMonth(comparisonStartDate.getMonth() - 1);
                comparisonEndDate = new Date(endDate);
                comparisonEndDate.setMonth(comparisonEndDate.getMonth() - 1);
                break;
            case 'lastYear':
                comparisonStartDate = new Date(startDate);
                comparisonStartDate.setFullYear(comparisonStartDate.getFullYear() - 1);
                comparisonEndDate = new Date(endDate);
                comparisonEndDate.setFullYear(comparisonEndDate.getFullYear() - 1);
                break;
            default:
                comparisonStartDate = previousStartDate;
                comparisonEndDate = previousEndDate;
        }

        return { startDate, endDate, previousStartDate, previousEndDate, comparisonStartDate, comparisonEndDate };
    }, [period, customStartDate, customEndDate, comparison]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (user) {
            fetchReportData();
        }
    }, [user, dateRange]);

    const fetchReportData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { startDate, endDate, previousStartDate, previousEndDate, comparisonStartDate, comparisonEndDate } = dateRange;

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

            // Fetch comparison period orders
            const { data: comparisonOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', comparisonStartDate.toISOString())
                .lte('created_at', comparisonEndDate.toISOString())
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
            const compOrders = comparisonOrders || [];
            const cats = categories || [];
            const prods = products || [];

            // OPTIMIZED: Single pass through orders for all metrics - O(n) instead of 4×O(n)
            // Initialize all tracking objects
            const byPaymentMethod: { [key: string]: number } = {};
            const byStatus: { [key: string]: number } = {};
            const byHour: { [key: number]: number } = {};
            const byDay: { [key: string]: number } = {};
            let totalRevenue = 0;
            let paidOrdersCount = 0;
            let deliveryCount = 0;
            let pickupCount = 0;

            // Single loop for all order metrics
            orders.forEach((o: Order) => {
                // byStatus - count all orders
                byStatus[o.status] = (byStatus[o.status] || 0) + 1;

                // byHour - count all orders
                const hour = new Date(o.created_at).getHours();
                byHour[hour] = (byHour[hour] || 0) + 1;

                // Delivery vs Pickup
                if (o.is_delivery) {
                    deliveryCount++;
                } else {
                    pickupCount++;
                }

                // Paid order specific metrics
                if (o.payment_status === 'paid') {
                    paidOrdersCount++;
                    totalRevenue += o.total;

                    // byPaymentMethod - only paid orders
                    byPaymentMethod[o.payment_method] = (byPaymentMethod[o.payment_method] || 0) + o.total;

                    // byDay - only paid orders
                    const day = new Date(o.created_at).toISOString().split('T')[0];
                    byDay[day] = (byDay[day] || 0) + o.total;
                }
            });

            // Previous period revenue - single reduce
            const previousRevenue = prevOrders.reduce((sum: number, o: Order) =>
                o.payment_status === 'paid' ? sum + o.total : sum, 0);

            // Comparison stats - optimized single loop
            const comparisonByDay: { [key: string]: number } = {};
            let comparisonRevenue = 0;
            compOrders.forEach((o: Order) => {
                if (o.payment_status === 'paid') {
                    comparisonRevenue += o.total;
                    const day = new Date(o.created_at).toISOString().split('T')[0];
                    comparisonByDay[day] = (comparisonByDay[day] || 0) + o.total;
                }
            });
            const comparisonOrdersCount = compOrders.length;

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
                averageTicket: paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0,
                previousRevenue,
                previousOrders: prevOrders.length,
                deliveryCount,
                pickupCount,
                byPaymentMethod,
                byStatus,
                byHour,
                byDay,
                topProducts,
                byCategory,
                comparisonRevenue,
                comparisonOrders: comparisonOrdersCount,
                comparisonByDay
            });
        } catch (error) {
            console.error('Error fetching report data:', error);
            toast.error('Erro ao carregar dados do relatório');
        } finally {
            setLoading(false);
        }
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

    const getComparisonLabel = (type: ComparisonType) => {
        const labels: Record<ComparisonType, string> = {
            previous: 'Período anterior',
            lastWeek: 'Semana passada',
            lastMonth: 'Mês passado',
            lastYear: 'Ano passado'
        };
        return labels[type];
    };

    // Prepare chart data
    const dailySalesData = useMemo(() => {
        const days = Object.entries(stats.byDay)
            .map(([day, total]) => ({
                day,
                date: new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                atual: total,
                comparacao: stats.comparisonByDay[day] || 0
            }))
            .sort((a, b) => a.day.localeCompare(b.day));
        return days;
    }, [stats.byDay, stats.comparisonByDay]);

    const hourlyData = useMemo(() => {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push({
                hour: `${i.toString().padStart(2, '0')}:00`,
                pedidos: stats.byHour[i] || 0
            });
        }
        return hours;
    }, [stats.byHour]);

    const paymentData = useMemo(() => {
        return Object.entries(stats.byPaymentMethod).map(([method, total]) => ({
            name: getPaymentMethodLabel(method),
            value: total,
            color: PAYMENT_COLORS[method] || '#6c5ce7'
        }));
    }, [stats.byPaymentMethod]);

    const categoryData = useMemo(() => {
        return stats.byCategory.map(cat => ({
            name: cat.name,
            value: cat.total,
            color: cat.color
        }));
    }, [stats.byCategory]);

    const deliveryData = useMemo(() => {
        return [
            { name: 'Entrega', value: stats.deliveryCount, color: '#ff6b35' },
            { name: 'Balcão', value: stats.pickupCount, color: '#00b894' }
        ];
    }, [stats.deliveryCount, stats.pickupCount]);

    const topProductsData = useMemo(() => {
        return stats.topProducts.slice(0, 5).map(p => ({
            name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
            quantidade: p.quantity,
            receita: p.revenue
        }));
    }, [stats.topProducts]);

    const getPeakHours = () => {
        const hours = Object.entries(stats.byHour)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        return hours;
    };

    const handleExportPDF = () => {
        window.print();
    };

    const handleExportCSV = () => {
        // Build CSV Content
        const lines: string[] = [];
        lines.push(`Relatório Gerencial - ${userSettings?.app_name || 'Ligeirinho Hotdog'}`);
        lines.push(`Período: ${periodLabels[period]}`);

        lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
        lines.push('');

        // Resumo Geral
        lines.push('RESUMO GERAL');
        lines.push('Métrica;Valor');
        lines.push(`Receita Total;${formatCurrency(stats.totalRevenue)}`);
        lines.push(`Total de Pedidos;${stats.totalOrders}`);
        lines.push(`Ticket Médio;${formatCurrency(stats.averageTicket)}`);
        lines.push('');

        // Formas de Pagamento
        lines.push('FORMAS DE PAGAMENTO');
        lines.push('Método;Valor');
        Object.entries(stats.byPaymentMethod).forEach(([method, total]) => {
            lines.push(`${getPaymentMethodLabel(method)};${formatCurrency(total)}`);
        });
        lines.push('');

        // Status
        lines.push('DISTRIBUIÇÃO DE STATUS');
        lines.push('Status;Quantidade');
        Object.entries(stats.byStatus).forEach(([status, count]) => {
            lines.push(`${getStatusLabel(status)};${count}`);
        });
        lines.push('');

        // Top Produtos
        lines.push('TOP PRODUTOS');
        lines.push('Produto;Quantidade;Receita');
        stats.topProducts.forEach(p => {
            lines.push(`${p.name};${p.quantity};${formatCurrency(p.revenue)}`);
        });

        // Trigger Download
        const csvContent = lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_gerencial_${period}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const periodLabels: Record<PeriodType, string> = {
        today: 'Hoje',
        week: 'Esta Semana',
        month: 'Este Mês',
        '30days': 'Últimos 30 dias',
        custom: 'Personalizado'
    };

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className={styles.chartTooltip}>
                    <p className={styles.tooltipLabel}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {entry.name.includes('receita') || entry.name === 'atual' ? formatCurrency(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Check if user has access to reports
    if (!canAccess('reports')) {
        return (
            <UpgradePrompt
                feature="Relatórios"
                requiredPlan="Avançado"
                currentPlan={plan}
                fullPage
            />
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Relatórios</h1>
                    <p className={styles.subtitle}>Análise detalhada do desempenho do seu negócio</p>
                </div>

                <div className="flex gap-2">
                    {canAccess('exportPdf') && isClient && (
                        <Button leftIcon={<FiFileText />} onClick={handleExportCSV} variant="outline">
                            Exportar CSV
                        </Button>
                    )}

                    {canAccess('exportPdf') && isClient && (
                        <PDFDownloadLink
                            document={
                                <RelatorioPDFCompleto
                                    reportData={{
                                        businessName: userSettings?.app_name || 'Ligeirinho Hotdog',
                                        periodoSelecionado: periodLabels[period],
                                        secoes: [
                                            {
                                                titulo: 'Resumo Geral',
                                                tipo: 'kpi' as const,
                                                dados: [
                                                    { label: 'Receita Total', value: formatCurrency(stats.totalRevenue) },
                                                    { label: 'Total Pedidos', value: String(stats.totalOrders) },
                                                    { label: 'Ticket Médio', value: formatCurrency(stats.averageTicket) }
                                                ]
                                            },
                                            {
                                                titulo: 'Formas de Pagamento',
                                                tipo: 'kpi' as const,
                                                dados: Object.entries(stats.byPaymentMethod).map(([method, total]) => ({
                                                    label: getPaymentMethodLabel(method),
                                                    value: formatCurrency(total)
                                                }))
                                            },
                                            {
                                                titulo: 'Top Produtos',
                                                tipo: 'tabela' as const,
                                                dados: stats.topProducts.map(p => ({
                                                    produto: p.name,
                                                    qtd: p.quantity,
                                                    total: formatCurrency(p.revenue)
                                                })),
                                                colunas: [
                                                    { header: 'Produto', key: 'produto', width: '50%' },
                                                    { header: 'Qtd.', key: 'qtd', width: '20%' },
                                                    { header: 'Total', key: 'total', width: '30%' }
                                                ]
                                            },
                                            {
                                                titulo: 'Distribuição de Status',
                                                tipo: 'lista' as const,
                                                dados: Object.entries(stats.byStatus).map(([status, count]) => ({
                                                    label: getStatusLabel(status),
                                                    value: String(count)
                                                }))
                                            }
                                        ],
                                        comparacao: {
                                            periodo: getComparisonLabel(comparison),
                                            dados: {
                                                'Receita': formatCurrency(stats.comparisonRevenue),
                                                'Pedidos': String(stats.comparisonOrders)
                                            }
                                        }
                                    }}
                                />
                            }
                            fileName={`relatorio_${period}.pdf`}
                        >
                            {({ loading }) => (
                                <Button leftIcon={<FiDownload />} isLoading={loading}>
                                    {loading ? 'Preparando...' : 'Exportar PDF'}
                                </Button>
                            )}
                        </PDFDownloadLink>
                    )}
                </div>
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

            {/* Comparison Selector */}
            <div className={styles.comparisonSelector}>
                <span className={styles.comparisonLabel}>
                    <FiActivity /> Comparar com:
                </span>
                <div className={styles.comparisonTabs}>
                    {(['previous', 'lastWeek', 'lastMonth', 'lastYear'] as ComparisonType[]).map((c) => (
                        <button
                            key={c}
                            className={`${styles.comparisonTab} ${comparison === c ? styles.active : ''}`}
                            onClick={() => setComparison(c)}
                        >
                            {getComparisonLabel(c)}
                        </button>
                    ))}
                </div>
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

                    {/* Interactive Sales Chart */}
                    <Card className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h2><FiBarChart2 /> Vendas por Dia</h2>
                            <div className={styles.chartLegend}>
                                <span className={styles.legendItem}>
                                    <span className={styles.legendDot} style={{ background: '#ff6b35' }}></span>
                                    Período atual
                                </span>
                                <span className={styles.legendItem}>
                                    <span className={styles.legendDot} style={{ background: 'rgba(0, 184, 148, 0.5)' }}></span>
                                    {getComparisonLabel(comparison)}
                                </span>
                            </div>
                        </div>
                        <div className={styles.chartContainer}>
                            {dailySalesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={dailySalesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1} />
                                            </linearGradient>
                                            <linearGradient id="colorComparacao" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00b894" stopOpacity={0.5} />
                                                <stop offset="95%" stopColor="#00b894" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888"
                                            fontSize={12}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#888"
                                            fontSize={12}
                                            tickFormatter={(value) => formatCurrencyShort(value)}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="comparacao"
                                            stroke="#00b894"
                                            fillOpacity={1}
                                            fill="url(#colorComparacao)"
                                            name="comparação"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="atual"
                                            stroke="#ff6b35"
                                            fillOpacity={1}
                                            fill="url(#colorAtual)"
                                            name="atual"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.noData}>
                                    <span>📊</span>
                                    <p>Nenhuma venda no período selecionado</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Two Column Charts Layout */}
                    <div className={styles.twoColumns}>
                        {/* Payment Methods Pie Chart */}
                        <Card className={styles.sectionCard}>
                            <div className={styles.cardHeader}>
                                <h2><BsCash /> Formas de Pagamento</h2>
                            </div>
                            <div className={styles.pieChartContainer}>
                                {paymentData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={paymentData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {paymentData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => formatCurrency(value as number)}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className={styles.pieLegend}>
                                            {paymentData.map((entry, index) => (
                                                <div key={index} className={styles.pieLegendItem}>
                                                    <span
                                                        className={styles.pieLegendDot}
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span className={styles.pieLegendLabel}>{entry.name}</span>
                                                    <span className={styles.pieLegendValue}>{formatCurrency(entry.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className={styles.noDataSmall}>
                                        <p>Nenhum pagamento no período</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Hourly Orders Bar Chart */}
                        <Card className={styles.sectionCard}>
                            <div className={styles.cardHeader}>
                                <h2><FiClock /> Pedidos por Hora</h2>
                            </div>
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="hour"
                                            stroke="#888"
                                            fontSize={10}
                                            tickLine={false}
                                            interval={2}
                                        />
                                        <YAxis
                                            stroke="#888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            formatter={(value) => [value as number, 'Pedidos']}
                                            contentStyle={{
                                                background: 'rgba(45, 52, 54, 0.95)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                            }}
                                        />
                                        <Bar
                                            dataKey="pedidos"
                                            fill="#ff6b35"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Top Products Bar Chart */}
                    <Card className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h2><FiPackage /> Top 5 Produtos Mais Vendidos</h2>
                        </div>
                        <div className={styles.chartContainer}>
                            {topProductsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={topProductsData}
                                        layout="vertical"
                                        margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            stroke="#888"
                                            fontSize={12}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            stroke="#888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [
                                                name === 'receita' ? formatCurrency(value as number) : (value as number) + 'x',
                                                name === 'receita' ? 'Receita' : 'Quantidade'
                                            ]}
                                            contentStyle={{
                                                background: 'rgba(45, 52, 54, 0.95)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="quantidade" fill="#ff6b35" name="Quantidade" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="receita" fill="#00b894" name="Receita" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.noData}>
                                    <span>📦</span>
                                    <p>Nenhum produto vendido no período</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Three Column Layout */}
                    <div className={styles.threeColumns}>
                        {/* Categories */}
                        <Card className={styles.miniCard}>
                            <div className={styles.cardHeaderMini}>
                                <h3><FiPieChart /> Categorias</h3>
                            </div>
                            <div className={styles.categoryGrid}>
                                {stats.byCategory.length > 0 ? (
                                    stats.byCategory.map((cat) => {
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
                                    })
                                ) : (
                                    <p className={styles.noDataText}>Nenhuma categoria</p>
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

                    {/* Period Comparison Summary */}
                    <Card className={styles.comparisonCard}>
                        <div className={styles.cardHeader}>
                            <h2><FiActivity /> Comparativo de Períodos</h2>
                        </div>
                        <div className={styles.comparisonGrid}>
                            <div className={styles.comparisonItem}>
                                <span className={styles.comparisonTitle}>Receita Atual</span>
                                <span className={styles.comparisonValue}>{formatCurrency(stats.totalRevenue)}</span>
                            </div>
                            <div className={styles.comparisonVs}>VS</div>
                            <div className={styles.comparisonItem}>
                                <span className={styles.comparisonTitle}>{getComparisonLabel(comparison)}</span>
                                <span className={styles.comparisonValue}>{formatCurrency(stats.comparisonRevenue)}</span>
                            </div>
                            <div className={`${styles.comparisonResult} ${stats.totalRevenue >= stats.comparisonRevenue ? styles.positive : styles.negative}`}>
                                <span className={styles.comparisonDiff}>
                                    {stats.totalRevenue >= stats.comparisonRevenue ? '+' : ''}
                                    {formatCurrency(stats.totalRevenue - stats.comparisonRevenue)}
                                </span>
                                <span className={styles.comparisonPercent}>
                                    ({getPercentChange(stats.totalRevenue, stats.comparisonRevenue).toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
