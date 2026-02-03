'use client';

import React, { useEffect, useState } from 'react';
import { FiCheck, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import StarRating from '@/components/ui/StarRating';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

interface OrderInfo { id: string; order_number: number; customer_name: string; total: number; rated: boolean; user_settings: { app_name: string; logo_url: string | null; primary_color: string; }; }

export default function RatingClient({ token }: { token: string }) {
    const [order, setOrder] = useState<OrderInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchOrder(); }, [token]);
    useEffect(() => { if (order?.user_settings) document.documentElement.style.setProperty('--primary', order.user_settings.primary_color); }, [order]);

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase.from('orders').select('id,order_number,customer_name,total,rated,user_id').eq('rating_token', token).single();
            if (error || !data) { setError('Pedido não encontrado'); setLoading(false); return; }
            if (data.rated) setSubmitted(true);
            const { data: settings } = await supabase.from('user_settings').select('app_name, logo_url, primary_color').eq('user_id', data.user_id).single();
            setOrder({ ...data, user_settings: settings || { app_name: 'Cola Aí', logo_url: null, primary_color: '#ff6b35' } });
        } catch { setError('Erro ao carregar pedido'); } finally { setLoading(false); }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) { setError('Por favor, selecione uma avaliação'); return; }
        setSubmitting(true); setError('');
        try {
            const { data: orderData } = await supabase.from('orders').select('id, user_id, customer_name').eq('rating_token', token).single();
            if (!orderData) { setError('Pedido não encontrado'); return; }

            // Insert into store_ratings instead of ratings
            const { error: ratingError } = await supabase.from('store_ratings').insert({
                user_id: orderData.user_id,
                rating,
                comment: comment.trim() || null,
                customer_name: orderData.customer_name || 'Cliente'
            });

            if (ratingError) throw ratingError;

            await supabase.from('orders').update({ rated: true }).eq('id', orderData.id);
            setSubmitted(true);
        } catch (err) { console.error(err); setError('Erro ao enviar avaliação. Tente novamente.'); } finally { setSubmitting(false); }
    };

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /><p className="text-text-muted">Carregando...</p></div></div>;
    if (error && !order) return <div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><FiAlertCircle className="text-error text-5xl mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">{error}</h2><p className="text-text-muted">O link pode ter expirado ou o pedido não existe.</p></div></div>;
    if (submitted) return <div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="text-center"><div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center"><FiCheck className="text-success text-4xl" /></div><h2 className="text-2xl font-bold mb-2">Obrigado pela avaliação!</h2><p className="text-text-muted mb-4">Sua opinião é muito importante para nós.</p>{order?.user_settings && <p className="text-primary font-medium">{order.user_settings.app_name}</p>}</div></div>;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-bg-card border border-border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="bg-primary/10 p-6 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-4 rounded-full bg-bg-card flex items-center justify-center overflow-hidden">{order?.user_settings?.logo_url ? <Image src={order.user_settings.logo_url} alt="" fill className="object-contain" sizes="80px" /> : <span className="text-4xl">🌭</span>}</div>
                    <h1 className="text-xl font-bold">{order?.user_settings?.app_name}</h1>
                </div>

                {/* Order Info */}
                <div className="p-6 text-center border-b border-border">
                    <span className="inline-block px-4 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold mb-3">Pedido #{order?.order_number}</span>
                    <p className="text-lg font-medium mb-1">Olá, {order?.customer_name}!</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(order?.total || 0)}</p>
                </div>

                {/* Rating Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="text-center">
                        <label className="block text-lg font-medium mb-4">Como foi sua experiência?</label>
                        <StarRating rating={rating} size="lg" interactive onChange={setRating} />
                        <div className="flex justify-between text-xs text-text-muted mt-2"><span>Ruim</span><span>Normal</span><span>Excelente</span></div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" htmlFor="comment">Deixe um comentário (opcional)</label>
                        <textarea id="comment" className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg resize-none focus:border-primary focus:outline-none transition-colors" placeholder="Conte-nos mais sobre sua experiência..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                    </div>

                    {error && <p className="text-error text-sm text-center">{error}</p>}

                    <button type="submit" disabled={submitting || rating === 0} className={cn('w-full py-4 rounded-lg font-semibold text-white transition-all', rating === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover active:scale-[0.98]')}>{submitting ? 'Enviando...' : 'Enviar Avaliação'}</button>
                </form>
            </div>
        </div>
    );
}
