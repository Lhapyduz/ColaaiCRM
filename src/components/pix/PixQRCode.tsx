'use client';

import React, { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { generatePixQRCode, generatePixCode, PixPayload } from '@/lib/pix';
import styles from './PixQRCode.module.css';

interface PixQRCodeProps {
    pixKey: string;
    pixKeyType: PixPayload['pixKeyType'];
    merchantName: string;
    merchantCity: string;
    amount: number;
    orderId?: string | number;
    onPaymentConfirmed?: () => void;
}

export default function PixQRCode({
    pixKey,
    pixKeyType,
    merchantName,
    merchantCity,
    amount,
    orderId,
    onPaymentConfirmed
}: PixQRCodeProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [pixCode, setPixCode] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const payload: PixPayload = {
        pixKey,
        pixKeyType,
        merchantName,
        merchantCity,
        amount,
        txId: orderId ? `PED${orderId}` : undefined
    };

    useEffect(() => {
        generateQRCode();
    }, [pixKey, amount, orderId]);

    const generateQRCode = async () => {
        if (!pixKey) {
            setError('Chave PIX não configurada');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const code = generatePixCode(payload);
            setPixCode(code);

            const qrUrl = await generatePixQRCode(payload);
            setQrCodeUrl(qrUrl);
        } catch (err) {
            setError('Erro ao gerar QR Code');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(pixCode);
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

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <span>⚠️</span>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.pixIcon}>
                    <svg viewBox="0 0 512 512" fill="currentColor">
                        <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.9 231.1 518.9 200.8 488.6L103.3 391.1H117.4C137.5 391.1 156.3 383.3 170.5 369.1L242.4 292.5zM262.5 218.9C257.1 224.4 247.9 224.5 242.4 218.9L170.5 142C156.3 127.8 137.4 119.1 117.4 119.1H103.3L200.8 22.51C231.1-7.86 280.3-7.86 310.6 22.51L407.8 119.1H392.7C372.6 119.1 353.8 127.8 339.6 142L262.5 218.9zM112.6 142.7C119.1 136.3 127.5 132.5 136.8 132.5H141.1C146.1 132.5 150.9 134.5 154.4 138L226.2 214.5C247.4 235.8 282 235.8 303.2 214.5L375 138.7C378.5 135.2 383.3 133.3 388.3 133.3H392.7C401.9 133.3 410.3 137.1 416.7 143.5L481.1 207.9C495.4 222.3 495.4 245.3 481.1 259.7L416.8 324.1C410.4 330.5 402 334.3 392.8 334.3H388.4C383.4 334.3 378.6 332.3 375.1 328.8L303.2 252.9C282 231.6 247.4 231.6 226.2 252.9L154.4 328.6C150.9 332.2 146.1 334.2 141.1 334.2H136.8C127.5 334.2 119.2 330.3 112.7 323.9L48.34 259.5C34.02 245.2 34.02 222.2 48.34 207.8L112.6 142.7z" />
                    </svg>
                </div>
                <h3 className={styles.title}>Pagamento via PIX</h3>
            </div>

            {loading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Gerando QR Code...</p>
                </div>
            ) : (
                <>
                    <div className={styles.amount}>
                        <span className={styles.amountLabel}>Valor:</span>
                        <span className={styles.amountValue}>{formatCurrency(amount)}</span>
                    </div>

                    <div className={styles.qrWrapper}>
                        <img src={qrCodeUrl} alt="QR Code PIX" className={styles.qrCode} />
                    </div>

                    <div className={styles.instructions}>
                        <p>1. Abra o app do seu banco</p>
                        <p>2. Escolha pagar com PIX</p>
                        <p>3. Escaneie o QR Code ou copie o código</p>
                    </div>

                    <div className={styles.copySection}>
                        <div className={styles.codePreview}>
                            <code>{pixCode.substring(0, 30)}...</code>
                        </div>
                        <button
                            className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                            onClick={copyToClipboard}
                        >
                            {copied ? (
                                <>
                                    <FiCheck /> Copiado!
                                </>
                            ) : (
                                <>
                                    <FiCopy /> Copiar código
                                </>
                            )}
                        </button>
                    </div>

                    {onPaymentConfirmed && (
                        <button className={styles.confirmButton} onClick={onPaymentConfirmed}>
                            <FiCheck /> Confirmar Pagamento
                        </button>
                    )}

                    <button className={styles.refreshButton} onClick={generateQRCode}>
                        <FiRefreshCw /> Gerar novo código
                    </button>
                </>
            )}
        </div>
    );
}
