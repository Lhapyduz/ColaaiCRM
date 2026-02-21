'use client';

import React, { useState } from 'react';
import { FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import PixQRCode from './PixQRCode';
import { PIX_CONFIG, PlanPriceKey, BillingPeriod, getPlanPrice } from '@/lib/pix-config';
import { Portal } from '@/components/ui/Portal';

interface PixPaymentModalProps {
    planType: PlanPriceKey;
    planName: string;
    billingPeriod: BillingPeriod;
    onClose: () => void;
}

export default function PixPaymentModal({
    planType,
    planName,
    billingPeriod,
    onClose
}: PixPaymentModalProps) {
    const [confirmed, setConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const amount = getPlanPrice(planType, billingPeriod);

    const handleConfirmPayment = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/pix/notify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planType,
                    amount,
                    billingPeriod
                })
            });

            if (response.ok) {
                setConfirmed(true);
            } else {
                alert('Falha ao enviar notificação. Tente novamente.');
            }
        } catch (error) {
            console.error('Error notifying payment:', error);
            alert('Erro de conexão. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Portal>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-overlay p-4"
                onClick={onClose}
            >
                <div
                    className="relative bg-bg-card rounded-2xl max-w-[400px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_40px_rgba(0,0,0,0.2)] animate-fadeInUp max-[480px]:max-h-[95vh] max-[480px]:rounded-xl z-modal"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-bg-tertiary border-none rounded-full cursor-pointer text-text-secondary z-10 transition-all duration-200 hover:bg-bg-card-hover hover:text-text-primary"
                        onClick={onClose}
                    >
                        <FiX />
                    </button>

                    <div className="text-center px-6 py-6 border-b border-border max-[480px]:px-4 max-[480px]:py-5">
                        <h2 className="text-xl font-bold text-text-primary m-0 mb-2 max-[480px]:text-lg">Pagamento via PIX</h2>
                        <p className="m-0 text-[0.9375rem] text-text-secondary">
                            Plano <strong className="text-primary">{planName}</strong>
                        </p>
                    </div>

                    <div className="p-4">
                        <PixQRCode
                            pixKey={PIX_CONFIG.pixKey}
                            pixKeyType={PIX_CONFIG.pixKeyType}
                            merchantName={PIX_CONFIG.merchantName}
                            merchantCity={PIX_CONFIG.merchantCity}
                            amount={amount}
                            orderId={`SUB-${Date.now()}`}
                        />

                        <div className="flex gap-3 px-4 py-3 bg-warning/10 border border-warning/30 rounded-lg my-4">
                            <FiAlertCircle className="shrink-0 text-[#f59e0b] text-lg mt-0.5" />
                            <p className="m-0 text-[0.8125rem] text-text-secondary leading-relaxed">
                                Após realizar o pagamento, clique no botão abaixo para notificar.
                                Sua assinatura será ativada em até 24h após confirmação.
                            </p>
                        </div>

                        {confirmed ? (
                            <div className="flex items-center justify-center gap-2 px-5 py-3.5 bg-accent/10 border border-accent/30 rounded-xl text-accent font-semibold">
                                <FiCheck />
                                <span>Notificação enviada! Aguarde a confirmação.</span>
                            </div>
                        ) : (
                            <button
                                className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-linear-to-br from-[#2ecc71] to-[#27ae60] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_4px_12px_rgba(46,204,113,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
                                onClick={handleConfirmPayment}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
        </Portal>
    );
}
