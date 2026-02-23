'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FiShoppingBag, FiMinus, FiPlus, FiX, FiMessageCircle, FiStar, FiClock, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/hooks/useFormatters';

import { useQuery } from '@tanstack/react-query';
import MenuSkeleton from '@/components/menu/MenuSkeleton';
import { cn } from '@/lib/utils';
import StoreRatingModal from '@/components/menu/StoreRatingModal';
import ProductRatingModal from '@/components/menu/ProductRatingModal';
import StoreReviewsModal from '@/components/menu/StoreReviewsModal';
import ProductReviewsModal from '@/components/menu/ProductReviewsModal';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';


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
interface Addon { id: string; name: string; price: number; }
interface AddonGroup { id: string; name: string; required: boolean; max_selection: number; addons: Addon[]; }
interface SelectedAddon { id: string; name: string; price: number; }
interface CartItem { product: Product; quantity: number; notes: string; addons: SelectedAddon[]; }

interface OpeningHour { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean; }

interface MenuClientProps {
    slug: string;
    initialSettings?: UserSettings | null;
    initialCategories?: Category[];
    initialProducts?: Product[];
}

export default function MenuClient({
    slug,
    initialSettings = null,
    initialCategories = [],
    initialProducts = [],
}: MenuClientProps) {
    // 1. Query principal para dados do cardápio (Settings, Categories, Products)
    const { data: menuData, isLoading: menuLoading, isError: menuError } = useQuery({
        queryKey: ['menu-data', slug],
        queryFn: async () => {
            const { data: settingsData, error: settingsError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('public_slug', slug)
                .single();

            if (settingsError || !settingsData) throw new Error('Store not found');

            const [{ data: categoriesData }, { data: productsData }] = await Promise.all([
                supabase.from('categories').select('*').eq('user_id', settingsData.user_id).order('name'),
                supabase.from('products').select('*').eq('user_id', settingsData.user_id).eq('available', true).order('name'),
            ]);

            return {
                settings: settingsData as UserSettings,
                categories: (categoriesData || []) as Category[],
                products: (productsData || []) as Product[]
            };
        },
        initialData: initialSettings ? {
            settings: initialSettings,
            categories: initialCategories,
            products: initialProducts
        } : undefined,
        staleTime: 5 * 60 * 1000,
    });

    const settings = menuData?.settings || null;
    const categories = React.useMemo(() => menuData?.categories || [], [menuData?.categories]);
    const products = React.useMemo(() => menuData?.products || [], [menuData?.products]);

    // 2. Query para dados extras (Opening Hours, Ratings)
    const { data: extraData } = useQuery({
        queryKey: ['extra-data', settings?.user_id],
        queryFn: async () => {
            if (!settings?.user_id) return null;

            const [{ data: hours }, { data: sRatings }, { data: pRatings }] = await Promise.all([
                supabase.from('opening_hours').select('*').eq('user_id', settings.user_id),
                supabase.from('store_ratings').select('*').eq('user_id', settings.user_id).eq('hidden', false).order('created_at', { ascending: false }),
                supabase.from('product_ratings').select('*').eq('user_id', settings.user_id).eq('hidden', false).order('created_at', { ascending: false }),
            ]);

            const storeReviews = sRatings || [];
            const avgStoreRating = storeReviews.length > 0
                ? storeReviews.reduce((a, b) => a + b.rating, 0) / storeReviews.length
                : 0;

            const productRatingsMap: { [key: string]: { average: number; count: number } } = {};
            if (pRatings && pRatings.length > 0) {
                const tempMap: { [key: string]: { sum: number; count: number } } = {};
                pRatings.forEach(r => {
                    if (!tempMap[r.product_id]) tempMap[r.product_id] = { sum: 0, count: 0 };
                    tempMap[r.product_id].sum += r.rating;
                    tempMap[r.product_id].count += 1;
                });
                Object.keys(tempMap).forEach(id => {
                    productRatingsMap[id] = {
                        average: tempMap[id].sum / tempMap[id].count,
                        count: tempMap[id].count
                    };
                });
            }

            return {
                openingHours: (hours || []) as OpeningHour[],
                storeRating: { average: avgStoreRating, count: storeReviews.length },
                storeReviews: storeReviews,
                productRatings: productRatingsMap,
                allProductReviews: pRatings || []
            };
        },
        enabled: !!settings?.user_id,
        staleTime: 5 * 60 * 1000,
    });

    const openingHours = React.useMemo(() => extraData?.openingHours || [], [extraData?.openingHours]);
    const storeRating = React.useMemo(() => extraData?.storeRating || { average: 0, count: 0 }, [extraData?.storeRating]);
    const productRatings = React.useMemo(() => extraData?.productRatings || {}, [extraData?.productRatings]);
    const storeReviews = React.useMemo(() => extraData?.storeReviews || [], [extraData?.storeReviews]);
    const allProductReviews = React.useMemo(() => extraData?.allProductReviews || [], [extraData?.allProductReviews]);

    const router = useRouter();
    const [showSchedules, setShowSchedules] = useState(false);
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [showProductDetail, setShowProductDetail] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productAddonGroups, setProductAddonGroups] = useState<AddonGroup[]>([]);
    const [, setLoadingAddons] = useState(false);
    const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    // UI State for Modals
    const [showStoreRatingModal, setShowStoreRatingModal] = useState(false);
    const [showProductRatingModal, setShowProductRatingModal] = useState(false);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [showProductReviewsModal, setShowProductReviewsModal] = useState(false);
    const [ratingProduct, setRatingProduct] = useState<Product | null>(null);

    // Modal Item State
    const [modalQuantity, setModalQuantity] = useState(1);
    const [selectedModalAddons, setSelectedModalAddons] = useState<SelectedAddon[]>([]);
    const [observations, setObservations] = useState('');

    const [currentTimeRef, setCurrentTimeRef] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTimeRef(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Scroll lock: trava o body quando o detalhe do produto está aberto
    useEffect(() => {
        if (showProductDetail) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showProductDetail]);

    const getProductPrice = (product: Product) => {
        if (!product) return 0;
        if (!product.promo_enabled || !product.promo_value) return product.price;
        if (product.promo_type === 'percentage') {
            return product.price * (1 - product.promo_value / 100);
        }
        return Math.max(0, product.price - product.promo_value);
    };

    const isStoreOpen = React.useMemo(() => {
        if (!settings) return false;
        if (settings.store_open === false) return false;

        const dayOfWeek = currentTimeRef.getDay();
        const currentTimeMinutes = currentTimeRef.getHours() * 60 + currentTimeRef.getMinutes();
        const todaySchedule = openingHours.find(h => h.day_of_week === dayOfWeek);

        if (!todaySchedule || todaySchedule.is_closed || !todaySchedule.open_time || !todaySchedule.close_time) return false;

        const [openHour, openMinute] = todaySchedule.open_time.split(':').map(Number);
        const [closeHour, closeMinute] = todaySchedule.close_time.split(':').map(Number);
        const openTime = openHour * 60 + openMinute;
        const closeTime = closeHour * 60 + closeMinute;

        if (closeTime < openTime) {
            return currentTimeMinutes >= openTime || currentTimeMinutes <= closeTime;
        }
        return currentTimeMinutes >= openTime && currentTimeMinutes <= closeTime;
    }, [settings, openingHours, currentTimeRef]);

    // 3. Carousel State
    const promotionalCarouselRef = useRef<HTMLDivElement>(null);
    const [isDraggingCarousel] = useState(false);

    useEffect(() => {
        if (settings) {
            document.documentElement.style.setProperty('--color-primary', settings.primary_color);
            document.documentElement.style.setProperty('--color-secondary', settings.secondary_color);
            const sidebarColor = settings.sidebar_color || settings.secondary_color;
            document.documentElement.style.setProperty('--color-sidebar-bg', sidebarColor);
        }
    }, [settings]);

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
                const group = link.addon_groups as unknown as { id: string; name: string; required: boolean; max_selection: number; addon_group_items: Array<{ product_addons: { id: string; name: string; price: number; available: boolean } }> };
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

    const handleProductClick = async (product: Product) => {
        setSelectedProduct(product);
        setModalQuantity(1);
        setSelectedModalAddons([]);
        setObservations('');
        setShowProductDetail(true);

        setLoadingAddons(true);
        const addonGroups = await loadProductAddons(product.id);
        setProductAddonGroups(addonGroups);
        setLoadingAddons(false);
    };

    const handleAddToCart = (product: Product, quantity: number, addons: SelectedAddon[], notes: string) => {
        setCart(prev => {
            const existingItemIndex = prev.findIndex(item => {
                if (item.product.id !== product.id) return false;
                if (item.addons.length !== addons.length) return false;
                if (item.notes !== notes) return false;

                const existingAddonIds = item.addons.map(a => a.id).sort();
                const newAddonIds = addons.map(a => a.id).sort();

                return existingAddonIds.every((id, index) => id === newAddonIds[index]);
            });

            if (existingItemIndex > -1) {
                const newCart = [...prev];
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: newCart[existingItemIndex].quantity + quantity
                };
                return newCart;
            }

            return [...prev, { product, quantity, notes, addons }];
        });
    };
    const toggleModalAddon = (addon: Addon) => {
        setSelectedModalAddons(prev => {
            const exists = prev.find(a => a.id === addon.id);
            return exists
                ? prev.filter(a => a.id !== addon.id)
                : [...prev, { id: addon.id, name: addon.name, price: addon.price }];
        });
    };

    const confirmModalAddToCart = () => {
        if (selectedProduct) {
            // TODO: Upsell modal will be rendered here in the future
            // For now, always add directly to cart
            handleAddToCart(selectedProduct, modalQuantity, selectedModalAddons, observations);
            setShowProductDetail(false);
            setSelectedProduct(null);
            setProductAddonGroups([]);
            setSelectedModalAddons([]);
            setModalQuantity(1);
            setObservations('');
        }
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQuantity = item.quantity + delta;
                if (newQuantity <= 0) return null;
                return { ...item, quantity: newQuantity };
            }
            return item;
        }).filter(Boolean) as CartItem[]);
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => {
            const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
            return total + ((getProductPrice(item.product) + addonTotal) * item.quantity);
        }, 0);
    };

    const getCartCount = () => cart.reduce((count, item) => count + item.quantity, 0);

    const scrollToCategory = (categoryId: string) => {
        setSelectedCategory(categoryId);
        if (categoryId === 'all') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const element = categoryRefs.current[categoryId];
        if (element) {
            const offset = 180;
            window.scrollTo({
                top: element.getBoundingClientRect().top + window.scrollY - offset,
                behavior: 'smooth'
            });
        }
    };

    const getProductsByCategory = (categoryId: string) => products.filter(p => p.category_id === categoryId);


    if (menuLoading) return <MenuSkeleton />;
    if (menuError || !settings) return <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center gap-4 text-center p-4"><span className="text-6xl mb-4">🔍</span><h1 className="text-2xl font-bold text-white">Cardápio não encontrado</h1><p className="text-gray-400">O link que você acessou não existe ou foi removido.</p></div>;

    // Cálculos do Carrinho
    const totalPrice = getCartTotal();
    const totalItems = getCartCount();
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

                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">
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
                                {products.filter(p => p.promo_enabled).map((product, index) => {
                                    const price = getProductPrice(product);
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => !isDraggingCarousel && handleProductClick(product)}
                                            className="min-w-[85vw] sm:min-w-[320px] max-w-[320px] lg:snap-align-none snap-start bg-linear-to-br from-[#1E1E1E] to-[#151515] rounded-2xl overflow-hidden border border-primary/20 shadow-lg shadow-primary/5 cursor-grab active:cursor-grabbing select-none group hover:border-primary/40 transition-all duration-300"
                                        >
                                            <div className="relative h-36 sm:h-44 overflow-hidden">
                                                {product.image_url ? (
                                                    <Image
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        fill
                                                        priority={index < 2}
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                        sizes="(max-width: 640px) 100vw, 320px"
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
                                    const rating = productRatings[product.id];

                                    // Design Horizontal para todos os itens (padronizado)
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            className="bg-[#1E1E1E] p-4 rounded-xl shadow-sm border border-gray-800 flex justify-between gap-4 hover:bg-bg-tertiary hover:border-primary/30 transition-all cursor-pointer group"
                                        >
                                            <div className="flex flex-col justify-between flex-1">
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                                                        {product.promo_enabled && (
                                                            <span className="shrink-0 bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20">PROMO</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{product.description}</p>
                                                    {rating && (
                                                        <div className="flex items-center gap-1 mt-2">
                                                            <FiStar className="text-yellow-400 fill-current" size={12} />
                                                            <span className="text-xs text-gray-400">{rating.average.toFixed(1)} ({rating.count})</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <span className="text-[#10B981] font-bold text-lg">{formatCurrency(price)}</span>
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
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Ver detalhes</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                                                    className="absolute bottom-1 right-1 bg-black/80 p-1.5 rounded-full shadow text-primary border border-white/10 hover:bg-primary hover:text-white transition-all z-10"
                                                >
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
                            <div className="p-6 bg-[#1A1A1A] border-t border-white/5 space-y-4 shadow-top">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>Subtotal</span>
                                        <span className="font-bold text-white">{formatCurrency(totalPrice)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                                        <span className="font-bold text-white text-lg">Total estimado</span>
                                        <span className="font-black text-2xl text-primary">{formatCurrency(totalPrice)}</span>
                                    </div>
                                </div>

                                <button
                                    className="w-full py-4 bg-primary hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                                    onClick={() => {
                                        sessionStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
                                        router.push(`/menu/${slug}/checkout`);
                                    }}
                                >
                                    <FiShoppingBag size={20} />
                                    <span>Ir para o Checkout</span>
                                </button>
                                {!isStoreOpen && <p className="text-[10px] text-center text-red-500 font-bold uppercase tracking-widest">Loja Fechada</p>}
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Mobile Cart Bar - Stitch style — Oculta quando detalhe do produto está aberto */}
            <AnimatePresence>
                {
                    cart.length > 0 && !showProductDetail && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="lg:hidden fixed bottom-6 left-4 right-4 z-dropdown"
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
                                            {formatCurrency(totalPrice)}
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
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {
                        showMobileCart && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-modal lg:hidden flex items-end"
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
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm text-gray-500">
                                                <span>Subtotal</span>
                                                <span className="text-white font-bold">{formatCurrency(totalPrice)}</span>
                                            </div>
                                            <div className="flex justify-between text-xl font-black text-white pt-2 border-t border-white/5">
                                                <span>Total estimado</span>
                                                <span className="text-primary">{formatCurrency(totalPrice)}</span>
                                            </div>
                                        </div>

                                        <button
                                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                                            onClick={() => {
                                                setShowMobileCart(false);
                                                sessionStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
                                                router.push(`/menu/${slug}/checkout`);
                                            }}
                                        >
                                            <FiShoppingBag size={20} />
                                            Ir para o Checkout
                                        </button>
                                        {!isStoreOpen && <p className="text-[10px] text-center text-red-500 font-bold uppercase tracking-widest">Loja Fechada</p>}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence>,
                document.body
            )}

            {/* Product Detail — Mobile: Fullscreen (estilo iFood) / Desktop: Modal lado a lado */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showProductDetail && selectedProduct && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-modal md:flex md:items-center md:justify-center md:p-6 md:bg-black/80 md:backdrop-blur-xl"
                            onClick={() => { setShowProductDetail(false); setSelectedProduct(null); }}
                        >
                            {/* Mobile: bg preto fullscreen / Desktop: overlay já está no parent */}
                            <div className="absolute inset-0 bg-[#121212] md:hidden" />

                            <motion.div
                                initial={{ y: '100%', opacity: 1 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                className="relative w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] bg-[#121212] md:rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl md:border md:border-white/5"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* ===== IMAGEM DO PRODUTO ===== */}
                                <div className="relative w-full md:w-1/2 h-56 sm:h-64 md:h-auto shrink-0 bg-[#1A1A1A]">
                                    {selectedProduct.image_url ? (
                                        <Image
                                            src={selectedProduct.image_url}
                                            alt={selectedProduct.name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 600px"
                                            priority
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-icons text-primary/20 text-6xl md:text-8xl">restaurant</span>
                                        </div>
                                    )}
                                    {/* Gradiente sobre a imagem */}
                                    <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-[#121212]/70 via-transparent to-transparent" />

                                    {/* Botão fechar — Mobile (sobre a imagem) */}
                                    <button
                                        onClick={() => { setShowProductDetail(false); setSelectedProduct(null); }}
                                        className="absolute top-4 left-4 md:hidden w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 active:scale-90 transition-transform"
                                    >
                                        <FiX size={20} />
                                    </button>

                                    {/* Badge de promoção */}
                                    {selectedProduct.promo_enabled && (
                                        <div className="absolute top-4 right-4 md:top-4 md:left-4 md:right-auto bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-2xl animate-pulse">
                                            🔥 Promoção
                                        </div>
                                    )}
                                </div>

                                {/* ===== CONTEÚDO + FOOTER ===== */}
                                <div className="w-full md:w-1/2 flex flex-col min-h-0 flex-1">
                                    {/* Botão fechar — Desktop */}
                                    <div className="hidden md:flex justify-end p-4 absolute right-0 top-0 z-10">
                                        <button
                                            onClick={() => { setShowProductDetail(false); setSelectedProduct(null); }}
                                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
                                        >
                                            <FiX />
                                        </button>
                                    </div>

                                    {/* ===== ÁREA SCROLLÁVEL ===== */}
                                    <div className="flex-1 overflow-y-auto overscroll-contain p-5 md:p-8 md:pt-10 space-y-6 md:space-y-8 pb-44 md:pb-8">
                                        {/* Título, Preço e Descrição */}
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                                                    {selectedProduct.name}
                                                </h2>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-xl md:text-2xl font-black text-primary">
                                                        {formatCurrency(getProductPrice(selectedProduct))}
                                                    </span>
                                                    {selectedProduct.promo_enabled && (
                                                        <span className="text-xs text-gray-500 line-through">
                                                            {formatCurrency(selectedProduct.price)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedProduct.description && (
                                                <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium">
                                                    {selectedProduct.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                                <button
                                                    onClick={() => { setShowProductRatingModal(true); setRatingProduct(selectedProduct); }}
                                                    className="bg-white/5 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center border border-white/10 cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-colors"
                                                >
                                                    <FiStar className="text-sm mr-2 text-yellow-500 fill-current" />
                                                    Avaliar Produto
                                                </button>

                                                {productRatings[selectedProduct.id] && productRatings[selectedProduct.id].count > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setRatingProduct(selectedProduct);
                                                            setShowProductReviewsModal(true);
                                                        }}
                                                        className="bg-white/5 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center border border-white/10 cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-colors"
                                                    >
                                                        <FiMessageCircle className="text-sm mr-2 text-primary" />
                                                        Ver {productRatings[selectedProduct.id].count} {productRatings[selectedProduct.id].count === 1 ? 'Avaliação' : 'Avaliações'} ({productRatings[selectedProduct.id].average.toFixed(1)})
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* ===== GRUPOS DE ADICIONAIS COM CHECKBOX ===== */}
                                        {productAddonGroups.length > 0 && (
                                            <div className="space-y-6">
                                                {productAddonGroups.map((group) => (
                                                    <div key={group.id} className="space-y-3">
                                                        <div className="flex items-center justify-between bg-white/3 rounded-xl p-3 -mx-1">
                                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">
                                                                {group.name}
                                                            </h3>
                                                            <div className="flex items-center gap-2">
                                                                {group.max_selection > 1 && (
                                                                    <span className="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                                                                        máx. {group.max_selection}
                                                                    </span>
                                                                )}
                                                                {group.required && (
                                                                    <span className="text-[9px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                                                                        OBRIGATÓRIO
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            {group.addons.map((addon) => {
                                                                const isSelected = !!selectedModalAddons.find(a => a.id === addon.id);
                                                                return (
                                                                    <label
                                                                        key={addon.id}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer active:scale-[0.98]",
                                                                            isSelected
                                                                                ? "bg-primary/10 border-primary shadow-md shadow-primary/10"
                                                                                : "bg-white/5 border-white/5 hover:bg-white/10"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={() => toggleModalAddon(addon)}
                                                                                className="w-5 h-5 rounded-md border-2 border-gray-600 text-primary bg-transparent checked:bg-primary checked:border-primary focus:ring-primary focus:ring-offset-0 focus:ring-1 accent-primary cursor-pointer shrink-0 appearance-auto"
                                                                            />
                                                                            <span className={cn("font-semibold text-sm", isSelected ? "text-white" : "text-gray-300")}>
                                                                                {addon.name}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-primary font-bold text-sm shrink-0 ml-2">
                                                                            +{formatCurrency(addon.price)}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Observações */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.15em]">
                                                Observações
                                            </h3>
                                            <textarea
                                                className="w-full bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white placeholder:text-gray-600 focus:border-primary focus:outline-none resize-none transition-colors"
                                                placeholder="Ex: sem cebola, ponto da carne..."
                                                rows={2}
                                                value={observations}
                                                onChange={(e) => setObservations(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* ===== FOOTER FIXO — sempre visível, sticky no bottom ===== */}
                                    <div className="sticky bottom-0 z-50 shrink-0 p-4 md:p-6 bg-[#1A1A1A] border-t border-white/5 flex items-center gap-3 safe-area-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                                        <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/5 shrink-0">
                                            <button
                                                onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-90"
                                            >
                                                <FiMinus size={16} />
                                            </button>
                                            <span className="w-8 text-center font-black text-white text-base">
                                                {modalQuantity}
                                            </span>
                                            <button
                                                onClick={() => setModalQuantity(modalQuantity + 1)}
                                                className="w-10 h-10 flex items-center justify-center text-primary transition-colors active:scale-90"
                                            >
                                                <FiPlus size={16} />
                                            </button>
                                        </div>

                                        <button
                                            className="flex-1 py-3.5 bg-primary hover:bg-orange-600 text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.97] transition-all flex items-center justify-between px-5"
                                            onClick={confirmModalAddToCart}
                                        >
                                            <span>Adicionar</span>
                                            <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-sm font-semibold">
                                                {formatCurrency((getProductPrice(selectedProduct) + selectedModalAddons.reduce((a, b) => a + b.price, 0)) * modalQuantity)}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Other Modals */}
            {settings && (
                <StoreRatingModal
                    isOpen={showStoreRatingModal}
                    onClose={() => setShowStoreRatingModal(false)}
                    storeOwnerId={settings.user_id}
                    appName={settings.app_name}
                />
            )}
            {settings && (
                <StoreReviewsModal
                    isOpen={showReviewsModal}
                    onClose={() => setShowReviewsModal(false)}
                    reviews={storeReviews}
                    appName={settings.app_name}
                    averageRating={storeRating.average}
                    totalRatings={storeRating.count}
                />
            )}
            {initialSettings && ratingProduct && (
                <ProductRatingModal
                    isOpen={showProductRatingModal}
                    onClose={() => { setShowProductRatingModal(false); setRatingProduct(null); }}
                    storeOwnerId={initialSettings.user_id}
                    productId={ratingProduct.id}
                    productName={ratingProduct.name}
                    productImage={ratingProduct.image_url}
                />
            )}
            {settings && ratingProduct && (
                <ProductReviewsModal
                    isOpen={showProductReviewsModal}
                    onClose={() => { setShowProductReviewsModal(false); setRatingProduct(null); }}
                    reviews={allProductReviews.filter((r: { product_id: string }) => r.product_id === ratingProduct.id)}
                    appName={settings.app_name}
                    productName={ratingProduct.name}
                    averageRating={productRatings[ratingProduct.id]?.average || 0}
                    totalRatings={productRatings[ratingProduct.id]?.count || 0}
                />
            )}
            {/* Prompt de Instalação PWA Premium — oculto quando modal de produto está aberto */}
            {settings && !showProductDetail && (
                <PWAInstallPrompt
                    appName={settings.app_name}
                    logoUrl={settings.logo_url || "https://koxmxvutlxlikeszwyir.supabase.co/storage/v1/object/public/logos/colaaipwa.webp"}
                    className={cart.length > 0 ? "bottom-28" : "bottom-6"}
                />
            )}
        </div>
    );
}
