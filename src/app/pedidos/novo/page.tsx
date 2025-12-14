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
    FiCheck
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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

interface CartItem {
    product: Product;
    quantity: number;
    notes: string;
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

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user) return;

        try {
            const [categoriesRes, productsRes] = await Promise.all([
                supabase.from('categories').select('*').eq('user_id', user.id),
                supabase.from('products').select('*').eq('user_id', user.id).eq('available', true)
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
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = selectedCategory
        ? products.filter(p => p.category_id === selectedCategory)
        : products;

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1, notes: '' }];
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

    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const total = subtotal + (isDelivery ? deliveryFee : 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

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
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
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
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Create order items
            const orderItems = cart.map(item => ({
                order_id: order.id,
                product_id: item.product.id,
                product_name: item.product.name,
                quantity: item.quantity,
                unit_price: item.product.price,
                total: item.product.price * item.quantity,
                notes: item.notes || null
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            router.push('/pedidos');
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Erro ao criar pedido');
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
                                            onClick={() => addToCart(product)}
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
                                        {cart.map((item) => (
                                            <div key={item.product.id} className={styles.cartItem}>
                                                <div className={styles.cartItemInfo}>
                                                    <span className={styles.cartItemName}>{item.product.name}</span>
                                                    <span className={styles.cartItemPrice}>
                                                        {formatCurrency(item.product.price * item.quantity)}
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
                                        ))}
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

                                    {/* Totals */}
                                    <div className={styles.totals}>
                                        <div className={styles.totalRow}>
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(subtotal)}</span>
                                        </div>
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
        </MainLayout>
    );
}
