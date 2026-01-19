'use client';

import React, { useState } from 'react';
import { FiX, FiCheck, FiCopy, FiAlertCircle } from 'react-icons/fi';
import PixQRCode from './PixQRCode';
import { PIX_CONFIG, PLAN_PRICES, PlanPriceKey } from '@/lib/pix-config';
import styles from './PixPaymentModal.module.css';

interface PixPaymentModalProps {
    planType: PlanPriceKey;
    planName: string;
    onClose: () => void;
    onPaymentConfirmed: () => void;
    isLoading?: boolean;
}

export default function PixPaymentModal({
    planType,
    planName,
    onClose,
    onPaymentConfirmed,
    isLoading = false
}: PixPaymentModalProps) {
    const [confirmed, setConfirmed] = useState(false);
    const amount = PLAN_PRICES[planType];

    const handleConfirmPayment = () => {
        setConfirmed(true);
        onPaymentConfirmed();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <FiX />
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>Pagamento via PIX</h2>
                    <p className={styles.subtitle}>
                        Plano <strong>{planName}</strong>
                    </p>
                </div>

                <div className={styles.content}>
                    <PixQRCode
                        pixKey={PIX_CONFIG.pixKey}
                        pixKeyType={PIX_CONFIG.pixKeyType}
                        merchantName={PIX_CONFIG.merchantName}
                        merchantCity={PIX_CONFIG.merchantCity}
                        amount={amount}
                        orderId={`SUB-${Date.now()}`}
                    />

                    <div className={styles.notice}>
                        <FiAlertCircle />
                        <p>
                            Após realizar o pagamento, clique no botão abaixo para notificar.
                            Sua assinatura será ativada em até 24h após confirmação.
                        </p>
                    </div>

                    {confirmed ? (
                        <div className={styles.confirmedMessage}>
                            <FiCheck />
                            <span>Notificação enviada! Aguarde a confirmação.</span>
                        </div>
                    ) : (
                        <button
                            className={styles.confirmButton}
                            onClick={handleConfirmPayment}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className={styles.spinner} />
                            ) : (
                                <>
                                    <FiCheck />
                                    Já realizei o pagamento
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
