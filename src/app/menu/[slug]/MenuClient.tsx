'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FiShoppingBag, FiMinus, FiPlus, FiX, FiMessageCircle, FiUser, FiPhone, FiTag, FiCheck, FiGift } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/hooks/useFormatters';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface Category { id: string; name: string; icon: string; color: string; }
interface Product { id: string; name: string; description: string | null; price: number; image_url: string | null; category_id: string; available: boolean; }
interface UserSettings { app_name: string; logo_url: string | null; primary_color: string; secondary_color: string; whatsapp_number: string | null; user_id: string; delivery_fee_value: number | null; }
interface Addon { id: string; name: string; price: number; }
interface AddonGroup { id: string; name: string; required: boolean; max_selection: number; addons: Addon[]; }
interface SelectedAddon { id: string; name: string; price: number; }
interface CartItem { product: Product; quantity: number; notes: string; addons: SelectedAddon[]; }
interface Customer { id: string; phone: string; name: string; total_points: number; total_spent: number; total_orders: number; tier: string; }
interface LoyaltySettings { points_per_real: number; is_active: boolean; }
interface AppSettings { loyalty_enabled: boolean; coupons_enabled: boolean; }

interface MenuClientProps {
    slug: string;
    initialSettings?: UserSettings | null;
    initialCategories?: Category[];
    initialProducts?: Product[];
    initialAppSettings?: AppSettings | null;
    initialLoyaltySettings?: LoyaltySettings | null;
}

