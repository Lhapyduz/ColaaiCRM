'use client';

import React, { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiRefreshCw } from 'react-icons/fi';
import Image from 'next/image';
import { generatePixQRCode, generatePixCode, PixPayload } from '@/lib/pix';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

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



    if (error) {
        return (
            <div className="flex flex-col items-center p-6 bg-bg-card rounded-lg border border-border max-w-[320px] mx-auto">
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <span className="text-[2rem]">⚠️</span>
                    <p className="text-error text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center p-6 bg-bg-card rounded-lg border border-border max-w-[320px] mx-auto">
            <div className="flex flex-col items-center gap-3 mb-5">
                <div className="w-12 h-12 text-[#32BCAD]">
                    <svg viewBox="0 0 512 512" fill="currentColor" className="w-full h-full">
                        <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.9 231.1 518.9 200.8 488.6L103.3 391.1H117.4C137.5 391.1 156.3 383.3 170.5 369.1L242.4 292.5zM262.5 218.9C257.1 224.4 247.9 224.5 242.4 218.9L170.5 142C156.3 127.8 137.4 119.1 117.4 119.1H103.3L200.8 22.51C231.1-7.86 280.3-7.86 310.6 22.51L407.8 119.1H392.7C372.6 119.1 353.8 127.8 339.6 142L262.5 218.9zM112.6 142.7C119.1 136.3 127.5 132.5 136.8 132.5H141.1C146.1 132.5 150.9 134.5 154.4 138L226.2 214.5C247.4 235.8 282 235.8 303.2 214.5L375 138.7C378.5 135.2 383.3 133.3 388.3 133.3H392.7C401.9 133.3 410.3 137.1 416.7 143.5L481.1 207.9C495.4 222.3 495.4 245.3 481.1 259.7L416.8 324.1C410.4 330.5 402 334.3 392.8 334.3H388.4C383.4 334.3 378.6 332.3 375.1 328.8L303.2 252.9C282 231.6 247.4 231.6 226.2 252.9L154.4 328.6C150.9 332.2 146.1 334.2 141.1 334.2H136.8C127.5 334.2 119.2 330.3 112.7 323.9L48.34 259.5C34.02 245.2 34.02 222.2 48.34 207.8L112.6 142.7z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary m-0">Pagamento via PIX</h3>
            </div>

            {loading ? (
                <div className="flex flex-col items-center gap-4 py-10 px-5">
                    <div className="w-10 h-10 border-[3px] border-border border-t-[#32BCAD] rounded-full animate-spin" />
                    <p className="text-text-secondary text-sm">Gerando QR Code...</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center gap-1 mb-5 px-6 py-3 bg-[rgba(50,188,173,0.1)] rounded-md w-full">
                        <span className="text-xs text-text-secondary uppercase tracking-wider">Valor:</span>
                        <span className="text-2xl font-bold text-[#32BCAD]">{formatCurrency(amount)}</span>
                    </div>

                    <div className="relative p-4 bg-white rounded-md mb-5 w-[200px] h-[200px]">
                        <Image src={qrCodeUrl} alt="QR Code PIX" fill className="object-contain" unoptimized />
                    </div>

                    <div className="w-full p-4 bg-bg-tertiary rounded-md mb-4">
                        <p className="m-0 py-1 text-[0.8125rem] text-text-secondary">1. Abra o app do seu banco</p>
                        <p className="m-0 py-1 text-[0.8125rem] text-text-secondary">2. Escolha pagar com PIX</p>
                        <p className="m-0 py-1 text-[0.8125rem] text-text-secondary">3. Escaneie o QR Code ou copie o código</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full mb-4">
                        <div className="p-3 bg-bg-tertiary rounded-sm overflow-hidden">
                            <code className="font-mono text-xs text-text-muted break-all">{pixCode.substring(0, 30)}...</code>
                        </div>
                        <button
                            className={cn(
                                'flex items-center justify-center gap-2 px-5 py-3 bg-[#32BCAD] text-white border-none rounded-md text-sm font-semibold cursor-pointer transition-all duration-fast hover:bg-[#2aa89a]',
                                copied && 'bg-accent'
                            )}
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
                        <button
                            className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-accent text-white border-none rounded-md text-[0.9375rem] font-semibold cursor-pointer transition-all duration-fast mb-3 hover:opacity-90"
                            onClick={onPaymentConfirmed}
                        >
                            <FiCheck /> Confirmar Pagamento
                        </button>
                    )}

                    <button
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent text-text-secondary border border-border rounded-md text-[0.8125rem] cursor-pointer transition-all duration-fast hover:text-text-primary hover:border-text-muted"
                        onClick={generateQRCode}
                    >
                        <FiRefreshCw /> Gerar novo código
                    </button>
                </>
            )}
        </div>
    );
}
