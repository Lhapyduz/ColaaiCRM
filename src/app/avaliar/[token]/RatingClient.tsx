'use client';

import React, { useEffect, useState } from 'react';
import { FiCheck, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import StarRating from '@/components/ui/StarRating';
import styles from './page.module.css';

interface OrderInfo {
    id: string;
    order_number: number;
    customer_name: string;
    total: number;
    rated: boolean;
    user_settings: {
        app_name: string;
        logo_url: string | null;
        primary_color: string;
    };
}

export default function RatingClient({ token }: { token: string }) {
    const [order, setOrder] = useState<OrderInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOrder();
    }, [token]);

    useEffect(() => {
        if (order?.user_settings) {
            document.documentElement.style.setProperty('--primary', order.user_settings.primary_color);
        }
    }, [order]);

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    customer_name,
                    total,
                    rated,
                    user_id
                `)
                .eq('rating_token', token)
                .single();

            if (error || !data) {
                setError('Pedido não encontrado');
                setLoading(false);
                return;
            }

            if (data.rated) {
                setSubmitted(true);
            }

            // Fetch user settings
            const { data: settings } = await supabase
                .from('user_settings')
                .select('app_name, logo_url, primary_color')
                .eq('user_id', data.user_id)
                .single();

            setOrder({
                ...data,
                user_settings: settings || {
                    app_name: 'Cola Aí',
                    logo_url: null,
                    primary_color: '#ff6b35'
                }
            });
        } catch (err) {
            setError('Erro ao carregar pedido');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            setError('Por favor, selecione uma avaliação');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            // Get order info first
            const { data: orderData } = await supabase
                .from('orders')
                .select('id, user_id')
                .eq('rating_token', token)
                .single();

            if (!orderData) {
                setError('Pedido não encontrado');
                return;
            }

            // Insert rating
            const { error: ratingError } = await supabase
                .from('ratings')
                .insert({
                    order_id: orderData.id,
                    user_id: orderData.user_id,
                    rating,
                    comment: comment.trim() || null
                });

            if (ratingError) throw ratingError;

            // Mark order as rated
            await supabase
                .from('orders')
                .update({ rated: true })
                .eq('id', orderData.id);

            setSubmitted(true);
        } catch (err) {
            console.error('Error submitting rating:', err);
            setError('Erro ao enviar avaliação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Carregando...</p>
                </div>
            </div>
        );
    }

    if (error && !order) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <FiAlertCircle className={styles.errorIcon} />
                    <h2>{error}</h2>
                    <p>O link pode ter expirado ou o pedido não existe.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={styles.container}>
                <div className={styles.successState}>
                    <div className={styles.successIcon}>
                        <FiCheck />
                    </div>
                    <h2>Obrigado pela avaliação!</h2>
                    <p>Sua opinião é muito importante para nós.</p>
                    {order?.user_settings && (
                        <p className={styles.businessName}>{order.user_settings.app_name}</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.logo}>
                        {order?.user_settings?.logo_url ? (
                            <img src={order.user_settings.logo_url} alt="" />
                        ) : (
                            <span>🌭</span>
                        )}
                    </div>
                    <h1>{order?.user_settings?.app_name}</h1>
                </div>

                {/* Order Info */}
                <div className={styles.orderInfo}>
                    <div className={styles.orderBadge}>
                        Pedido #{order?.order_number}
                    </div>
                    <p className={styles.customerName}>Olá, {order?.customer_name}!</p>
                    <p className={styles.orderTotal}>{formatCurrency(order?.total || 0)}</p>
                </div>

                {/* Rating Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.ratingSection}>
                        <label>Como foi sua experiência?</label>
                        <StarRating
                            rating={rating}
                            size="lg"
                            interactive
                            onChange={setRating}
                        />
                        <div className={styles.ratingLabels}>
                            <span>Ruim</span>
                            <span>Normal</span>
                            <span>Excelente</span>
                        </div>
                    </div>

                    <div className={styles.commentSection}>
                        <label htmlFor="comment">Deixe um comentário (opcional)</label>
                        <textarea
                            id="comment"
                            placeholder="Conte-nos mais sobre sua experiência..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={submitting || rating === 0}
                    >
                        {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                </form>
            </div>
        </div>
    );
}