export default function MenuClient({
    slug,
    initialSettings = null,
    initialCategories = [],
    initialProducts = [],
    initialAppSettings = null,
    initialLoyaltySettings = null
}: MenuClientProps) {
    // Use initial data from SSR if available, otherwise start with empty/loading state
    const hasInitialData = initialSettings !== null;

    const [settings, setSettings] = useState<UserSettings | null>(initialSettings);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [loading, setLoading] = useState(!hasInitialData);
    const [notFound, setNotFound] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: 'percentage' | 'fixed'; discount_value: number; } | null>(null);
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    const [productAddonGroups, setProductAddonGroups] = useState<AddonGroup[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
    const [loadingAddons, setLoadingAddons] = useState(false);
    const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});
    // Customer & Coupon states
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [loyaltyEnabled, setLoyaltyEnabled] = useState(initialAppSettings?.loyalty_enabled ?? false);
    const [couponsEnabled, setCouponsEnabled] = useState(initialAppSettings?.coupons_enabled ?? false);
    const [customerData, setCustomerData] = useState<Customer | null>(null);
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(initialLoyaltySettings);

    // Debounce phone for customer lookup
    const debouncedPhone = useDebounce(customerPhone, 500);

    // Only fetch data client-side if SSR data wasn't provided
    useEffect(() => {
        if (!hasInitialData) {
            fetchMenuData();
        }
    }, [slug, hasInitialData]);

    useEffect(() => {
        if (settings) {
            document.documentElement.style.setProperty('--menu-primary', settings.primary_color);
            document.documentElement.style.setProperty('--menu-secondary', settings.secondary_color);
        }
    }, [settings]);

    // Debounced customer lookup
    useEffect(() => {
        if (debouncedPhone && debouncedPhone.length >= 10 && settings) {
            lookupCustomer(debouncedPhone);
        }
    }, [debouncedPhone, settings]);

    const fetchMenuData = async () => {
        try {
            const { data: settingsData, error: settingsError } = await supabase.from('user_settings').select('*').eq('public_slug', slug).single();
            if (settingsError || !settingsData) { setNotFound(true); setLoading(false); return; }
            setSettings(settingsData);
            const [{ data: categoriesData }, { data: productsData }, { data: appSettingsData }, { data: loyaltySettingsData }] = await Promise.all([
                supabase.from('categories').select('*').eq('user_id', settingsData.user_id).order('name'),
                supabase.from('products').select('*').eq('user_id', settingsData.user_id).eq('available', true).order('name'),
                supabase.from('app_settings').select('loyalty_enabled, coupons_enabled').eq('user_id', settingsData.user_id).single(),
                supabase.from('loyalty_settings').select('points_per_real, is_active').eq('user_id', settingsData.user_id).single()
            ]);
            setCategories(categoriesData || []); setProducts(productsData || []);
            if (appSettingsData) { setLoyaltyEnabled(appSettingsData.loyalty_enabled ?? false); setCouponsEnabled(appSettingsData.coupons_enabled ?? false); }
            if (loyaltySettingsData) { setLoyaltySettings(loyaltySettingsData); }
        } catch { setNotFound(true); } finally { setLoading(false); }
    };


    const loadProductAddons = async (productId: string): Promise<AddonGroup[]> => {
        if (!settings) return [];

        try {
            const { data: groupLinks, error } = await supabase
                .from('product_addon_groups')
                .select(`
                    group_id,
                    addon_groups(
                        id,
                        name,
                        required,
                        max_selection,
                        addon_group_items(
                            product_addons(id,name,price,available)
                        )
                    )
                `)
                .eq('product_id', productId);

            // Handle error or empty response
            if (error || !groupLinks || !Array.isArray(groupLinks)) {
                console.warn('Failed to load addons:', error);
                return [];
            }

            // Process each group link with proper null checks
            const processedGroups: AddonGroup[] = [];

            for (const link of groupLinks) {
                // Skip if addon_groups is null/undefined
                if (!link?.addon_groups) continue;

                // Cast to any because Supabase types for nested joins can be incorrect
                const group = link.addon_groups as any;

                // Skip if required properties are missing
                if (!group.id || !group.name) continue;

                // Safely process addon items
                const addonItems = group.addon_group_items;
                const addons: Addon[] = [];

                if (Array.isArray(addonItems)) {
                    for (const item of addonItems) {
                        const addon = item?.product_addons;
                        // Only add if addon exists, is available, and has required fields
                        if (addon && addon.available && addon.id && addon.name != null) {
                            addons.push({
                                id: addon.id,
                                name: addon.name,
                                price: addon.price ?? 0
                            });
                        }
                    }
                }

                // Only add groups that have at least one addon
                if (addons.length > 0) {
                    processedGroups.push({
                        id: group.id,
                        name: group.name,
                        required: group.required ?? false,
                        max_selection: group.max_selection ?? 1,
                        addons
                    });
                }
            }

            return processedGroups;
        } catch (err) {
            console.error('Error loading product addons:', err);
            return [];
        }
    };

    const handleAddToCart = async (product: Product) => { setLoadingAddons(true); const addonGroups = await loadProductAddons(product.id); setLoadingAddons(false); if (addonGroups.length > 0) { setPendingProduct(product); setProductAddonGroups(addonGroups); setSelectedAddons([]); setShowAddonModal(true); } else { addToCart(product, []); } };
    const toggleAddon = (addon: Addon) => { setSelectedAddons(prev => { const exists = prev.find(a => a.id === addon.id); return exists ? prev.filter(a => a.id !== addon.id) : [...prev, { id: addon.id, name: addon.name, price: addon.price }]; }); };
    const confirmAddToCart = () => { if (pendingProduct) { addToCart(pendingProduct, selectedAddons); setShowAddonModal(false); setPendingProduct(null); setProductAddonGroups([]); setSelectedAddons([]); } };
    const addToCart = (product: Product, addons: SelectedAddon[]) => { setCart(prev => { if (addons.length > 0) return [...prev, { product, quantity: 1, notes: '', addons }]; const existing = prev.find(item => item.product.id === product.id && item.addons.length === 0); if (existing) return prev.map(item => item.product.id === product.id && item.addons.length === 0 ? { ...item, quantity: item.quantity + 1 } : item); return [...prev, { product, quantity: 1, notes: '', addons: [] }]; }); };
    const updateQuantity = (index: number, delta: number) => { setCart(prev => prev.map((item, i) => { if (i === index) { const newQuantity = item.quantity + delta; if (newQuantity <= 0) return null; return { ...item, quantity: newQuantity }; } return item; }).filter(Boolean) as CartItem[]); };
    const getCartTotal = () => cart.reduce((total, item) => { const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0); return total + ((item.product.price + addonTotal) * item.quantity); }, 0);
    const getCartCount = () => cart.reduce((count, item) => count + item.quantity, 0);
    const getCartTotalWithDiscount = () => { const subtotal = getCartTotal(); if (!appliedCoupon) return subtotal; const discount = appliedCoupon.discount_type === 'percentage' ? subtotal * (appliedCoupon.discount_value / 100) : appliedCoupon.discount_value; return Math.max(0, subtotal - discount); };
    const scrollToCategory = (categoryId: string) => { setSelectedCategory(categoryId); if (categoryId === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; } const element = categoryRefs.current[categoryId]; if (element) { const offset = 180; window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' }); } };
    const getProductsByCategory = (categoryId: string) => products.filter(p => p.category_id === categoryId);
    const getDeliveryFee = () => settings?.delivery_fee_value ?? 5;

    // Coupon validation function
    const applyCoupon = async () => {
        if (!couponCode.trim() || !settings) return;
        setCouponLoading(true); setCouponError('');
        try {
            const { data: coupon } = await supabase.from('coupons').select('*').eq('user_id', settings.user_id).ilike('code', couponCode.trim()).eq('active', true).single();
            if (!coupon) { setCouponError('Cupom não encontrado'); setCouponLoading(false); return; }
            const now = new Date();
            if (coupon.valid_until && new Date(coupon.valid_until) < now) { setCouponError('Cupom expirado'); setCouponLoading(false); return; }
            if (coupon.valid_from && new Date(coupon.valid_from) > now) { setCouponError('Cupom ainda não válido'); setCouponLoading(false); return; }
            if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) { setCouponError('Limite de uso atingido'); setCouponLoading(false); return; }
            const subtotal = getCartTotal();
            if (coupon.min_order_value && subtotal < coupon.min_order_value) { setCouponError(`Pedido mínimo: ${formatCurrency(coupon.min_order_value)}`); setCouponLoading(false); return; }
            setAppliedCoupon({ code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value });
            setCouponCode('');
        } catch { setCouponError('Erro ao validar cupom'); } finally { setCouponLoading(false); }
    };

    // Customer lookup function
    const lookupCustomer = async (phone: string) => {
        if (!phone || phone.length < 10 || !settings) return;
        const cleanPhone = phone.replace(/\D/g, '');
        const { data: customer } = await supabase.from('customers').select('*').eq('user_id', settings.user_id).eq('phone', cleanPhone).single();
        if (customer) setCustomerData(customer);
        else setCustomerData(null);
    };

    // Calculate points to earn
    const getPointsToEarn = () => {
        if (!loyaltyEnabled || !loyaltySettings?.is_active) return 0;
        const total = getCartTotalWithDiscount();
        return Math.floor(total * (loyaltySettings.points_per_real || 1));
    };

    const sendWhatsAppOrder = () => {
        if (!settings?.whatsapp_number || cart.length === 0) return;
        const subtotal = getCartTotal();
        const total = getCartTotalWithDiscount();
        const deliveryFee = getDeliveryFee();
        let message = `🍔 *Novo Pedido - ${settings.app_name}*\n\n`;
        if (customerName || customerPhone) {
            message += `👤 *Cliente:* ${customerName || 'Não informado'}\n`;
            message += `📱 *Telefone:* ${customerPhone || 'Não informado'}\n\n`;
        }
        message += `📋 *Itens:*\n${'─'.repeat(20)}\n`;
        cart.forEach(item => {
            const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
            const itemTotal = item.product.price + addonTotal;
            message += `• ${item.quantity}x ${item.product.name}\n`;
            if (item.addons.length > 0) message += `  📦 ${item.addons.map(a => a.name).join(', ')}\n`;
            message += `  ${formatCurrency(itemTotal)} cada\n`;
        });
        message += `${'─'.repeat(20)}\n`;
        if (appliedCoupon) {
            const discount = appliedCoupon.discount_type === 'percentage' ? subtotal * (appliedCoupon.discount_value / 100) : appliedCoupon.discount_value;
            message += `🏷️ *Cupom:* ${appliedCoupon.code} (-${formatCurrency(discount)})\n`;
        }
        message += `🚚 *Entrega:* ${formatCurrency(deliveryFee)}\n`;
        message += `💰 *Total:* ${formatCurrency(total + deliveryFee)}\n`;
        const phone = settings.whatsapp_number.replace(/\D/g, '');
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };
    const categoriesWithProducts = categories.filter(cat => getProductsByCategory(cat.id).length > 0);

    if (loading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /><p className="text-text-muted">Carregando cardápio...</p></div>;
    if (notFound) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center p-4"><span className="text-6xl mb-4">🔍</span><h1 className="text-2xl font-bold">Cardápio não encontrado</h1><p className="text-text-muted">O link que você acessou não existe ou foi removido.</p></div>;

    const CartItemComponent = ({ item, index }: { item: CartItem; index: number }) => { const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0); const itemTotal = (item.product.price + addonTotal) * item.quantity; return (<div className="flex gap-3 pb-3 border-b border-border last:border-0"><div className="w-14 h-14 rounded-lg bg-bg-tertiary flex items-center justify-center overflow-hidden shrink-0">{item.product.image_url ? <img src={item.product.image_url} alt="" className="w-full h-full object-cover" /> : <span>🍽️</span>}</div><div className="flex-1 min-w-0"><div className="flex justify-between gap-2"><span className="font-medium truncate">{item.product.name}</span><span className="text-primary font-medium shrink-0">{formatCurrency(itemTotal)}</span></div>{item.addons.length > 0 && <span className="text-xs text-text-muted">{item.addons.map(a => a.name).join(', ')}</span>}<div className="flex items-center gap-2 mt-2"><button className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center hover:bg-primary hover:text-white transition-all" onClick={() => updateQuantity(index, -1)}><FiMinus size={14} /></button><span className="w-6 text-center font-medium">{item.quantity}</span><button className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center hover:bg-primary hover:text-white transition-all" onClick={() => updateQuantity(index, 1)}><FiPlus size={14} /></button></div></div></div>); };

    return (
        <div className="min-h-screen bg-bg-primary font-sans text-text-primary selection:bg-primary/30">
            {/* Background Gradients/Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-linear-to-b from-primary/10 to-transparent opacity-60" />
                <div className="absolute -top-[200px] right-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-40" />
                <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] opacity-30" />
            </div>

            {/* Hero Section */}
            <header className="relative pt-12 pb-16 px-4 text-center z-10">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="relative w-28 h-28 mx-auto rounded-full bg-bg-card border-4 border-bg-card shadow-xl shadow-black/20 overflow-hidden flex items-center justify-center group transition-transform hover:scale-105 duration-500">
                        {settings?.logo_url ? (
                            <img src={settings.logo_url} alt={settings.app_name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-5xl">🍔</span>
                        )}
                        <div className="absolute inset-0 ring-1 ring-white/10 rounded-full" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
                            {settings?.app_name}
                        </h1>
                        <p className="text-text-secondary text-lg font-medium max-w-lg mx-auto leading-relaxed">
                            A melhor experiência gastronômica, entregue na sua porta.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-sm font-semibold backdrop-blur-sm shadow-lg shadow-success/5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                            </span>
                            Aberto Agora
                        </span>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-card/50 border border-white/5 text-text-primary text-sm font-medium backdrop-blur-sm shadow-lg">
                            🛵 30-45 min
                        </span>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-card/50 border border-white/5 text-text-primary text-sm font-medium backdrop-blur-sm shadow-lg">
                            ⭐ 4.8 (500+)
                        </span>
                    </div>
                </div>
            </header>

            {/* Category Navigation - Sticky */}
            <div className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-xl border-y border-white/5 shadow-2xl shadow-black/20">
                <nav className="max-w-7xl mx-auto px-4 py-3 overflow-x-auto no-scrollbar mask-linear-fade">
                    <div className="flex gap-2 min-w-max px-2">
                        <button
                            onClick={() => scrollToCategory('all')}
                            className={cn(
                                'px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border',
                                selectedCategory === 'all'
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105'
                                    : 'bg-bg-card text-text-muted border-transparent hover:bg-bg-card-hover hover:text-text-primary hover:border-white/5'
                            )}
                        >
                            Todos
                        </button>
                        {categoriesWithProducts.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                className={cn(
                                    'px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border',
                                    selectedCategory === cat.id
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105'
                                        : 'bg-bg-card text-text-muted border-transparent hover:bg-bg-card-hover hover:text-text-primary hover:border-white/5'
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex gap-8 px-4 py-8 max-w-7xl mx-auto relative z-10">
                {/* Product List */}
                <main className="flex-1 min-w-0 space-y-12">
                    {categoriesWithProducts.map((category) => (
                        <section
                            key={category.id}
                            ref={(el) => { categoryRefs.current[category.id] = el; }}
                            className="scroll-mt-32"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-2xl font-bold text-text-primary">{category.name}</h2>
                                <div className="h-px flex-1 bg-linear-to-r from-white/10 to-transparent" />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                                {getProductsByCategory(category.id).map((product) => (
                                    <div
                                        key={product.id}
                                        className="group w-full bg-bg-card rounded-3xl shadow-xl overflow-hidden border border-white/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
                                    >
                                        {/* Image Container */}
                                        <div className="relative h-48 overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-5xl bg-bg-tertiary">
                                                    <span className="opacity-30">🍽️</span>
                                                </div>
                                            )}

                                            {/* Rating Badge (Top Right) */}
                                            <div className="absolute top-4 right-4 flex items-center gap-1 bg-bg-tertiary/80 backdrop-blur-sm px-2 py-1 rounded-md">
                                                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="text-sm font-semibold text-white">4.8</span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5">
                                            {/* Title */}
                                            <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-primary transition-colors">
                                                {product.name}
                                            </h3>

                                            {/* Description */}
                                            {product.description && (
                                                <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                                                    {product.description}
                                                </p>
                                            )}

                                            {/* Meta Details (Time & Info) */}
                                            <div className="flex items-center gap-4 text-sm text-text-muted mb-5">
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    <span>15-20 min</span>
                                                </div>
                                            </div>

                                            {/* Price & Button Action */}
                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-text-muted">Preço</span>
                                                    <span className="text-xl font-bold text-accent">{formatCurrency(product.price)}</span>
                                                </div>
                                                <button
                                                    className="bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-5 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-2"
                                                    onClick={() => handleAddToCart(product)}
                                                >
                                                    <span>Adicionar</span>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </main>

                {/* Desktop Cart Sidebar */}
                <aside className="hidden lg:block w-[380px] shrink-0">
                    <div className="sticky top-28 bg-bg-card/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        <div className="p-6 border-b border-white/5 bg-bg-card/50">
                            <h2 className="flex items-center gap-3 text-lg font-bold">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <FiShoppingBag size={20} />
                                </div>
                                Seu Pedido
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
                                    <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mb-2">
                                        <FiShoppingBag size={32} />
                                    </div>
                                    <p className="font-medium text-lg">Sua sacola está vazia</p>
                                    <p className="text-sm text-text-muted">Adicione itens deliciosos para começar seu pedido</p>
                                </div>
                            ) : (
                                cart.map((item, index) => (
                                    <CartItemComponent key={index} item={item} index={index} />
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-6 bg-bg-card border-t border-white/5 space-y-4 shadow-top">
                                {/* Customer Info Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                                        <FiUser size={14} /> Seus Dados
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Seu nome"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary border border-white/5 rounded-lg text-sm focus:border-primary focus:outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="relative">
                                            <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                            <input
                                                type="tel"
                                                placeholder="Seu telefone"
                                                value={customerPhone}
                                                onChange={(e) => { setCustomerPhone(e.target.value); if (e.target.value.length >= 10) lookupCustomer(e.target.value); }}
                                                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary border border-white/5 rounded-lg text-sm focus:border-primary focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    {/* Loyalty Info */}
                                    {loyaltyEnabled && customerData && (
                                        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-xs">
                                            <FiGift className="text-primary" size={14} />
                                            <span className="text-primary font-medium">{customerData.total_points} pontos</span>
                                            <span className="text-text-muted">• Nível {customerData.tier}</span>
                                        </div>
                                    )}
                                    {loyaltyEnabled && loyaltySettings?.is_active && getPointsToEarn() > 0 && (
                                        <div className="text-xs text-accent flex items-center gap-1">
                                            <FiGift size={12} />
                                            Ganhe {getPointsToEarn()} pontos com este pedido!
                                        </div>
                                    )}
                                </div>

                                {/* Coupon Section */}
                                {couponsEnabled && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                                            <FiTag size={14} /> Cupom de Desconto
                                        </h3>
                                        {appliedCoupon ? (
                                            <div className="flex items-center justify-between p-2 bg-accent/10 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FiCheck className="text-accent" size={16} />
                                                    <span className="font-medium text-accent">{appliedCoupon.code}</span>
                                                </div>
                                                <button onClick={() => setAppliedCoupon(null)} className="text-text-muted hover:text-error text-xs">Remover</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Código do cupom"
                                                    value={couponCode}
                                                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                                    className="flex-1 px-3 py-2 bg-bg-tertiary border border-white/5 rounded-lg text-sm focus:border-primary focus:outline-none transition-colors uppercase"
                                                />
                                                <button
                                                    onClick={applyCoupon}
                                                    disabled={couponLoading || !couponCode.trim()}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {couponLoading ? '...' : 'Aplicar'}
                                                </button>
                                            </div>
                                        )}
                                        {couponError && <p className="text-xs text-error">{couponError}</p>}
                                    </div>
                                )}

                                {/* Totals */}
                                <div className="space-y-2 text-sm pt-2 border-t border-white/5">
                                    <div className="flex justify-between text-text-secondary">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-text-primary">{formatCurrency(getCartTotal())}</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-accent">
                                            <span>Desconto ({appliedCoupon.code})</span>
                                            <span className="font-medium">-{formatCurrency(appliedCoupon.discount_type === 'percentage' ? getCartTotal() * (appliedCoupon.discount_value / 100) : appliedCoupon.discount_value)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-text-secondary">
                                        <span>Taxa de Entrega</span>
                                        <span className="font-medium text-text-primary">{formatCurrency(getDeliveryFee())}</span>
                                    </div>
                                    <div className="h-px bg-white/10 my-2" />
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-lg">Total</span>
                                        <span className="font-bold text-2xl text-primary">{formatCurrency(getCartTotalWithDiscount() + getDeliveryFee())}</span>
                                    </div>
                                </div>

                                {settings?.whatsapp_number && (
                                    <button
                                        className="w-full py-4 bg-[#25d366] hover:bg-[#1ebe57] text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                                        onClick={sendWhatsAppOrder}
                                    >
                                        <FiMessageCircle size={24} className="group-hover:animate-bounce" />
                                        <span>Finalizar Pedido</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Mobile Cart Floating Bar */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
                    <button
                        className="w-full bg-bg-card border-t border-white/10 rounded-2xl shadow-2xl p-4 flex items-center justify-between group overflow-hidden relative"
                        onClick={() => setShowMobileCart(true)}
                    >
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30">
                                {getCartCount()}
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-text-muted uppercase font-bold tracking-wider">Ver sacola</p>
                                <p className="text-lg font-bold text-white transition-colors group-hover:text-primary">
                                    {formatCurrency(getCartTotalWithDiscount() + getDeliveryFee())}
                                </p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <FiShoppingBag />
                        </div>
                    </button>
                </div>
            )}

            {/* Mobile Cart Modal (Sheet) */}
            {showMobileCart && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden flex items-end animate-fadeIn"
                    onClick={() => setShowMobileCart(false)}
                >
                    <div
                        className="w-full h-[90vh] bg-bg-card rounded-t-[32px] overflow-hidden flex flex-col animate-slideInRight shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-primary/10 text-primary"><FiShoppingBag /></span>
                                Seu Pedido
                            </h2>
                            <button
                                className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center hover:bg-white/10 transition-colors"
                                onClick={() => setShowMobileCart(false)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                                    <FiShoppingBag size={48} className="mb-4" />
                                    <p>Carrinho vazio</p>
                                </div>
                            ) : cart.map((item, index) => <CartItemComponent key={index} item={item} index={index} />)}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-bg-tertiary/50 pb-8 space-y-4">
                            {/* Customer Info Section - Mobile */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                                    <FiUser size={14} /> Seus Dados
                                </h3>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Seu nome"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-white/5 rounded-lg text-sm focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                        <input
                                            type="tel"
                                            placeholder="Seu telefone"
                                            value={customerPhone}
                                            onChange={(e) => { setCustomerPhone(e.target.value); if (e.target.value.length >= 10) lookupCustomer(e.target.value); }}
                                            className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-white/5 rounded-lg text-sm focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                </div>
                                {loyaltyEnabled && customerData && (
                                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-xs">
                                        <FiGift className="text-primary" size={14} />
                                        <span className="text-primary font-medium">{customerData.total_points} pontos</span>
                                        <span className="text-text-muted">• Nível {customerData.tier}</span>
                                    </div>
                                )}
                                {loyaltyEnabled && loyaltySettings?.is_active && getPointsToEarn() > 0 && (
                                    <div className="text-xs text-accent flex items-center gap-1">
                                        <FiGift size={12} />
                                        Ganhe {getPointsToEarn()} pontos com este pedido!
                                    </div>
                                )}
                            </div>

                            {/* Coupon Section - Mobile */}
                            {couponsEnabled && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                                        <FiTag size={14} /> Cupom de Desconto
                                    </h3>
                                    {appliedCoupon ? (
                                        <div className="flex items-center justify-between p-2 bg-accent/10 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <FiCheck className="text-accent" size={16} />
                                                <span className="font-medium text-accent">{appliedCoupon.code}</span>
                                            </div>
                                            <button onClick={() => setAppliedCoupon(null)} className="text-text-muted hover:text-error text-xs">Remover</button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Código do cupom"
                                                value={couponCode}
                                                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                                className="flex-1 px-3 py-2 bg-bg-card border border-white/5 rounded-lg text-sm focus:border-primary focus:outline-none uppercase"
                                            />
                                            <button
                                                onClick={applyCoupon}
                                                disabled={couponLoading || !couponCode.trim()}
                                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                            >
                                                {couponLoading ? '...' : 'Aplicar'}
                                            </button>
                                        </div>
                                    )}
                                    {couponError && <p className="text-xs text-error">{couponError}</p>}
                                </div>
                            )}

                            {/* Totals - Mobile */}
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="flex justify-between text-text-secondary">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(getCartTotal())}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-accent">
                                        <span>Desconto</span>
                                        <span>-{formatCurrency(appliedCoupon.discount_type === 'percentage' ? getCartTotal() * (appliedCoupon.discount_value / 100) : appliedCoupon.discount_value)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-text-secondary">
                                    <span>Entrega</span>
                                    <span>{formatCurrency(getDeliveryFee())}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/5">
                                    <span>Total</span>
                                    <span className="text-primary">{formatCurrency(getCartTotalWithDiscount() + getDeliveryFee())}</span>
                                </div>
                            </div>
                            {settings?.whatsapp_number && (
                                <button
                                    className="w-full py-4 bg-[#25d366] text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
                                    onClick={sendWhatsAppOrder}
                                >
                                    <FiMessageCircle size={22} />
                                    Enviar Pedido no WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Addon Modal */}
            {showAddonModal && pendingProduct && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setShowAddonModal(false)}
                >
                    <div
                        className="w-full max-w-lg bg-bg-card rounded-3xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl animate-scaleIn border border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header com Ícone e Título */}
                        <div className="relative h-32 bg-bg-tertiary overflow-hidden shrink-0">
                            {pendingProduct.image_url && <img src={pendingProduct.image_url} className="w-full h-full object-cover opacity-60 blur-sm" />}
                            <div className="absolute inset-0 bg-linear-to-t from-bg-card to-transparent" />
                            <div className="absolute bottom-4 left-6">
                                <h2 className="text-2xl font-bold text-white">{pendingProduct.name}</h2>
                                <p className="text-primary font-bold">{formatCurrency(pendingProduct.price)}</p>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                            {productAddonGroups.map((group) => (
                                <div key={group.id} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-white">{group.name}</h3>
                                        {group.required ? (
                                            <span className="px-2 py-0.5 rounded-md bg-error/10 text-error text-xs font-bold uppercase tracking-wider">Obrigatório</span>
                                        ) : (
                                            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Opcional</span>
                                        )}
                                    </div>

                                    <div className="grid gap-3">
                                        {group.addons.map((addon) => {
                                            const isSelected = !!selectedAddons.find(a => a.id === addon.id);
                                            return (
                                                <label
                                                    key={addon.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 group",
                                                        isSelected
                                                            ? "bg-primary/5 border-primary shadow-sm shadow-primary/10"
                                                            : "bg-bg-tertiary border-transparent hover:border-white/10 hover:bg-bg-tertiary/80"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                            isSelected ? "border-primary bg-primary" : "border-text-muted group-hover:border-text-secondary"
                                                        )}>
                                                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <span className={cn("font-medium transition-colors", isSelected ? "text-white" : "text-text-secondary")}>
                                                            {addon.name}
                                                        </span>
                                                    </div>
                                                    {addon.price > 0 && (
                                                        <span className="font-semibold text-primary">
                                                            +{formatCurrency(addon.price)}
                                                        </span>
                                                    )}
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isSelected}
                                                        onChange={() => toggleAddon(addon)}
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-bg-card flex gap-4">
                            <button
                                className="flex-1 py-3.5 border border-white/10 rounded-xl font-bold text-text-secondary hover:bg-white/5 transition-all"
                                onClick={() => setShowAddonModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="flex-2 py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all"
                                onClick={confirmAddToCart}
                            >
                                Adicionar ao Pedido - {formatCurrency(pendingProduct.price + selectedAddons.reduce((a, b) => a + b.price, 0))}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay for Addons */}
            {loadingAddons && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center">
                    <div className="bg-bg-card p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-white/5 animate-scaleIn">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="font-medium text-white">Carregando opções...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
