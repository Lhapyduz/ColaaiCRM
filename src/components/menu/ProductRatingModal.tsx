'use client';

import React, { useState, useEffect } from 'react';
import { IconX as FiX, IconCheck as FiCheck, IconAlertCircle as FiAlertCircle } from '@/components/ui/Icons';
import Image from 'next/image';
import StarRating from '@/components/ui/StarRating';
import { addProductRating } from '@/app/actions/store';
import Button from '@/components/ui/Button';
import { Portal } from '@/components/ui/Portal';

interface ProductRatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeOwnerId: string;
    productId: string;
    productName: string;
    productImage?: string | null;
}

export default function ProductRatingModal({
    isOpen,
    onClose,
    storeOwnerId,
    productId,
    productName,
    productImage
}: ProductRatingModalProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [alreadyRated, setAlreadyRated] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const lastRated = localStorage.getItem(`product_rated_${productId}`);
            if (lastRated) {
                const date = new Date(lastRated);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 7) {
                    setAlreadyRated(true);
                }
            }
        }
    }, [isOpen, productId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Por favor, selecione uma nota de 1 a 5 estrelas.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await addProductRating(storeOwnerId, productId, rating, comment, customerName || 'Anônimo');

            localStorage.setItem(`product_rated_${productId}`, new Date().toISOString());

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setRating(0);
                setComment('');
                setCustomerName('');
            }, 2000);
        } catch (err) {
            console.error(err);
            setError('Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" style={{ zIndex: 99998 }}>
                <div className="w-full max-w-md bg-bg-card rounded-3xl p-6 shadow-2xl animate-scaleIn border border-white/10 relative" style={{ zIndex: 99999 }}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors z-10"
                    >
                        <FiX size={24} />
                    </button>

                    <div className="text-center mb-6">
                        {productImage && (
                            <div className="relative w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border border-white/10">
                                <Image src={productImage} alt={productName} fill className="object-cover" sizes="80px" />
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-white mb-2">Avaliar {productName}</h2>
                        <p className="text-text-secondary">O que você achou deste produto?</p>
                    </div>

                    {alreadyRated ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                <FiCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Obrigado!</h3>
                            <p className="text-text-muted">Você já avaliou este produto recentemente.</p>
                            <Button className="mt-6 w-full" onClick={onClose}>Fechar</Button>
                        </div>
                    ) : success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 text-success">
                                <FiCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Obrigado!</h3>
                            <p className="text-text-muted">Sua avaliação foi enviada com sucesso.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex justify-center">
                                <StarRating
                                    rating={rating}
                                    onChange={setRating}
                                    interactive
                                    size="lg"
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Seu Nome (Opcional)</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-4 py-3 bg-bg-tertiary border border-white/5 rounded-xl text-white focus:border-primary focus:outline-none transition-colors"
                                        placeholder="Como quer ser identificado?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Comentário (Opcional)</label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="w-full px-4 py-3 bg-bg-tertiary border border-white/5 rounded-xl text-white focus:border-primary focus:outline-none transition-colors min-h-[100px] resize-none"
                                        placeholder="Conte-nos o que achou..."
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-error text-sm bg-error/10 p-3 rounded-lg">
                                    <FiAlertCircle />
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full py-3 text-lg font-bold"
                                isLoading={loading}
                                disabled={rating === 0}
                            >
                                Enviar Avaliação
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </Portal>
    );
}
