'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiCheck, FiPhone, FiMapPin, FiClock, FiVolume2, FiVolumeX } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatRelativeTime, formatDateTime } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

interface Order {
    id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    status: string;
    total: number;
    is_delivery: boolean;
    created_at: string;
}

export default function EntregasPage() {
    const { user } = useAuth();
    const { plan, canAccess } = useSubscription();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const toast = useToast();

    useEffect(() => {
        if (user && canAccess('deliveries')) {
            fetchOrders();

            // Real-time subscription for delivery orders
            const subscription = supabase
                .channel('delivery_orders')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    console.log('Order change for delivery:', payload);
                    // Check if order status changed to 'ready' (delivery ready)
                    if (payload.new && (payload.new as Order).status === 'ready' && (payload.new as Order).is_delivery && soundEnabled) {
                        playNotificationSound();
                    }
                    fetchOrders();
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user, soundEnabled, activeTab, canAccess]);

    if (!canAccess('deliveries')) {
        return <UpgradePrompt feature="Gestão de Entregas" requiredPlan="Avançado" currentPlan={plan} fullPage />;
    }

    const playNotificationSound = () => {
        if (audioRef.current) audioRef.current.play().catch(() => { });
    };

    const fetchOrders = async () => {
        if (!user) return;
        try {
            let query = supabase.from('orders').select('*').eq('user_id', user.id).eq('is_delivery', true).order('created_at', { ascending: activeTab === 'pending' });
            if (activeTab === 'pending') query = query.in('status', ['ready', 'delivering']);
            else query = query.eq('status', 'delivered');
            const { data } = await query;
            setOrders(data || []);
        } catch (error) { console.error('Error fetching orders:', error); }
        finally { setLoading(false); }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
            toast.success(newStatus === 'delivering' ? 'Saiu para entrega!' : 'Entrega finalizada!');
            fetchOrders();
        }
        catch (error) {
            console.error('Error updating order:', error);
            toast.error('Erro ao atualizar entrega');
        }
    };

    const readyOrders = orders.filter(o => o.status === 'ready');
    const deliveringOrders = orders.filter(o => o.status === 'delivering');

    return (
        <div className="max-w-[1200px] mx-auto">
            <audio ref={audioRef} src="https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/sons/Entrega.mp3" preload="auto" />

            <div className="flex items-start justify-between mb-6 gap-5 max-md:flex-col">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Entregas</h1>
                    <p className="text-text-secondary">Gerencie suas entregas</p>
                </div>
                <Button variant={soundEnabled ? 'secondary' : 'ghost'} leftIcon={soundEnabled ? <FiVolume2 /> : <FiVolumeX />} onClick={() => setSoundEnabled(!soundEnabled)}>
                    {soundEnabled ? 'Som Ativo' : 'Som Mudo'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-bg-secondary p-1 rounded-lg mb-6 w-fit">
                <button className={cn('flex items-center gap-2 px-5 py-2.5 bg-transparent border-none rounded-md text-text-secondary text-[0.9375rem] font-medium cursor-pointer transition-all duration-fast hover:text-text-primary', activeTab === 'pending' && 'bg-bg-card text-text-primary')} onClick={() => setActiveTab('pending')}>
                    Pendentes
                    {activeTab === 'pending' && orders.length > 0 && <span className="px-2 py-0.5 bg-primary text-white text-xs font-semibold rounded-full">{orders.length}</span>}
                </button>
                <button className={cn('flex items-center gap-2 px-5 py-2.5 bg-transparent border-none rounded-md text-text-secondary text-[0.9375rem] font-medium cursor-pointer transition-all duration-fast hover:text-text-primary', activeTab === 'history' && 'bg-bg-card text-text-primary')} onClick={() => setActiveTab('history')}>
                    Histórico
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-[140px] rounded-xl bg-bg-tertiary animate-pulse" />)}
                </div>
            ) : activeTab === 'pending' ? (
                orders.length > 0 ? (
                    <div className="grid grid-cols-2 gap-6 items-start max-md:grid-cols-1">
                        {/* Ready for Delivery */}
                        <div className="bg-bg-secondary rounded-lg border border-border p-4">
                            <h3 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold mb-4 pb-3 border-b border-border">
                                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                                Prontos para Entrega ({readyOrders.length})
                            </h3>
                            <div className="flex flex-col gap-3">
                                {readyOrders.map((order) => (
                                    <Card key={order.id} className="p-4!">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-lg font-bold text-primary">#{order.order_number}</span>
                                            <span className="flex items-center gap-1 text-[0.8125rem] text-text-muted"><FiClock /> {formatRelativeTime(order.created_at)}</span>
                                        </div>
                                        <div className="font-medium mb-2">{order.customer_name}</div>
                                        {order.customer_phone && <div className="flex items-center gap-2 text-sm text-text-secondary mb-1"><FiPhone /> {order.customer_phone}</div>}
                                        {order.customer_address && <div className="flex items-center gap-2 text-sm text-text-secondary mb-1"><FiMapPin /> {order.customer_address}</div>}
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                                            <span className="text-lg font-bold text-accent">{formatCurrency(order.total)}</span>
                                            <Button size="sm" onClick={() => updateOrderStatus(order.id, 'delivering')}>Saiu para Entrega</Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Delivering */}
                        <div className="bg-bg-secondary rounded-lg border border-border p-4">
                            <h3 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold mb-4 pb-3 border-b border-border">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                                Em Entrega ({deliveringOrders.length})
                            </h3>
                            <div className="flex flex-col gap-3">
                                {deliveringOrders.map((order) => (
                                    <Card key={order.id} className="p-4! border-primary">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-lg font-bold text-primary">#{order.order_number}</span>
                                            <span className="flex items-center gap-1 text-[0.8125rem] text-text-muted"><FiClock /> {formatRelativeTime(order.created_at)}</span>
                                        </div>
                                        <div className="font-medium mb-2">{order.customer_name}</div>
                                        {order.customer_address && <div className="flex items-center gap-2 text-sm text-text-secondary mb-1"><FiMapPin /> {order.customer_address}</div>}
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                                            <span className="text-lg font-bold text-accent">{formatCurrency(order.total)}</span>
                                            <Button size="sm" leftIcon={<FiCheck />} onClick={() => updateOrderStatus(order.id, 'delivered')} style={{ background: 'var(--accent)' }}>Entregue</Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                        <span className="text-6xl mb-4">🚚</span>
                        <h3 className="text-xl mb-2">Nenhuma entrega pendente</h3>
                        <p className="text-text-secondary">As entregas prontas aparecerão aqui</p>
                    </div>
                )
            ) : (
                orders.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {orders.map((order) => (
                            <Card key={order.id} className="flex justify-between items-center px-5! py-4! max-md:flex-col max-md:items-start max-md:gap-3">
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-primary">#{order.order_number}</span>
                                    <span className="font-medium">{order.customer_name}</span>
                                </div>
                                <div className="flex items-center gap-4 max-md:w-full max-md:justify-between">
                                    <span className="text-lg font-bold text-accent">{formatCurrency(order.total)}</span>
                                    <span className="text-sm text-text-secondary">{formatDateTime(order.created_at)}</span>
                                    <StatusBadge status="delivered" size="sm" />
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                        <span className="text-6xl mb-4">📦</span>
                        <h3 className="text-xl mb-2">Nenhuma entrega no histórico</h3>
                        <p className="text-text-secondary">As entregas finalizadas aparecerão aqui</p>
                    </div>
                )
            )}
        </div>
    );
}
