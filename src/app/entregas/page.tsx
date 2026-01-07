'use client';

import React, { useState, useEffect } from 'react';
import { FiCheck, FiPhone, FiMapPin, FiClock } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Order {
    id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    status: string;
    total: number;
    created_at: string;
}

export default function EntregasPage() {
    const { user } = useAuth();
    const { plan, canAccess } = useSubscription();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    useEffect(() => {
        if (user && canAccess('deliveries')) {
            fetchOrders();
        }
    }, [user, activeTab, canAccess]);

    // Check if user has access to deliveries feature
    if (!canAccess('deliveries')) {
        return (
            <MainLayout>
                <UpgradePrompt
                    feature="Gestão de Entregas"
                    requiredPlan="Avançado"
                    currentPlan={plan}
                    fullPage
                />
            </MainLayout>
        );
    }

    const fetchOrders = async () => {
        if (!user) return;

        try {
            let query = supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_delivery', true)
                .order('created_at', { ascending: activeTab === 'pending' });

            if (activeTab === 'pending') {
                query = query.in('status', ['ready', 'delivering']);
            } else {
                query = query.eq('status', 'delivered');
            }

            const { data } = await query;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);
            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins} min`;
        const hours = Math.floor(diffMins / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    const readyOrders = orders.filter(o => o.status === 'ready');
    const deliveringOrders = orders.filter(o => o.status === 'delivering');

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Entregas</h1>
                        <p className={styles.subtitle}>Gerencie suas entregas</p>
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pendentes
                        {activeTab === 'pending' && orders.length > 0 && (
                            <span className={styles.tabBadge}>{orders.length}</span>
                        )}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Histórico
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
                        ))}
                    </div>
                ) : activeTab === 'pending' ? (
                    orders.length > 0 ? (
                        <div className={styles.columns}>
                            {/* Ready for Delivery */}
                            <div className={styles.column}>
                                <h3 className={styles.columnTitle}>
                                    <span className={styles.statusDot} style={{ background: 'var(--accent)' }} />
                                    Prontos para Entrega ({readyOrders.length})
                                </h3>
                                <div className={styles.ordersList}>
                                    {readyOrders.map((order) => (
                                        <Card key={order.id} className={styles.orderCard}>
                                            <div className={styles.orderHeader}>
                                                <span className={styles.orderNumber}>#{order.order_number}</span>
                                                <span className={styles.orderTime}>
                                                    <FiClock /> {getTimeAgo(order.created_at)}
                                                </span>
                                            </div>
                                            <div className={styles.customerName}>{order.customer_name}</div>
                                            {order.customer_phone && (
                                                <div className={styles.customerDetail}>
                                                    <FiPhone /> {order.customer_phone}
                                                </div>
                                            )}
                                            {order.customer_address && (
                                                <div className={styles.customerDetail}>
                                                    <FiMapPin /> {order.customer_address}
                                                </div>
                                            )}
                                            <div className={styles.orderFooter}>
                                                <span className={styles.orderTotal}>{formatCurrency(order.total)}</span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => updateOrderStatus(order.id, 'delivering')}
                                                >
                                                    Saiu para Entrega
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Delivering */}
                            <div className={styles.column}>
                                <h3 className={styles.columnTitle}>
                                    <span className={styles.statusDot} style={{ background: 'var(--primary)' }} />
                                    Em Entrega ({deliveringOrders.length})
                                </h3>
                                <div className={styles.ordersList}>
                                    {deliveringOrders.map((order) => (
                                        <Card key={order.id} className={`${styles.orderCard} ${styles.delivering}`}>
                                            <div className={styles.orderHeader}>
                                                <span className={styles.orderNumber}>#{order.order_number}</span>
                                                <span className={styles.orderTime}>
                                                    <FiClock /> {getTimeAgo(order.created_at)}
                                                </span>
                                            </div>
                                            <div className={styles.customerName}>{order.customer_name}</div>
                                            {order.customer_address && (
                                                <div className={styles.customerDetail}>
                                                    <FiMapPin /> {order.customer_address}
                                                </div>
                                            )}
                                            <div className={styles.orderFooter}>
                                                <span className={styles.orderTotal}>{formatCurrency(order.total)}</span>
                                                <Button
                                                    size="sm"
                                                    leftIcon={<FiCheck />}
                                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                                                    style={{ background: 'var(--accent)' }}
                                                >
                                                    Entregue
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>🚚</span>
                            <h3>Nenhuma entrega pendente</h3>
                            <p>As entregas prontas aparecerão aqui</p>
                        </div>
                    )
                ) : (
                    orders.length > 0 ? (
                        <div className={styles.historyList}>
                            {orders.map((order) => (
                                <Card key={order.id} className={styles.historyCard}>
                                    <div className={styles.historyInfo}>
                                        <span className={styles.orderNumber}>#{order.order_number}</span>
                                        <span className={styles.customerName}>{order.customer_name}</span>
                                    </div>
                                    <div className={styles.historyMeta}>
                                        <span className={styles.orderTotal}>{formatCurrency(order.total)}</span>
                                        <span className={styles.historyTime}>
                                            {new Intl.DateTimeFormat('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }).format(new Date(order.created_at))}
                                        </span>
                                        <span className={styles.deliveredBadge}>✓ Entregue</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>📦</span>
                            <h3>Nenhuma entrega no histórico</h3>
                            <p>As entregas finalizadas aparecerão aqui</p>
                        </div>
                    )
                )}
            </div>
        </MainLayout>
    );
}
