'use client';

import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCreditCard, FiSmartphone } from 'react-icons/fi';
import { BsCash } from 'react-icons/bs';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface DaySummary {
    totalOrders: number;
    totalRevenue: number;
    paidOrders: number;
    pendingPayments: number;
    byMethod: {
        money: number;
        pix: number;
        credit: number;
        debit: number;
    };
}

export default function CaixaPage() {
    const { user } = useAuth();
    const [summary, setSummary] = useState<DaySummary>({
        totalOrders: 0,
        totalRevenue: 0,
        paidOrders: 0,
        pendingPayments: 0,
        byMethod: { money: 0, pix: 0, credit: 0, debit: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (user) {
            fetchSummary();
        }
    }, [user, selectedDate]);

    const fetchSummary = async () => {
        if (!user) return;

        try {
            // Create dates with proper timezone handling
            // Use selectedDate + T00:00:00 to interpret in local timezone
            const startDate = new Date(`${selectedDate}T00:00:00`);
            const endDate = new Date(`${selectedDate}T23:59:59.999`);

            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .neq('status', 'cancelled');

            if (orders) {
                const paidOrders = orders.filter(o => o.payment_status === 'paid');
                const pendingOrders = orders.filter(o => o.payment_status === 'pending');

                const byMethod = {
                    money: paidOrders.filter(o => o.payment_method === 'money').reduce((sum, o) => sum + o.total, 0),
                    pix: paidOrders.filter(o => o.payment_method === 'pix').reduce((sum, o) => sum + o.total, 0),
                    credit: paidOrders.filter(o => o.payment_method === 'credit').reduce((sum, o) => sum + o.total, 0),
                    debit: paidOrders.filter(o => o.payment_method === 'debit').reduce((sum, o) => sum + o.total, 0)
                };

                setSummary({
                    totalOrders: orders.length,
                    totalRevenue: paidOrders.reduce((sum, o) => sum + o.total, 0),
                    paidOrders: paidOrders.length,
                    pendingPayments: pendingOrders.reduce((sum, o) => sum + o.total, 0),
                    byMethod
                });
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
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

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long'
        }).format(date);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Caixa</h1>
                        <p className={styles.subtitle}>Resumo financeiro do dia</p>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className={styles.datePicker}
                    />
                </div>

                <div className={styles.dateLabel}>
                    {isToday ? 'Hoje' : formatDate(selectedDate)}
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <div className="skeleton" style={{ height: 150, borderRadius: 16 }} />
                        <div className={styles.grid}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Main Stats */}
                        <Card className={styles.mainCard}>
                            <div className={styles.mainStat}>
                                <span className={styles.mainLabel}>Receita Total</span>
                                <span className={styles.mainValue}>{formatCurrency(summary.totalRevenue)}</span>
                                <span className={styles.mainMeta}>
                                    {summary.paidOrders} pedido{summary.paidOrders !== 1 ? 's' : ''} pago{summary.paidOrders !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {summary.pendingPayments > 0 && (
                                <div className={styles.pendingAlert}>
                                    <span className={styles.pendingIcon}>⚠️</span>
                                    <div>
                                        <span className={styles.pendingLabel}>Pagamentos Pendentes</span>
                                        <span className={styles.pendingValue}>{formatCurrency(summary.pendingPayments)}</span>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Payment Methods Grid */}
                        <h3 className={styles.sectionTitle}>Por Forma de Pagamento</h3>
                        <div className={styles.grid}>
                            <Card className={styles.methodCard}>
                                <div className={styles.methodIcon} style={{ background: 'rgba(0, 184, 148, 0.1)' }}>
                                    <BsCash style={{ color: 'var(--accent)' }} />
                                </div>
                                <div className={styles.methodInfo}>
                                    <span className={styles.methodName}>Dinheiro</span>
                                    <span className={styles.methodValue}>{formatCurrency(summary.byMethod.money)}</span>
                                </div>
                            </Card>

                            <Card className={styles.methodCard}>
                                <div className={styles.methodIcon} style={{ background: 'rgba(0, 206, 201, 0.1)' }}>
                                    <FiSmartphone style={{ color: '#00cec9' }} />
                                </div>
                                <div className={styles.methodInfo}>
                                    <span className={styles.methodName}>PIX</span>
                                    <span className={styles.methodValue}>{formatCurrency(summary.byMethod.pix)}</span>
                                </div>
                            </Card>

                            <Card className={styles.methodCard}>
                                <div className={styles.methodIcon} style={{ background: 'rgba(9, 132, 227, 0.1)' }}>
                                    <FiCreditCard style={{ color: 'var(--info)' }} />
                                </div>
                                <div className={styles.methodInfo}>
                                    <span className={styles.methodName}>Crédito</span>
                                    <span className={styles.methodValue}>{formatCurrency(summary.byMethod.credit)}</span>
                                </div>
                            </Card>

                            <Card className={styles.methodCard}>
                                <div className={styles.methodIcon} style={{ background: 'rgba(155, 89, 182, 0.1)' }}>
                                    <FiCreditCard style={{ color: '#9b59b6' }} />
                                </div>
                                <div className={styles.methodInfo}>
                                    <span className={styles.methodName}>Débito</span>
                                    <span className={styles.methodValue}>{formatCurrency(summary.byMethod.debit)}</span>
                                </div>
                            </Card>
                        </div>

                        {/* Summary Stats */}
                        <h3 className={styles.sectionTitle}>Resumo</h3>
                        <Card className={styles.summaryCard}>
                            <div className={styles.summaryRow}>
                                <span>Total de Pedidos</span>
                                <span className={styles.summaryValue}>{summary.totalOrders}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Pedidos Pagos</span>
                                <span className={styles.summaryValue}>{summary.paidOrders}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Ticket Médio</span>
                                <span className={styles.summaryValue}>
                                    {summary.paidOrders > 0
                                        ? formatCurrency(summary.totalRevenue / summary.paidOrders)
                                        : formatCurrency(0)}
                                </span>
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
