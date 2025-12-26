'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiCheck, FiVolume2, FiVolumeX, FiPrinter } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { printKitchenTicket } from '@/lib/print';
import styles from './page.module.css';

interface OrderItemAddon {
    id: string;
    addon_name: string;
    addon_price: number;
    quantity: number;
}

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
    addons: OrderItemAddon[];
}

interface Order {
    id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    status: string;
    payment_method: string;
    payment_status: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
    notes: string | null;
    is_delivery: boolean;
    created_at: string;
    items: OrderItem[];
}

export default function CozinhaPage() {
    const { user } = useAuth();
    const { plan, canAccess } = useSubscription();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Check if user has access to kitchen feature
    if (!canAccess('kitchen')) {
        return (
            <MainLayout>
                <UpgradePrompt
                    feature="Tela de Cozinha"
                    requiredPlan="Profissional"
                    currentPlan={plan}
                    fullPage
                />
            </MainLayout>
        );
    }

    useEffect(() => {
        if (user) {
            fetchOrders();

            // Set up real-time subscription
            const subscription = supabase
                .channel('kitchen_orders')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    console.log('Order change:', payload);
                    fetchOrders();
                    if (payload.eventType === 'INSERT' && soundEnabled) {
                        playNotificationSound();
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user, soundEnabled]);

    const fetchOrders = async () => {
        if (!user) return;

        try {
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['pending', 'preparing'])
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Fetch items and addons for each order
            const ordersWithItems = await Promise.all(
                (ordersData || []).map(async (order) => {
                    const { data: items } = await supabase
                        .from('order_items')
                        .select('*')
                        .eq('order_id', order.id);

                    // Load addons for each item
                    const itemsWithAddons = await Promise.all(
                        (items || []).map(async (item) => {
                            const { data: addons } = await supabase
                                .from('order_item_addons')
                                .select('id, addon_name, addon_price, quantity')
                                .eq('order_item_id', item.id);
                            return { ...item, addons: addons || [] };
                        })
                    );

                    return { ...order, items: itemsWithAddons };
                })
            );

            setOrders(ordersWithItems);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;
            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    const getTimeElapsed = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '< 1 min';
        if (diffMins < 60) return `${diffMins} min`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    const getTimeColor = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMins = Math.floor((now.getTime() - past.getTime()) / 60000);

        if (diffMins < 10) return 'var(--accent)';
        if (diffMins < 20) return 'var(--warning)';
        return 'var(--error)';
    };

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Hidden audio element for notifications */}
                <audio ref={audioRef} src="/notification.mp3" preload="auto" />

                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Cozinha</h1>
                        <p className={styles.subtitle}>
                            Fila de preparo • {orders.length} pedido{orders.length !== 1 ? 's' : ''} ativo{orders.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Button
                        variant={soundEnabled ? 'secondary' : 'ghost'}
                        leftIcon={soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                    >
                        {soundEnabled ? 'Som Ativo' : 'Som Mudo'}
                    </Button>
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
                        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
                    </div>
                ) : orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>👨‍🍳</span>
                        <h3>Nenhum pedido na fila</h3>
                        <p>Os novos pedidos aparecerão aqui automaticamente</p>
                    </div>
                ) : (
                    <div className={styles.kitchenGrid}>
                        {/* Pending Column */}
                        <div className={styles.column}>
                            <div className={styles.columnHeader}>
                                <span className={styles.columnTitle}>
                                    <span className={styles.statusDot} style={{ background: 'var(--warning)' }} />
                                    Aguardando
                                </span>
                                <span className={styles.columnCount}>{pendingOrders.length}</span>
                            </div>
                            <div className={styles.ordersList}>
                                {pendingOrders.map((order) => (
                                    <Card key={order.id} className={styles.orderCard}>
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderInfo}>
                                                <span className={styles.orderNumber}>#{order.order_number}</span>
                                                <span className={styles.orderType}>
                                                    {order.is_delivery ? '🚚' : '🏪'}
                                                </span>
                                            </div>
                                            <div
                                                className={styles.timer}
                                                style={{ color: getTimeColor(order.created_at) }}
                                            >
                                                <FiClock />
                                                {getTimeElapsed(order.created_at)}
                                            </div>
                                        </div>

                                        <div className={styles.customerName}>
                                            {order.customer_name}
                                        </div>

                                        <div className={styles.itemsList}>
                                            {order.items.map((item) => (
                                                <div key={item.id} className={styles.item}>
                                                    <span className={styles.itemQuantity}>{item.quantity}x</span>
                                                    <span className={styles.itemName}>{item.product_name}</span>
                                                    {item.notes && (
                                                        <span className={styles.itemNotes}>({item.notes})</span>
                                                    )}
                                                    {item.addons && item.addons.length > 0 && (
                                                        <div className={styles.itemAddons}>
                                                            {item.addons.map((addon) => (
                                                                <span key={addon.id} className={styles.addonTag}>
                                                                    + {addon.addon_name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.orderActions}>
                                            <Button
                                                fullWidth
                                                variant="primary"
                                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                                            >
                                                Iniciar Preparo
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                leftIcon={<FiPrinter />}
                                                onClick={() => printKitchenTicket(order)}
                                                title="Imprimir comanda"
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Preparing Column */}
                        <div className={styles.column}>
                            <div className={styles.columnHeader}>
                                <span className={styles.columnTitle}>
                                    <span className={styles.statusDot} style={{ background: 'var(--info)' }} />
                                    Preparando
                                </span>
                                <span className={styles.columnCount}>{preparingOrders.length}</span>
                            </div>
                            <div className={styles.ordersList}>
                                {preparingOrders.map((order) => (
                                    <Card key={order.id} className={`${styles.orderCard} ${styles.preparing}`}>
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderInfo}>
                                                <span className={styles.orderNumber}>#{order.order_number}</span>
                                                <span className={styles.orderType}>
                                                    {order.is_delivery ? '🚚' : '🏪'}
                                                </span>
                                            </div>
                                            <div
                                                className={styles.timer}
                                                style={{ color: getTimeColor(order.created_at) }}
                                            >
                                                <FiClock />
                                                {getTimeElapsed(order.created_at)}
                                            </div>
                                        </div>

                                        <div className={styles.customerName}>
                                            {order.customer_name}
                                        </div>

                                        <div className={styles.itemsList}>
                                            {order.items.map((item) => (
                                                <div key={item.id} className={styles.item}>
                                                    <span className={styles.itemQuantity}>{item.quantity}x</span>
                                                    <span className={styles.itemName}>{item.product_name}</span>
                                                    {item.notes && (
                                                        <span className={styles.itemNotes}>({item.notes})</span>
                                                    )}
                                                    {item.addons && item.addons.length > 0 && (
                                                        <div className={styles.itemAddons}>
                                                            {item.addons.map((addon) => (
                                                                <span key={addon.id} className={styles.addonTag}>
                                                                    + {addon.addon_name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.orderActions}>
                                            <Button
                                                fullWidth
                                                variant="primary"
                                                leftIcon={<FiCheck />}
                                                onClick={() => updateOrderStatus(order.id, 'ready')}
                                                style={{ background: 'var(--accent)' }}
                                            >
                                                Marcar Pronto
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                leftIcon={<FiPrinter />}
                                                onClick={() => printKitchenTicket(order)}
                                                title="Imprimir comanda"
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
