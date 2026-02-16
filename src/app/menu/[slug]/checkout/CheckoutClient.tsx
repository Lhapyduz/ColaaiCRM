'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiUser, FiPhone, FiMapPin, FiTag, FiCheck, FiX, FiMessageCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { formatCurrency, getWhatsAppUrl, EMOJIS } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';
import { createOrder } from '@/app/actions/orders';
import { toast } from 'react-hot-toast';

// ── Interfaces ─────────────────────────────────────────────────────
interface Product {
    id: string; name: string; description: string | null; price: number;
    image_url: string | null; category_id: string; available: boolean;
    promo_enabled?: boolean; promo_value?: number; promo_type?: 'value' | 'percentage';
}
interface SelectedAddon { id: string; name: string; price: number; }
interface CartItem { product: Product; quantity: number; notes: string; addons: SelectedAddon[]; }
interface UserSettings {
    app_name: string; logo_url: string | null; primary_color: string;
    secondary_color: string; whatsapp_number: string | null; user_id: string;
    delivery_fee_value: number | null; store_open: boolean | null;
    sidebar_color?: string | null; public_slug?: string;
}
interface Coupon {
    id: string; code: string; discount_type: 'percentage' | 'value';
    discount_value: number; min_order_value: number | null;
    is_active: boolean; uses_remaining: number | null;
}

interface CheckoutClientProps {
    slug: string;
    settings: UserSettings;
    couponsEnabled: boolean;
}

type DeliveryMode = 'delivery' | 'pickup';
type PaymentMethod = 'pix' | 'card' | 'cash';

