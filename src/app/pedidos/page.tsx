'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FiPlus,
    FiFilter,
    FiSearch,
    FiClock,
    FiMoreVertical,
    FiEye,
    FiEdit,
    FiTrash2
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Order {
    id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    status: string;
    payment_method: string;
    payment_status: string;
    total: number;
    is_delivery: boolean;
    created_at: string;
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
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDropdown, setShowDropdown] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user, statusFilter]);

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
        setShowDropdown(null);
    };

    const updatePaymentStatus = async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;
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
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Pedidos</h1>
                        <p className={styles.subtitle}>Gerencie todos os seus pedidos</p>
                    </div>
                    <Link href="/pedidos/novo">
                        <Button leftIcon={<FiPlus />}>Novo Pedido</Button>
                    </Link>
                </div>

                {/* Filters */}
                <Card className={styles.filtersCard}>
                    <div className={styles.filters}>
                        <div className={styles.searchWrapper}>
                            <Input
                                placeholder="Buscar por cliente ou número..."
                                leftIcon={<FiSearch />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className={styles.statusFilter}>
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className={`${styles.statusBtn} ${statusFilter === option.value ? styles.active : ''}`}
                                    onClick={() => setStatusFilter(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Orders List */}
                <div className={styles.ordersContainer}>
                    {loading ? (
                        <div className={styles.loading}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
                            ))}
                        </div>
                    ) : filteredOrders.length > 0 ? (
                        <div className={styles.ordersList}>
                            {filteredOrders.map((order) => (
                                <Card key={order.id} className={styles.orderCard} hoverable>
                                    <div className={styles.orderHeader}>
                                        <div className={styles.orderIdentifier}>
                                            <span className={styles.orderNumber}>#{order.order_number}</span>
                                            <span className={`${styles.orderType} ${order.is_delivery ? styles.delivery : styles.pickup}`}>
                                                {order.is_delivery ? '🚚 Entrega' : '🏪 Balcão'}
                                            </span>
                                        </div>
                                        <div className={styles.orderActions}>
                                            <span className={`${styles.statusBadge} status-${order.status}`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                            <div className={styles.dropdown}>
                                                <button
                                                    className={styles.dropdownTrigger}
                                                    onClick={() => setShowDropdown(showDropdown === order.id ? null : order.id)}
                                                >
                                                    <FiMoreVertical />
                                                </button>
                                                {showDropdown === order.id && (
                                                    <div className={styles.dropdownMenu}>
                                                        <Link href={`/pedidos/${order.id}`} className={styles.dropdownItem}>
                                                            <FiEye /> Ver Detalhes
                                                        </Link>
                                                        <Link href={`/pedidos/${order.id}/editar`} className={styles.dropdownItem}>
                                                            <FiEdit /> Editar
                                                        </Link>
                                                        <div className={styles.dropdownDivider} />
                                                        <button
                                                            className={`${styles.dropdownItem} ${styles.danger}`}
                                                            onClick={() => deleteOrder(order.id)}
                                                        >
                                                            <FiTrash2 /> Excluir
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.orderContent}>
                                        <div className={styles.customerInfo}>
                                            <span className={styles.customerName}>{order.customer_name}</span>
                                            {order.customer_phone && (
                                                <span className={styles.customerPhone}>{order.customer_phone}</span>
                                            )}
                                        </div>

                                        <div className={styles.orderDetails}>
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Pagamento</span>
                                                <span className={styles.detailValue}>
                                                    {getPaymentLabel(order.payment_method)}
                                                    <span className={`${styles.paymentStatus} ${order.payment_status === 'paid' ? styles.paid : ''}`}>
                                                        {order.payment_status === 'paid' ? '✓ Pago' : 'Pendente'}
                                                    </span>
                                                    {order.payment_status === 'pending' && (
                                                        <button
                                                            className={`${styles.paymentReceivedBtn}`}
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
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Total</span>
                                                <span className={styles.detailTotal}>{formatCurrency(order.total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.orderFooter}>
                                        <span className={styles.orderTime}>
                                            <FiClock /> {formatDate(order.created_at)}
                                        </span>

                                        <div className={styles.quickActions}>
                                            {order.status === 'pending' && (
                                                <button
                                                    className={styles.quickActionBtn}
                                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                                >
                                                    Iniciar Preparo
                                                </button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button
                                                    className={styles.quickActionBtn}
                                                    onClick={() => updateOrderStatus(order.id, 'ready')}
                                                >
                                                    Marcar Pronto
                                                </button>
                                            )}
                                            {order.status === 'ready' && order.is_delivery && (
                                                <button
                                                    className={styles.quickActionBtn}
                                                    onClick={() => updateOrderStatus(order.id, 'delivering')}
                                                >
                                                    Saiu para Entrega
                                                </button>
                                            )}
                                            {(order.status === 'ready' && !order.is_delivery) || order.status === 'delivering' && (
                                                <button
                                                    className={`${styles.quickActionBtn} ${styles.success}`}
                                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
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
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>📋</span>
                            <h3>Nenhum pedido encontrado</h3>
                            <p>Crie um novo pedido para começar</p>
                            <Link href="/pedidos/novo">
                                <Button leftIcon={<FiPlus />}>Novo Pedido</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
