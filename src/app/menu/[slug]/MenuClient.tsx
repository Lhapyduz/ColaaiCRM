'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FiShoppingBag, FiMinus, FiPlus, FiX, FiMessageCircle, FiUser, FiPhone, FiTag, FiCheck, FiGift, FiStar, FiClock, FiChevronDown, FiZap } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/hooks/useFormatters';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import StoreRatingModal from '@/components/menu/StoreRatingModal';
import ProductRatingModal from '@/components/menu/ProductRatingModal';
import StoreReviewsModal from '@/components/menu/StoreReviewsModal';


interface Category { id: string; name: string; icon: string; color: string; }
interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category_id: string;
    available: boolean;
    promo_enabled?: boolean;
    promo_value?: number;
    promo_type?: 'value' | 'percentage';
}
interface UserSettings {
    app_name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    whatsapp_number: string | null;
    user_id: string;
    delivery_fee_value: number | null;
    store_open: boolean | null;
    delivery_time_min: number | null;
    delivery_time_max: number | null;
    sidebar_color?: string | null;
    public_slug?: string;
}
interface UpsellRule {
    id: string;
    product_id: string;
    upsell_product_id: string;
    discount_percentage: number;
    upsell_product?: Product;
}
interface Addon { id: string; name: string; price: number; }
interface AddonGroup { id: string; name: string; required: boolean; max_selection: number; addons: Addon[]; }
interface SelectedAddon { id: string; name: string; price: number; }
interface CartItem { product: Product; quantity: number; notes: string; addons: SelectedAddon[]; }
interface Customer { id: string; phone: string; name: string; total_points: number; total_spent: number; total_orders: number; tier: string; }
interface LoyaltySettings { points_per_real: number; is_active: boolean; }
interface AppSettings { loyalty_enabled: boolean; coupons_enabled: boolean; }
interface OpeningHour { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean; }

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
    const hasInitialData = initialSettings !== null;

    const [settings, setSettings] = useState<UserSettings | null>(initialSettings);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [loading, setLoading] = useState(!hasInitialData);
    const [notFound, setNotFound] = useState(false);
    const [showSchedules, setShowSchedules] = useState(false);
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
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

    // New Features States
    const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const promotionalCarouselRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const [isDraggingCarousel, setIsDraggingCarousel] = useState(false); // Mantido apenas para o onClick condicional

    // Lógica de drag-to-scroll para desktop
    useEffect(() => {
        const slider = promotionalCarouselRef.current;
        if (!slider) return;

        let isDown = false;
        let startX: number;
        let scrollLeft: number;
        let animationFrame: number | null = null;

        const onMouseDown = (e: MouseEvent) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
            isDraggingRef.current = false;
        };

        const onMouseLeave = () => {
            isDown = false;
            slider.style.cursor = 'grab';
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };

        const onMouseUp = () => {
            isDown = false;
            slider.style.cursor = 'grab';
            if (animationFrame) cancelAnimationFrame(animationFrame);
            // Se houve arraste, bloquear clique momentaneamente
            if (isDraggingRef.current) {
                setIsDraggingCarousel(true);
                setTimeout(() => {
                    setIsDraggingCarousel(false);
                    isDraggingRef.current = false;
                }, 100);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();

            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2.5;
            const dist = Math.abs(x - startX);

            if (dist > 5) {
                isDraggingRef.current = true;
            }

            // Usar requestAnimationFrame para performance otimizada
            if (animationFrame) cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(() => {
                slider.scrollLeft = scrollLeft - walk;
            });
        };

        slider.addEventListener('mousedown', onMouseDown);
        slider.addEventListener('mouseleave', onMouseLeave);
        slider.addEventListener('mouseup', onMouseUp);
        slider.addEventListener('mousemove', onMouseMove);

        return () => {
            slider.removeEventListener('mousedown', onMouseDown);
            slider.removeEventListener('mouseleave', onMouseLeave);
            slider.removeEventListener('mouseup', onMouseUp);
            slider.removeEventListener('mousemove', onMouseMove);
        };
    }, []);
    const [storeRating, setStoreRating] = useState({ average: 0, count: 0 });
    const [productRatings, setProductRatings] = useState<{ [key: string]: { average: number; count: number } }>({});

    const getProductPrice = (product: Product) => {
        if (!product.promo_enabled || !product.promo_value) return product.price;
        if (product.promo_type === 'percentage') {
            return product.price * (1 - product.promo_value / 100);
        }
        return Math.max(0, product.price - product.promo_value);
    };
    const [showStoreRatingModal, setShowStoreRatingModal] = useState(false);
    const [showProductRatingModal, setShowProductRatingModal] = useState(false);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [storeReviews, setStoreReviews] = useState<any[]>([]);
    const [ratingProduct, setRatingProduct] = useState<Product | null>(null);

    // Upsell States
    const [upsellRules, setUpsellRules] = useState<UpsellRule[]>([]);
    const [showUpsellModal, setShowUpsellModal] = useState(false);
    const [activeUpsell, setActiveUpsell] = useState<UpsellRule | null>(null);
    const [originalProduct, setOriginalProduct] = useState<Product | null>(null);
    const [originalAddons, setOriginalAddons] = useState<SelectedAddon[]>([]);

    const debouncedPhone = useDebounce(customerPhone, 500);

    useEffect(() => {
        if (!hasInitialData) {
            fetchMenuData();
        } else if (settings) {
            // Fetch extra data if we have initial settings but not the rest
            fetchExtraData(settings.user_id);
        }
    }, [slug, hasInitialData]);

    useEffect(() => {
        if (settings) {
            document.documentElement.style.setProperty('--color-primary', settings.primary_color);
            document.documentElement.style.setProperty('--color-secondary', settings.secondary_color);
            // Apply sidebar color
            const sidebarColor = settings.sidebar_color || settings.secondary_color;
            document.documentElement.style.setProperty('--color-sidebar-bg', sidebarColor);
        }
    }, [settings]);

    useEffect(() => {
        if (debouncedPhone && debouncedPhone.length >= 10 && settings) {
            lookupCustomer(debouncedPhone);
        }
    }, [debouncedPhone, settings]);

    // Check store status every minute
    useEffect(() => {
        if (settings && openingHours.length > 0) {
            checkStoreStatus();
            const interval = setInterval(checkStoreStatus, 60000);
            return () => clearInterval(interval);
        }
    }, [settings, openingHours]);

    const checkStoreStatus = () => {
        if (!settings) return;

        // Manual override (Master Switch)
        if (settings.store_open === false) {
            setIsStoreOpen(false);
            return;
        }

        // Check schedule
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes from midnight

        const todaySchedule = openingHours.find(h => h.day_of_week === dayOfWeek);

        if (!todaySchedule || todaySchedule.is_closed) {
            setIsStoreOpen(false);
            return;
        }

        if (todaySchedule.open_time && todaySchedule.close_time) {
            const [openHour, openMinute] = todaySchedule.open_time.split(':').map(Number);
            const [closeHour, closeMinute] = todaySchedule.close_time.split(':').map(Number);

            const openTime = openHour * 60 + openMinute;
            const closeTime = closeHour * 60 + closeMinute;

            if (closeTime < openTime) {
                // Spans midnight (e.g. 18:00 to 02:00)
                // If current time is after open OR before close
                if (currentTime >= openTime || currentTime <= closeTime) {
                    setIsStoreOpen(true);
                } else {
                    setIsStoreOpen(false);
                }
            } else {
                // Normal hours (e.g. 09:00 to 22:00)
                if (currentTime >= openTime && currentTime <= closeTime) {
                    setIsStoreOpen(true);
                } else {
                    setIsStoreOpen(false);
                }
            }
        } else {
            // Fallback if no time set but not closed? Assume open? Better closed.
            setIsStoreOpen(false);
        }
    };

    const fetchExtraData = async (userId: string) => {
        try {
            const [{ data: hours }, { data: sRatings }, { data: pRatings }, { data: upsells }] = await Promise.all([
                supabase.from('opening_hours').select('*').eq('user_id', userId),
                supabase.from('store_ratings').select('*').eq('user_id', userId).eq('hidden', false).order('created_at', { ascending: false }),
                supabase.from('product_ratings').select('rating, product_id').eq('user_id', userId).eq('hidden', false),
                supabase.from('product_upsells')
                    .select('*, upsell_product:products(*)')
                    .eq('user_id', userId)
                    .eq('active', true)
            ]);

            if (hours) setOpeningHours(hours);
            if (upsells) setUpsellRules(upsells as any);

            if (sRatings && sRatings.length > 0) {
                const avg = sRatings.reduce((a, b) => a + b.rating, 0) / sRatings.length;
                setStoreRating({ average: avg, count: sRatings.length });
                setStoreReviews(sRatings);
            }

            if (pRatings && pRatings.length > 0) {
                const ratingsMap: { [key: string]: { sum: number; count: number } } = {};
                pRatings.forEach(r => {
                    if (!ratingsMap[r.product_id]) ratingsMap[r.product_id] = { sum: 0, count: 0 };
                    ratingsMap[r.product_id].sum += r.rating;
                    ratingsMap[r.product_id].count += 1;
                });

                const finalMap: { [key: string]: { average: number; count: number } } = {};
                Object.keys(ratingsMap).forEach(id => {
                    finalMap[id] = {
                        average: ratingsMap[id].sum / ratingsMap[id].count,
                        count: ratingsMap[id].count
                    };
                });
                setProductRatings(finalMap);
            }
        } catch (e) {
            console.error('Error fetching extra data', e);
        }
    };

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

            await fetchExtraData(settingsData.user_id);

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
                        id, name, required, max_selection,
                        addon_group_items(product_addons(id,name,price,available))
                    )
                `)
                .eq('product_id', productId);

            if (error || !groupLinks || !Array.isArray(groupLinks)) return [];

            const processedGroups: AddonGroup[] = [];
            for (const link of groupLinks) {
                if (!link?.addon_groups) continue;
                const group = link.addon_groups as any;
                if (!group.id || !group.name) continue;
                const addonItems = group.addon_group_items;
                const addons: Addon[] = [];
                if (Array.isArray(addonItems)) {
                    for (const item of addonItems) {
                        const addon = item?.product_addons;
                        if (addon && addon.available && addon.id && addon.name != null) {
                            addons.push({ id: addon.id, name: addon.name, price: addon.price ?? 0 });
                        }
                    }
                }
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

    const handleAddToCart = async (product: Product) => {
        setLoadingAddons(true);
        const addonGroups = await loadProductAddons(product.id);
        setLoadingAddons(false);

        if (addonGroups.length > 0) {
            setPendingProduct(product);
            setProductAddonGroups(addonGroups);
            setSelectedAddons([]);
            setShowAddonModal(true);
        } else {
            // Check for Upsells
            const rule = upsellRules.find(r => r.product_id === product.id);
            if (rule && rule.upsell_product) {
                setOriginalProduct(product);
                setOriginalAddons([]);
                setActiveUpsell(rule);
                setShowUpsellModal(true);
            } else {
                addToCart(product, []);
            }
        }
    };
    const toggleAddon = (addon: Addon) => { setSelectedAddons(prev => { const exists = prev.find(a => a.id === addon.id); return exists ? prev.filter(a => a.id !== addon.id) : [...prev, { id: addon.id, name: addon.name, price: addon.price }]; }); };
    const confirmAddToCart = () => {
        if (pendingProduct) {
            const rule = upsellRules.find(r => r.product_id === pendingProduct.id);
            if (rule && rule.upsell_product) {
                setOriginalProduct(pendingProduct);
                setOriginalAddons(selectedAddons);
                setActiveUpsell(rule);
                setShowUpsellModal(true);
            } else {
                addToCart(pendingProduct, selectedAddons);
            }
            setShowAddonModal(false);
            setPendingProduct(null);
            setProductAddonGroups([]);
            setSelectedAddons([]);
        }
    };
    const addToCart = (product: Product, addons: SelectedAddon[]) => {
        setCart(prev => [...prev, { product, quantity: 1, notes: '', addons }]);
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };
    const updateQuantity = (index: number, delta: number) => { setCart(prev => prev.map((item, i) => { if (i === index) { const newQuantity = item.quantity + delta; if (newQuantity <= 0) return null; return { ...item, quantity: newQuantity }; } return item; }).filter(Boolean) as CartItem[]); };
    const getCartTotal = () => cart.reduce((total, item) => { const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0); return total + ((getProductPrice(item.product) + addonTotal) * item.quantity); }, 0);
    const getCartCount = () => cart.reduce((count, item) => count + item.quantity, 0);
    const getCartTotalWithDiscount = () => { const subtotal = getCartTotal(); if (!appliedCoupon) return subtotal; const discount = appliedCoupon.discount_type === 'percentage' ? subtotal * (appliedCoupon.discount_value / 100) : appliedCoupon.discount_value; return Math.max(0, subtotal - discount); };
    const scrollToCategory = (categoryId: string) => { setSelectedCategory(categoryId); if (categoryId === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; } const element = categoryRefs.current[categoryId]; if (element) { const offset = 180; window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' }); } };
    const getProductsByCategory = (categoryId: string) => products.filter(p => p.category_id === categoryId);
    const getDeliveryFee = () => settings?.delivery_fee_value ?? 5;

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

    const lookupCustomer = async (phone: string) => {
        if (!phone || phone.length < 10 || !settings) return;
        const cleanPhone = phone.replace(/\D/g, '');
        const { data: customer } = await supabase.from('customers').select('*').eq('user_id', settings.user_id).eq('phone', cleanPhone).single();
        setCustomerData(customer || null);
    };

    const getPointsToEarn = () => {
        if (!loyaltyEnabled || !loyaltySettings?.is_active) return 0;
        const total = getCartTotalWithDiscount();
        return Math.floor(total * (loyaltySettings.points_per_real || 1));
    };

    const sendWhatsAppOrder = () => {
        if (!settings?.whatsapp_number || cart.length === 0) return;

        if (!isStoreOpen) {
            alert('A loja está fechada no momento. Por favor, verifique o horário de funcionamento.');
            return;
        }

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
            const itemTotal = getProductPrice(item.product) + addonTotal;
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

    const openProductRating = (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();
        setRatingProduct(product);
        setShowProductRatingModal(true);
    };

    if (loading) return <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /><p className="text-gray-400">Carregando cardápio...</p></div>;
    if (notFound) return <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center gap-4 text-center p-4"><span className="text-6xl mb-4">🔍</span><h1 className="text-2xl font-bold text-white">Cardápio não encontrado</h1><p className="text-gray-400">O link que você acessou não existe ou foi removido.</p></div>;

    // Cálculos do Carrinho
    const totalPrice = getCartTotal();
    const totalItems = getCartCount();
    const totalWithDiscount = getCartTotalWithDiscount();
    const deliveryFee = getDeliveryFee();
    const categoriesWithProducts = categories.filter(cat => products.some(p => p.category_id === cat.id));

    const CartItemComponent = ({ item, index }: { item: CartItem; index: number }) => {
        const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
        const itemPrice = getProductPrice(item.product);
        const itemTotal = (itemPrice + addonTotal) * item.quantity;

        return (
            <div className="flex gap-3 pb-3 border-b border-white/5 last:border-0 hover:bg-white/5 p-2 rounded-xl transition-colors">
                <div className="relative w-16 h-16 rounded-xl bg-[#2A2A2A] flex items-center justify-center overflow-hidden shrink-0 border border-white/5">
                    {item.product.image_url ? (
                        <Image src={item.product.image_url} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                        <span className="material-icons text-gray-700">restaurant</span>
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between gap-1">
                        <span className="font-bold text-white text-sm truncate">{item.product.name}</span>
                        <span className="text-[#10B981] font-bold text-sm shrink-0">{formatCurrency(itemTotal)}</span>
                    </div>
                    {item.addons.length > 0 && (
                        <span className="text-[10px] text-gray-500 line-clamp-1 italic">
                            + {item.addons.map(a => a.name).join(', ')}
                        </span>
                    )}
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center bg-[#2A2A2A] rounded-lg p-0.5 border border-white/5">
                            <button
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
                                onClick={() => updateQuantity(index, -1)}
                            >
                                <FiMinus size={12} />
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-white">{item.quantity}</span>
                            <button
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
                                onClick={() => updateQuantity(index, 1)}
                            >
                                <FiPlus size={12} />
                            </button>
                        </div>
                        <button
                            onClick={() => removeFromCart(index)}
                            className="text-[10px] text-red-500 hover:underline font-bold"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-bg-primary font-sans text-text-primary selection:bg-primary/30">
            {/* Background Effects do Stitch */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#121212]">
                <div className="absolute inset-0 bg-linear-to-b from-[#1E1E1E]/50 to-[#121212]" />
                <div className="absolute -top-[200px] right-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-40" />
                <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] opacity-30" />
            </div>

            <header className="relative w-full overflow-hidden z-10">
                <div className="absolute inset-0 bg-linear-to-b from-[#1E1E1E]/50 to-[#121212] pointer-events-none"></div>
                <div className="max-w-4xl mx-auto px-4 py-16 relative z-10 flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-full bg-[#2A2A2A] border-4 border-[#333] flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group transition-transform hover:scale-105 duration-500">
                        <div className="absolute inset-0 rounded-full bg-linear-to-tr from-black/20 to-transparent"></div>
                        {settings?.logo_url ? (
                            <Image src={settings.logo_url} alt={settings.app_name} fill className="object-cover" sizes="128px" priority />
                        ) : (
                            <span className="material-icons text-primary text-6xl">restaurant_menu</span>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
                        {settings?.app_name || 'Sua Logo Aqui'}
                    </h1>
                    <p className="text-gray-400 text-lg mb-8 max-w-xl">
                        A melhor experiência gastronômica, entregue na sua porta.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {isStoreOpen ? (
                            <div
                                onClick={() => setShowSchedules(!showSchedules)}
                                className="bg-[#1A382E] text-[#4ADE80] px-4 py-2 rounded-full text-sm font-medium flex items-center border border-[#10B981]/20 cursor-pointer hover:bg-[#1A382E]/80 transition-colors"
                            >
                                <div className="w-2 h-2 rounded-full bg-[#4ADE80] mr-2 animate-pulse"></div>
                                Aberto Agora
                            </div>
                        ) : (
                            <div
                                onClick={() => setShowSchedules(!showSchedules)}
                                className="bg-[#381A1A] text-[#DE4A4A] px-4 py-2 rounded-full text-sm font-medium flex items-center border border-[#B91010]/20 cursor-pointer hover:bg-[#381A1A]/80 transition-colors"
                            >
                                <div className="w-2 h-2 rounded-full bg-[#DE4A4A] mr-2"></div>
                                Fechado Agora
                            </div>
                        )}

                        <div className="bg-[#262626] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center border border-white/10">
                            <FiClock className="text-sm mr-2 text-gray-400" />
                            {settings?.delivery_time_min ?? 10}-{settings?.delivery_time_max ?? 25} min
                        </div>

                        <div
                            onClick={() => setShowStoreRatingModal(true)}
                            className="bg-[#262626] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center border border-white/10 cursor-pointer hover:bg-[#333] transition-colors"
                        >
                            <FiStar className="text-sm mr-2 text-yellow-400 fill-current" />
                            {storeRating.count > 0 ? `${storeRating.average.toFixed(1)} (${storeRating.count})` : 'Avaliar'}
                        </div>

                        {storeRating.count > 0 && (
                            <div
                                onClick={() => setShowReviewsModal(true)}
                                className="bg-[#262626] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center border border-white/10 cursor-pointer hover:bg-[#333] transition-colors"
                            >
                                <FiMessageCircle className="text-sm mr-2 text-gray-400" />
                                Ver Avaliações
                            </div>
                        )}
                    </div>

                    <AnimatePresence>
                        {showSchedules && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="max-w-md mx-auto mt-6 bg-[#1E1E1E] border border-white/10 rounded-2xl p-4 shadow-2xl relative z-20"
                            >
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 justify-center">
                                    <FiClock size={14} /> Horário de Funcionamento
                                </h3>
                                <div className="space-y-2">
                                    {dayNames.map((day, index) => {
                                        const schedule = openingHours.find(h => h.day_of_week === index);
                                        const isToday = new Date().getDay() === index;
                                        return (
                                            <div key={day} className={cn("flex justify-between text-sm py-1 border-b border-white/5 last:border-0", isToday && "text-primary font-bold")}>
                                                <span className="opacity-80">{day}</span>
                                                <span>
                                                    {schedule && !schedule.is_closed && schedule.open_time ? (
                                                        `${schedule.open_time.slice(0, 5)} - ${schedule.close_time?.slice(0, 5)}`
                                                    ) : (
                                                        <span className="text-red-500 opacity-60">Fechado</span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <div className="sticky top-0 z-40 bg-[#1A1A1A] border-b border-white/5 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 py-4 overflow-x-auto no-scrollbar scroll-smooth">
                        <button
                            onClick={() => scrollToCategory('all')}
                            className={cn(
                                'shrink-0 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300',
                                selectedCategory === 'all'
                                    ? 'bg-primary text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-[#2C2C2C] text-gray-300 hover:bg-[#383838]'
                            )}
                        >
                            Todos
                        </button>
                        {categoriesWithProducts.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                className={cn(
                                    'shrink-0 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300',
                                    selectedCategory === cat.id
                                        ? 'bg-primary text-white shadow-lg shadow-orange-500/20'
                                        : 'bg-[#2C2C2C] text-gray-300 hover:bg-[#383838]'
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={cn(
                "flex gap-8 px-4 py-8 max-w-7xl mx-auto relative z-10",
                cart.length > 0 && "pb-32 lg:pb-8"
            )}>
                <main className="flex-1 min-w-0 space-y-8 sm:space-y-12">
                    {/* Seção Em Alta - Carrossel de Promoções */}
                    {products.filter(p => p.promo_enabled).length > 0 && (
                        <section className="scroll-mt-32">
                            <div className="flex items-center gap-4 mb-4 sm:mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl sm:text-2xl">🔥</span>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white">Em Alta</h2>
                                </div>
                                <div className="h-px flex-1 bg-linear-to-r from-primary/30 to-transparent" />
                            </div>
                            <div
                                ref={promotionalCarouselRef}
                                className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:snap-none snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing select-none"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {products.filter(p => p.promo_enabled).map((product) => {
                                    const price = getProductPrice(product);
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => !isDraggingCarousel && handleAddToCart(product)}
                                            className="min-w-sidebar sm:min-w-[320px] max-w-[320px] lg:snap-align-none snap-start bg-linear-to-br from-[#1E1E1E] to-[#151515] rounded-2xl overflow-hidden border border-primary/20 shadow-lg shadow-primary/5 cursor-grab active:cursor-grabbing select-none group hover:border-primary/40 transition-all duration-300"
                                        >
                                            <div className="relative h-36 sm:h-44 overflow-hidden">
                                                {product.image_url ? (
                                                    <Image
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                        sizes="320px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center">
                                                        <span className="material-icons text-primary text-4xl">restaurant</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                                                <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                                    Promoção
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-bold text-white text-base sm:text-lg truncate">{product.name}</h3>
                                                <p className="text-xs sm:text-sm text-gray-400 line-clamp-1 mt-1">{product.description}</p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-primary font-black text-lg">{formatCurrency(price)}</span>
                                                        <span className="text-gray-500 text-xs line-through">{formatCurrency(product.price)}</span>
                                                    </div>
                                                    <button className="bg-primary/20 text-primary p-2 rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                                                        <FiPlus size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Espaçador para garantir que o último item apareça totalmente */}
                                <div className="min-w-[32px] h-full pointer-events-none" />
                            </div>
                        </section>
                    )}

                    {categoriesWithProducts.map((category) => (
                        <section
                            key={category.id}
                            ref={(el) => { categoryRefs.current[category.id] = el; }}
                            className="scroll-mt-32"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-2xl font-bold text-text-primary capitalize">{category.name}</h2>
                                <div className="h-px flex-1 bg-linear-to-r from-white/10 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                {getProductsByCategory(category.id).map((product) => {
                                    const price = getProductPrice(product);

                                    // Design Horizontal para todos os itens (padronizado)
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => handleAddToCart(product)}
                                            className="bg-[#1E1E1E] p-4 rounded-xl shadow-sm border border-gray-800 flex justify-between gap-4 hover:bg-bg-tertiary transition cursor-pointer"
                                        >
                                            <div className="flex flex-col justify-between flex-1">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white mb-1">{product.name}</h3>
                                                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{product.description}</p>
                                                </div>
                                                <div className="mt-4 flex items-center gap-3">
                                                    <span className="text-[#10B981] font-bold">{formatCurrency(price)}</span>
                                                    {product.promo_enabled && (
                                                        <span className="text-xs text-gray-500 line-through">{formatCurrency(product.price)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-32 h-24 shrink-0 bg-gray-800 rounded-lg overflow-hidden relative">
                                                {product.image_url ? (
                                                    <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="128px" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                        <span className="material-icons">restaurant</span>
                                                    </div>
                                                )}
                                                <button className="absolute bottom-1 right-1 bg-black p-1 rounded-full shadow text-primary border border-white/10">
                                                    <FiPlus className="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </main>

                <aside className="hidden lg:block w-[400px] shrink-0">
                    <div className="sticky top-28 bg-[#1A1A1A] border border-white/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <h2 className="flex items-center gap-3 text-lg font-bold text-white">
                                <FiShoppingBag className="text-primary" /> Seu Pedido
                            </h2>
                            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                                {totalItems} itens
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30">
                                    <FiShoppingBag size={48} />
                                    <p className="font-medium text-lg text-white">Sua sacola está vazia</p>
                                </div>
                            ) : (
                                cart.map((item, index) => (
                                    <CartItemComponent key={index} item={item} index={index} />
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-6 bg-[#1A1A1A] border-t border-white/5 space-y-5 shadow-top">
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <FiUser size={14} /> Seus Dados
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Seu nome"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none transition-all placeholder:text-gray-700"
                                            />
                                        </div>
                                        <div className="relative">
                                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                            <input
                                                type="tel"
                                                placeholder="Seu telefone"
                                                value={customerPhone}
                                                onChange={(e) => { setCustomerPhone(e.target.value); if (e.target.value.length >= 10) lookupCustomer(e.target.value); }}
                                                className="w-full pl-11 pr-4 py-3 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none transition-all placeholder:text-gray-700"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {couponsEnabled && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <FiTag size={14} /> Cupom
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="CÓDIGO"
                                                value={couponCode}
                                                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                                className="flex-1 px-4 py-3 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none transition-all uppercase placeholder:text-gray-700"
                                            />
                                            <button
                                                onClick={applyCoupon}
                                                disabled={couponLoading || !couponCode.trim()}
                                                className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-orange-500/10"
                                            >
                                                {couponLoading ? '...' : 'OK'}
                                            </button>
                                        </div>
                                        {appliedCoupon && (
                                            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                                <span className="text-green-500 font-bold text-xs flex items-center gap-2">
                                                    <FiCheck /> {appliedCoupon.code}
                                                </span>
                                                <button onClick={() => setAppliedCoupon(null)} className="text-green-500">
                                                    <FiX size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {couponError && <p className="text-[10px] text-red-500 font-medium">{couponError}</p>}
                                    </div>
                                )}

                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>Subtotal</span>
                                        <span className="font-bold text-white">{formatCurrency(totalPrice)}</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-sm text-[#10B981] font-bold">
                                            <span>Desconto</span>
                                            <span>-{formatCurrency(totalPrice - totalWithDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>Taxa de Entrega</span>
                                        <span className="font-bold text-white">{formatCurrency(deliveryFee)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline pt-2">
                                        <span className="font-bold text-white text-lg">Total</span>
                                        <span className="font-black text-2xl text-primary">{formatCurrency(totalWithDiscount + deliveryFee)}</span>
                                    </div>
                                </div>

                                <button
                                    className="w-full py-4 bg-primary hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                                    onClick={sendWhatsAppOrder}
                                    disabled={!isStoreOpen}
                                >
                                    <FiMessageCircle size={24} className="group-hover:animate-bounce" />
                                    <span>Finalizar Pedido</span>
                                </button>
                                {!isStoreOpen && <p className="text-[10px] text-center text-red-500 font-bold uppercase tracking-widest">Loja Fechada</p>}
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Mobile Cart Bar - Stitch style */}
            <AnimatePresence>
                {
                    cart.length > 0 && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="lg:hidden fixed bottom-6 left-4 right-4 z-40"
                        >
                            <button
                                onClick={() => setShowMobileCart(true)}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center justify-between group overflow-hidden relative"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30 relative">
                                        {totalItems}
                                        <FiShoppingBag className="absolute -bottom-1 -right-1 text-[10px] bg-white text-primary rounded-full p-0.5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none mb-1">Total do Pedido</p>
                                        <p className="text-xl font-black text-white">
                                            {formatCurrency(totalWithDiscount + deliveryFee)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm">
                                    Ver Sacola <FiChevronDown />
                                </div>
                            </button>
                        </motion.div>
                    )
                }
            </AnimatePresence>

            {/* Mobile Cart Modal */}
            <AnimatePresence>
                {
                    showMobileCart && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden flex items-end"
                            onClick={() => setShowMobileCart(false)}
                        >
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="w-full h-[85vh] bg-[#121212] rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl border-t border-white/5"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#1A1A1A]">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                        <FiShoppingBag className="text-primary" /> Seu Pedido
                                    </h2>
                                    <button
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                                        onClick={() => setShowMobileCart(false)}
                                    >
                                        <FiX />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {cart.map((item, index) => <CartItemComponent key={index} item={item} index={index} />)}
                                </div>

                                <div className="p-6 border-t border-white/5 bg-[#1A1A1A] space-y-4">
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Seu nome"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                            <input
                                                type="tel"
                                                placeholder="Seu telefone"
                                                value={customerPhone}
                                                onChange={(e) => { setCustomerPhone(e.target.value); if (e.target.value.length >= 10) lookupCustomer(e.target.value); }}
                                                className="w-full pl-11 pr-4 py-3 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Campo de Cupom Mobile */}
                                    {couponsEnabled && (
                                        <div className="relative">
                                            <FiTag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Cupom de desconto"
                                                value={couponCode}
                                                onChange={(e) => {
                                                    setCouponCode(e.target.value.toUpperCase());
                                                    setCouponError('');
                                                }}
                                                className="w-full pl-11 pr-20 py-3 bg-[#121212] border border-white/5 rounded-xl text-sm text-white focus:border-primary focus:outline-none"
                                            />
                                            <button
                                                onClick={applyCoupon}
                                                disabled={couponLoading || !couponCode.trim()}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                            >
                                                {couponLoading ? '...' : 'Aplicar'}
                                            </button>
                                            {appliedCoupon && (
                                                <div className="mt-2 flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                                                    <span className="text-green-400 text-xs font-bold flex items-center gap-1">
                                                        <FiCheck size={12} /> {appliedCoupon.code}
                                                    </span>
                                                    <button onClick={() => setAppliedCoupon(null)} className="text-red-400 text-xs">Remover</button>
                                                </div>
                                            )}
                                            {couponError && (
                                                <p className="mt-1 text-red-500 text-xs px-2">{couponError}</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-2 py-3 border-y border-white/5">
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Subtotal</span>
                                            <span className="text-white font-bold">{formatCurrency(totalPrice)}</span>
                                        </div>
                                        <div className="flex justify-between text-xl font-black text-white pt-2">
                                            <span>Total</span>
                                            <span className="text-primary">{formatCurrency(totalWithDiscount + deliveryFee)}</span>
                                        </div>
                                    </div>

                                    <button
                                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                                        onClick={sendWhatsAppOrder}
                                        disabled={!isStoreOpen}
                                    >
                                        <FiMessageCircle size={24} />
                                        Finalizar pelo WhatsApp
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>

            {/* Modals - Refilando para o Tema Dark Premium */}
            {
                showAddonModal && pendingProduct && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-60 flex items-center justify-center p-4" onClick={() => setShowAddonModal(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-xl bg-[#121212] rounded-[32px] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl border border-white/5"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="relative h-48 bg-[#1A1A1A] shrink-0">
                                {pendingProduct.image_url && (
                                    <Image src={pendingProduct.image_url!} alt="" fill className="object-cover opacity-60" sizes="600px" />
                                )}
                                <div className="absolute inset-0 bg-linear-to-t from-[#121212] to-transparent" />
                                <button onClick={() => setShowAddonModal(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                                    <FiX />
                                </button>
                                <div className="absolute bottom-6 left-8">
                                    <h2 className="text-3xl font-black text-white mb-1">{pendingProduct.name}</h2>
                                    <p className="text-primary font-black text-xl">{formatCurrency(pendingProduct.price)}</p>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
                                {productAddonGroups.map((group) => (
                                    <div key={group.id} className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                            <h3 className="font-black text-lg text-white uppercase tracking-widest">{group.name}</h3>
                                            {group.required && <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">OBRIGATÓRIO</span>}
                                        </div>
                                        <div className="space-y-3">
                                            {group.addons.map((addon) => {
                                                const isSelected = !!selectedAddons.find(a => a.id === addon.id);
                                                return (
                                                    <label key={addon.id} className={cn(
                                                        "flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all active:scale-[0.98]",
                                                        isSelected ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" : "bg-white/5 border-transparent hover:bg-white/10"
                                                    )}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary" : "border-gray-700")}>
                                                                {isSelected && <FiCheck className="text-white text-sm" />}
                                                            </div>
                                                            <span className={cn("font-bold text-lg", isSelected ? "text-white" : "text-gray-400")}>{addon.name}</span>
                                                        </div>
                                                        <span className="text-primary font-black">+{formatCurrency(addon.price)}</span>
                                                        <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleAddon(addon)} />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 bg-[#1A1A1A] border-t border-white/5 flex gap-4">
                                <button className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={confirmAddToCart}>
                                    Adicionar • {formatCurrency((pendingProduct?.price || 0) + selectedAddons.reduce((a, b) => a + b.price, 0))}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Upsell Modal - Stitch Style */}
            {
                showUpsellModal && activeUpsell && activeUpsell.upsell_product && (
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-70 flex items-center justify-center p-4" onClick={() => setShowUpsellModal(false)}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md bg-[#121212] rounded-[40px] overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                            <div className="relative h-64">
                                {activeUpsell.upsell_product.image_url ? (
                                    <Image src={activeUpsell.upsell_product.image_url} alt="" fill className="object-cover" sizes="400px" />
                                ) : (
                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-6xl">🥤</div>
                                )}
                                <div className="absolute inset-0 bg-linear-to-t from-[#121212] via-transparent to-transparent" />
                                <div className="absolute top-6 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-[0.2em] shadow-2xl">Oportunidade</span>
                                </div>
                            </div>
                            <div className="p-10 text-center space-y-8">
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black text-white leading-tight">Melhore seu combo!</h2>
                                    <p className="text-gray-400 font-medium">Adicione <span className="text-white font-black">{activeUpsell.upsell_product.name}</span> por apenas:</p>
                                    <div className="text-5xl font-black text-[#10B981] drop-shadow-2xl">
                                        {formatCurrency((activeUpsell.upsell_product?.price || 0) * (1 - (activeUpsell.discount_percentage / 100)))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button className="w-full py-5 bg-primary text-white rounded-xl font-black text-xl shadow-2xl shadow-primary/40 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-3" onClick={() => { if (originalProduct && activeUpsell.upsell_product) { addToCart(originalProduct, originalAddons); addToCart({ ...activeUpsell.upsell_product, price: activeUpsell.upsell_product.price * (1 - (activeUpsell.discount_percentage / 100)) }, []); } setShowUpsellModal(false); setActiveUpsell(null); }}>
                                        <FiZap /> Adicionar Agora
                                    </button>
                                    <button className="w-full py-4 text-gray-500 font-black hover:text-white transition-colors" onClick={() => { if (originalProduct) { addToCart(originalProduct, originalAddons); } setShowUpsellModal(false); setActiveUpsell(null); }}>Não, apenas o {originalProduct?.name}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Other Modals */}
            {
                settings && (
                    <StoreRatingModal isOpen={showStoreRatingModal} onClose={() => setShowStoreRatingModal(false)} storeOwnerId={settings.user_id} appName={settings.app_name} />
                )
            }
            {
                settings && (
                    <StoreReviewsModal isOpen={showReviewsModal} onClose={() => setShowReviewsModal(false)} reviews={storeReviews} appName={settings.app_name} averageRating={storeRating.average} totalRatings={storeRating.count} />
                )
            }
            {
                settings && ratingProduct && (
                    <ProductRatingModal isOpen={showProductRatingModal} onClose={() => { setShowProductRatingModal(false); setRatingProduct(null); }} storeOwnerId={settings.user_id} productId={ratingProduct.id} productName={ratingProduct.name} productImage={ratingProduct.image_url} />
                )
            }
        </div >
    );
}
