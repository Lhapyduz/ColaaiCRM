'use client';

import React from 'react';
import { IconX as FiX, IconMessageCircle as FiMessageCircle, IconUser as FiUser } from '@/components/ui/Icons';
import StarRating from '@/components/ui/StarRating';
import { Portal } from '@/components/ui/Portal';

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    customer_name: string | null;
    created_at: string | null;
    reply: string | null;
    replied_at: string | null;
}

interface ProductReviewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviews: Review[];
    appName: string;
    productName: string;
    averageRating: number;
    totalRatings: number;
}

export default function ProductReviewsModal({
    isOpen,
    onClose,
    reviews,
    appName,
    productName,
    averageRating,
    totalRatings
}: ProductReviewsModalProps) {
    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose} style={{ zIndex: 99998 }}>
                <div
                    className="w-full max-w-lg bg-bg-card rounded-3xl overflow-hidden max-h-[85vh] flex flex-col shadow-2xl animate-scaleIn border border-white/10"
                    onClick={e => e.stopPropagation()}
                    style={{ zIndex: 99999 }}
                >
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-bg-card sticky top-0 z-10 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white">Avaliações do Produto</h2>
                            <p className="text-sm text-text-muted">{productName}</p>
                        </div>
                        <button onClick={onClose} className="text-text-secondary hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors self-start mt-1">
                            <FiX size={24} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        {/* Header Stats */}
                        <div className="flex flex-col items-center justify-center py-4 space-y-2">
                            <div className="text-5xl font-bold text-white">{averageRating.toFixed(1)}</div>
                            <StarRating rating={averageRating} size="lg" />
                            <p className="text-text-secondary">{totalRatings} avaliações</p>
                        </div>

                        {/* Reviews List */}
                        <div className="space-y-4">
                            {reviews.length === 0 ? (
                                <div className="text-center py-8 text-text-muted">
                                    <p>Nenhuma avaliação com comentário ainda.</p>
                                </div>
                            ) : (
                                reviews.map((review) => (
                                    <div key={review.id} className="p-4 rounded-xl bg-bg-tertiary border border-white/5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                                                    <FiUser size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{review.customer_name || 'Cliente Anônimo'}</p>
                                                    <div className="flex items-center gap-2">
                                                        <StarRating rating={review.rating} size="sm" />
                                                        <span className="text-xs text-text-muted">
                                                            {review.created_at && new Date(review.created_at).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {review.comment && (
                                            <p className="text-text-secondary text-sm leading-relaxed pl-10">
                                                &quot;{review.comment}&quot;
                                            </p>
                                        )}

                                        {review.reply && (
                                            <div className="ml-10 mt-3 p-3 bg-white/5 rounded-lg border-l-2 border-primary">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FiMessageCircle className="text-primary" size={12} />
                                                    <span className="text-xs font-bold text-primary">{appName} respondeu:</span>
                                                </div>
                                                <p className="text-text-secondary text-xs italic">
                                                    {review.reply}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
