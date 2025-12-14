'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    FiArrowLeft,
    FiClock,
    FiUser,
    FiPhone,
    FiMapPin,
    FiCreditCard,
    FiPrinter,
    FiCheck
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
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

export default function OrderDetailsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && params.id) {
            fetchOrderDetails();
        }
    }, [user, params.id]);

    const fetchOrderDetails = async () => {
        try {
            // Fetch order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', params.id)
                .single();

            if (orderError) throw orderError;

            // Fetch items
            const { data: itemsData, error: itemsError } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', params.id);

            if (itemsError) throw itemsError;

            setOrder({ ...orderData, items: itemsData });
        } catch (error) {
            console.error('Error fetching order details:', error);
            alert('Erro ao carregar detalhes do pedido');
            router.push('/pedidos');
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

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        }).format(new Date(date));
    };

    const updatePaymentStatus = async () => {
        if (!order) return;
        try {
            const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', order.id);

            if (error) throw error;
            setOrder({ ...order, payment_status: 'paid' });
        } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Erro ao atualizar status do pagamento');
        }
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

    if (loading) {
        return (
            <MainLayout>
                <div className={styles.container}>
                    <div className={styles.loading}>
                        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
                        <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!order) return null;

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <FiArrowLeft />
                    </button>
                    <div className={styles.titleWrapper}>
                        <h1 className={styles.title}>Pedido #{order.order_number}</h1>
                        <p className={styles.subtitle}>
                            <FiClock /> {formatDate(order.created_at)}
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        leftIcon={<FiPrinter />}
                        onClick={() => window.print()}
                    >
                        Imprimir
                    </Button>
                </div>

                <div className={styles.content}>
                    {/* Status Card */}
                    <Card className={styles.statusCard}>
                        <div className={styles.statusInfo}>
                            <span className={styles.statusLabel}>Status do Pedido</span>
                            <span className={`${styles.statusBadge} status-${order.status}`}>
                                {getStatusLabel(order.status)}
                            </span>
                        </div>
                        <div className={styles.statusInfo}>
                            <span className={styles.statusLabel}>Tipo</span>
                            <span className={styles.infoValue}>
                                {order.is_delivery ? '🚚 Entrega' : '🏪 Balcão'}
                            </span>
                        </div>
                    </Card>

                    {/* Customer & Payment Info */}
                    <Card>
                        <div className={styles.sectionTitle}>
                            <FiUser /> Informações do Cliente
                        </div>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoGroup}>
                                <span className={styles.infoLabel}>Nome</span>
                                <span className={styles.infoValue}>{order.customer_name}</span>
                            </div>
                            {order.customer_phone && (
                                <div className={styles.infoGroup}>
                                    <span className={styles.infoLabel}>Telefone</span>
                                    <span className={styles.infoValue}>{order.customer_phone}</span>
                                </div>
                            )}
                            {order.is_delivery && order.customer_address && (
                                <div className={styles.infoGroup}>
                                    <span className={styles.infoLabel}>Endereço</span>
                                    <span className={styles.infoValue}>{order.customer_address}</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.divider} />

                        <div className={styles.sectionTitle}>
                            <FiCreditCard /> Pagamento
                        </div>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoGroup}>
                                <span className={styles.infoLabel}>Método</span>
                                <span className={styles.infoValue}>{getPaymentLabel(order.payment_method)}</span>
                            </div>
                            <div className={styles.infoGroup}>
                                <span className={styles.infoLabel}>Status</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span className={`${styles.infoValue} ${order.payment_status === 'paid' ? 'text-success' : 'text-warning'}`}>
                                        {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                    </span>
                                    {order.payment_status === 'pending' && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            leftIcon={<FiCheck />}
                                            onClick={updatePaymentStatus}
                                        >
                                            Pagamento Recebido
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Order Items */}
                    <Card>
                        <div className={styles.sectionTitle}>
                            Itens do Pedido
                        </div>
                        <div className={styles.itemsList}>
                            {order.items.map((item) => (
                                <div key={item.id} className={styles.item}>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>
                                            {item.quantity}x {item.product_name}
                                        </span>
                                        {item.notes && (
                                            <span className={styles.itemNotes}>Obs: {item.notes}</span>
                                        )}
                                    </div>
                                    <span className={styles.itemPrice}>
                                        {formatCurrency(item.total)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.divider} />

                        <div className={styles.totals}>
                            <div className={styles.totalRow}>
                                <span>Subtotal</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            {order.delivery_fee > 0 && (
                                <div className={styles.totalRow}>
                                    <span>Taxa de Entrega</span>
                                    <span>{formatCurrency(order.delivery_fee)}</span>
                                </div>
                            )}
                            <div className={styles.totalRow}>
                                <span className={styles.grandTotal}>Total</span>
                                <span className={styles.grandTotal}>{formatCurrency(order.total)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
