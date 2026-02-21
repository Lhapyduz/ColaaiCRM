'use client';

import React, { useState, useEffect } from 'react';
import { FiDelete, FiUser, FiUnlock, FiX, FiAlertCircle } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { checkRateLimit, formatBlockTime } from '@/lib/rateLimiter';
import { cn } from '@/lib/utils';
import { Portal } from '@/components/ui/Portal';

interface PinPadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (pin: string) => Promise<boolean>;
    onSignOutOwner?: () => void;
    title?: string;
    isLocked?: boolean;
    onBack?: () => void;
}

export default function PinPadModal({ isOpen, onClose, onSuccess, onSignOutOwner, title = 'Acesso de Funcionário', isLocked = false, onBack }: PinPadModalProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimeRemaining, setBlockTimeRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError('');
            checkBlockStatus();
        }
    }, [isOpen]);

    const checkBlockStatus = () => {
        const status = checkRateLimit();
        if (!status.allowed && status.blockRemaining) {
            setIsBlocked(true);
            setBlockTimeRemaining(status.blockRemaining);
        } else {
            setIsBlocked(false);
            setBlockTimeRemaining(null);
        }
    };

    useEffect(() => {
        if (!isBlocked || blockTimeRemaining === null) return;

        const timer = setInterval(() => {
            setBlockTimeRemaining(prev => {
                if (prev === null || prev <= 1) {
                    setIsBlocked(false);
                    setError('');
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isBlocked, blockTimeRemaining]);

    const handleNumberClick = (num: number) => {
        if (isBlocked) return;
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    const handleSubmit = async () => {
        if (isBlocked) {
            checkBlockStatus();
            return;
        }

        if (pin.length < 4) {
            setError('PIN deve ter pelo menos 4 dígitos');
            return;
        }

        setLoading(true);
        try {
            const success = await onSuccess(pin);
            if (success) {
                setPin('');
            } else {
                checkBlockStatus();
                setPin('');
            }
        } catch (err) {
            console.error('Erro de PIN:', err);
            setError('PIN incorreto');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-overlay p-4 animate-fadeIn">
                <div className="bg-bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-modal">
                    {!isLocked && (
                        <button
                            className="absolute top-4 right-4 bg-transparent border-none text-text-secondary text-2xl cursor-pointer p-2 rounded-full transition-all duration-200 hover:bg-bg-tertiary hover:text-text-primary"
                            onClick={onClose}
                            aria-label="Fechar"
                        >
                            <FiX />
                        </button>
                    )}

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            {isLocked ? <FiUnlock className="text-[2rem] text-primary" /> : <FiUser className="text-[2rem] text-primary" />}
                        </div>
                        <h2 className="m-0 text-2xl text-text-primary">{title}</h2>
                        <p className="mt-2 text-text-secondary">Digite seu PIN de 4 a 6 dígitos</p>
                    </div>

                    {isBlocked && blockTimeRemaining !== null ? (
                        <div className="text-center py-8">
                            <FiAlertCircle className="text-[3rem] text-error mb-4" />
                            <p className="text-text-primary font-medium">Muitas tentativas incorretas</p>
                            <span className="text-primary text-lg font-semibold">
                                Tente novamente em {formatBlockTime(blockTimeRemaining)}
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8 text-center">
                                <div className={cn(
                                    'flex justify-center gap-4 mb-2',
                                    error && 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]'
                                )}>
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                'w-4 h-4 rounded-full border-2 border-border transition-all duration-200',
                                                i < pin.length && 'bg-primary border-primary scale-110'
                                            )}
                                        />
                                    ))}
                                </div>
                                {error && <p className="text-error text-sm mt-2">{error}</p>}
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        className="aspect-square rounded-full border border-border bg-bg-card text-text-primary text-2xl font-medium cursor-pointer transition-all duration-100 flex items-center justify-center hover:enabled:bg-bg-tertiary hover:enabled:border-primary hover:enabled:text-primary active:enabled:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handleNumberClick(num)}
                                        disabled={loading || isBlocked}
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    className="aspect-square rounded-full border border-border bg-bg-card text-text-primary text-2xl font-medium cursor-pointer transition-all duration-100 flex items-center justify-center hover:enabled:bg-bg-tertiary hover:enabled:border-primary hover:enabled:text-primary active:enabled:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleClear}
                                    disabled={loading || pin.length === 0 || isBlocked}
                                >
                                    C
                                </button>
                                <button
                                    className="aspect-square rounded-full border border-border bg-bg-card text-text-primary text-2xl font-medium cursor-pointer transition-all duration-100 flex items-center justify-center hover:enabled:bg-bg-tertiary hover:enabled:border-primary hover:enabled:text-primary active:enabled:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleNumberClick(0)}
                                    disabled={loading || isBlocked}
                                >
                                    0
                                </button>
                                <button
                                    className="aspect-square rounded-full border border-border bg-bg-card text-text-primary text-2xl font-medium cursor-pointer transition-all duration-100 flex items-center justify-center hover:enabled:bg-bg-tertiary hover:enabled:border-primary hover:enabled:text-primary active:enabled:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleDelete}
                                    disabled={loading || pin.length === 0 || isBlocked}
                                >
                                    <FiDelete />
                                </button>
                            </div>
                        </>
                    )}

                    <div className="flex flex-col gap-2">
                        {isLocked && onSignOutOwner && (
                            <Button
                                variant="ghost"
                                onClick={onSignOutOwner}
                                disabled={loading}
                            >
                                Sair da Conta (Proprietário)
                            </Button>
                        )}

                        {isLocked && onBack && (
                            <Button
                                variant="outline"
                                onClick={onBack}
                                disabled={loading}
                            >
                                Voltar
                            </Button>
                        )}

                        <Button
                            fullWidth
                            size="lg"
                            onClick={handleSubmit}
                            isLoading={loading}
                            disabled={pin.length < 4 || isBlocked}
                        >
                            Entrar
                        </Button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
