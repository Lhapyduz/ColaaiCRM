'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    FiPlus,
    FiSearch,
    FiClock,
    FiMoreVertical,
    FiEye,
    FiEdit,
    FiTrash2
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { openWhatsAppNotification, shouldNotifyOnStatusChange, OrderDetails } from '@/lib/whatsapp';
import { logOrderStatusChange, logPaymentReceived } from '@/lib/actionLogger';
import { cn } from '@/lib/utils';

interface Order {
    id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    status: string;
    payment_method: string;
    payment_status: string;
    total: number;
    is_delivery: boolean;
    created_at: string;
    rating_token: string | null;
}

const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Aguardando' },
    { value: 'preparing', label: 'Preparando' },
    { value: 'ready', label: 'Pronto' },
    { value: 'delivering', label: 'Entregando' },
    { value: 'delivered', label: 'Entregue' },
    { value: 'cancelled', label: 'Cancelado' }
];

export default function PedidosPage() {
    const { user, userSettings } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDropdown, setShowDropdown] = useState<string | null>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState<Order | null>(null);

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user, statusFilter]);

    const ordersMap = useMemo(() => {
        const map = new Map<string, Order>();
        orders.forEach(o => map.set(o.id, o));
        return map;
    }, [orders]);

    const fetchOrders = async () => {
        if (!user) return;

        try {
            let query = supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendWhatsAppNotification = (order: Order, newStatus: string) => {
        if (!order.customer_phone || !userSettings?.whatsapp_number) return;

        const orderDetails: OrderDetails = {
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            total: order.total,
            status: newStatus,
            is_delivery: order.is_delivery,
            customer_address: order.customer_address || undefined,
            rating_token: order.rating_token || undefined
        };

        const notificationSettings = {
            whatsapp_number: userSettings.whatsapp_number,
            app_name: userSettings.app_name || 'Cola Aí'
        };

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        openWhatsAppNotification(orderDetails, notificationSettings, newStatus, baseUrl);
    };

    const updateOrderStatus = async (orderId: string, newStatus: string, sendNotification: boolean = false) => {
        try {
            const order = ordersMap.get(orderId);

            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;

            if (order) {
                logOrderStatusChange(orderId, order.order_number, order.status, newStatus);
            }

            if (sendNotification && order?.customer_phone && shouldNotifyOnStatusChange(order.status, newStatus)) {
                sendWhatsAppNotification(order, newStatus);
            }

            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
        }
        setShowDropdown(null);
        setShowWhatsAppModal(null);
    };

    const handleStatusChangeWithNotification = (order: Order, newStatus: string) => {
        if (order.customer_phone && shouldNotifyOnStatusChange(order.status, newStatus)) {
            setShowWhatsAppModal(order);
            (order as any)._pendingStatus = newStatus;
        } else {
            updateOrderStatus(order.id, newStatus, false);
        }
    };

    const updatePaymentStatus = async (orderId: string) => {
        try {
            const order = ordersMap.get(orderId);
            if (!order) return;

            const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;

            logPaymentReceived(orderId, order.order_number, order.total, order.payment_method);

            if (order.customer_phone && user) {
                try {
                    const cleanPhone = order.customer_phone.replace(/\D/g, '');

                    const { data: customer } = await supabase
                        .from('customers')
                        .select('id, total_spent, total_points')
                        .eq('user_id', user.id)
                        .eq('phone', cleanPhone)
                        .single();

                    if (customer) {
                        const { data: settings } = await supabase
                            .from('loyalty_settings')
                            .select('points_per_real')
                            .eq('user_id', user.id)
                            .single();

                        const pointsPerReal = settings?.points_per_real || 1;
                        const pointsEarned = Math.floor(order.total * pointsPerReal);

                        await supabase
                            .from('customers')
                            .update({
                                total_spent: (customer.total_spent || 0) + order.total,
                                total_points: (customer.total_points || 0) + pointsEarned
                            })
                            .eq('id', customer.id);

                        if (pointsEarned > 0) {
                            await supabase.from('points_transactions').insert({
                                user_id: user.id,
                                customer_id: customer.id,
                                points: pointsEarned,
                                type: 'earned',
                                description: `Pedido #${order.order_number}`,
                                order_id: order.id
                            });
                        }
                    }
                } catch (loyaltyErr) {
                    console.warn('Failed to update customer loyalty data:', loyaltyErr);
                }
            }

            fetchOrders();
        } catch (error) {
            console.error('Error updating payment status:', error);
        }
    };

    const deleteOrder = async (orderId: string) => {
        if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

        try {
            await supabase.from('order_items').delete().eq('order_id', orderId);
            await supabase.from('orders').delete().eq('id', orderId);
            fetchOrders();
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        }).format(new Date(date));
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

    const getPaymentLabel = (method: string) => {
        const labels: Record<string, string> = {
            money: 'Dinheiro',
            credit: 'Crédito',
            debit: 'Débito',
            pix: 'PIX'
        };
        return labels[method] || method;
    };

    const filteredOrders = orders.filter(order =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_number.toString().includes(searchTerm)
    );

    return (
        <MainLayout>
            <div className="max-w-[1200px] mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 gap-5 max-md:flex-col">
                    <div>
                        <h1 className="text-[2rem] font-bold mb-2">Pedidos</h1>
                        <p className="text-text-secondary">Gerencie todos os seus pedidos</p>
                    </div>
                    <Link href="/pedidos/novo">
                        <Button leftIcon={<FiPlus />}>Novo Pedido</Button>
                    </Link>
                </div>

                {/* Filters */}
                <Card className="mb-6 px-5! py-4!">
                    <div className="flex flex-col gap-4">
                        <div className="max-w-[400px]">
                            <Input
                                placeholder="Buscar por cliente ou número..."
                                leftIcon={<FiSearch />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className={cn(
                                        'px-4 py-2 bg-bg-tertiary border border-border rounded-full text-text-secondary text-sm cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary',
                                        statusFilter === option.value && 'bg-primary border-primary text-white'
                                    )}
                                    onClick={() => setStatusFilter(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Orders List */}
                <div className="min-h-[200px]">
                    {loading ? (
                        <div className="flex flex-col gap-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-20 rounded-md bg-bg-tertiary animate-pulse" />
                            ))}
                        </div>
                    ) : filteredOrders.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {filteredOrders.map((order) => (
                                <Card key={order.id} className="px-5! py-4!" hoverable>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-primary">#{order.order_number}</span>
                                            <span className={cn(
                                                'px-2.5 py-1 rounded-full text-xs font-medium',
                                                order.is_delivery ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                                            )}>
                                                {order.is_delivery ? '🚚 Entrega' : '🏪 Balcão'}
                                            </span>
                                            {order.customer_phone && (
                                                <span className="flex items-center justify-center w-6 h-6 bg-[rgba(37,211,102,0.15)] text-[#25D366] rounded-full text-xs" title="Cliente com WhatsApp">
                                                    <FaWhatsapp />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                'px-3 py-1.5 rounded-full text-xs font-semibold uppercase bg-bg-tertiary',
                                                order.status === 'pending' && 'text-warning',
                                                order.status === 'preparing' && 'text-info',
                                                order.status === 'ready' && 'text-accent',
                                                order.status === 'delivering' && 'text-primary',
                                                order.status === 'delivered' && 'text-accent',
                                                order.status === 'cancelled' && 'text-error'
                                            )}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                            <div className="relative">
                                                <button
                                                    className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-tertiary hover:text-text-primary"
                                                    onClick={() => setShowDropdown(showDropdown === order.id ? null : order.id)}
                                                >
                                                    <FiMoreVertical />
                                                </button>
                                                {showDropdown === order.id && (
                                                    <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-bg-card border border-border rounded-md shadow-lg z-dropdown animate-[fadeInDown_0.15s_ease]">
                                                        <Link href={`/pedidos/${order.id}`} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-text-secondary text-sm text-left cursor-pointer transition-all duration-fast hover:bg-bg-tertiary hover:text-text-primary">
                                                            <FiEye /> Ver Detalhes
                                                        </Link>
                                                        <Link href={`/pedidos/${order.id}/editar`} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-text-secondary text-sm text-left cursor-pointer transition-all duration-fast hover:bg-bg-tertiary hover:text-text-primary">
                                                            <FiEdit /> Editar
                                                        </Link>
                                                        {order.customer_phone && (
                                                            <button
                                                                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-[#25D366] text-sm text-left cursor-pointer transition-all duration-fast hover:bg-[rgba(37,211,102,0.1)]"
                                                                onClick={() => {
                                                                    sendWhatsAppNotification(order, order.status);
                                                                    setShowDropdown(null);
                                                                }}
                                                            >
                                                                <FaWhatsapp /> Enviar WhatsApp
                                                            </button>
                                                        )}
                                                        <div className="h-px bg-border my-1" />
                                                        <button
                                                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-none text-error text-sm text-left cursor-pointer transition-all duration-fast hover:bg-error/10"
                                                            onClick={() => deleteOrder(order.id)}
                                                        >
                                                            <FiTrash2 /> Excluir
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-border max-md:flex-col max-md:gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{order.customer_name}</span>
                                            {order.customer_phone && (
                                                <span className="text-sm text-text-secondary">{order.customer_phone}</span>
                                            )}
                                        </div>

                                        <div className="flex gap-8 max-md:w-full max-md:justify-between">
                                            <div className="flex flex-col items-end gap-1 max-md:items-start">
                                                <span className="text-xs text-text-muted uppercase">Pagamento</span>
                                                <span className="flex items-center gap-2 text-sm">
                                                    {getPaymentLabel(order.payment_method)}
                                                    <span className={cn(
                                                        'px-2 py-0.5 rounded-full text-[0.7rem]',
                                                        order.payment_status === 'paid' ? 'bg-accent/20 text-accent' : 'bg-warning/20 text-warning'
                                                    )}>
                                                        {order.payment_status === 'paid' ? '✓ Pago' : 'Pendente'}
                                                    </span>
                                                    {order.payment_status === 'pending' && (
                                                        <button
                                                            className="px-2.5 py-1 ml-1.5 bg-accent border-none rounded-full text-white text-[0.7rem] font-medium cursor-pointer transition-all duration-fast hover:opacity-90 hover:-translate-y-px"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updatePaymentStatus(order.id);
                                                            }}
                                                        >
                                                            Recebido
                                                        </button>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 max-md:items-start">
                                                <span className="text-xs text-text-muted uppercase">Total</span>
                                                <span className="text-lg font-bold text-accent">{formatCurrency(order.total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between max-md:flex-col max-md:gap-3 max-md:items-stretch">
                                        <span className="flex items-center gap-1.5 text-sm text-text-muted">
                                            <FiClock /> {formatDate(order.created_at)}
                                        </span>

                                        <div className="flex gap-2 max-md:justify-end">
                                            {order.status === 'pending' && (
                                                <button
                                                    className="px-4 py-2 bg-primary border-none rounded-md text-white text-sm font-medium cursor-pointer transition-all duration-fast hover:opacity-90 hover:-translate-y-px"
                                                    onClick={() => handleStatusChangeWithNotification(order, 'preparing')}
                                                >
                                                    Iniciar Preparo
                                                </button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button
                                                    className="px-4 py-2 bg-primary border-none rounded-md text-white text-sm font-medium cursor-pointer transition-all duration-fast hover:opacity-90 hover:-translate-y-px"
                                                    onClick={() => handleStatusChangeWithNotification(order, 'ready')}
                                                >
                                                    Marcar Pronto
                                                </button>
                                            )}
                                            {order.status === 'ready' && order.is_delivery && (
                                                <button
                                                    className="px-4 py-2 bg-primary border-none rounded-md text-white text-sm font-medium cursor-pointer transition-all duration-fast hover:opacity-90 hover:-translate-y-px"
                                                    onClick={() => handleStatusChangeWithNotification(order, 'delivering')}
                                                >
                                                    Saiu para Entrega
                                                </button>
                                            )}
                                            {((order.status === 'ready' && !order.is_delivery) || order.status === 'delivering') && (
                                                <button
                                                    className="px-4 py-2 bg-accent border-none rounded-md text-white text-sm font-medium cursor-pointer transition-all duration-fast hover:opacity-90 hover:-translate-y-px"
                                                    onClick={() => handleStatusChangeWithNotification(order, 'delivered')}
                                                >
                                                    Finalizar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-15 px-5 text-center">
                            <span className="text-6xl mb-4">📋</span>
                            <h3 className="text-xl mb-2">Nenhum pedido encontrado</h3>
                            <p className="text-text-secondary mb-5">Crie um novo pedido para começar</p>
                            <Link href="/pedidos/novo">
                                <Button leftIcon={<FiPlus />}>Novo Pedido</Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* WhatsApp Notification Modal */}
                {showWhatsAppModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 animate-[fadeIn_0.2s_ease]" onClick={() => setShowWhatsAppModal(null)}>
                        <div className="bg-bg-card rounded-lg p-6 max-w-[400px] w-[90%] animate-[scaleIn_0.2s_ease]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <FaWhatsapp className="text-2xl text-[#25D366]" />
                                <h3 className="m-0 text-xl">Notificar Cliente?</h3>
                            </div>
                            <p className="text-text-secondary mb-6 leading-relaxed">
                                Deseja enviar uma notificação via WhatsApp para <strong className="text-text-primary">{showWhatsAppModal.customer_name}</strong> sobre a atualização do pedido?
                            </p>
                            <div className="flex gap-3 justify-end max-[480px]:flex-col-reverse">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const pendingStatus = (showWhatsAppModal as any)._pendingStatus;
                                        updateOrderStatus(showWhatsAppModal.id, pendingStatus, false);
                                    }}
                                >
                                    Não Notificar
                                </Button>
                                <Button
                                    leftIcon={<FaWhatsapp />}
                                    onClick={() => {
                                        const pendingStatus = (showWhatsAppModal as any)._pendingStatus;
                                        updateOrderStatus(showWhatsAppModal.id, pendingStatus, true);
                                    }}
                                    style={{ background: '#25D366' }}
                                >
                                    Enviar WhatsApp
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
