'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch,
    FiMove,
    FiTag
} from 'react-icons/fi';
import Image from 'next/image';
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
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUpload from '@/components/ui/ImageUpload';
import { LimitWarning } from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';
import { useProductsCache, useCategoriesCache } from '@/hooks/useDataCache';

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
    promo_enabled: boolean;
    promo_value: number;
    promo_type: 'value' | 'percentage';
}

interface AddonGroup {
    id: string;
    name: string;
    description: string | null;
    required: boolean;
}

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
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={cn(
                'p-4! flex flex-col relative transition-all duration-200',
                !product.available && 'opacity-60',
                isDragging && 'shadow-[0_8px_24px_rgba(0,0,0,0.3)] border-primary'
            )}>
                <div
                    className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 text-text-muted opacity-0 cursor-grab transition-all duration-fast rounded-sm z-10 touch-none select-none hover:text-primary hover:bg-primary/10 active:cursor-grabbing group-hover:opacity-100"
                    {...attributes}
                    {...listeners}
                    title="Arraste para reordenar"
                    style={{ opacity: 1 }}
                >
                    <FiMove size={14} />
                </div>
                <div className="flex gap-4">
                    {product.image_url && (
                        <div className="relative shrink-0 w-20 h-20 rounded-md overflow-hidden bg-bg-tertiary">
                            <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="80px"
                            />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs text-text-muted">
                                {category?.icon} {category?.name}
                            </span>
                            <button
                                className={cn(
                                    'px-2.5 py-1 border-none rounded-full text-[0.7rem] font-medium cursor-pointer transition-all duration-fast',
                                    product.available ? 'bg-accent/10 text-accent' : 'bg-error/10 text-error'
                                )}
                                onClick={onToggleAvailability}
                            >
                                {product.available ? 'Disponível' : 'Indisponível'}
                            </button>
                        </div>
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-base font-semibold truncate flex-1">{product.name}</h3>
                            {product.promo_enabled && (
                                <span className="ml-2 px-1.5 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded flex items-center gap-0.5">
                                    <FiTag size={10} /> Promo
                                </span>
                            )}
                        </div>
                        {product.description && (
                            <p className="text-[0.8125rem] text-text-secondary mb-3 flex-1 line-clamp-2 overflow-hidden">{product.description}</p>
                        )}
                        <div className="flex justify-between items-center mt-auto pt-3 border-t border-border">
                            <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                            <div className="flex gap-1">
                                <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-tertiary hover:text-text-primary" onClick={onEdit}>
                                    <FiEdit2 />
                                </button>
                                <button
                                    className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-error/10 hover:text-error"
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

    // Novo sistema de cache: Economia de ~50% nas consultas
    const {
        products: cachedProducts,
        loading: productsLoading,
        refetch: refetchProducts
    } = useProductsCache();

    const {
        categories: cachedCategories,
        loading: categoriesLoading,
        refetch: refetchCategories
    } = useCategoriesCache();

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Sincronizar estado local com cache
    useEffect(() => {
        if (cachedProducts) setProducts(cachedProducts);
    }, [cachedProducts]);

    useEffect(() => {
        if (cachedCategories) setCategories(cachedCategories);
    }, [cachedCategories]);

    useEffect(() => {
        setLoading(productsLoading || categoriesLoading);
    }, [productsLoading, categoriesLoading]);

    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        category_id: '',
        available: true,
        image_url: null as string | null,
        promo_enabled: false,
        promo_value: '',
        promo_type: 'percentage' as 'value' | 'percentage'
    });
    const [saving, setSaving] = useState(false);

    const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
    const [selectedAddonGroups, setSelectedAddonGroups] = useState<string[]>([]);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const productsLimit = getLimit('products');
    const isAtLimit = !isWithinLimit('products', products.length);
    const toast = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (isDragging) {
            const preventScroll = (e: TouchEvent) => e.preventDefault();
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
        // useProductsCache e useCategoriesCache já lidam com produtos e categorias.
        // Precisamos carregar os addon_groups separadamente, pois não estão no cache.
        if (user) {
            supabase
                .from('addon_groups')
                .select('id, name, description, required')
                .eq('user_id', user.id)
                .order('name')
                .then(({ data }) => {
                    if (data) setAddonGroups(data);
                });
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
            toast.error('Erro ao carregar produtos');
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

    const handleDragStart = useCallback((_event: DragStartEvent) => setIsDragging(true), []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setIsDragging(false);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setProducts((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(async () => {
                    try {
                        await Promise.all(newItems.map((item, index) =>
                            supabase.from('products').update({ display_order: index }).eq('id', item.id)
                        ));
                    } catch (error) {
                        console.error('Failed to save product order:', error);
                    }
                }, 500);
                return newItems;
            });
        }
    }, []);

    const openProductModal = async (product?: Product) => {
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
                image_url: product.image_url,
                promo_enabled: product.promo_enabled ?? false,
                promo_value: (product.promo_value ?? 0).toString(),
                promo_type: (product.promo_type as 'value' | 'percentage') ?? 'percentage'
            });
            const { data } = await supabase.from('product_addon_groups').select('group_id').eq('product_id', product.id);
            setSelectedAddonGroups(data?.map(g => g.group_id) || []);
        } else {
            setEditingProduct(null);
            setProductForm({
                name: '',
                description: '',
                price: '',
                category_id: categories[0]?.id || '',
                available: true,
                image_url: null,
                promo_enabled: false,
                promo_value: '',
                promo_type: 'percentage'
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
                image_url: productForm.image_url,
                promo_enabled: productForm.promo_enabled,
                promo_value: parseFloat(productForm.promo_value) || 0,
                promo_type: productForm.promo_type
            };
            let productId: string;
            if (editingProduct) {
                await supabase.from('products').update(productData).eq('id', editingProduct.id);
                productId = editingProduct.id;
            } else {
                const maxOrder = products.length > 0 ? Math.max(...products.map(p => p.display_order || 0)) : -1;
                const { data } = await supabase.from('products').insert({ ...productData, display_order: maxOrder + 1 }).select().single();
                productId = data.id;
            }
            await supabase.from('product_addon_groups').delete().eq('product_id', productId);
            if (selectedAddonGroups.length > 0) {
                await supabase.from('product_addon_groups').insert(selectedAddonGroups.map(groupId => ({ product_id: productId, group_id: groupId })));
            }
            toast.success(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
            refetchProducts(); // Invalida o cache
            closeProductModal();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Erro ao salvar produto');
        } finally {
            setSaving(false);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            const product = products.find(p => p.id === id);
            if (product?.image_url) {
                const urlParts = product.image_url.split('product-images/');
                if (urlParts.length >= 2) {
                    await supabase.storage.from('product-images').remove([urlParts[1]]);
                }
            }
            await supabase.from('products').delete().eq('id', id);
            toast.success('Produto excluído!');
            refetchProducts(); // Invalida o cache
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Erro ao excluir produto');
        }
    };

    const toggleAvailability = async (product: Product) => {
        try {
            await supabase.from('products').update({ available: !product.available }).eq('id', product.id);
            refetchProducts(); // Invalida o cache
        } catch (error) {
            console.error('Error toggling availability:', error);
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto overscroll-contain">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 gap-5 max-md:flex-col">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Produtos</h1>
                    <p className="text-text-secondary">Gerencie seu cardápio (arraste para reordenar)</p>
                </div>
                <Button leftIcon={<FiPlus />} onClick={() => openProductModal()} disabled={isAtLimit}>
                    Novo Produto
                </Button>
            </div>

            <LimitWarning resource="produtos" current={products.length} limit={productsLimit} requiredPlan="Avançado" />

            {/* Filters */}
            <Card className="mb-6 px-5! py-4!">
                <div className="flex flex-col gap-4">
                    <div className="max-w-[400px]">
                        <Input placeholder="Buscar produto..." leftIcon={<FiSearch />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button className={cn('px-4 py-2 bg-bg-tertiary border border-border rounded-full text-text-secondary text-sm cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary', !selectedCategory && 'bg-primary border-primary text-white')} onClick={() => setSelectedCategory(null)}>
                            Todos
                        </button>
                        {categories.map((category) => (
                            <button key={category.id} className={cn('px-4 py-2 bg-bg-tertiary border border-border rounded-full text-text-secondary text-sm cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary', selectedCategory === category.id && 'bg-primary border-primary text-white')} onClick={() => setSelectedCategory(category.id)}>
                                {category.icon} {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Products Grid */}
            {loading ? (
                <div className="grid grid-cols-3 gap-4 max-[1024px]:grid-cols-2 max-md:grid-cols-1 overscroll-y-none">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-40 rounded-xl bg-bg-tertiary animate-pulse" />
                    ))}
                </div>
            ) : filteredProducts.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={filteredProducts.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 gap-4 max-[1024px]:grid-cols-2 max-md:grid-cols-1 overscroll-y-none">
                            {filteredProducts.map((product) => (
                                <SortableProductCard key={product.id} product={product} category={getCategoryById(product.category_id)} formatCurrency={formatCurrency} onEdit={() => openProductModal(product)} onDelete={() => deleteProduct(product.id)} onToggleAvailability={() => toggleAvailability(product)} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="flex flex-col items-center justify-center py-15 px-5 text-center">
                    <span className="text-6xl mb-4">🍔</span>
                    <h3 className="text-xl mb-2">Nenhum produto encontrado</h3>
                    <p className="text-text-secondary mb-5">Adicione produtos ao seu cardápio</p>
                    <Button leftIcon={<FiPlus />} onClick={() => openProductModal()}>Novo Produto</Button>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-modal p-6 animate-[fadeIn_0.15s_ease]" onClick={closeProductModal}>
                    <div className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-bg-card rounded-xl border border-border p-7 animate-[scaleIn_0.15s_ease] scrollbar-thin" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold mb-6">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>

                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-text-secondary">Foto do Produto</label>
                                <ImageUpload value={productForm.image_url} onChange={(url) => setProductForm({ ...productForm, image_url: url })} folder={user?.id} placeholder="Adicionar foto do produto" />
                            </div>

                            <Input label="Nome" placeholder="Nome do produto" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />

                            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-text-secondary">Categoria</label>
                                    <select className="h-12 px-4 bg-bg-tertiary border-2 border-border rounded-md text-text-primary text-[0.9375rem] focus:border-primary focus:outline-none" value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                                        {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>))}
                                    </select>
                                </div>
                                <Input label="Preço" type="number" placeholder="0,00" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-text-secondary">Descrição (opcional)</label>
                                <textarea className="px-4 py-3 bg-bg-tertiary border-2 border-border rounded-md text-text-primary text-[0.9375rem] resize-y min-h-20 focus:border-primary focus:outline-none" placeholder="Descrição do produto" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={3} />
                            </div>

                            {addonGroups.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-text-secondary">Grupos de Adicionais</label>
                                    <p className="text-[0.8rem] text-text-muted mb-1">Selecione quais adicionais este produto pode ter</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {addonGroups.map((group) => (
                                            <label key={group.id} className={cn('flex items-center gap-2 px-3.5 py-2 bg-bg-tertiary border-2 border-border rounded-md cursor-pointer transition-all duration-fast text-sm hover:border-primary', selectedAddonGroups.includes(group.id) && 'bg-primary/10 border-primary')}>
                                                <input type="checkbox" className="w-4 h-4 accent-primary" checked={selectedAddonGroups.includes(group.id)} onChange={(e) => {
                                                    if (e.target.checked) setSelectedAddonGroups([...selectedAddonGroups, group.id]);
                                                    else setSelectedAddonGroups(selectedAddonGroups.filter(id => id !== group.id));
                                                }} />
                                                <span>{group.name}</span>
                                                {group.required && <span className="text-[0.7rem] text-warning ml-1">(Obrigatório)</span>}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input type="checkbox" className="w-[18px] h-[18px] accent-primary" checked={productForm.available} onChange={(e) => setProductForm({ ...productForm, available: e.target.checked })} />
                                Produto disponível
                            </label>

                            <div className="mt-2 p-4 bg-bg-tertiary rounded-lg border border-border">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <FiTag className={cn(productForm.promo_enabled ? "text-success" : "text-text-muted")} />
                                        <span className="text-sm font-semibold">Promoção</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setProductForm({ ...productForm, promo_enabled: !productForm.promo_enabled })}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                            productForm.promo_enabled ? "bg-success" : "bg-bg-card border border-border"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                productForm.promo_enabled ? "translate-x-6" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>

                                {productForm.promo_enabled && (
                                    <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease]">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium text-text-secondary">Tipo</label>
                                            <select
                                                className="h-10 px-3 bg-bg-card border border-border rounded text-sm text-text-primary focus:border-primary focus:outline-none"
                                                value={productForm.promo_type}
                                                onChange={(e) => setProductForm({ ...productForm, promo_type: e.target.value as 'value' | 'percentage' })}
                                            >
                                                <option value="percentage">Porcentagem (%)</option>
                                                <option value="value">Valor Fixo (R$)</option>
                                            </select>
                                        </div>
                                        <Input
                                            label={productForm.promo_type === 'percentage' ? "Porcentagem (%)" : "Desconto (R$)"}
                                            type="number"
                                            placeholder="0"
                                            value={productForm.promo_value}
                                            onChange={(e) => setProductForm({ ...productForm, promo_value: e.target.value })}
                                            className="h-10!"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button className="px-4 py-2 bg-transparent border-none text-text-secondary cursor-pointer hover:text-text-primary" onClick={closeProductModal}>Cancelar</button>
                            <Button onClick={handleSaveProduct} isLoading={saving}>{editingProduct ? 'Salvar' : 'Criar Produto'}</Button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
