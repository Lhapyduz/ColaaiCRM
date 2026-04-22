'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiArrowLeft,
    FiPlus,
    FiMinus,
    FiTrash2,
    FiUser,
    FiPhone,
    FiMapPin,
    FiCheck,
    FiTag,
    FiGift
} from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
// import { supabase } from '@/infra/persistence/supabase'; // Removed for local-first
import { logOrderCreated } from '@/infra/logging/actionLogger';
import { formatCurrency } from '@/hooks/useFormatters';
import { createFullOrder } from '@/repositories/dataAccess';
import { 
    useProductsCache, 
    useCategoriesCache, 
    useAddonsCache, 
    useAppSettingsCache, 
    useCouponsCache, 
    useCustomersCache,
    Addon,
    AddonGroup
} from '@/hooks/useDataCache';
import { CachedClient, CachedCoupon } from '@/types/db';
import styles from './page.module.css';

// Função para disparar notificação local
async function sendNewOrderPush(userId: string, orderNumber: number, customerName: string, total: number) {
    try {
        const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
        await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                title: '🔔 Novo Pedido!',
                message: `Pedido #${orderNumber} de ${customerName} — ${formattedTotal}`,
                url: '/pedidos'
            })
        });
    } catch (e) {
        console.error('Push error:', e);
    }
}

// Categories are fetched via useCategoriesCache

interface Product {
    id: string;
    name: string;
    price: number;
    category_id: string;
}

// Interfaces are now imported from useDataCache

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

const paymentMethods = [
    { value: 'money', label: '💵 Dinheiro' },
    { value: 'pix', label: '📱 PIX' },
    { value: 'credit', label: '💳 Crédito' },
    { value: 'debit', label: '💳 Débito' }
];

