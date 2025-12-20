'use client';

import React, { useState, useEffect } from 'react';
import { FiDelete, FiUser, FiUnlock, FiX, FiAlertCircle } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { checkRateLimit, formatBlockTime } from '@/lib/rateLimiter';
import styles from './PinPadModal.module.css';

interface PinPadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (pin: string) => Promise<boolean>;
    onSignOutOwner?: () => void;
    title?: string;
    isLocked?: boolean; // If true, cannot be closed without success (for Lock Screen mode)
    onBack?: () => void; // Optional back action (e.g. if no admin configured)
}

export default function PinPadModal({ isOpen, onClose, onSuccess, onSignOutOwner, title = 'Acesso de Funcionário', isLocked = false, onBack }: PinPadModalProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimeRemaining, setBlockTimeRemaining] = useState<number | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError('');
            checkBlockStatus();
        }
    }, [isOpen]);

    // Check rate limit status
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

    // Update block timer every second
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
    }, [isBlocked]);

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
                // Success is handled by parent (closing modal etc)
                setPin('');
            } else {
                // Error message comes from parent via context
                // Check if we're now blocked
                checkBlockStatus();
                setPin('');
            }
        } catch (err) {
            setError('Erro ao validar PIN');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {!isLocked && (
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
                        <FiX />
                    </button>
                )}

                <div className={styles.header}>
                    <div className={styles.iconWrapper}>
                        {isLocked ? <FiUnlock className={styles.icon} /> : <FiUser className={styles.icon} />}
                    </div>
                    <h2>{title}</h2>
                    <p>Digite seu PIN de 4 a 6 dígitos</p>
                </div>

                {isBlocked && blockTimeRemaining !== null ? (
                    <div className={styles.blockedState}>
                        <FiAlertCircle className={styles.blockedIcon} />
                        <p>Muitas tentativas incorretas</p>
                        <span className={styles.blockTimer}>
                            Tente novamente em {formatBlockTime(blockTimeRemaining)}
                        </span>
                    </div>
                ) : (
                    <>
                        <div className={styles.display}>
                            <div className={`${styles.pinDots} ${error ? styles.shake : ''}`}>
                                {[...Array(6)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`${styles.dot} ${i < pin.length ? styles.filled : ''}`}
                                    />
                                ))}
                            </div>
                            {error && <p className={styles.errorText}>{error}</p>}
                        </div>

                        <div className={styles.keypad}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    className={styles.keyBtn}
                                    onClick={() => handleNumberClick(num)}
                                    disabled={loading || isBlocked}
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                className={styles.keyBtn}
                                onClick={handleClear}
                                disabled={loading || pin.length === 0 || isBlocked}
                            >
                                C
                            </button>
                            <button
                                className={styles.keyBtn}
                                onClick={() => handleNumberClick(0)}
                                disabled={loading || isBlocked}
                            >
                                0
                            </button>
                            <button
                                className={styles.keyBtn}
                                onClick={handleDelete}
                                disabled={loading || pin.length === 0 || isBlocked}
                            >
                                <FiDelete />
                            </button>
                        </div>
                    </>
                )}

                <div className={styles.actions}>
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
    );
}
