'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { FiClock, FiCheck, FiVolume2, FiVolumeX, FiPrinter } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useOrdersCache } from '@/hooks/useDataCache';
import { updateOrder } from '@/repositories/dataAccess';
import type { CachedOrder } from '@/types/db';
import { printKitchenTicket, type OrderData } from '@/services/business/print';
import { cn } from '@/utils/utils';



export default function CozinhaPage() {
    const { plan, canAccess } = useSubscription();
    const { orders: rawOrders, loading } = useOrdersCache();
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevOrdersCount = useRef(0);

    const playNotificationSound = useCallback(() => {
        if (audioRef.current) audioRef.current.play().catch(() => { });
    }, []);

    const orders = useMemo(() => {
        return rawOrders
            .filter((o: CachedOrder) => o.status === 'pending' || o.status === 'preparing')
            .sort((a: CachedOrder, b: CachedOrder) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    }, [rawOrders]);

    // Sound notification for new orders - moved from useMemo to useEffect
    useEffect(() => {
        if (!loading && orders.length > prevOrdersCount.current) {
            if (soundEnabled) {
                playNotificationSound();
            }
        }
        prevOrdersCount.current = orders.length;
    }, [orders.length, soundEnabled, loading, playNotificationSound]);

    if (!canAccess('kitchen')) {
        return (
            <UpgradePrompt feature="Tela de Cozinha" requiredPlan="Profissional" currentPlan={plan} fullPage />
        );
    }

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        try {
            await updateOrder(orderId, { status: newStatus });
        } catch (error) {
            console.error('Error updating order status:', error);
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

    const pendingOrders = orders.filter((o: CachedOrder) => o.status === 'pending');
    const preparingOrders = orders.filter((o: CachedOrder) => o.status === 'preparing');

    const OrderCard = ({ order, isPreparing }: { order: CachedOrder; isPreparing?: boolean }) => (
        <Card className={cn('p-4! animate-[slideInUp_0.3s_ease]', isPreparing && 'border-info shadow-[0_0_0_1px_rgba(9,132,227,0.2)]')}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">#{order.order_number}</span>
                    <span className="text-xl">{order.is_delivery ? '🚚' : '🏪'}</span>
                </div>
                <div className={cn('flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 bg-white/5 rounded-full', getTimeColor(order.created_at || new Date().toISOString()))}>
                    <FiClock />
                    {getTimeElapsed(order.created_at || new Date().toISOString())}
                </div>
            </div>

            <div className="font-medium mb-3 pb-3 border-b border-border">{order.customer_name}</div>

            <div className="mb-4">
                {(order.order_items || []).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 py-2 not-last:border-b not-last:border-dashed not-last:border-border">
                        <span className="font-bold text-primary min-w-8">{item.quantity}x</span>
                        <span className="flex-1 font-medium">{item.product_name}</span>
                        {item.notes && <span className="text-[0.8125rem] text-text-secondary italic">({item.notes})</span>}
                        {item.order_item_addons && item.order_item_addons.length > 0 && (
                            <div className="flex flex-wrap gap-1 w-full mt-1 pl-8">
                                {(item.order_item_addons || []).map((addon) => (
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
                    onClick={() => handleUpdateStatus(order.id, isPreparing ? 'ready' : 'preparing')}
                    style={isPreparing ? { background: 'var(--accent)' } : undefined}
                >
                    {isPreparing ? 'Marcar Pronto' : 'Iniciar Preparo'}
                </Button>
                <Button variant="ghost" leftIcon={<FiPrinter />} onClick={() => printKitchenTicket({ ...order, items: (order.order_items || []).map(item => ({ ...item, unit_price: item.unit_price || 0, total: item.total || 0 })) } as OrderData)} title="Imprimir comanda" />
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
