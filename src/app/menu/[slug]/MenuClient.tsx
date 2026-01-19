'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FiShoppingBag, FiMinus, FiPlus, FiX, FiMessageCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Category { id: string; name: string; icon: string; color: string; }
interface Product { id: string; name: string; description: string | null; price: number; image_url: string | null; category_id: string; available: boolean; }
interface UserSettings { app_name: string; logo_url: string | null; primary_color: string; secondary_color: string; whatsapp_number: string | null; user_id: string; }
interface Addon { id: string; name: string; price: number; }
interface AddonGroup { id: string; name: string; required: boolean; max_selection: number; addons: Addon[]; }
interface SelectedAddon { id: string; name: string; price: number; }
interface CartItem { product: Product; quantity: number; notes: string; addons: SelectedAddon[]; }

export default function MenuClient({ slug }: { slug: string }) {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => { fetchMenuData(); }, [slug]);
    useEffect(() => { if (settings) { document.documentElement.style.setProperty('--menu-primary', settings.primary_color); document.documentElement.style.setProperty('--menu-secondary', settings.secondary_color); } }, [settings]);

    const fetchMenuData = async () => {
        try {
            const { data: settingsData, error: settingsError } = await supabase.from('user_settings').select('*').eq('public_slug', slug).single();
            if (settingsError || !settingsData) { setNotFound(true); setLoading(false); return; }
            setSettings(settingsData);
            const [{ data: categoriesData }, { data: productsData }] = await Promise.all([supabase.from('categories').select('*').eq('user_id', settingsData.user_id).order('name'), supabase.from('products').select('*').eq('user_id', settingsData.user_id).eq('available', true).order('name')]);
            setCategories(categoriesData || []); setProducts(productsData || []);
        } catch { setNotFound(true); } finally { setLoading(false); }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const loadProductAddons = async (productId: string): Promise<AddonGroup[]> => {
        if (!settings) return [];
        const { data: groupLinks } = await supabase.from('product_addon_groups').select(`group_id,addon_groups(id,name,required,max_selection,addon_group_items(product_addons(id,name,price,available)))`).eq('product_id', productId);
        if (!groupLinks) return [];
        return groupLinks.filter((link: any) => link.addon_groups).map((link: any) => ({ id: link.addon_groups.id, name: link.addon_groups.name, required: link.addon_groups.required, max_selection: link.addon_groups.max_selection, addons: (link.addon_groups.addon_group_items || []).filter((item: any) => item.product_addons?.available).map((item: any) => ({ id: item.product_addons.id, name: item.product_addons.name, price: item.product_addons.price })) })).filter((g: AddonGroup) => g.addons.length > 0);
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
    const sendWhatsAppOrder = () => { if (!settings?.whatsapp_number || cart.length === 0) return; const subtotal = getCartTotal(); const total = getCartTotalWithDiscount(); let message = `🍔 *Novo Pedido - ${settings.app_name}*\n\n📋 *Itens:*\n${'─'.repeat(20)}\n`; cart.forEach(item => { const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0); const itemTotal = item.product.price + addonTotal; message += `• ${item.quantity}x ${item.product.name}\n`; if (item.addons.length > 0) message += `  📦 ${item.addons.map(a => a.name).join(', ')}\n`; message += `  ${formatCurrency(itemTotal)} cada\n`; }); message += `${'─'.repeat(20)}\n💰 *Total: ${formatCurrency(total + 5)}*\n`; const phone = settings.whatsapp_number.replace(/\D/g, ''); window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank'); };
    const categoriesWithProducts = categories.filter(cat => getProductsByCategory(cat.id).length > 0);

    if (loading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /><p className="text-text-muted">Carregando cardápio...</p></div>;
    if (notFound) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center p-4"><span className="text-6xl mb-4">🔍</span><h1 className="text-2xl font-bold">Cardápio não encontrado</h1><p className="text-text-muted">O link que você acessou não existe ou foi removido.</p></div>;

    const CartItemComponent = ({ item, index }: { item: CartItem; index: number }) => { const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0); const itemTotal = (item.product.price + addonTotal) * item.quantity; return (<div className="flex gap-3 pb-3 border-b border-border last:border-0"><div className="w-14 h-14 rounded-lg bg-bg-tertiary flex items-center justify-center overflow-hidden shrink-0">{item.product.image_url ? <img src={item.product.image_url} alt="" className="w-full h-full object-cover" /> : <span>🍽️</span>}</div><div className="flex-1 min-w-0"><div className="flex justify-between gap-2"><span className="font-medium truncate">{item.product.name}</span><span className="text-primary font-medium shrink-0">{formatCurrency(itemTotal)}</span></div>{item.addons.length > 0 && <span className="text-xs text-text-muted">{item.addons.map(a => a.name).join(', ')}</span>}<div className="flex items-center gap-2 mt-2"><button className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center hover:bg-primary hover:text-white transition-all" onClick={() => updateQuantity(index, -1)}><FiMinus size={14} /></button><span className="w-6 text-center font-medium">{item.quantity}</span><button className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center hover:bg-primary hover:text-white transition-all" onClick={() => updateQuantity(index, 1)}><FiPlus size={14} /></button></div></div></div>); };

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--menu-primary, #e91e63) 0%, var(--menu-secondary, #c2185b) 100%)' }}>
            {/* Hero Section */}
            <header className="relative pt-12 pb-8 px-4 text-center text-white">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden">{settings?.logo_url ? <img src={settings.logo_url} alt={settings.app_name} className="w-full h-full object-contain" /> : <span className="text-4xl">🍔</span>}</div>
                <h1 className="text-2xl font-bold mb-3">{settings?.app_name}</h1>
                <div className="flex flex-wrap justify-center gap-2"><span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Aberto Agora</span><span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm">🛵 30-45 min</span><span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm">⭐ 4.8</span></div>
            </header>

            {/* Main Layout */}
            <div className="flex gap-6 px-4 pb-32 lg:pb-6 max-w-7xl mx-auto">
                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    {/* Category Navigation */}
                    <nav className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border overflow-x-auto flex gap-2 scrollbar-hide"><div className="flex gap-2 min-w-max">{categoriesWithProducts.map((cat) => <button key={cat.id} className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all', selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-card')} onClick={() => scrollToCategory(cat.id)}>{cat.name}</button>)}</div></nav>

                    {/* Menu Sections */}
                    <div className="mt-4 space-y-8">{categoriesWithProducts.map((category) => (
                        <section key={category.id} ref={(el) => { categoryRefs.current[category.id] = el; }}>
                            <h2 className="text-xl font-bold mb-4 text-text-primary">{category.name}</h2>
                            <div className="grid gap-4 sm:grid-cols-2">{getProductsByCategory(category.id).map((product) => (
                                <div key={product.id} className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group">
                                    <div className="relative h-40 bg-bg-tertiary">{product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}</div>
                                    <div className="p-4"><h3 className="font-semibold mb-1">{product.name}</h3>{product.description && <p className="text-sm text-text-muted line-clamp-2 mb-3">{product.description}</p>}<div className="flex items-center justify-between"><span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span><button className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-all active:scale-95" onClick={() => handleAddToCart(product)}>ADICIONAR</button></div></div>
                                </div>
                            ))}</div>
                        </section>
                    ))}</div>
                </main>

                {/* Desktop Cart Sidebar */}
                <aside className="hidden lg:block w-[340px] shrink-0">
                    <div className="sticky top-4 bg-bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-border"><h2 className="flex items-center gap-2 font-semibold"><FiShoppingBag /> Seu Pedido</h2>{cart.length > 0 && <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">{getCartCount()} ITENS</span>}</div>
                        <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">{cart.length === 0 ? <div className="text-center py-8 text-text-muted"><FiShoppingBag size={40} className="mx-auto mb-2 opacity-50" /><p>Seu carrinho está vazio</p></div> : cart.map((item, index) => <CartItemComponent key={index} item={item} index={index} />)}</div>
                        {cart.length > 0 && <div className="p-4 border-t border-border bg-bg-tertiary"><div className="space-y-2 text-sm mb-4"><div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(getCartTotal())}</span></div><div className="flex justify-between"><span className="text-text-muted">Taxa de Entrega</span><span>R$ 5,00</span></div><div className="flex justify-between text-base font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(getCartTotalWithDiscount() + 5)}</span></div></div>{settings?.whatsapp_number && <button className="w-full py-3 bg-[#25d366] text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#1ebe57] transition-all" onClick={sendWhatsAppOrder}><FiMessageCircle /> Pedir no WhatsApp</button>}</div>}
                    </div>
                </aside>
            </div>

            {/* Mobile Cart Button */}
            {cart.length > 0 && <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-bg-card border-t border-border z-30"><button className="w-full py-4 bg-primary text-white rounded-lg font-semibold flex items-center justify-between px-4" onClick={() => setShowMobileCart(true)}><span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">{getCartCount()}</span><span>Ver Pedido</span><span>{formatCurrency(getCartTotal())}</span></button></div>}

            {/* Mobile Cart Modal */}
            {showMobileCart && <div className="fixed inset-0 bg-black/60 z-50 lg:hidden flex items-end" onClick={() => setShowMobileCart(false)}><div className="w-full max-h-[80vh] bg-bg-card rounded-t-2xl overflow-hidden" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center p-4 border-b border-border"><h2 className="font-semibold">Seu Pedido</h2><button className="p-2 hover:bg-bg-tertiary rounded-full" onClick={() => setShowMobileCart(false)}><FiX /></button></div><div className="p-4 max-h-[40vh] overflow-y-auto space-y-3">{cart.map((item, index) => <CartItemComponent key={index} item={item} index={index} />)}</div><div className="p-4 border-t border-border bg-bg-tertiary"><div className="space-y-2 text-sm mb-4"><div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(getCartTotal())}</span></div><div className="flex justify-between"><span className="text-text-muted">Taxa de Entrega</span><span>R$ 5,00</span></div><div className="flex justify-between text-base font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(getCartTotalWithDiscount() + 5)}</span></div></div>{settings?.whatsapp_number && <button className="w-full py-3 bg-[#25d366] text-white rounded-lg font-semibold flex items-center justify-center gap-2" onClick={sendWhatsAppOrder}><FiMessageCircle /> Pedir no WhatsApp</button>}</div></div></div>}

            {/* Addon Modal */}
            {showAddonModal && pendingProduct && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddonModal(false)}><div className="w-full max-w-md bg-bg-card rounded-xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-border"><h2 className="font-semibold">Personalizar {pendingProduct.name}</h2></div><div className="p-4 overflow-y-auto flex-1 space-y-4">{productAddonGroups.map((group) => <div key={group.id}><h3 className="font-medium mb-2">{group.name} {group.required && <span className="text-error text-xs">(Obrigatório)</span>}</h3><div className="space-y-2">{group.addons.map((addon) => <label key={addon.id} className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg cursor-pointer hover:bg-bg-tertiary/80"><input type="checkbox" className="w-5 h-5 accent-primary" checked={!!selectedAddons.find(a => a.id === addon.id)} onChange={() => toggleAddon(addon)} /><span className="flex-1">{addon.name}</span>{addon.price > 0 && <span className="text-primary text-sm">+{formatCurrency(addon.price)}</span>}</label>)}</div></div>)}</div><div className="p-4 border-t border-border flex gap-3"><button className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-bg-tertiary transition-all" onClick={() => setShowAddonModal(false)}>Cancelar</button><button className="flex-1 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-all" onClick={confirmAddToCart}>Adicionar</button></div></div></div>}

            {loadingAddons && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}
        </div>
    );
}
