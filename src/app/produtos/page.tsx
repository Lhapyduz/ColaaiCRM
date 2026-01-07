'use client';

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
}

interface AddonGroup {
    id: string;
    name: string;
    description: string | null;
    required: boolean;
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
        available: true
    });
    const [saving, setSaving] = useState(false);

    // Addon groups
    const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
    const [selectedAddonGroups, setSelectedAddonGroups] = useState<string[]>([]);

    const productsLimit = getLimit('products');
    const isAtLimit = !isWithinLimit('products', products.length);

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
                supabase.from('products').select('*').eq('user_id', user.id).order('name'),
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
                available: product.available
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
                available: true
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
                available: productForm.available
            };

            let productId: string;

            if (editingProduct) {
                await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id);
                productId = editingProduct.id;
            } else {
                const { data } = await supabase.from('products').insert(productData).select().single();
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
                        <p className={styles.subtitle}>Gerencie seu cardápio</p>
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
                    <div className={styles.productsGrid}>
                        {filteredProducts.map((product) => {
                            const category = getCategoryById(product.category_id);
                            return (
                                <Card key={product.id} className={`${styles.productCard} ${!product.available ? styles.unavailable : ''}`}>
                                    <div className={styles.productHeader}>
                                        <span className={styles.productCategory}>
                                            {category?.icon} {category?.name}
                                        </span>
                                        <button
                                            className={`${styles.availabilityToggle} ${product.available ? styles.available : ''}`}
                                            onClick={() => toggleAvailability(product)}
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
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => openProductModal(product)}
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                className={`${styles.actionBtn} ${styles.danger}`}
                                                onClick={() => deleteProduct(product.id)}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
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