export default function NovoPedidoPage() {
    const { user } = useAuth();
    const router = useRouter();

    const { categories, loading: categoriesLoading } = useCategoriesCache();
    const { products: allProducts, loading: productsLoading } = useProductsCache();
    const { getProductAddons } = useAddonsCache();
    const { settings: appSettings, loading: settingsLoading } = useAppSettingsCache();
    const { coupons, loading: couponsLoading } = useCouponsCache();
    const { customers: allCustomers, loading: customersLoading } = useCustomersCache();

    const products = allProducts.filter(p => p.available);
    
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Customer info
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [isDelivery, setIsDelivery] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('money');
    const [isPaid, setIsPaid] = useState(false);
    const [notes] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<CachedCoupon | null>(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    // Loyalty state
    const [loyaltyCustomer, setLoyaltyCustomer] = useState<CachedClient | null>(null);

    // Addons modal state
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    const [productAddonGroups, setProductAddonGroups] = useState<AddonGroup[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
    const toast = useToast();

    // Overall Loading State
    const loading = categoriesLoading || productsLoading || settingsLoading || couponsLoading || customersLoading;

    useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id);
        }
    }, [categories, selectedCategory]);

    const filteredProducts = selectedCategory
        ? products.filter(p => p.category_id === selectedCategory)
        : products;

    const handleAddToCart = async (product: Product) => {
        const addonGroups = getProductAddons(product.id);

        if (addonGroups.length > 0) {
            // Product has addons, show modal
            setPendingProduct(product);
            setProductAddonGroups(addonGroups);
            setSelectedAddons([]);
            setShowAddonModal(true);
        } else {
            // No addons, add directly to cart
            addToCart(product, []);
        }
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
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return null;
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(Boolean) as CartItem[];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateItemNotes = (productId: string, notes: string) => {
        setCart(prev => prev.map(item =>
            item.product.id === productId ? { ...item, notes } : item
        ));
    };

    const subtotal = cart.reduce((sum, item) => {
        const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
        return sum + ((item.product.price + addonTotal) * item.quantity);
    }, 0);

    // Calculate discount
    const discount = appliedCoupon
        ? appliedCoupon.discount_type === 'percentage'
            ? subtotal * (appliedCoupon.discount_value / 100)
            : appliedCoupon.discount_value
        : 0;

    const total = subtotal - discount + (isDelivery ? deliveryFee : 0);


    // Validate coupon locally
    const validateCoupon = async () => {
        if (!couponCode.trim() || !user) return;

        setCouponError('');
        setValidatingCoupon(true);

        try {
            const now = new Date().toISOString();
            const coupon = coupons.find(c => c.code === couponCode.toUpperCase() && c.active);

            if (!coupon) {
                setCouponError('Cupom inválido ou expirado');
                setAppliedCoupon(null);
                return;
            }

            // Check validity period
            if (coupon.valid_from && now < coupon.valid_from) {
                setCouponError('Cupom ainda não está válido');
                return;
            }
            if (coupon.valid_until && now > coupon.valid_until) {
                setCouponError('Cupom expirado');
                return;
            }

            // Check usage limit
            if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
                setCouponError('Cupom esgotado');
                return;
            }

            // Check minimum order
            if (coupon.min_order_value && subtotal < coupon.min_order_value) {
                setCouponError(`Pedido mínimo: R$ ${coupon.min_order_value.toFixed(2)}`);
                return;
            }

            setAppliedCoupon(coupon);
        } catch {
            setCouponError('Erro ao validar cupom');
        } finally {
            setValidatingCoupon(false);
        }
    };

    // Search loyalty customer by phone locally
    const searchLoyaltyCustomer = useCallback(async (phone: string) => {
        if (!phone || phone.length < 10 || !user) return;

        const cleanPhone = phone.replace(/\D/g, '');
        const customer = allCustomers.find(c => c.phone === cleanPhone);

        if (customer) {
            setLoyaltyCustomer(customer);
        } else {
            setLoyaltyCustomer(null);
        }
    }, [user, allCustomers]);

    // Effect to search customer when phone changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (customerPhone.length >= 10) {
                searchLoyaltyCustomer(customerPhone);
            } else {
                setLoyaltyCustomer(null);
            }
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerPhone]);



    const handleSubmit = async () => {
        if (!user || !customerName || cart.length === 0) return;

        setSubmitting(true);

        try {
            let orderNumber = 1;
            // Use local Dexie as primary source of truth for order numbers to support offline creation
            try {
                const dbModule = await import('@/infra/persistence/db');
                const db = dbModule.db;
                const lastOrder = await db.orders
                    .where('user_id')
                    .equals(user.id)
                    .reverse()
                    .sortBy('order_number');
                
                // Get the literal max or 0
                const maxNum = lastOrder.length > 0 ? (lastOrder[0].order_number || 0) : 0;
                orderNumber = maxNum + 1;
            } catch (err) {
                console.error('Failed to get last order number from local DB:', err);
                orderNumber = Math.floor(Math.random() * 10000);
            }

            const orderData = {
                user_id: user.id,
                order_number: orderNumber,
                customer_name: customerName,
                customer_phone: customerPhone || null,
                customer_address: isDelivery ? customerAddress : null,
                status: 'pending',
                payment_method: paymentMethod,
                payment_status: isPaid ? 'paid' : 'pending',
                subtotal,
                delivery_fee: isDelivery ? deliveryFee : 0,
                total,
                notes: notes || null,
                is_delivery: isDelivery,
                user_slug: appSettings?.public_slug || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                rating_token: null,
                ...(appliedCoupon ? { discount_amount: discount, coupon_code: appliedCoupon.code } : {})
            };

            const orderId = crypto.randomUUID();

            const orderItems = cart.map(item => {
                const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                return {
                    id: crypto.randomUUID(),
                    order_id: orderId,
                    product_id: item.product.id,
                    product_name: item.product.name,
                    quantity: item.quantity,
                    unit_price: item.product.price,
                    total: (item.product.price + addonTotal) * item.quantity,
                    notes: item.notes || null
                };
            });

            const itemAddons: { itemIndex: number, id: string, order_item_id: string, addon_id: string, addon_name: string, addon_price: number, quantity: number }[] = [];
            cart.forEach((item, index) => {
                item.addons.forEach(addon => {
                    itemAddons.push({
                        itemIndex: index,
                        id: crypto.randomUUID(),
                        order_item_id: '', // Will be updated in DAL
                        addon_id: addon.id,
                        addon_name: addon.name,
                        addon_price: addon.price,
                        quantity: 1
                    });
                });
            });

            let couponData = null;
            if (appliedCoupon) {
                couponData = {
                    appliedCoupon,
                    discount,
                    customerPhone
                };
            }

            let loyaltyData = null;
            if (customerPhone) {
                const cleanPhone = customerPhone.replace(/\D/g, '');
                if (cleanPhone.length >= 10) {
                    const currentCustomer = loyaltyCustomer;
                    loyaltyData = {
                        customer: currentCustomer,
                        newCustomer: !currentCustomer ? {
                            user_id: user.id,
                            name: customerName.trim(),
                            phone: cleanPhone,
                            total_points: 0,
                            total_spent: 0,
                            total_orders: 0,
                            email: null,
                            created_at: new Date().toISOString()
                        } : null,
                        pointsEarned: isPaid ? Math.floor(total * 1) : 0, // Fallback default = 1 point per real
                        updateData: currentCustomer ? {
                            total_orders: (currentCustomer.total_orders || 0) + 1,
                            ...(isPaid ? {
                                total_spent: (currentCustomer.total_spent || 0) + total,
                                total_points: (currentCustomer.total_points || 0) + Math.floor(total * 1)
                            } : {})
                        } : null
                    };
                }
            }

            const orderWithId = { ...orderData, id: orderId };

            await createFullOrder(orderWithId, orderItems, itemAddons, loyaltyData, couponData);

            if (user) {
                sendNewOrderPush(user.id, orderNumber, customerName, total).catch(console.error);
            }

            logOrderCreated(orderId, orderNumber, total);
            toast.success(`Pedido #${orderNumber} gerado com sucesso!`);
            router.push('/pedidos');
        } catch (error) {
            console.error('Error creating order:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error(`Erro ao criar pedido: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <FiArrowLeft />
                </button>
                <div>
                    <h1 className={styles.title}>Novo Pedido</h1>
                    <p className={styles.subtitle}>Adicione os produtos e informações do cliente</p>
                </div>
            </div>

            <div className={styles.content}>
                {/* Products Section */}
                <div className={styles.productsSection}>
                    {/* Categories */}
                    <div className={styles.categories}>
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                className={`${styles.categoryBtn} ${selectedCategory === category.id ? styles.active : ''}`}
                                onClick={() => setSelectedCategory(category.id)}
                            >
                                <span className={styles.categoryIcon}>{category.icon}</span>
                                <span className={styles.categoryName}>{category.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Products Grid */}
                    {loading ? (
                        <div className={styles.productsGrid}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
                            ))}
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <div className={styles.productsGrid}>
                            {filteredProducts.map((product) => {
                                const inCart = cart.find(item => item.product.id === product.id);
                                return (
                                    <Card
                                        key={product.id}
                                        className={`${styles.productCard} ${inCart ? styles.inCart : ''}`}
                                        onClick={() => handleAddToCart(product)}
                                        hoverable
                                    >
                                        <div className={styles.productInfo}>
                                            <span className={styles.productName}>{product.name}</span>
                                            <span className={styles.productPrice}>{formatCurrency(product.price)}</span>
                                        </div>
                                        {inCart && (
                                            <span className={styles.cartBadge}>{inCart.quantity}</span>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyProducts}>
                            <p>Nenhum produto nesta categoria</p>
                        </div>
                    )}
                </div>

                {/* Cart Section */}
                <div className={styles.cartSection}>
                    <Card className={styles.cartCard}>
                        <h2 className={styles.cartTitle}>Carrinho</h2>

                        {cart.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <p>Adicione produtos ao pedido</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.cartItems}>
                                    {cart.map((item, index) => {
                                        const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                                        const itemTotal = (item.product.price + addonTotal) * item.quantity;
                                        return (
                                            <div key={`${item.product.id}-${index}`} className={styles.cartItem}>
                                                <div className={styles.cartItemInfo}>
                                                    <span className={styles.cartItemName}>
                                                        {item.product.name}
                                                        {item.addons.length > 0 && (
                                                            <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>
                                                                + {item.addons.map(a => a.name).join(', ')}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className={styles.cartItemPrice}>
                                                        {formatCurrency(itemTotal)}
                                                    </span>
                                                </div>
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
                                                    <button
                                                        className={styles.removeBtn}
                                                        onClick={() => removeFromCart(item.product.id)}
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Observação..."
                                                    value={item.notes}
                                                    onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                                                    className={styles.itemNotes}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={styles.cartDivider} />

                                {/* Customer Info */}
                                <div className={styles.customerSection}>
                                    <Input
                                        label="Nome do Cliente"
                                        placeholder="Nome"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        leftIcon={<FiUser />}
                                        required
                                    />

                                    <Input
                                        label="Telefone"
                                        placeholder="(00) 00000-0000"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        leftIcon={<FiPhone />}
                                    />

                                    <div className={styles.deliveryToggle}>
                                        <button
                                            className={`${styles.toggleBtn} ${!isDelivery ? styles.active : ''}`}
                                            onClick={() => setIsDelivery(false)}
                                        >
                                            🏪 Balcão
                                        </button>
                                        <button
                                            className={`${styles.toggleBtn} ${isDelivery ? styles.active : ''}`}
                                            onClick={() => setIsDelivery(true)}
                                        >
                                            🚚 Entrega
                                        </button>
                                    </div>

                                    {isDelivery && (
                                        <>
                                            <Input
                                                label="Endereço"
                                                placeholder="Rua, número, bairro..."
                                                value={customerAddress}
                                                onChange={(e) => setCustomerAddress(e.target.value)}
                                                leftIcon={<FiMapPin />}
                                            />
                                            <Input
                                                label="Taxa de Entrega"
                                                type="number"
                                                placeholder="0,00"
                                                value={deliveryFee.toString()}
                                                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                                            />
                                        </>
                                    )}
                                </div>

                                <div className={styles.cartDivider} />

                                {/* Payment */}
                                <div className={styles.paymentSection}>
                                    <label className={styles.sectionLabel}>Forma de Pagamento</label>
                                    <div className={styles.paymentMethods}>
                                        {paymentMethods.map((method) => (
                                            <button
                                                key={method.value}
                                                className={`${styles.paymentBtn} ${paymentMethod === method.value ? styles.active : ''}`}
                                                onClick={() => setPaymentMethod(method.value)}
                                            >
                                                {method.label}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        className={`${styles.paidToggle} ${isPaid ? styles.active : ''}`}
                                        onClick={() => setIsPaid(!isPaid)}
                                    >
                                        <span className={styles.checkbox}>
                                            {isPaid && <FiCheck />}
                                        </span>
                                        Pagamento Recebido
                                    </button>
                                </div>

                                <div className={styles.cartDivider} />

                                {/* Coupon Section - only show if coupons are enabled */}
                                {appSettings?.coupons_enabled !== false && (
                                    <div className={styles.couponSection}>
                                        <label className={styles.sectionLabel}>Cupom de Desconto</label>
                                        <div className={styles.couponInput}>
                                            <Input
                                                placeholder="Digite o cupom"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                leftIcon={<FiTag />}
                                                disabled={!!appliedCoupon}
                                            />
                                            {appliedCoupon ? (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                                                >
                                                    Remover
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    onClick={validateCoupon}
                                                    isLoading={validatingCoupon}
                                                    disabled={!couponCode.trim()}
                                                >
                                                    Aplicar
                                                </Button>
                                            )}
                                        </div>
                                        {couponError && <p className={styles.couponError}>{couponError}</p>}
                                        {appliedCoupon && (
                                            <p className={styles.couponSuccess}>
                                                ✓ Desconto de {appliedCoupon.discount_type === 'percentage'
                                                    ? `${appliedCoupon.discount_value}%`
                                                    : formatCurrency(appliedCoupon.discount_value)} aplicado!
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Totals */}
                                <div className={styles.totals}>
                                    <div className={styles.totalRow}>
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className={`${styles.totalRow} ${styles.discountRow}`}>
                                            <span>🎫 {appliedCoupon.code}</span>
                                            <span>-{formatCurrency(discount)}</span>
                                        </div>
                                    )}
                                    {isDelivery && deliveryFee > 0 && (
                                        <div className={styles.totalRow}>
                                            <span>Taxa de Entrega</span>
                                            <span>{formatCurrency(deliveryFee)}</span>
                                        </div>
                                    )}
                                    <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                                        <span>Total</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                    {loyaltyCustomer && (
                                        <div className={styles.loyaltyInfo}>
                                            <FiGift />
                                            <span>Cliente: {loyaltyCustomer.name} • {loyaltyCustomer.total_points} pts</span>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    fullWidth
                                    size="lg"
                                    onClick={handleSubmit}
                                    isLoading={submitting}
                                    disabled={!customerName || cart.length === 0}
                                >
                                    Criar Pedido
                                </Button>
                            </>
                        )}
                    </Card>
                </div>
            </div>

            {/* Addon Selection Modal */}
            {showAddonModal && pendingProduct && (
                <div className={styles.modalOverlay} onClick={() => setShowAddonModal(false)}>
                    <div className={styles.addonModal} onClick={(e) => e.stopPropagation()}>
                        <h2>Adicionais para {pendingProduct.name}</h2>

                        {productAddonGroups.map((group) => (
                            <div key={group.id} className={styles.addonGroup}>
                                <h3>
                                    {group.name}
                                    {group.required && <span style={{ color: '#f39c12', fontSize: '0.8rem' }}> (Obrigatório)</span>}
                                </h3>
                                <div className={styles.addonList}>
                                    {group.addons.map((addon) => (
                                        <label
                                            key={addon.id}
                                            className={`${styles.addonOption} ${selectedAddons.find(a => a.id === addon.id) ? styles.selected : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!selectedAddons.find(a => a.id === addon.id)}
                                                onChange={() => toggleAddon(addon)}
                                            />
                                            <span>{addon.name}</span>
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
                            <Button variant="ghost" onClick={() => setShowAddonModal(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={confirmAddToCart}>
                                Adicionar ao Pedido
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
