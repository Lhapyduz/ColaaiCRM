'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiClock, FiCheck, FiVolume2, FiVolumeX, FiLogOut, FiTruck, FiRefreshCw } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface OrderItemAddon { id: string; addon_name: string; addon_price: number; quantity: number; }
interface OrderItem { id: string; product_name: string; quantity: number; unit_price: number; total: number; notes: string | null; addons: OrderItemAddon[]; }
interface Order { id: string; order_number: number; customer_name: string; customer_phone: string | null; customer_address: string | null; status: string; payment_method: string; payment_status: string; subtotal: number; delivery_fee: number; total: number; notes: string | null; is_delivery: boolean; created_at: string; items: OrderItem[]; }
interface Employee { id: string; name: string; role: string; }

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

    useEffect(() => {
        const storedEmployee = sessionStorage.getItem('publicAccessEmployee');
        const storedUserId = sessionStorage.getItem('publicAccessUserId');
        const storedPage = sessionStorage.getItem('publicAccessPage');
        if (!storedEmployee || !storedUserId || storedPage !== pagina) { router.push(`/acesso/${token}/${pagina}`); return; }
        setEmployee(JSON.parse(storedEmployee));
        setUserId(storedUserId);
    }, [pagina, token, router]);

    useEffect(() => {
        if (!userId) return;
        fetchOrders();
        const channelName = `public_kitchen_${userId}_${Date.now()}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => { fetchOrders(); if (soundEnabled && audioRef.current) audioRef.current.play().catch(() => { }); })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => fetchOrders())
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => fetchOrders())
            .subscribe();
        const pollInterval = setInterval(() => fetchOrders(), 15000);
        return () => { channel.unsubscribe(); clearInterval(pollInterval); };
    }, [userId, soundEnabled]);

    const fetchOrders = async () => {
        if (!userId) return;
        try {
            const statusFilter = pagina === 'cozinha' ? ['pending', 'preparing'] : ['ready'];
            const { data: ordersData, error } = await supabase.from('orders').select('*').eq('user_id', userId).in('status', statusFilter).order('created_at', { ascending: true });
            if (error) throw error;
            const ordersWithItems = await Promise.all((ordersData || []).map(async (order) => {
                const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
                const itemsWithAddons = await Promise.all((items || []).map(async (item) => {
                    const { data: addons } = await supabase.from('order_item_addons').select('id, addon_name, addon_price, quantity').eq('order_item_id', item.id);
                    return { ...item, addons: addons || [] };
                }));
                return { ...order, items: itemsWithAddons };
            }));
            setOrders(ordersWithItems);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => { try { await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId); fetchOrders(); } catch (e) { console.error(e); } };
    const getTimeElapsed = (date: string) => { const diffMins = Math.floor((Date.now() - new Date(date).getTime()) / 60000); if (diffMins < 1) return '< 1 min'; if (diffMins < 60) return `${diffMins} min`; return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`; };
    const getTimeColor = (date: string) => { const diffMins = Math.floor((Date.now() - new Date(date).getTime()) / 60000); if (diffMins < 10) return 'text-accent'; if (diffMins < 20) return 'text-warning'; return 'text-error'; };
    const handleLogout = () => { sessionStorage.removeItem('publicAccessEmployee'); sessionStorage.removeItem('publicAccessUserId'); sessionStorage.removeItem('publicAccessPage'); router.push(`/acesso/${token}/${pagina}`); };

    if (!employee) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    const isKitchen = pagina === 'cozinha';
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready' && o.is_delivery);

    const OrderCard = ({ order, actionLabel, actionStatus, statusColor }: { order: Order; actionLabel: string; actionStatus: string; statusColor: string }) => (
        <Card className={cn('mb-4', order.status === 'preparing' && 'border-l-4 border-l-accent')}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2"><span className="text-xl font-bold">#{order.order_number}</span><span>{order.is_delivery ? '🚚' : '🏪'}</span></div>
                <div className={cn('flex items-center gap-1 text-sm font-medium', getTimeColor(order.created_at))}><FiClock size={14} /> {getTimeElapsed(order.created_at)}</div>
            </div>
            <div className="font-medium mb-2">{order.customer_name}</div>
            {order.customer_address && <div className="text-sm text-text-muted mb-2">📍 {order.customer_address}</div>}
            {order.customer_phone && <div className="text-sm text-text-muted mb-2">📞 {order.customer_phone}</div>}
            <div className="bg-bg-tertiary rounded-lg p-3 mb-3">
                {order.items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-start gap-2 mb-1 last:mb-0">
                        <span className="font-bold text-primary min-w-8">{item.quantity}x</span>
                        <span className="flex-1">{item.product_name}</span>
                        {item.notes && <span className="text-text-muted text-sm w-full pl-8">({item.notes})</span>}
                        {item.addons && item.addons.length > 0 && <div className="flex flex-wrap gap-1 w-full pl-8">{item.addons.map((addon) => <span key={addon.id} className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">+ {addon.addon_name}</span>)}</div>}
                    </div>
                ))}
            </div>
            {pagina === 'entregas' && <div className="font-bold text-lg mb-3 text-primary">Total: R$ {order.total.toFixed(2).replace('.', ',')}</div>}
            <Button fullWidth variant="primary" leftIcon={actionStatus === 'ready' ? <FiCheck /> : actionStatus === 'delivered' ? <FiTruck /> : undefined} onClick={() => updateOrderStatus(order.id, actionStatus)} className={statusColor}>{actionLabel}</Button>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background">
            <audio ref={audioRef} src={`https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/sons/${pagina === 'cozinha' ? 'Cozinha' : 'Entrega'}.mp3`} preload="auto" />
            {/* Header */}
            <div className="sticky top-0 z-20 bg-bg-card border-b border-border p-4 flex items-center justify-between">
                <div><h1 className="text-xl font-bold">{isKitchen ? '👨‍🍳 Cozinha' : '🚚 Entregas'}</h1><span className="text-sm text-text-muted">Olá, {employee.name}</span></div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" leftIcon={<FiRefreshCw />} onClick={fetchOrders}>Atualizar</Button>
                    <Button variant="ghost" size="sm" leftIcon={soundEnabled ? <FiVolume2 /> : <FiVolumeX />} onClick={() => setSoundEnabled(!soundEnabled)} />
                    <Button variant="ghost" size="sm" leftIcon={<FiLogOut />} onClick={handleLogout}>Sair</Button>
                </div>
            </div>

            {loading ? <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
                : orders.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-center"><span className="text-5xl mb-4">{isKitchen ? '👨‍🍳' : '📦'}</span><h3 className="text-lg font-semibold text-text-secondary mb-2">Nenhum pedido no momento</h3><p className="text-text-muted">Novos pedidos aparecerão automaticamente</p></div>
                    : isKitchen ? (
                        <div className="grid grid-cols-2 gap-4 p-4 max-md:grid-cols-1">
                            {/* Pending Column */}
                            <div><div className="flex items-center justify-between mb-4 bg-bg-tertiary rounded-lg p-3"><span className="flex items-center gap-2 font-medium"><span className="w-3 h-3 rounded-full bg-warning" /> Aguardando</span><span className="bg-warning/20 text-warning px-2 py-0.5 rounded-full text-sm font-bold">{pendingOrders.length}</span></div>{pendingOrders.map(o => <OrderCard key={o.id} order={o} actionLabel="Iniciar Preparo" actionStatus="preparing" statusColor="" />)}</div>
                            {/* Preparing Column */}
                            <div><div className="flex items-center justify-between mb-4 bg-bg-tertiary rounded-lg p-3"><span className="flex items-center gap-2 font-medium"><span className="w-3 h-3 rounded-full bg-accent" /> Preparando</span><span className="bg-accent/20 text-accent px-2 py-0.5 rounded-full text-sm font-bold">{preparingOrders.length}</span></div>{preparingOrders.map(o => <OrderCard key={o.id} order={o} actionLabel="Marcar Pronto" actionStatus="ready" statusColor="!bg-accent" />)}</div>
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4 bg-bg-tertiary rounded-lg p-3"><span className="flex items-center gap-2 font-medium"><span className="w-3 h-3 rounded-full bg-success" /> Prontos para Entrega</span><span className="bg-success/20 text-success px-2 py-0.5 rounded-full text-sm font-bold">{readyOrders.length}</span></div>
                            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">{readyOrders.map(o => <OrderCard key={o.id} order={o} actionLabel="Marcar Entregue" actionStatus="delivered" statusColor="!bg-accent" />)}</div>
                        </div>
                    )}
        </div>
    );
}