// ── Componente Principal ───────────────────────────────────────────
export default function CheckoutClient({ slug, settings, couponsEnabled }: CheckoutClientProps) {
    const router = useRouter();

    // ── Cart state (lazy init from sessionStorage) ─────────────────
    const [cart] = useState<CartItem[]>(() => {
        if (typeof window === 'undefined') return [];
        const raw = sessionStorage.getItem(`cart_${slug}`);
        if (!raw) return [];
        try { return JSON.parse(raw) as CartItem[]; } catch { return []; }
    });

    // ── Customer data ──────────────────────────────────────────────
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // ── Delivery / Pickup ──────────────────────────────────────────
    const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('delivery');
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [complement, setComplement] = useState('');

    // ── Payment ────────────────────────────────────────────────────
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [needChange, setNeedChange] = useState(false);
    const [changeFor, setChangeFor] = useState('');

    // ── Coupon ──────────────────────────────────────────────────────
    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

    // ── Observations ───────────────────────────────────────────────
    const [observations, setObservations] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Redirect if cart is empty (no useEffect needed) ────────────
    if (typeof window !== 'undefined' && cart.length === 0) {
        router.replace(`/menu/${slug}`);
        return null;
    }

    // ── Helpers ────────────────────────────────────────────────────
    const getProductPrice = (product: Product) => {
        if (!product) return 0;
        if (!product.promo_enabled || !product.promo_value) return product.price;
        if (product.promo_type === 'percentage') return product.price * (1 - product.promo_value / 100);
        return Math.max(0, product.price - product.promo_value);
    };

    const subtotal = cart.reduce((acc, item) => {
        const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
        return acc + (getProductPrice(item.product) + addonTotal) * item.quantity;
    }, 0);

    const deliveryFee = deliveryMode === 'delivery' ? (settings.delivery_fee_value ?? 0) : 0;

    const discount = appliedCoupon
        ? appliedCoupon.discount_type === 'percentage'
            ? subtotal * (appliedCoupon.discount_value / 100)
            : appliedCoupon.discount_value
        : 0;

    const total = Math.max(0, subtotal - discount) + deliveryFee;

    // ── Apply Coupon ──────────────────────────────────────────────
    const applyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError('');

        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', couponCode.toUpperCase())
            .eq('user_id', settings.user_id)
            .eq('active', true)
            .single();

        if (error || !coupon) {
            setCouponError('Cupom inválido ou expirado.');
            setCouponLoading(false);
            return;
        }
        if (coupon.min_order_value && subtotal < coupon.min_order_value) {
            setCouponError(`Pedido mínimo: ${formatCurrency(coupon.min_order_value)}`);
            setCouponLoading(false);
            return;
        }
        if (coupon.uses_remaining !== null && coupon.uses_remaining <= 0) {
            setCouponError('Cupom esgotado.');
            setCouponLoading(false);
            return;
        }

        setAppliedCoupon(coupon);
        setCouponLoading(false);
    };

    // ── Send WhatsApp Order ────────────────────────────────────────
    const sendWhatsAppOrder = async () => {
        if (!settings.whatsapp_number || cart.length === 0) return;
        if (!customerName.trim() || !customerPhone.trim()) {
            toast.error('Por favor, preencha seu nome e telefone.');
            return;
        }
        if (deliveryMode === 'delivery' && (!street.trim() || !houseNumber.trim() || !neighborhood.trim())) {
            toast.error('Por favor, preencha o endereço completo.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Preparar dados para o banco
            const orderData = {
                user_id: settings.user_id,
                customerName,
                customerPhone,
                deliveryMode,
                street,
                houseNumber,
                neighborhood,
                complement,
                paymentMethod,
                changeFor: paymentMethod === 'cash' ? parseFloat(changeFor) || 0 : 0,
                subtotal,
                deliveryFee,
                total,
                observations: observations.trim(),
                items: cart.map(item => ({
                    productId: item.product.id,
                    name: item.product.name,
                    price: getProductPrice(item.product),
                    quantity: item.quantity,
                    notes: item.notes,
                    addons: item.addons.map(a => ({
                        id: a.id,
                        name: a.name,
                        price: a.price
                    }))
                }))
            };

            // 2. Salvar no banco via Server Action
            const result = await createOrder(orderData);

            if (result.error) {
                console.error('Erro ao salvar pedido:', result.error);
                toast.error('Erro ao registrar pedido no sistema. Tente novamente.');
                setIsSubmitting(false);
                return;
            }

            // 3. Gerar mensagem do WhatsApp
            let message = `${EMOJIS.BURGER} *PEDIDO #${result.orderNumber} - ${settings.app_name.toUpperCase()}* ${EMOJIS.FRIES}\n`;
            message += `------------------------\n\n`;
            // ... resto da mensagem (vou manter igual)
            message += `${EMOJIS.USER} *CLIENTE:* ${customerName}\n`;
            message += `${EMOJIS.PHONE} *TELEFONE:* ${customerPhone}\n\n`;

            if (deliveryMode === 'delivery') {
                message += `${EMOJIS.LOCATION} *ENTREGA:*\n`;
                message += `${EMOJIS.HOUSE} ${street}, ${houseNumber}${complement ? ` (${complement})` : ''}\n`;
                message += `${EMOJIS.NEIGHBORHOOD} ${neighborhood}\n\n`;
            } else {
                message += `${EMOJIS.STORE} *RETIRADA NO LOCAL*\n\n`;
            }

            message += `${EMOJIS.CLIPBOARD} *ITENS DO PEDIDO:*\n------------------------\n`;
            cart.forEach(item => {
                const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                const itemPrice = getProductPrice(item.product);
                const itemTotal = (itemPrice + addonTotal) * item.quantity;

                message += `*${item.quantity}x ${item.product.name.toUpperCase()}*\n`;
                if (item.addons.length > 0) message += `   - ${EMOJIS.PACKAGE} ${item.addons.map(a => a.name).join(', ')}\n`;
                if (item.notes) message += `   - ${EMOJIS.MEMO} _Obs: ${item.notes}_\n`;
                message += `   - ${EMOJIS.BANKNOTE} ${formatCurrency(itemTotal)}\n\n`;
            });
            message += `------------------------\n`;

            if (appliedCoupon) {
                message += `${EMOJIS.COUPON} *CUPOM:* ${appliedCoupon.code} (-${formatCurrency(discount)})\n`;
            }
            if (deliveryMode === 'delivery') {
                message += `${EMOJIS.TRUCK} *ENTREGA:* ${formatCurrency(deliveryFee)}\n`;
            }
            message += `${EMOJIS.BANKNOTE} *TOTAL:* *${formatCurrency(total)}*\n\n`;

            const paymentLabels: Record<PaymentMethod, string> = {
                pix: `PIX ${EMOJIS.ZAP}`,
                card: `Cartão ${EMOJIS.CARD}`,
                cash: `Dinheiro ${EMOJIS.BANKNOTE}`
            };
            message += `${EMOJIS.CARD} *FORMA DE PAGAMENTO:* ${paymentLabels[paymentMethod]}`;
            if (paymentMethod === 'cash' && needChange) {
                message += `\n${EMOJIS.MONEY_BAG} *TROCO PARA:* ${formatCurrency(parseFloat(changeFor) || 0)}`;
            }
            message += '\n';

            if (observations.trim()) {
                message += `\n${EMOJIS.SPEECH} *OBSERVAÇÕES GERAIS:*\n_${observations}_\n`;
            }

            message += `\n${EMOJIS.ROCKET} *Pedido enviado via Cardápio Online*`;

            const url = getWhatsAppUrl(settings.whatsapp_number, message);
            window.open(url, '_blank');

            // Limpar carrinho após enviar
            sessionStorage.removeItem(`cart_${slug}`);
            toast.success('Pedido registrado com sucesso!');
            setIsSubmitting(false);
            router.push(`/menu/${slug}/sucesso?id=${result.orderId}`);

        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Erro inesperado ao processar pedido. Tente novamente.');
            setIsSubmitting(false);
        }
    };

    if (cart.length === 0) return null;

    // ── CSS Custom Properties ──────────────────────────────────────
    const cssVars = {
        '--primary': settings.primary_color || '#FF6B00',
        '--secondary': settings.secondary_color || '#FF8C00',
    } as React.CSSProperties;

    return (
        <div className="min-h-screen bg-[#0D0D0D] text-white" style={cssVars}>

            {/* ── Header ─────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-2xl mx-auto flex items-center gap-4 px-4 py-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    {settings.logo_url && (
                        <Image src={settings.logo_url} alt={settings.app_name} width={32} height={32} className="rounded-full" />
                    )}
                    <div>
                        <h1 className="font-bold text-lg">Checkout</h1>
                        <p className="text-xs text-gray-500">{settings.app_name}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pb-32 space-y-6 pt-6">

                {/* ── 1. Resumo do Pedido ─────────────────────── */}
                <section className="bg-[#1A1A1A] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Seu Pedido</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {cart.map((item, i) => {
                            const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                            const itemTotal = (getProductPrice(item.product) + addonTotal) * item.quantity;
                            return (
                                <div key={i} className="flex items-center gap-3 p-4">
                                    {item.product.image_url && (
                                        <Image src={item.product.image_url} alt={item.product.name} width={48} height={48} className="rounded-lg object-cover w-12 h-12 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{item.quantity}x {item.product.name}</p>
                                        {item.addons.length > 0 && (
                                            <p className="text-xs text-gray-500 truncate">{item.addons.map(a => a.name).join(', ')}</p>
                                        )}
                                        {item.notes && <p className="text-xs text-gray-600 italic truncate">{item.notes}</p>}
                                    </div>
                                    <span className="text-sm font-bold text-primary shrink-0">{formatCurrency(itemTotal)}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t border-white/5 flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="font-bold">{formatCurrency(subtotal)}</span>
                    </div>
                </section>

                {/* ── 2. Dados do Cliente ─────────────────────── */}
                <section className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 space-y-4">
                    <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FiUser size={14} /> Seus Dados
                    </h2>
                    <div className="space-y-3">
                        <div className="relative">
                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                            <input
                                type="text" placeholder="Seu nome *"
                                value={customerName} onChange={e => setCustomerName(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <div className="relative">
                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                            <input
                                type="tel" placeholder="Seu telefone *"
                                value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>
                </section>

                {/* ── 3. Entrega ou Retirada ──────────────────── */}
                <section className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 space-y-4">
                    <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FiMapPin size={14} /> Entrega
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {(['delivery', 'pickup'] as DeliveryMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setDeliveryMode(mode)}
                                className={`py-3 rounded-xl font-bold text-sm transition-all border ${deliveryMode === mode
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-[#121212] border-white/5 text-gray-400 hover:border-white/10'
                                    }`}
                            >
                                {mode === 'delivery' ? `${EMOJIS.TRUCK} Entrega` : `${EMOJIS.STORE} Retirada`}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {deliveryMode === 'delivery' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-3"
                            >
                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        type="text" placeholder="Rua *"
                                        value={street} onChange={e => setStreet(e.target.value)}
                                        className="col-span-2 px-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none placeholder:text-gray-600"
                                    />
                                    <input
                                        type="text" placeholder="Nº *"
                                        value={houseNumber} onChange={e => setHouseNumber(e.target.value)}
                                        className="px-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none placeholder:text-gray-600"
                                    />
                                </div>
                                <input
                                    type="text" placeholder="Bairro *"
                                    value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none placeholder:text-gray-600"
                                />
                                <input
                                    type="text" placeholder="Complemento (opcional)"
                                    value={complement} onChange={e => setComplement(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none placeholder:text-gray-600"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* ── 4. Cupom ────────────────────────────────── */}
                {couponsEnabled && (
                    <section className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 space-y-4">
                        <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <FiTag size={14} /> Cupom de Desconto
                        </h2>
                        {appliedCoupon ? (
                            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <span className="text-green-400 font-bold text-sm flex items-center gap-2">
                                    <FiCheck /> {appliedCoupon.code} (-{formatCurrency(discount)})
                                </span>
                                <button onClick={() => setAppliedCoupon(null)} className="text-red-400 hover:text-red-300 transition-colors">
                                    <FiX size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text" placeholder="CÓDIGO DO CUPOM"
                                    value={couponCode}
                                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                    className="flex-1 px-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none uppercase placeholder:text-gray-600"
                                />
                                <button
                                    onClick={applyCoupon}
                                    disabled={couponLoading || !couponCode.trim()}
                                    className="px-6 py-3.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {couponLoading ? '...' : 'Aplicar'}
                                </button>
                            </div>
                        )}
                        {couponError && <p className="text-xs text-red-500 font-medium">{couponError}</p>}
                    </section>
                )}

                {/* ── 5. Forma de Pagamento ───────────────────── */}
                <section className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 space-y-4">
                    <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">{EMOJIS.CARD} Pagamento</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {([
                            { key: 'pix' as PaymentMethod, label: 'PIX', icon: EMOJIS.ZAP },
                            { key: 'card' as PaymentMethod, label: 'Cartão', icon: EMOJIS.CARD },
                            { key: 'cash' as PaymentMethod, label: 'Dinheiro', icon: EMOJIS.BANKNOTE },
                        ]).map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setPaymentMethod(key)}
                                className={`py-3.5 rounded-xl font-bold text-sm transition-all border ${paymentMethod === key
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-[#121212] border-white/5 text-gray-400 hover:border-white/10'
                                    }`}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {paymentMethod === 'cash' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-3"
                            >
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox" checked={needChange}
                                        onChange={e => setNeedChange(e.target.checked)}
                                        className="w-5 h-5 rounded bg-[#121212] border-white/10 accent-primary"
                                    />
                                    <span className="text-sm text-gray-300">Preciso de troco</span>
                                </label>
                                {needChange && (
                                    <input
                                        type="number" placeholder="Troco para quanto? (ex: 50)"
                                        value={changeFor} onChange={e => setChangeFor(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none placeholder:text-gray-600"
                                    />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* ── 6. Observações ──────────────────────────── */}
                <section className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 space-y-3">
                    <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">{EMOJIS.MEMO} Observações</h2>
                    <textarea
                        placeholder="Alguma observação sobre o pedido? (opcional)"
                        value={observations} onChange={e => setObservations(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3.5 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none resize-none placeholder:text-gray-600"
                    />
                </section>

                {/* ── 7. Resumo Final ─────────────────────────── */}
                <section className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 space-y-3">
                    <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-3">Resumo</h2>
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>Subtotal</span>
                        <span className="text-white font-bold">{formatCurrency(subtotal)}</span>
                    </div>
                    {appliedCoupon && (
                        <div className="flex justify-between text-sm text-green-400 font-bold">
                            <span>Desconto ({appliedCoupon.code})</span>
                            <span>-{formatCurrency(discount)}</span>
                        </div>
                    )}
                    {deliveryMode === 'delivery' && (
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Taxa de Entrega</span>
                            <span className="text-white font-bold">{formatCurrency(deliveryFee)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-baseline pt-3 border-t border-white/5">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-black text-2xl text-primary">{formatCurrency(total)}</span>
                    </div>
                </section>

            </main>

            {/* ── Botão Fixo de Finalizar ─────────────────────── */}
            <div className="fixed bottom-0 inset-x-0 bg-[#0D0D0D]/95 backdrop-blur-xl border-t border-white/5 p-4 z-50">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={sendWhatsAppOrder}
                        disabled={isSubmitting || !customerName.trim() || !customerPhone.trim() || (deliveryMode === 'delivery' && (!street.trim() || !houseNumber.trim() || !neighborhood.trim()))}
                        className="w-full py-4 bg-primary hover:opacity-90 disabled:opacity-40 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                                />
                                Processando...
                            </span>
                        ) : (
                            <>
                                <FiMessageCircle size={22} />
                                Finalizar pelo WhatsApp
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
