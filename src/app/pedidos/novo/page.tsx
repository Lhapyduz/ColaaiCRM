'use client';

import React, { useState, useEffect } from 'react';
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
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logOrderCreated } from '@/lib/actionLogger';
import { formatCurrency } from '@/hooks/useFormatters';
import styles from './page.module.css';

interface Category {
    id: string;
    name: string;
    icon: string;
}

interface Product {
    id: string;
    name: string;
    price: number;
    category_id: string;
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

const paymentMethods = [
    { value: 'money', label: '💵 Dinheiro' },
    { value: 'pix', label: '📱 PIX' },
    { value: 'credit', label: '💳 Crédito' },
    { value: 'debit', label: '💳 Débito' }
];

export default function NovoPedidoPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Customer info
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [isDelivery, setIsDelivery] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('money');
    const [isPaid, setIsPaid] = useState(false);
    const [notes, setNotes] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{
        id: string;
        code: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
    } | null>(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    // Loyalty state
    const [loyaltyCustomer, setLoyaltyCustomer] = useState<{ id: string; name: string; total_points: number } | null>(null);

    // App settings (for feature toggles)
    const [appSettings, setAppSettings] = useState<{ coupons_enabled: boolean; loyalty_enabled: boolean } | null>(null);

    // Addons modal state
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    const [productAddonGroups, setProductAddonGroups] = useState<AddonGroup[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
    const [loadingAddons, setLoadingAddons] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user) return;

        try {
            const [categoriesRes, productsRes, appSettingsRes] = await Promise.all([
                supabase.from('categories').select('*').eq('user_id', user.id),
                supabase.from('products').select('*').eq('user_id', user.id).eq('available', true),
                supabase.from('app_settings').select('coupons_enabled, loyalty_enabled').eq('user_id', user.id).single()
            ]);

            if (categoriesRes.data) {
                setCategories(categoriesRes.data);
                if (categoriesRes.data.length > 0) {
                    setSelectedCategory(categoriesRes.data[0].id);
                }
            }

            if (productsRes.data) {
                setProducts(productsRes.data);
            }

            if (appSettingsRes.data) {
                setAppSettings(appSettingsRes.data);
            } else {
                // Default to enabled if no settings
                setAppSettings({ coupons_enabled: true, loyalty_enabled: true });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = selectedCategory
        ? products.filter(p => p.category_id === selectedCategory)
        : products;

    // Load addons for a product
    const loadProductAddons = async (productId: string): Promise<AddonGroup[]> => {
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


    // Validate coupon
    const validateCoupon = async () => {
        if (!couponCode.trim() || !user) return;

        setCouponError('');
        setValidatingCoupon(true);

        try {
            const now = new Date().toISOString();

            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('user_id', user.id)
                .eq('code', couponCode.toUpperCase())
                .eq('active', true)
                .single();

            if (error || !coupon) {
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

            setAppliedCoupon({
                id: coupon.id,
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value
            });
        } catch (err) {
            setCouponError('Erro ao validar cupom');
        } finally {
            setValidatingCoupon(false);
        }
    };

    // Search loyalty customer by phone
    const searchLoyaltyCustomer = async (phone: string) => {
        if (!phone || phone.length < 10 || !user) return;

        const { data } = await supabase
            .from('customers')
            .select('id, name, total_points')
            .eq('user_id', user.id)
            .eq('phone', phone.replace(/\D/g, ''))
            .single();

        if (data) {
            setLoyaltyCustomer(data);
        } else {
            setLoyaltyCustomer(null);
        }
    };

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
    }, [customerPhone]);



    const handleSubmit = async () => {
        if (!user || !customerName || cart.length === 0) return;

        setSubmitting(true);

        try {
            // Get next order number
            const { data: lastOrder } = await supabase
                .from('orders')
                .select('order_number')
                .eq('user_id', user.id)
                .order('order_number', { ascending: false })
                .limit(1)
                .single();

            const orderNumber = (lastOrder?.order_number || 0) + 1;

            // Create order
            const orderData: Record<string, unknown> = {
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
                is_delivery: isDelivery
            };

            // Add coupon fields if coupon is applied (fields may not exist in older schemas)
            if (appliedCoupon) {
                orderData.discount_amount = discount;
                orderData.coupon_code = appliedCoupon.code;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single();

            if (orderError) {
                console.error('Order creation error:', orderError);
                throw new Error(orderError.message || 'Failed to create order');
            }

            // Create order items with addons
            const orderItems = cart.map(item => {
                const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
                return {
                    order_id: order.id,
                    product_id: item.product.id,
                    product_name: item.product.name,
                    quantity: item.quantity,
                    unit_price: item.product.price,
                    total: (item.product.price + addonTotal) * item.quantity,
                    notes: item.notes || null
                };
            });

            const { data: insertedItems, error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)
                .select('id');

            if (itemsError) {
                console.error('Order items error:', itemsError);
                throw new Error(itemsError.message || 'Failed to create order items');
            }

            // Save addons for each order item
            if (insertedItems) {
                const addonInserts: { order_item_id: string; addon_id: string; addon_name: string; addon_price: number; quantity: number }[] = [];

                cart.forEach((item, index) => {
                    if (item.addons.length > 0 && insertedItems[index]) {
                        item.addons.forEach(addon => {
                            addonInserts.push({
                                order_item_id: insertedItems[index].id,
                                addon_id: addon.id,
                                addon_name: addon.name,
                                addon_price: addon.price,
                                quantity: 1
                            });
                        });
                    }
                });

                if (addonInserts.length > 0) {
                    await supabase.from('order_item_addons').insert(addonInserts);
                }
            }

            // Log order creation
            logOrderCreated(order.id, orderNumber, total);

            // Update coupon usage if applied (non-blocking errors)
            if (appliedCoupon) {
                try {
                    // Get current count and increment
                    const { data: couponData } = await supabase
                        .from('coupons')
                        .select('usage_count')
                        .eq('id', appliedCoupon.id)
                        .single();

                    if (couponData) {
                        await supabase
                            .from('coupons')
                            .update({ usage_count: (couponData.usage_count || 0) + 1 })
                            .eq('id', appliedCoupon.id);
                    }

                    // Record coupon usage
                    await supabase.from('coupon_usage').insert({
                        coupon_id: appliedCoupon.id,
                        order_id: order.id,
                        customer_phone: customerPhone || null,
                        discount_applied: discount
                    });
                } catch (couponErr) {
                    console.warn('Coupon usage tracking failed:', couponErr);
                }
            }

            // Register customer in loyalty program if phone provided (always, not just when paid)
            if (customerPhone) {
                try {
                    // Normalize phone number - remove all non-digits
                    const cleanPhone = customerPhone.replace(/\D/g, '');

                    // Skip if phone is too short after cleaning
                    if (cleanPhone.length < 10) {
                        console.warn('Phone number too short for loyalty registration:', cleanPhone);
                    } else {
                        // Get or create customer
                        let { data: customer, error: fetchError } = await supabase
                            .from('customers')
                            .select('id, total_points, total_spent, total_orders')
                            .eq('user_id', user.id)
                            .eq('phone', cleanPhone)
                            .single();

                        if (fetchError && fetchError.code === 'PGRST116') {
                            // Customer doesn't exist - create new one
                            const { data: newCustomer, error: insertError } = await supabase
                                .from('customers')
                                .insert({
                                    user_id: user.id,
                                    name: customerName.trim(),
                                    phone: cleanPhone,
                                    total_points: 0,
                                    total_spent: 0,
                                    total_orders: 0,
                                    tier: 'bronze'
                                })
                                .select()
                                .single();

                            if (insertError) {
                                console.error('Failed to create customer:', insertError);
                            } else {
                                customer = newCustomer;
                            }
                        }

                        if (customer) {
                            // Calculate points only if order is paid
                            let pointsEarned = 0;

                            if (isPaid) {
                                // Get loyalty settings
                                const { data: settings } = await supabase
                                    .from('loyalty_settings')
                                    .select('points_per_real')
                                    .eq('user_id', user.id)
                                    .single();

                                const pointsPerReal = settings?.points_per_real || 1;
                                pointsEarned = Math.floor(total * pointsPerReal);

                                // Add points transaction if earned
                                if (pointsEarned > 0) {
                                    await supabase.from('points_transactions').insert({
                                        user_id: user.id,
                                        customer_id: customer.id,
                                        points: pointsEarned,
                                        type: 'earned',
                                        description: `Pedido #${orderNumber}`,
                                        order_id: order.id
                                    });
                                }
                            }

                            // Get current customer data for coupon tracking
                            const { data: currentCustomer } = await supabase
                                .from('customers')
                                .select('coupons_used, total_discount_savings')
                                .eq('id', customer.id)
                                .single();

                            // Build update data - always update orders count
                            const updateData: Record<string, number> = {
                                total_orders: (customer.total_orders || 0) + 1
                            };

                            // Add spent and points if paid
                            if (isPaid) {
                                updateData.total_spent = (customer.total_spent || 0) + total;
                                updateData.total_points = (customer.total_points || 0) + pointsEarned;
                            }

                            // Add coupon tracking if coupon was applied
                            if (appliedCoupon && discount > 0) {
                                updateData.coupons_used = (currentCustomer?.coupons_used || 0) + 1;
                                updateData.total_discount_savings = (currentCustomer?.total_discount_savings || 0) + discount;
                            }

                            await supabase
                                .from('customers')
                                .update(updateData)
                                .eq('id', customer.id);
                        }
                    }
                } catch (loyaltyErr) {
                    console.warn('Loyalty registration failed:', loyaltyErr);
                }
            }

            toast.success(`Pedido #${orderNumber} criado com sucesso!`);
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
        <MainLayout>
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

            {loadingAddons && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner} />
                </div>
            )}
        </MainLayout>
    );
}
