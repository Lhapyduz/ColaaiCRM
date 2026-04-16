'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiClock, FiUser, FiPhone, FiMapPin, FiCreditCard, FiPrinter, FiCheck, FiChevronDown } from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PixQRCode from '@/components/pix/PixQRCode';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSingleOrderCache } from '@/hooks/useDataCache';
import { confirmOrderPayment } from '@/lib/dataAccess';
import { printOrder, printCustomerReceipt, printKitchenTicket } from '@/lib/print';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

export default function OrderDetailsPage() {
    const { user, userSettings } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;
    
    const { order: cachedOrder, loading, error: cacheError } = useSingleOrderCache(orderId);
    
    const [showPrintMenu, setShowPrintMenu] = useState(false);
    const [printing, setPrinting] = useState(false);
    const appName = userSettings?.app_name || 'Cola Aí';
    const toast = useToast();

    // Map cachedOrder to local interface if needed, or use directly
    const order = cachedOrder ? {
        ...cachedOrder,
        items: (cachedOrder.order_items || []).map(item => ({
            ...item,
            total: item.total || (item.quantity * item.unit_price)
        }))
    } : null;

    const formatDateFull = (date: string) => {
        try {
            return new Intl.DateTimeFormat('pt-BR', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', 
                timeZone: 'America/Sao_Paulo' 
            }).format(new Date(date));
        } catch (e) {
            return 'Data inválida';
        }
    };

    const updatePaymentStatus = async () => {
        if (!order || !user) return;
        try {
            await confirmOrderPayment(order as any, user.id);
            toast.success('Pagamento confirmado!');
        } catch (e) { 
            console.error(e); 
            toast.error('Erro ao atualizar status do pagamento'); 
        }
    };

    const getStatusLabel = (status: string) => ({ pending: 'Aguardando', preparing: 'Preparando', ready: 'Pronto', delivering: 'Entregando', delivered: 'Entregue', cancelled: 'Cancelado' }[status] || status);
    const getPaymentLabel = (method: string) => ({ money: 'Dinheiro', credit: 'Crédito', debit: 'Débito', pix: 'PIX' }[method] || method);

    const handlePrintBoth = async () => { if (!order) return; setPrinting(true); setShowPrintMenu(false); try { await printOrder(order as any, { type: 'both', appName }); } finally { setPrinting(false); } };
    const handlePrintCustomer = async () => { if (!order) return; setPrinting(true); setShowPrintMenu(false); try { await printCustomerReceipt(order as any, appName); } finally { setPrinting(false); } };
    const handlePrintKitchen = async () => { if (!order) return; setPrinting(true); setShowPrintMenu(false); try { await printKitchenTicket(order as any); } finally { setPrinting(false); } };
    
    if (loading && !order) return <div className="max-w-[1400px] mx-auto"><div className="h-[200px] bg-bg-tertiary rounded-xl animate-pulse mb-4" /><div className="h-[300px] bg-bg-tertiary rounded-xl animate-pulse" /></div>;
    if (cacheError) return <div className="max-w-[800px] mx-auto p-8 text-center"><p className="text-error mb-4">Erro ao carregar pedido.</p><Button onClick={() => router.push('/pedidos')}>Voltar para Pedidos</Button></div>;
    if (!order) return <div className="max-w-[800px] mx-auto p-8 text-center"><p className="text-text-secondary mb-4">Pedido não encontrado.</p><Button onClick={() => router.push('/pedidos')}>Voltar para Pedidos</Button></div>;

    
    return (
        <div className="max-w-[1400px] mx-auto">
            {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-tertiary text-text-secondary hover:bg-primary hover:text-white transition-all" onClick={() => router.back()}><FiArrowLeft size={20} /></button>
                    <div className="flex-1"><h1 className="text-2xl font-bold">Pedido #{order.order_number}</h1><p className="text-text-secondary flex items-center gap-1"><FiClock size={14} /> {formatDateFull(order.created_at || new Date().toISOString())}</p></div>
                    <div className="relative">
                        <Button variant="secondary" leftIcon={<FiPrinter />} rightIcon={<FiChevronDown />} onClick={() => setShowPrintMenu(!showPrintMenu)} disabled={printing}>{printing ? 'Imprimindo...' : 'Imprimir'}</Button>
                        {showPrintMenu && (
                            <div className="absolute right-0 top-full mt-2 w-[220px] bg-bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                                <button onClick={handlePrintBoth} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-tertiary transition-all"><FiPrinter className="text-primary" /><div><span className="block font-medium">Imprimir Tudo</span><small className="text-text-muted text-xs">Cliente + Cozinha</small></div></button>
                                <button onClick={handlePrintCustomer} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-tertiary transition-all border-t border-border"><FiUser className="text-primary" /><div><span className="block font-medium">Via do Cliente</span><small className="text-text-muted text-xs">Comprovante</small></div></button>
                                <button onClick={handlePrintKitchen} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-tertiary transition-all border-t border-border"><GiCookingPot className="text-primary" /><div><span className="block font-medium">Comanda Cozinha</span><small className="text-text-muted text-xs">Para preparo</small></div></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Card */}
                <Card className="mb-4 p-4!">
                    <div className="flex justify-between items-center">
                        <div><span className="text-sm text-text-muted">Status do Pedido</span><span className={cn('block mt-1 px-3 py-1 rounded-full text-sm font-medium w-fit', order.status === 'pending' && 'bg-warning/20 text-warning', order.status === 'preparing' && 'bg-accent/20 text-accent', order.status === 'ready' && 'bg-primary/20 text-primary', order.status === 'delivered' && 'bg-success/20 text-success', order.status === 'cancelled' && 'bg-error/20 text-error')}>{getStatusLabel(order.status || 'pending')}</span></div>
                        <div className="text-right"><span className="text-sm text-text-muted">Tipo</span><span className="block mt-1 text-lg">{order.is_delivery ? '🚚 Entrega' : '🏪 Balcão'}</span></div>
                    </div>
                </Card>

                {/* Customer & Payment Info */}
                <Card className="mb-4">
                    <div className="flex items-center gap-2 text-text-primary font-medium mb-4"><FiUser /> Informações do Cliente</div>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                        <div><span className="text-sm text-text-muted">Nome</span><span className="block mt-1">{order.customer_name}</span></div>
                        {order.customer_phone && <div><span className="text-sm text-text-muted">Telefone</span><span className="block mt-1">{order.customer_phone}</span></div>}
                        {order.is_delivery && order.customer_address && <div className="col-span-2"><span className="text-sm text-text-muted">Endereço</span><span className="block mt-1">{order.customer_address}</span></div>}
                    </div>
                    <div className="border-t border-border my-4" />
                    <div className="flex items-center gap-2 text-text-primary font-medium mb-4"><FiCreditCard /> Pagamento</div>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                        <div><span className="text-sm text-text-muted">Método</span><span className="block mt-1">{getPaymentLabel(order.payment_method)}</span></div>
                        <div><span className="text-sm text-text-muted">Status</span><div className="flex items-center gap-3 mt-1"><span className={order.payment_status === 'paid' ? 'text-success' : 'text-warning'}>{order.payment_status === 'paid' ? 'Pago' : 'Pendente'}</span>{order.payment_status === 'pending' && <Button variant="primary" size="sm" leftIcon={<FiCheck />} onClick={updatePaymentStatus}>Pagamento Recebido</Button>}</div></div>
                    </div>
                    {order.payment_method === 'pix' && order.payment_status === 'pending' && userSettings?.pix_key && (<><div className="border-t border-border my-4" /><div className="flex justify-center"><PixQRCode pixKey={userSettings.pix_key} pixKeyType={userSettings.pix_key_type || 'cpf'} merchantName={appName} merchantCity={userSettings.merchant_city || 'Brasil'} amount={order.total} orderId={order.order_number} onPaymentConfirmed={updatePaymentStatus} /></div></>)}
                </Card>

                {/* Order Items */}
                <Card>
                    <div className="text-text-primary font-medium mb-4">Itens do Pedido</div>
                    <div className="flex flex-col">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-start py-3 border-b border-border last:border-b-0">
                                <div><span className="font-medium">{item.quantity}x {item.product_name}</span>{item.notes && <span className="block text-sm text-text-muted mt-1">Obs: {item.notes}</span>}</div>
                                <span className="font-medium text-primary">{formatCurrency(item.total)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-border my-4" />
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                        {order.delivery_fee !== null && order.delivery_fee > 0 && <div className="flex justify-between text-text-secondary"><span>Taxa de Entrega</span><span>{formatCurrency(order.delivery_fee)}</span></div>}
                        {order.coupon_discount && order.coupon_discount > 0 && <div className="flex justify-between text-success"><span>Desconto</span><span>-{formatCurrency(order.coupon_discount)}</span></div>}
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(order.total)}</span></div>
                    </div>
                </Card>
            </div>
    );
}
