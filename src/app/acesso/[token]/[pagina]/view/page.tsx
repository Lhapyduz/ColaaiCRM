'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiClock, FiCheck, FiVolume2, FiVolumeX, FiPrinter, FiLogOut, FiTruck, FiRefreshCw } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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

interface Employee {
    id: string;
    name: string;
    role: string;
}

export default function PublicViewPage() {
    const params = useParams();
    const router = useRouter();
    const pagina = params.pagina as string;
    const token = params.token as string;

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Validate session
    useEffect(() => {
        const storedEmployee = sessionStorage.getItem('publicAccessEmployee');
        const storedUserId = sessionStorage.getItem('publicAccessUserId');
        const storedPage = sessionStorage.getItem('publicAccessPage');

        if (!storedEmployee || !storedUserId || storedPage !== pagina) {
            // Redirect back to PIN page
            router.push(`/acesso/${token}/${pagina}`);
            return;
        }

        setEmployee(JSON.parse(storedEmployee));
        setUserId(storedUserId);
    }, [pagina, token, router]);

    // Fetch orders and set up real-time subscription
    useEffect(() => {
        if (!userId) return;

        // Initial fetch
        fetchOrders();

        // Create unique channel name for this session
        const channelName = `public_kitchen_${userId}_${Date.now()}`;

        // Real-time subscription for INSERT, UPDATE, DELETE events
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                console.log('New order received:', payload);
                fetchOrders();
                // Play sound for new orders
                if (soundEnabled && audioRef.current) {
                    audioRef.current.play().catch(() => { });
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                console.log('Order updated:', payload);
                fetchOrders();
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${userId}`
            }, () => {
                fetchOrders();
            })
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        // Also poll every 15 seconds as fallback
        const pollInterval = setInterval(() => {
            fetchOrders();
        }, 15000);

        return () => {
            channel.unsubscribe();
            clearInterval(pollInterval);
        };
    }, [userId, soundEnabled]);

    const fetchOrders = async () => {
        if (!userId) return;

        try {
            const statusFilter = pagina === 'cozinha'
                ? ['pending', 'preparing']
                : ['ready']; // entregas

            const { data: ordersData, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .in('status', statusFilter)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Fetch items and addons
            const ordersWithItems = await Promise.all(
                (ordersData || []).map(async (order) => {
                    const { data: items } = await supabase
                        .from('order_items')
                        .select('*')
                        .eq('order_id', order.id);

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

    const handleLogout = () => {
        sessionStorage.removeItem('publicAccessEmployee');
        sessionStorage.removeItem('publicAccessUserId');
        sessionStorage.removeItem('publicAccessPage');
        router.push(`/acesso/${token}/${pagina}`);
    };

    if (!employee) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}>
                    <div className={styles.spinner} />
                </div>
            </div>
        );
    }

    const isKitchen = pagina === 'cozinha';
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready' && o.is_delivery);

    return (
        <div className={styles.publicContainer}>
            {/* Hidden audio element */}
            <audio ref={audioRef} src="/notification.mp3" preload="auto" />

            {/* Header */}
            <div className={styles.publicHeader}>
                <div className={styles.headerLeft}>
                    <h1>{isKitchen ? '👨‍🍳 Cozinha' : '🚚 Entregas'}</h1>
                    <span className={styles.employeeName}>Olá, {employee.name}</span>
                </div>
                <div className={styles.headerActions}>
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FiRefreshCw />}
                        onClick={fetchOrders}
                    >
                        Atualizar
                    </Button>
                    <Button
                        variant={soundEnabled ? 'ghost' : 'ghost'}
                        size="sm"
                        leftIcon={soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FiLogOut />}
                        onClick={handleLogout}
                    >
                        Sair
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className={styles.loader}>
                    <div className={styles.spinner} />
                    <p>Carregando pedidos...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>{isKitchen ? '👨‍🍳' : '📦'}</span>
                    <h3>Nenhum pedido no momento</h3>
                    <p>Novos pedidos aparecerão automaticamente</p>
                </div>
            ) : isKitchen ? (
                /* Kitchen View - Two columns */
                <div className={styles.kitchenGrid}>
                    {/* Pending Column */}
                    <div className={styles.column}>
                        <div className={styles.columnHeader}>
                            <span className={styles.columnTitle}>
                                <span className={styles.statusDot} style={{ background: '#f39c12' }} />
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
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Preparing Column */}
                    <div className={styles.column}>
                        <div className={styles.columnHeader}>
                            <span className={styles.columnTitle}>
                                <span className={styles.statusDot} style={{ background: '#3498db' }} />
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
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* Delivery View */
                <div className={styles.deliveryGrid}>
                    <div className={styles.columnHeader}>
                        <span className={styles.columnTitle}>
                            <span className={styles.statusDot} style={{ background: '#00b894' }} />
                            Prontos para Entrega
                        </span>
                        <span className={styles.columnCount}>{readyOrders.length}</span>
                    </div>
                    <div className={styles.ordersList}>
                        {readyOrders.map((order) => (
                            <Card key={order.id} className={styles.orderCard}>
                                <div className={styles.orderHeader}>
                                    <div className={styles.orderInfo}>
                                        <span className={styles.orderNumber}>#{order.order_number}</span>
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

                                {order.customer_address && (
                                    <div className={styles.address}>
                                        📍 {order.customer_address}
                                    </div>
                                )}

                                {order.customer_phone && (
                                    <div className={styles.phone}>
                                        📞 {order.customer_phone}
                                    </div>
                                )}

                                <div className={styles.itemsList}>
                                    {order.items.map((item) => (
                                        <div key={item.id} className={styles.item}>
                                            <span className={styles.itemQuantity}>{item.quantity}x</span>
                                            <span className={styles.itemName}>{item.product_name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.orderTotal}>
                                    Total: R$ {order.total.toFixed(2).replace('.', ',')}
                                </div>

                                <div className={styles.orderActions}>
                                    <Button
                                        fullWidth
                                        variant="primary"
                                        leftIcon={<FiTruck />}
                                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                                        style={{ background: 'var(--accent)' }}
                                    >
                                        Marcar Entregue
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
