'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FiShoppingBag, FiMinus, FiPlus, FiX, FiMessageCircle, FiTag } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
}

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category_id: string;
    available: boolean;
}

interface UserSettings {
    app_name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    whatsapp_number: string | null;
    user_id: string;
}

interface Addon {
    id: string;
    name: string;
    price: number;
}

interface AddonGroup {
    id: string;
    name: string;
    required: boolean;
    max_selection: number;
    addons: Addon[];
}

interface SelectedAddon {
    id: string;
    name: string;
    price: number;
}

interface CartItem {
    product: Product;
    quantity: number;
    notes: string;
    addons: SelectedAddon[];
}

export default function MenuClient({ slug }: { slug: string }) {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showMobileCart, setShowMobileCart] = useState(false);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{
        code: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
    } | null>(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponsEnabled, setCouponsEnabled] = useState(true);

    // Addon modal state
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    const [productAddonGroups, setProductAddonGroups] = useState<AddonGroup[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
    const [loadingAddons, setLoadingAddons] = useState(false);

    const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    useEffect(() => {
        fetchMenuData();
    }, [slug]);

    useEffect(() => {
        if (settings) {
            document.documentElement.style.setProperty('--menu-primary', settings.primary_color);
            document.documentElement.style.setProperty('--menu-secondary', settings.secondary_color);
        }
    }, [settings]);

    const fetchMenuData = async () => {
        try {
            const { data: settingsData, error: settingsError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('public_slug', slug)
                .single();

            if (settingsError || !settingsData) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            setSettings(settingsData);

            const { data: categoriesData } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', settingsData.user_id)
                .order('name');

            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', settingsData.user_id)
                .eq('available', true)
                .order('name');

            const { data: appSettingsData } = await supabase
                .from('app_settings')
                .select('coupons_enabled')
                .eq('user_id', settingsData.user_id)
                .single();

            setCategories(categoriesData || []);
            setProducts(productsData || []);
            setCouponsEnabled(appSettingsData?.coupons_enabled !== false);
        } catch (error) {
            console.error('Error fetching menu:', error);
            setNotFound(true);
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

    const loadProductAddons = async (productId: string): Promise<AddonGroup[]> => {
        if (!settings) return [];

        const { data: groupLinks } = await supabase
            .from('product_addon_groups')
            .select(`
                group_id,
                addon_groups (
                    id,
                    name,
                    required,
                    max_selection,
                    addon_group_items (
                        product_addons (
                            id,
                            name,
                            price,
                            available
                        )
                    )
                )
            `)
            .eq('product_id', productId);

        if (!groupLinks) return [];

        return groupLinks
            .filter((link: any) => link.addon_groups)
            .map((link: any) => ({
                id: link.addon_groups.id,
                name: link.addon_groups.name,
                required: link.addon_groups.required,
                max_selection: link.addon_groups.max_selection,
                addons: (link.addon_groups.addon_group_items || [])
                    .filter((item: any) => item.product_addons?.available)
                    .map((item: any) => ({
                        id: item.product_addons.id,
                        name: item.product_addons.name,
                        price: item.product_addons.price
                    }))
            }))
            .filter((g: AddonGroup) => g.addons.length > 0);
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
            addToCart(product, []);
        }
    };

    const toggleAddon = (addon: Addon) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.id === addon.id);
            if (exists) {
                return prev.filter(a => a.id !== addon.id);
            } else {
                return [...prev, { id: addon.id, name: addon.name, price: addon.price }];
            }
        });
    };

    const confirmAddToCart = () => {
        if (pendingProduct) {
            addToCart(pendingProduct, selectedAddons);
            setShowAddonModal(false);
            setPendingProduct(null);
            setProductAddonGroups([]);
            setSelectedAddons([]);
        }
    };

    const addToCart = (product: Product, addons: SelectedAddon[]) => {
        setCart(prev => {
            if (addons.length > 0) {
                return [...prev, { product, quantity: 1, notes: '', addons }];
            }
            const existing = prev.find(item => item.product.id === product.id && item.addons.length === 0);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id && item.addons.length === 0
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1, notes: '', addons: [] }];
        });
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            return prev.map((item, i) => {
                if (i === index) {
                    const newQuantity = item.quantity + delta;
                    if (newQuantity <= 0) return null;
                    return { ...item, quantity: newQuantity };
                }
                return item;
            }).filter(Boolean) as CartItem[];
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => {
            const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
            return total + ((item.product.price + addonTotal) * item.quantity);
        }, 0);
    };

    const getCartCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    };

    const getCartTotalWithDiscount = () => {
        const subtotal = getCartTotal();
        if (!appliedCoupon) return subtotal;

        const discount = appliedCoupon.discount_type === 'percentage'
            ? subtotal * (appliedCoupon.discount_value / 100)
            : appliedCoupon.discount_value;

        return Math.max(0, subtotal - discount);
    };

    const validateCoupon = async () => {
        if (!couponCode.trim() || !settings) return;

        setCouponError('');
        setValidatingCoupon(true);

        try {
            const now = new Date().toISOString();
            const subtotal = getCartTotal();

            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('user_id', settings.user_id)
                .eq('code', couponCode.toUpperCase())
                .eq('active', true)
                .single();

            if (error || !coupon) {
                setCouponError('Cupom inválido');
                setAppliedCoupon(null);
                return;
            }

            if (coupon.valid_from && now < coupon.valid_from) {
                setCouponError('Cupom ainda não válido');
                return;
            }
            if (coupon.valid_until && now > coupon.valid_until) {
                setCouponError('Cupom expirado');
                return;
            }
            if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
                setCouponError('Cupom esgotado');
                return;
            }
            if (coupon.min_order_value && subtotal < coupon.min_order_value) {
                setCouponError(`Pedido mínimo: R$ ${coupon.min_order_value.toFixed(2)}`);
                return;
            }

            setAppliedCoupon({
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value
            });
        } catch {
            setCouponError('Erro ao validar');
        } finally {
            setValidatingCoupon(false);
        }
    };

    const scrollToCategory = (categoryId: string) => {
        setSelectedCategory(categoryId);
        if (categoryId === 'all') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const element = categoryRefs.current[categoryId];
        if (element) {
            const offset = 180;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
        }
    };

    const getProductsByCategory = (categoryId: string) => {
        return products.filter(p => p.category_id === categoryId);
    };

    const sendWhatsAppOrder = () => {
        if (!settings?.whatsapp_number || cart.length === 0) return;

        const subtotal = getCartTotal();
        const total = getCartTotalWithDiscount();
        const discount = subtotal - total;

        let message = `🍔 *Novo Pedido - ${settings.app_name}*\n\n`;
        message += `📋 *Itens do Pedido:*\n`;
        message += `${'─'.repeat(20)}\n`;

        cart.forEach(item => {
            const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
            const itemTotal = item.product.price + addonTotal;
            message += `• ${item.quantity}x ${item.product.name}\n`;
            if (item.addons.length > 0) {
                message += `  📦 Adicionais: ${item.addons.map(a => a.name).join(', ')}\n`;
            }
            message += `  ${formatCurrency(itemTotal)} cada\n`;
        });

        message += `${'─'.repeat(20)}\n`;

        if (appliedCoupon && discount > 0) {
            message += `Subtotal: ${formatCurrency(subtotal)}\n`;
            message += `🎫 Cupom ${appliedCoupon.code}: -${formatCurrency(discount)}\n`;
        }

        message += `💰 *Total: ${formatCurrency(total)}*\n`;

        const phone = settings.whatsapp_number.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const categoriesWithProducts = categories.filter(cat => getProductsByCategory(cat.id).length > 0);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Carregando cardápio...</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className={styles.notFoundContainer}>
                <span className={styles.notFoundIcon}>🔍</span>
                <h1>Cardápio não encontrado</h1>
                <p>O link que você acessou não existe ou foi removido.</p>
            </div>
        );
    }

    return (
        <div className={styles.menuPage}>
            {/* Hero Section */}
            <header className={styles.hero}>
                <div className={styles.heroLogo}>
                    {settings?.logo_url ? (
                        <img src={settings.logo_url} alt={settings.app_name} />
                    ) : (
                        <span className={styles.heroLogoIcon}>🍔</span>
                    )}
                </div>
                <h1 className={styles.heroTitle}>{settings?.app_name}</h1>
                <div className={styles.heroBadges}>
                    <span className={styles.badgeOpen}>
                        <span className={styles.badgeDot}></span>
                        Aberto Agora
                    </span>
                    <span className={styles.badgeInfo}>🛵 30-45 min entrega</span>
                    <span className={styles.badgeInfo}>⭐ 4.8 (500+)</span>
                </div>
            </header>

            {/* Main Layout */}
            <div className={styles.mainLayout}>
                {/* Content Area */}
                <main className={styles.mainContent}>
                    {/* Sticky Category Navigation */}
                    <nav className={styles.categoryNav}>
                        {categoriesWithProducts.map((cat) => (
                            <button
                                key={cat.id}
                                className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.categoryBtnActive : ''}`}
                                onClick={() => scrollToCategory(cat.id)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </nav>

                    {/* Menu Sections */}
                    <div className={styles.menuSections}>
                        {categoriesWithProducts.map((category) => (
                            <section
                                key={category.id}
                                ref={(el) => { categoryRefs.current[category.id] = el; }}
                                className={styles.menuSection}
                            >
                                <h2 className={styles.sectionTitle}>{category.name}</h2>
                                <div className={styles.productGrid}>
                                    {getProductsByCategory(category.id).map((product) => (
                                        <div key={product.id} className={styles.productCard}>
                                            <div className={styles.productImageWrapper}>
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className={styles.productImage} />
                                                ) : (
                                                    <div className={styles.productImagePlaceholder}>🍽️</div>
                                                )}
                                            </div>
                                            <div className={styles.productContent}>
                                                <h3 className={styles.productName}>{product.name}</h3>
                                                {product.description && (
                                                    <p className={styles.productDescription}>{product.description}</p>
                                                )}
                                                <div className={styles.productFooter}>
                                                    <span className={styles.productPrice}>{formatCurrency(product.price)}</span>
                                                    <button
                                                        className={styles.addButton}
                                                        onClick={() => handleAddToCart(product)}
                                                    >
                                                        ADICIONAR
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </main>

                {/* Desktop Cart Sidebar */}
                <aside className={styles.cartSidebar}>
                    <div className={styles.cartPanel}>
                        <div className={styles.cartHeader}>
                            <h2><FiShoppingBag /> Seu Pedido</h2>
                            {cart.length > 0 && (
                                <span className={styles.cartBadge}>{getCartCount()} ITENS</span>
                            )}
                        </div>

                        <div className={styles.cartItems}>
                            {cart.length === 0 ? (
                                <div className={styles.cartEmpty}>
                                    <FiShoppingBag size={40} />
                                    <p>Seu carrinho está vazio</p>
                                </div>
                            ) : (
                                cart.map((item, index) => {
                                    const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                                    const itemTotal = (item.product.price + addonTotal) * item.quantity;
                                    return (
                                        <div key={index} className={styles.cartItem}>
                                            <div className={styles.cartItemImage}>
                                                {item.product.image_url ? (
                                                    <img src={item.product.image_url} alt={item.product.name} />
                                                ) : (
                                                    <span>🍽️</span>
                                                )}
                                            </div>
                                            <div className={styles.cartItemInfo}>
                                                <div className={styles.cartItemTop}>
                                                    <span className={styles.cartItemName}>{item.product.name}</span>
                                                    <span className={styles.cartItemPrice}>{formatCurrency(itemTotal)}</span>
                                                </div>
                                                {item.addons.length > 0 && (
                                                    <span className={styles.cartItemAddons}>
                                                        {item.addons.map(a => a.name).join(', ')}
                                                    </span>
                                                )}
                                                <div className={styles.cartItemQuantity}>
                                                    <button onClick={() => updateQuantity(index, -1)}><FiMinus /></button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(index, 1)}><FiPlus /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className={styles.cartFooter}>
                                <div className={styles.cartTotals}>
                                    <div className={styles.cartTotalRow}>
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(getCartTotal())}</span>
                                    </div>
                                    <div className={styles.cartTotalRow}>
                                        <span>Taxa de Entrega</span>
                                        <span>R$ 5,00</span>
                                    </div>
                                    <div className={`${styles.cartTotalRow} ${styles.cartTotalFinal}`}>
                                        <span>Total</span>
                                        <span>{formatCurrency(getCartTotalWithDiscount() + 5)}</span>
                                    </div>
                                </div>

                                {settings?.whatsapp_number && (
                                    <button className={styles.whatsappBtn} onClick={sendWhatsAppOrder}>
                                        <FiMessageCircle /> Pedir no WhatsApp
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Mobile Cart Button */}
            {cart.length > 0 && (
                <div className={styles.mobileCartBtn} onClick={() => setShowMobileCart(true)}>
                    <div className={styles.mobileCartBtnInner}>
                        <span className={styles.mobileCartCount}>{getCartCount()}</span>
                        <span>Ver Pedido</span>
                        <span>{formatCurrency(getCartTotal())}</span>
                    </div>
                </div>
            )}

            {/* Mobile Cart Modal */}
            {showMobileCart && (
                <div className={styles.mobileCartOverlay} onClick={() => setShowMobileCart(false)}>
                    <div className={styles.mobileCartModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.mobileCartHeader}>
                            <h2>Seu Pedido</h2>
                            <button onClick={() => setShowMobileCart(false)}><FiX /></button>
                        </div>
                        <div className={styles.mobileCartItems}>
                            {cart.map((item, index) => {
                                const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                                const itemTotal = (item.product.price + addonTotal) * item.quantity;
                                return (
                                    <div key={index} className={styles.cartItem}>
                                        <div className={styles.cartItemImage}>
                                            {item.product.image_url ? (
                                                <img src={item.product.image_url} alt={item.product.name} />
                                            ) : (
                                                <span>🍽️</span>
                                            )}
                                        </div>
                                        <div className={styles.cartItemInfo}>
                                            <div className={styles.cartItemTop}>
                                                <span className={styles.cartItemName}>{item.product.name}</span>
                                                <span className={styles.cartItemPrice}>{formatCurrency(itemTotal)}</span>
                                            </div>
                                            <div className={styles.cartItemQuantity}>
                                                <button onClick={() => updateQuantity(index, -1)}><FiMinus /></button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(index, 1)}><FiPlus /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={styles.cartFooter}>
                            <div className={styles.cartTotals}>
                                <div className={styles.cartTotalRow}>
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(getCartTotal())}</span>
                                </div>
                                <div className={styles.cartTotalRow}>
                                    <span>Delivery Fee</span>
                                    <span>R$ 5,00</span>
                                </div>
                                <div className={`${styles.cartTotalRow} ${styles.cartTotalFinal}`}>
                                    <span>Total</span>
                                    <span>{formatCurrency(getCartTotalWithDiscount() + 5)}</span>
                                </div>
                            </div>
                            {settings?.whatsapp_number && (
                                <button className={styles.whatsappBtn} onClick={sendWhatsAppOrder}>
                                    <FiMessageCircle /> Order via WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Addon Modal */}
            {showAddonModal && pendingProduct && (
                <div className={styles.addonModalOverlay} onClick={() => setShowAddonModal(false)}>
                    <div className={styles.addonModal} onClick={e => e.stopPropagation()}>
                        <h2>Personalizar {pendingProduct.name}</h2>
                        {productAddonGroups.map((group) => (
                            <div key={group.id} className={styles.addonGroup}>
                                <h3>{group.name} {group.required && <span className={styles.required}>(Obrigatório)</span>}</h3>
                                <div className={styles.addonList}>
                                    {group.addons.map((addon) => (
                                        <label key={addon.id} className={styles.addonOption}>
                                            <input
                                                type="checkbox"
                                                checked={!!selectedAddons.find(a => a.id === addon.id)}
                                                onChange={() => toggleAddon(addon)}
                                            />
                                            <span className={styles.addonName}>{addon.name}</span>
                                            {addon.price > 0 && (
                                                <span className={styles.addonPrice}>+{formatCurrency(addon.price)}</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className={styles.addonModalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowAddonModal(false)}>Cancelar</button>
                            <button className={styles.confirmBtn} onClick={confirmAddToCart}>Adicionar</button>
                        </div>
                    </div>
                </div>
            )}

            {loadingAddons && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                </div>
            )}
        </div>
    );
}
