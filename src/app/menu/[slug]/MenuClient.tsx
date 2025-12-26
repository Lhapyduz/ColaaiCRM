'use client';

import React, { useEffect, useState } from 'react';
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
    const [showCart, setShowCart] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isDelivery, setIsDelivery] = useState(false);
    const [customerAddress, setCustomerAddress] = useState('');
    const [orderNotes, setOrderNotes] = useState('');

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
            // Find user by public_slug
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

            // Fetch categories
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', settingsData.user_id)
                .order('name');

            // Fetch available products
            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', settingsData.user_id)
                .eq('available', true)
                .order('name');

            // Check if coupons are enabled
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

    // Load addons for a product
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
            // For items with addons, always add as new item
            if (addons.length > 0) {
                return [...prev, { product, quantity: 1, notes: '', addons }];
            }
            // For items without addons, increment if exists
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

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.product.id === productId) {
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

    const removeAddonFromItem = (itemIndex: number, addonId: string) => {
        setCart(prev => prev.map((item, i) => {
            if (i === itemIndex) {
                const newAddons = item.addons.filter(a => a.id !== addonId);
                return { ...item, addons: newAddons };
            }
            return item;
        }));
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

    // Calculate discount
    const getCartTotalWithDiscount = () => {
        const subtotal = getCartTotal();
        if (!appliedCoupon) return subtotal;

        const discount = appliedCoupon.discount_type === 'percentage'
            ? subtotal * (appliedCoupon.discount_value / 100)
            : appliedCoupon.discount_value;

        return Math.max(0, subtotal - discount);
    };

    // Validate coupon
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

    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category_id === selectedCategory);

    const sendWhatsAppOrder = () => {
        if (!settings?.whatsapp_number || cart.length === 0) return;

        const subtotal = getCartTotal();
        const total = getCartTotalWithDiscount();
        const discount = subtotal - total;

        let message = `🌭 *Novo Pedido - ${settings.app_name}*\n\n`;
        message += `👤 *Cliente:* ${customerName || 'Não informado'}\n`;
        message += `📱 *Telefone:* ${customerPhone || 'Não informado'}\n`;

        if (isDelivery) {
            message += `🚗 *Tipo:* Delivery\n`;
            message += `📍 *Endereço:* ${customerAddress || 'Não informado'}\n`;
        } else {
            message += `🏪 *Tipo:* Retirada no local\n`;
        }

        message += `\n📋 *Itens do Pedido:*\n`;
        message += `${'─'.repeat(20)}\n`;

        cart.forEach(item => {
            const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
            const itemTotal = item.product.price + addonTotal;
            message += `• ${item.quantity}x ${item.product.name}\n`;
            if (item.addons.length > 0) {
                message += `  📦 Adicionais: ${item.addons.map(a => a.name).join(', ')}\n`;
            }
            message += `  ${formatCurrency(itemTotal)} cada\n`;
            if (item.notes) {
                message += `  📝 ${item.notes}\n`;
            }
        });

        message += `${'─'.repeat(20)}\n`;

        if (appliedCoupon && discount > 0) {
            message += `Subtotal: ${formatCurrency(subtotal)}\n`;
            message += `🎫 Cupom ${appliedCoupon.code}: -${formatCurrency(discount)}\n`;
        }

        message += `💰 *Total: ${formatCurrency(total)}*\n`;

        if (orderNotes) {
            message += `\n📝 *Observações:* ${orderNotes}`;
        }

        const phone = settings.whatsapp_number.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Carregando cardápio...</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className={styles.notFound}>
                <span className={styles.notFoundIcon}>🔍</span>
                <h1>Cardápio não encontrado</h1>
                <p>O link que você acessou não existe ou foi removido.</p>
            </div>
        );
    }

    return (
        <div className={styles.container} style={{ '--primary': settings?.primary_color } as React.CSSProperties}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.logo}>
                        {settings?.logo_url ? (
                            <img src={settings.logo_url} alt={settings.app_name} />
                        ) : (
                            <span>🌭</span>
                        )}
                    </div>
                    <h1 className={styles.appName}>{settings?.app_name}</h1>
                </div>
            </header>

            {/* Categories */}
            <nav className={styles.categories}>
                <button
                    className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('all')}
                >
                    🍽️ Todos
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.active : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        {cat.icon} {cat.name}
                    </button>
                ))}
            </nav>

            {/* Products */}
            <main className={styles.products}>
                {filteredProducts.length === 0 ? (
                    <div className={styles.empty}>
                        <span>📭</span>
                        <p>Nenhum produto disponível nesta categoria</p>
                    </div>
                ) : (
                    <div className={styles.productGrid}>
                        {filteredProducts.map(product => {
                            const cartItem = cart.find(item => item.product.id === product.id);
                            return (
                                <div key={product.id} className={styles.productCard}>
                                    {product.image_url && (
                                        <div className={styles.productImage}>
                                            <img src={product.image_url} alt={product.name} />
                                        </div>
                                    )}
                                    <div className={styles.productInfo}>
                                        <h3>{product.name}</h3>
                                        {product.description && (
                                            <p className={styles.description}>{product.description}</p>
                                        )}
                                        <span className={styles.price}>{formatCurrency(product.price)}</span>
                                    </div>
                                    <div className={styles.productActions}>
                                        {cartItem ? (
                                            <div className={styles.quantityControl}>
                                                <button onClick={() => updateQuantity(product.id, -1)}>
                                                    <FiMinus />
                                                </button>
                                                <span>{cartItem.quantity}</span>
                                                <button onClick={() => updateQuantity(product.id, 1)}>
                                                    <FiPlus />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className={styles.addBtn}
                                                onClick={() => handleAddToCart(product)}
                                            >
                                                Adicionar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Cart FAB */}
            {cart.length > 0 && (
                <button className={styles.cartFab} onClick={() => setShowCart(true)}>
                    <FiShoppingBag />
                    <span className={styles.cartCount}>{getCartCount()}</span>
                </button>
            )}

            {/* Cart Modal */}
            {showCart && (
                <div className={styles.cartOverlay} onClick={() => setShowCart(false)}>
                    <div className={styles.cartModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.cartHeader}>
                            <h2>Seu Pedido</h2>
                            <button onClick={() => setShowCart(false)}>
                                <FiX />
                            </button>
                        </div>

                        <div className={styles.cartItems}>
                            {cart.map((item, index) => {
                                const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                                const itemTotal = (item.product.price + addonTotal) * item.quantity;
                                return (
                                    <div key={`${item.product.id}-${index}`} className={styles.cartItem}>
                                        <div className={styles.cartItemHeader}>
                                            <div className={styles.cartItemInfo}>
                                                <h4>{item.product.name}</h4>
                                                <span className={styles.cartItemPrice}>{formatCurrency(itemTotal)}</span>
                                            </div>
                                            <button
                                                className={styles.removeBtn}
                                                onClick={() => removeFromCart(index)}
                                            >
                                                <FiX />
                                            </button>
                                        </div>

                                        {item.addons.length > 0 && (
                                            <div className={styles.cartItemAddons}>
                                                {item.addons.map((addon) => (
                                                    <div key={addon.id} className={styles.cartAddonTag}>
                                                        <span>+ {addon.name}</span>
                                                        <span className={styles.cartAddonPrice}>
                                                            {addon.price > 0 && `+${formatCurrency(addon.price)}`}
                                                        </span>
                                                        <button
                                                            className={styles.removeAddonBtn}
                                                            onClick={() => removeAddonFromItem(index, addon.id)}
                                                            title="Remover adicional"
                                                        >
                                                            <FiX size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className={styles.cartItemActions}>
                                            <div className={styles.quantityControl}>
                                                <button onClick={() => updateQuantity(item.product.id, -1)}>
                                                    <FiMinus />
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.product.id, 1)}>
                                                    <FiPlus />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.cartForm}>
                            <input
                                type="text"
                                placeholder="Seu nome"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                            />
                            <input
                                type="tel"
                                placeholder="Seu telefone"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                            />

                            <div className={styles.deliveryToggle}>
                                <button
                                    className={!isDelivery ? styles.active : ''}
                                    onClick={() => setIsDelivery(false)}
                                >
                                    🏪 Retirada
                                </button>
                                <button
                                    className={isDelivery ? styles.active : ''}
                                    onClick={() => setIsDelivery(true)}
                                >
                                    🚗 Delivery
                                </button>
                            </div>

                            {isDelivery && (
                                <input
                                    type="text"
                                    placeholder="Endereço de entrega"
                                    value={customerAddress}
                                    onChange={e => setCustomerAddress(e.target.value)}
                                />
                            )}

                            <textarea
                                placeholder="Observações (opcional)"
                                value={orderNotes}
                                onChange={e => setOrderNotes(e.target.value)}
                            />

                            {/* Coupon Input - only show if enabled */}
                            {couponsEnabled && (
                                <div className={styles.couponSection}>
                                    <div className={styles.couponInput}>
                                        <input
                                            type="text"
                                            placeholder="Código do cupom"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            disabled={!!appliedCoupon}
                                        />
                                        {appliedCoupon ? (
                                            <button
                                                type="button"
                                                className={styles.couponRemoveBtn}
                                                onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                                            >
                                                <FiX />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className={styles.couponApplyBtn}
                                                onClick={validateCoupon}
                                                disabled={!couponCode.trim() || validatingCoupon}
                                            >
                                                <FiTag />
                                            </button>
                                        )}
                                    </div>
                                    {couponError && <span className={styles.couponError}>{couponError}</span>}
                                    {appliedCoupon && (
                                        <span className={styles.couponSuccess}>
                                            ✓ {appliedCoupon.discount_type === 'percentage'
                                                ? `${appliedCoupon.discount_value}% de desconto`
                                                : `R$ ${appliedCoupon.discount_value.toFixed(2)} de desconto`}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.cartFooter}>
                            <div className={styles.cartTotal}>
                                {appliedCoupon && (
                                    <div className={styles.subtotalLine}>
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(getCartTotal())}</span>
                                    </div>
                                )}
                                <div className={styles.totalLine}>
                                    <span>Total</span>
                                    <strong>{formatCurrency(getCartTotalWithDiscount())}</strong>
                                </div>
                            </div>
                            <button
                                className={styles.whatsappBtn}
                                onClick={sendWhatsAppOrder}
                                disabled={!settings?.whatsapp_number}
                            >
                                <FiMessageCircle />
                                Enviar Pedido via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Addon Selection Modal */}
            {showAddonModal && pendingProduct && (
                <div className={styles.addonModalOverlay} onClick={() => setShowAddonModal(false)}>
                    <div className={styles.addonModal} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.addonModalTitle}>Adicionais para {pendingProduct.name}</h2>

                        {productAddonGroups.map((group) => (
                            <div key={group.id} className={styles.addonGroup}>
                                <h3 className={styles.addonGroupName}>
                                    {group.name}
                                    {group.required && <span className={styles.requiredBadge}> (Obrigatório)</span>}
                                </h3>
                                <div className={styles.addonList}>
                                    {group.addons.map((addon) => (
                                        <label
                                            key={addon.id}
                                            className={`${styles.addonOption} ${selectedAddons.find(a => a.id === addon.id) ? styles.addonSelected : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!selectedAddons.find(a => a.id === addon.id)}
                                                onChange={() => toggleAddon(addon)}
                                            />
                                            <span className={styles.addonName}>{addon.name}</span>
                                            {addon.price > 0 && (
                                                <span className={styles.addonPrice}>
                                                    +{formatCurrency(addon.price)}
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className={styles.addonModalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowAddonModal(false)}>
                                Cancelar
                            </button>
                            <button className={styles.confirmBtn} onClick={confirmAddToCart}>
                                Adicionar ao Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loadingAddons && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner} />
                </div>
            )}
        </div>
    );
}
