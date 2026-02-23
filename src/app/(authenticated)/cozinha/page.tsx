'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiClock, FiCheck, FiVolume2, FiVolumeX, FiPrinter } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { printKitchenTicket } from '@/lib/print';
import { cn } from '@/lib/utils';

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
    const toast = useToast();

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        try {
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        order_item_addons (*)
                    )
                `)
                .eq('user_id', user.id)
                .in('status', ['pending', 'preparing'])
                .order('created_at', { ascending: true });

            if (error) throw error;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedOrders: Order[] = (ordersData || []).map((o: any) => ({
                ...o,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: (o.order_items || []).map((item: any) => ({
                    ...item,
                    addons: item.order_item_addons || []
                }))
            }));

            setOrders(mappedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && canAccess('kitchen')) {
            fetchOrders();
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
    }, [user, soundEnabled, canAccess, fetchOrders]);

    if (!canAccess('kitchen')) {
        return (
            <UpgradePrompt feature="Tela de Cozinha" requiredPlan="Profissional" currentPlan={plan} fullPage />
        );
    }

    const playNotificationSound = () => {
        if (audioRef.current) audioRef.current.play().catch(() => { });
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
            if (error) throw error;
            toast.success(newStatus === 'preparing' ? 'Preparo iniciado!' : 'Pedido marcado como pronto!');
            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Erro ao atualizar pedido');
        }
    };

    const getTimeElapsed = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMins = Math.floor((now.getTime() - past.getTime()) / 60000);
        if (diffMins < 1) return '< 1 min';
        if (diffMins < 60) return `${diffMins} min`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    const getTimeColor = (date: string) => {
        const diffMins = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
        if (diffMins < 10) return 'text-accent';
        if (diffMins < 20) return 'text-warning';
        return 'text-error';
    };

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');

    const OrderCard = ({ order, isPreparing }: { order: Order; isPreparing?: boolean }) => (
        <Card className={cn('p-4! animate-[slideInUp_0.3s_ease]', isPreparing && 'border-info shadow-[0_0_0_1px_rgba(9,132,227,0.2)]')}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">#{order.order_number}</span>
                    <span className="text-xl">{order.is_delivery ? '🚚' : '🏪'}</span>
                </div>
                <div className={cn('flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 bg-white/5 rounded-full', getTimeColor(order.created_at))}>
                    <FiClock />
                    {getTimeElapsed(order.created_at)}
                </div>
            </div>

            <div className="font-medium mb-3 pb-3 border-b border-border">{order.customer_name}</div>

            <div className="mb-4">
                {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 py-2 not-last:border-b not-last:border-dashed not-last:border-border">
                        <span className="font-bold text-primary min-w-8">{item.quantity}x</span>
                        <span className="flex-1 font-medium">{item.product_name}</span>
                        {item.notes && <span className="text-[0.8125rem] text-text-secondary italic">({item.notes})</span>}
                        {item.addons && item.addons.length > 0 && (
                            <div className="flex flex-wrap gap-1 w-full mt-1 pl-8">
                                {item.addons.map((addon) => (
                                    <span key={addon.id} className="text-xs text-warning bg-warning/15 px-2 py-0.5 rounded-full font-medium">
                                        + {addon.addon_name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    fullWidth
                    variant="primary"
                    leftIcon={isPreparing ? <FiCheck /> : undefined}
                    onClick={() => updateOrderStatus(order.id, isPreparing ? 'ready' : 'preparing')}
                    style={isPreparing ? { background: 'var(--accent)' } : undefined}
                >
                    {isPreparing ? 'Marcar Pronto' : 'Iniciar Preparo'}
                </Button>
                <Button variant="ghost" leftIcon={<FiPrinter />} onClick={() => printKitchenTicket(order)} title="Imprimir comanda" />
            </div>
        </Card>
    );

    return (
        <div className="max-w-[1400px] mx-auto">
            <audio ref={audioRef} src="https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/sons/Cozinha.mp3" preload="auto" />

            {/* Header */}
            <div className="flex items-start justify-between mb-8 gap-5 max-md:flex-col">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Cozinha</h1>
                    <p className="text-text-secondary">Fila de preparo • {orders.length} pedido{orders.length !== 1 ? 's' : ''} ativo{orders.length !== 1 ? 's' : ''}</p>
                </div>
                <Button variant={soundEnabled ? 'secondary' : 'ghost'} leftIcon={soundEnabled ? <FiVolume2 /> : <FiVolumeX />} onClick={() => setSoundEnabled(!soundEnabled)}>
                    {soundEnabled ? 'Som Ativo' : 'Som Mudo'}
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 gap-6 max-[1024px]:grid-cols-1">
                    <div className="h-[200px] rounded-2xl bg-bg-tertiary animate-pulse" />
                    <div className="h-[200px] rounded-2xl bg-bg-tertiary animate-pulse" />
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                    <span className="text-[5rem] mb-5">👨‍🍳</span>
                    <h3 className="text-2xl mb-2">Nenhum pedido na fila</h3>
                    <p className="text-text-secondary">Os novos pedidos aparecerão aqui automaticamente</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-6 items-start max-[1024px]:grid-cols-1">
                    {/* Pending Column */}
                    <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 bg-bg-tertiary border-b border-border">
                            <span className="flex items-center gap-2.5 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                                Aguardando
                            </span>
                            <span className="px-3 py-1 bg-bg-card rounded-full text-sm font-semibold">{pendingOrders.length}</span>
                        </div>
                        <div className="p-4 flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto">
                            {pendingOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                        </div>
                    </div>

                    {/* Preparing Column */}
                    <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 bg-bg-tertiary border-b border-border">
                            <span className="flex items-center gap-2.5 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-info" />
                                Preparando
                            </span>
                            <span className="px-3 py-1 bg-bg-card rounded-full text-sm font-semibold">{preparingOrders.length}</span>
                        </div>
                        <div className="p-4 flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto">
                            {preparingOrders.map((order) => <OrderCard key={order.id} order={order} isPreparing />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
