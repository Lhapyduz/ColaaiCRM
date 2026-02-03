'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiCheck, FiCopy, FiRefreshCw } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface AbacatepayPixModalProps {
    planType: string;
    planName: string;
    amount: number;
    onClose: () => void;
    onPaymentConfirmed: () => void;
}

interface BillingData {
    billingId: string;
    billingUrl: string;
    pix?: {
        qrCode: string;
        qrCodeBase64: string;
        expiresAt: string;
    };
    status: string;
}

export default function AbacatepayPixModal({
    planType,
    planName,
    amount,
    onClose,
    onPaymentConfirmed,
}: AbacatepayPixModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [copied, setCopied] = useState(false);
    const [checking, setChecking] = useState(false);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    // Create billing on mount
    useEffect(() => {
        createBilling();
    }, [planType]);

    const createBilling = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/abacatepay/create-billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planType }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha ao criar cobrança PIX');
            }

            setBilling({
                billingId: data.billingId,
                billingUrl: data.billingUrl,
                pix: data.pix,
                status: data.status,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Poll for payment status
    const checkPaymentStatus = useCallback(async () => {
        if (!billing?.billingId || paymentConfirmed) return;

        setChecking(true);
        try {
            const response = await fetch(`/api/abacatepay/check-status?billingId=${billing.billingId}`);
            const data = await response.json();

            if (data.status === 'PAID' || data.status === 'paid') {
                setPaymentConfirmed(true);
                onPaymentConfirmed();
            }
        } catch (err) {
            console.error('Error checking status:', err);
        } finally {
            setChecking(false);
        }
    }, [billing?.billingId, paymentConfirmed, onPaymentConfirmed]);

    // Auto-poll every 5 seconds
    useEffect(() => {
        if (!billing || paymentConfirmed) return;

        const interval = setInterval(checkPaymentStatus, 5000);
        return () => clearInterval(interval);
    }, [billing, paymentConfirmed, checkPaymentStatus]);

    const copyPixCode = async () => {
        if (!billing?.pix?.qrCode) return;

        try {
            await navigator.clipboard.writeText(billing.pix.qrCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-1000 p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-bg-card rounded-2xl max-w-[420px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_40px_rgba(0,0,0,0.2)] animate-fadeInUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-bg-tertiary border-none rounded-full cursor-pointer text-text-secondary z-10 transition-all duration-200 hover:bg-bg-card-hover hover:text-text-primary"
                    onClick={onClose}
                >
                    <FiX />
                </button>

                {/* Header */}
                <div className="text-center px-6 py-5 border-b border-border">
                    <h2 className="text-xl font-bold text-text-primary m-0 mb-2">
                        Pagamento via PIX
                    </h2>
                    <p className="m-0 text-[0.9375rem] text-text-secondary">
                        Plano <strong className="text-primary">{planName}</strong>
                    </p>
                    <p className="m-0 mt-1 text-2xl font-bold text-primary">
                        {formatCurrency(amount)}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="mt-4 text-text-secondary">Gerando QR Code PIX...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <p className="text-error mb-4">{error}</p>
                            <button
                                onClick={createBilling}
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {paymentConfirmed && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-16 h-16 bg-[#27ae60]/20 rounded-full flex items-center justify-center mb-4">
                                <FiCheck className="text-[#27ae60] text-3xl" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#27ae60] mb-2">
                                Pagamento Confirmado!
                            </h3>
                            <p className="text-text-secondary text-center">
                                Seu acesso foi liberado automaticamente.
                            </p>
                        </div>
                    )}

                    {!loading && !error && !paymentConfirmed && billing && (
                        <>
                            {/* QR Code */}
                            <div className="flex flex-col items-center mb-6">
                                {billing.pix?.qrCode ? (
                                    <div className="p-4 bg-white rounded-xl">
                                        <QRCodeSVG
                                            value={billing.pix.qrCode}
                                            size={200}
                                            level="M"
                                            includeMargin={false}
                                        />
                                    </div>
                                ) : billing.billingUrl ? (
                                    <a
                                        href={billing.billingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover"
                                    >
                                        Abrir página de pagamento
                                    </a>
                                ) : null}
                            </div>

                            {/* PIX Copy-Paste */}
                            {billing.pix?.qrCode && (
                                <div className="mb-6">
                                    <p className="text-sm text-text-secondary text-center mb-2">
                                        Ou copie o código PIX:
                                    </p>
                                    <button
                                        onClick={copyPixCode}
                                        className={cn(
                                            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all',
                                            copied
                                                ? 'bg-[#27ae60]/10 border-[#27ae60]/30 text-[#27ae60]'
                                                : 'bg-bg-tertiary border-border text-text-primary hover:bg-bg-card-hover'
                                        )}
                                    >
                                        {copied ? (
                                            <>
                                                <FiCheck />
                                                <span>Copiado!</span>
                                            </>
                                        ) : (
                                            <>
                                                <FiCopy />
                                                <span>Copiar código PIX</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Status info */}
                            <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                                <FiRefreshCw className={cn('text-base', checking && 'animate-spin')} />
                                <span>Aguardando confirmação do pagamento...</span>
                            </div>

                            {/* Manual check button */}
                            <button
                                onClick={checkPaymentStatus}
                                disabled={checking}
                                className="w-full mt-4 px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg font-medium hover:bg-bg-card-hover disabled:opacity-50 transition-all"
                            >
                                {checking ? 'Verificando...' : 'Já paguei, verificar status'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
