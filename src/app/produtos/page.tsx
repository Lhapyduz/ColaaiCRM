'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch,
    FiMove
} from 'react-icons/fi';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUpload from '@/components/ui/ImageUpload';
import { LimitWarning } from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
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
    category_id: string;
    available: boolean;
    display_order: number;
    image_url: string | null;
}

interface AddonGroup {
    id: string;
    name: string;
    description: string | null;
    required: boolean;
}

// Sortable Product Card Component
function SortableProductCard({
    product,
    category,
    formatCurrency,
    onEdit,
    onDelete,
    onToggleAvailability
}: {
    product: Product;
    category: Category | undefined;
    formatCurrency: (value: number) => string;
    onEdit: () => void;
    onDelete: () => void;
    onToggleAvailability: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        touchAction: 'none', // Prevent browser native touch gestures
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`${styles.productCard} ${!product.available ? styles.unavailable : ''} ${isDragging ? styles.dragging : ''}`}>
                <div
                    className={styles.dragHandle}
                    {...attributes}
                    {...listeners}
                    title="Arraste para reordenar"
                >
                    <FiMove size={14} />
                </div>
                <div className={styles.productContent}>
                    {product.image_url && (
                        <div className={styles.productImageWrapper}>
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className={styles.productImage}
                            />
                        </div>
                    )}
                    <div className={styles.productInfo}>
                        <div className={styles.productHeader}>
                            <span className={styles.productCategory}>
                                {category?.icon} {category?.name}
                            </span>
                            <button
                                className={`${styles.availabilityToggle} ${product.available ? styles.available : ''}`}
                                onClick={onToggleAvailability}
                            >
                                {product.available ? 'Disponível' : 'Indisponível'}
                            </button>
                        </div>
                        <h3 className={styles.productName}>{product.name}</h3>
                        {product.description && (
                            <p className={styles.productDescription}>{product.description}</p>
                        )}
                        <div className={styles.productFooter}>
                            <span className={styles.productPrice}>{formatCurrency(product.price)}</span>
                            <div className={styles.productActions}>
                                <button className={styles.actionBtn} onClick={onEdit}>
                                    <FiEdit2 />
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${styles.danger}`}
                                    onClick={onDelete}
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function ProdutosPage() {
    const { user } = useAuth();
    const { getLimit, isWithinLimit } = useSubscription();
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        category_id: '',
        available: true,
        image_url: null as string | null
    });
    const [saving, setSaving] = useState(false);

    // Addon groups
    const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
    const [selectedAddonGroups, setSelectedAddonGroups] = useState<string[]>([]);

    // Debounce timer ref for saving order
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // State to track dragging and block scroll/refresh
    const [isDragging, setIsDragging] = useState(false);

    const productsLimit = getLimit('products');
    const isAtLimit = !isWithinLimit('products', products.length);

    // DnD sensors - with delay to prevent pull-to-refresh on touch devices
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Block body scroll/refresh while dragging
    useEffect(() => {
        if (isDragging) {
            const preventScroll = (e: TouchEvent) => {
                e.preventDefault();
            };
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            document.addEventListener('touchmove', preventScroll, { passive: false });

            return () => {
                document.body.style.overflow = '';
                document.body.style.touchAction = '';
                document.removeEventListener('touchmove', preventScroll);
            };
        }
    }, [isDragging]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user) return;

        try {
            const [categoriesRes, productsRes, groupsRes] = await Promise.all([
                supabase.from('categories').select('*').eq('user_id', user.id),
                supabase.from('products').select('*').eq('user_id', user.id).order('display_order', { ascending: true }),
                supabase.from('addon_groups').select('id, name, description, required').eq('user_id', user.id).order('name')
            ]);

            if (categoriesRes.data) setCategories(categoriesRes.data);
            if (productsRes.data) setProducts(productsRes.data);
            if (groupsRes.data) setAddonGroups(groupsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryById = (id: string) => categories.find(c => c.id === id);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Handle drag start - prevent scroll/refresh
    const handleDragStart = useCallback((_event: DragStartEvent) => {
        setIsDragging(true);
    }, []);

    // Handle drag end - instant local update + background save
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setIsDragging(false);
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setProducts((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Clear any pending save
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }

                // Background save to database
                saveTimeoutRef.current = setTimeout(async () => {
                    try {
                        await Promise.all(
                            newItems.map((item, index) =>
                                supabase
                                    .from('products')
                                    .update({ display_order: index })
                                    .eq('id', item.id)
                            )
                        );
                    } catch (error) {
                        console.error('Failed to save product order:', error);
                    }
                }, 500);

                return newItems;
            });
        }
    }, []);

    const openProductModal = async (product?: Product) => {
        // Block new products if at limit
        if (!product && isAtLimit) {
            alert(`Limite de ${productsLimit} produtos atingido! Faça upgrade do seu plano para adicionar mais.`);
            return;
        }

        if (product) {
            setEditingProduct(product);
            setProductForm({
                name: product.name,
                description: product.description || '',
                price: product.price.toString(),
                category_id: product.category_id,
                available: product.available,
                image_url: product.image_url
            });
            // Load existing addon groups for this product
            const { data } = await supabase
                .from('product_addon_groups')
                .select('group_id')
                .eq('product_id', product.id);
            setSelectedAddonGroups(data?.map(g => g.group_id) || []);
        } else {
            setEditingProduct(null);
            setProductForm({
                name: '',
                description: '',
                price: '',
                category_id: categories[0]?.id || '',
                available: true,
                image_url: null
            });
            setSelectedAddonGroups([]);
        }
        setShowProductModal(true);
    };

    const closeProductModal = () => {
        setShowProductModal(false);
        setEditingProduct(null);
        setSelectedAddonGroups([]);
    };

    const handleSaveProduct = async () => {
        if (!user || !productForm.name || !productForm.price || !productForm.category_id) return;

        setSaving(true);

        try {
            const productData = {
                user_id: user.id,
                name: productForm.name,
                description: productForm.description || null,
                price: parseFloat(productForm.price),
                category_id: productForm.category_id,
                available: productForm.available,
                image_url: productForm.image_url
            };

            let productId: string;

            if (editingProduct) {
                await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id);
                productId = editingProduct.id;
            } else {
                // Set display_order for new product
                const maxOrder = products.length > 0
                    ? Math.max(...products.map(p => p.display_order || 0))
                    : -1;
                const { data } = await supabase.from('products').insert({
                    ...productData,
                    display_order: maxOrder + 1
                }).select().single();
                productId = data.id;
            }

            // Update addon groups
            await supabase.from('product_addon_groups').delete().eq('product_id', productId);

            if (selectedAddonGroups.length > 0) {
                await supabase.from('product_addon_groups').insert(
                    selectedAddonGroups.map(groupId => ({
                        product_id: productId,
                        group_id: groupId
                    }))
                );
            }

            fetchData();
            closeProductModal();
        } catch (error) {
            console.error('Error saving product:', error);
        } finally {
            setSaving(false);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            // Find the product to check if it has an image
            const product = products.find(p => p.id === id);

            // Delete image from storage if exists
            if (product?.image_url) {
                const urlParts = product.image_url.split('product-images/');
                if (urlParts.length >= 2) {
                    const filePath = urlParts[1];
                    await supabase.storage.from('product-images').remove([filePath]);
                }
            }

            await supabase.from('products').delete().eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const toggleAvailability = async (product: Product) => {
        try {
            await supabase
                .from('products')
                .update({ available: !product.available })
                .eq('id', product.id);
            fetchData();
        } catch (error) {
            console.error('Error toggling availability:', error);
        }
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Produtos</h1>
                        <p className={styles.subtitle}>Gerencie seu cardápio (arraste para reordenar)</p>
                    </div>
                    <Button leftIcon={<FiPlus />} onClick={() => openProductModal()} disabled={isAtLimit}>
                        Novo Produto
                    </Button>
                </div>

                <LimitWarning
                    resource="produtos"
                    current={products.length}
                    limit={productsLimit}
                    requiredPlan="Avançado"
                />

                {/* Filters */}
                <Card className={styles.filtersCard}>
                    <div className={styles.filters}>
                        <div className={styles.searchWrapper}>
                            <Input
                                placeholder="Buscar produto..."
                                leftIcon={<FiSearch />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className={styles.categoryFilter}>
                            <button
                                className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
                                onClick={() => setSelectedCategory(null)}
                            >
                                Todos
                            </button>
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    className={`${styles.categoryBtn} ${selectedCategory === category.id ? styles.active : ''}`}
                                    onClick={() => setSelectedCategory(category.id)}
                                >
                                    {category.icon} {category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Products Grid */}
                {loading ? (
                    <div className={styles.productsGrid}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={filteredProducts.map(p => p.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className={styles.productsGrid}>
                                {filteredProducts.map((product) => (
                                    <SortableProductCard
                                        key={product.id}
                                        product={product}
                                        category={getCategoryById(product.category_id)}
                                        formatCurrency={formatCurrency}
                                        onEdit={() => openProductModal(product)}
                                        onDelete={() => deleteProduct(product.id)}
                                        onToggleAvailability={() => toggleAvailability(product)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>🍔</span>
                        <h3>Nenhum produto encontrado</h3>
                        <p>Adicione produtos ao seu cardápio</p>
                        <Button leftIcon={<FiPlus />} onClick={() => openProductModal()}>
                            Novo Produto
                        </Button>
                    </div>
                )}

                {/* Product Modal */}
                {showProductModal && (
                    <div className={styles.modalOverlay} onClick={closeProductModal}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>
                                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                            </h2>

                            <div className={styles.modalForm}>
                                <div className={styles.formGroup}>
                                    <label>Foto do Produto</label>
                                    <ImageUpload
                                        value={productForm.image_url}
                                        onChange={(url) => setProductForm({ ...productForm, image_url: url })}
                                        folder={user?.id}
                                        placeholder="Adicionar foto do produto"
                                    />
                                </div>

                                <Input
                                    label="Nome"
                                    placeholder="Nome do produto"
                                    value={productForm.name}
                                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                    required
                                />

                                <div className={styles.formRow}>
                                    <div className={styles.selectWrapper}>
                                        <label>Categoria</label>
                                        <select
                                            value={productForm.category_id}
                                            onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.icon} {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Input
                                        label="Preço"
                                        type="number"
                                        placeholder="0,00"
                                        value={productForm.price}
                                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className={styles.textareaWrapper}>
                                    <label>Descrição (opcional)</label>
                                    <textarea
                                        placeholder="Descrição do produto"
                                        value={productForm.description}
                                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>

                                {addonGroups.length > 0 && (
                                    <div className={styles.addonGroupsSection}>
                                        <label>Grupos de Adicionais</label>
                                        <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
                                            Selecione quais adicionais este produto pode ter
                                        </p>
                                        <div className={styles.addonGroupsList}>
                                            {addonGroups.map((group) => (
                                                <label
                                                    key={group.id}
                                                    className={`${styles.addonGroupOption} ${selectedAddonGroups.includes(group.id) ? styles.selected : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAddonGroups.includes(group.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedAddonGroups([...selectedAddonGroups, group.id]);
                                                            } else {
                                                                setSelectedAddonGroups(selectedAddonGroups.filter(id => id !== group.id));
                                                            }
                                                        }}
                                                    />
                                                    <span>{group.name}</span>
                                                    {group.required && (
                                                        <span style={{ fontSize: '0.7rem', color: '#f39c12', marginLeft: '0.5rem' }}>
                                                            (Obrigatório)
                                                        </span>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={productForm.available}
                                        onChange={(e) => setProductForm({ ...productForm, available: e.target.checked })}
                                    />
                                    Produto disponível
                                </label>
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="ghost" onClick={closeProductModal}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveProduct} isLoading={saving}>
                                    {editingProduct ? 'Salvar' : 'Criar Produto'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
