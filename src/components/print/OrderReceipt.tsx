'use client';

import React, { forwardRef } from 'react';
import styles from './OrderReceipt.module.css';

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
}

interface OrderData {
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
    coupon_discount?: number;
}

interface OrderReceiptProps {
    order: OrderData;
    appName?: string;
    showHeader?: boolean;
}

const OrderReceipt = forwardRef<HTMLDivElement, OrderReceiptProps>(
    ({ order, appName = 'Cola Aí', showHeader = true }, ref) => {
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

        const getPaymentLabel = (method: string) => {
            const labels: Record<string, string> = {
                money: 'Dinheiro',
                credit: 'Crédito',
                debit: 'Débito',
                pix: 'PIX'
            };
            return labels[method] || method;
        };

        return (
            <div ref={ref} className={styles.receipt}>
                {/* Header */}
                {showHeader && (
                    <div className={styles.header}>
                        <h1 className={styles.businessName}>{appName}</h1>
                        <div className={styles.receiptType}>
                            {order.is_delivery ? '🚚 ENTREGA' : '🏪 BALCÃO'}
                        </div>
                    </div>
                )}

                {/* Order Info */}
                <div className={styles.orderInfo}>
                    <div className={styles.orderNumber}>
                        <span className={styles.label}>PEDIDO</span>
                        <span className={styles.value}>#{order.order_number}</span>
                    </div>
                    <div className={styles.orderDate}>
                        {formatDate(order.created_at)}
                    </div>
                </div>

                <div className={styles.divider} />

                {/* Customer Info */}
                <div className={styles.customerSection}>
                    <div className={styles.sectionTitle}>CLIENTE</div>
                    <div className={styles.customerName}>{order.customer_name}</div>
                    {order.customer_phone && (
                        <div className={styles.customerInfo}>Tel: {order.customer_phone}</div>
                    )}
                    {order.is_delivery && order.customer_address && (
                        <div className={styles.customerAddress}>
                            <strong>Endereço:</strong> {order.customer_address}
                        </div>
                    )}
                </div>

                <div className={styles.divider} />

                {/* Items */}
                <div className={styles.itemsSection}>
                    <div className={styles.sectionTitle}>ITENS</div>
                    <table className={styles.itemsTable}>
                        <thead>
                            <tr>
                                <th className={styles.thQty}>Qtd</th>
                                <th className={styles.thItem}>Item</th>
                                <th className={styles.thPrice}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <React.Fragment key={item.id}>
                                    <tr>
                                        <td className={styles.tdQty}>{item.quantity}x</td>
                                        <td className={styles.tdItem}>{item.product_name}</td>
                                        <td className={styles.tdPrice}>{formatCurrency(item.total)}</td>
                                    </tr>
                                    {item.notes && (
                                        <tr className={styles.notesRow}>
                                            <td></td>
                                            <td colSpan={2} className={styles.itemNotes}>
                                                Obs: {item.notes}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {order.notes && (
                    <>
                        <div className={styles.divider} />
                        <div className={styles.orderNotes}>
                            <strong>Observações:</strong> {order.notes}
                        </div>
                    </>
                )}

                <div className={styles.dividerDouble} />

                {/* Totals */}
                <div className={styles.totalsSection}>
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
                    {order.coupon_discount && order.coupon_discount > 0 && (
                        <div className={`${styles.totalRow} ${styles.discount}`}>
                            <span>Desconto</span>
                            <span>-{formatCurrency(order.coupon_discount)}</span>
                        </div>
                    )}
                    <div className={styles.grandTotal}>
                        <span>TOTAL</span>
                        <span>{formatCurrency(order.total)}</span>
                    </div>
                </div>

                <div className={styles.divider} />

                {/* Payment Info */}
                <div className={styles.paymentSection}>
                    <div className={styles.paymentMethod}>
                        <span className={styles.label}>Pagamento:</span>
                        <span className={styles.value}>{getPaymentLabel(order.payment_method)}</span>
                    </div>
                    <div className={styles.paymentStatus}>
                        {order.payment_status === 'paid' ? '✓ PAGO' : '⏳ PENDENTE'}
                    </div>
                </div>

                <div className={styles.dividerDouble} />

                {/* Footer */}
                <div className={styles.footer}>
                    <p className={styles.thankYou}>Obrigado pela preferência!</p>
                    <p className={styles.appFooter}>{appName}</p>
                </div>

                {/* Kitchen Copy Indicator */}
                <div className={styles.copyIndicator}>
                    <span className={styles.copyLabel}>VIA DO CLIENTE</span>
                </div>
            </div>
        );
    }
);

OrderReceipt.displayName = 'OrderReceipt';

export default OrderReceipt;
