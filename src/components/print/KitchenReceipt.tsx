'use client';

import React, { forwardRef } from 'react';
import styles from './KitchenReceipt.module.css';

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    notes: string | null;
}

interface KitchenReceiptProps {
    orderNumber: number;
    customerName: string;
    isDelivery: boolean;
    items: OrderItem[];
    orderNotes?: string | null;
    createdAt: string;
}

const KitchenReceipt = forwardRef<HTMLDivElement, KitchenReceiptProps>(
    ({ orderNumber, customerName, isDelivery, items, orderNotes, createdAt }, ref) => {
        const formatTime = (date: string) => {
            return new Intl.DateTimeFormat('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
            }).format(new Date(date));
        };

        return (
            <div ref={ref} className={styles.receipt}>
                {/* Big Order Number */}
                <div className={styles.header}>
                    <div className={styles.orderType}>
                        {isDelivery ? '🚚 ENTREGA' : '🏪 BALCÃO'}
                    </div>
                    <div className={styles.orderNumber}>#{orderNumber}</div>
                    <div className={styles.orderTime}>{formatTime(createdAt)}</div>
                </div>

                <div className={styles.divider} />

                {/* Customer Name - Large */}
                <div className={styles.customerName}>{customerName}</div>

                <div className={styles.dividerDouble} />

                {/* Items - Big and Clear */}
                <div className={styles.itemsSection}>
                    {items.map((item, index) => (
                        <div key={item.id} className={styles.item}>
                            <div className={styles.itemHeader}>
                                <span className={styles.itemQty}>{item.quantity}x</span>
                                <span className={styles.itemName}>{item.product_name}</span>
                            </div>
                            {item.notes && (
                                <div className={styles.itemNotes}>
                                    ★ {item.notes}
                                </div>
                            )}
                            {index < items.length - 1 && (
                                <div className={styles.itemDivider} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Order Notes */}
                {orderNotes && (
                    <>
                        <div className={styles.dividerDouble} />
                        <div className={styles.orderNotes}>
                            <div className={styles.notesTitle}>⚠️ OBSERVAÇÕES</div>
                            <div className={styles.notesText}>{orderNotes}</div>
                        </div>
                    </>
                )}

                <div className={styles.dividerDouble} />

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.copyLabel}>COZINHA</span>
                </div>
            </div>
        );
    }
);

KitchenReceipt.displayName = 'KitchenReceipt';

export default KitchenReceipt;
