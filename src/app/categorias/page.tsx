'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiMove } from 'react-icons/fi';
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
    productCount?: number;
    display_order: number;
}

const iconOptions = ['🌭', '🍔', '🍟', '🥤', '🍕', '🌮', '🥪', '🍗', '🍦', '🧁', '🥗', '🍜'];

// Sortable Category Card Component
function SortableCategoryCard({
    category,
    onEdit,
    onDelete
}: {
    category: Category;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        touchAction: 'none', // Prevent browser native touch gestures
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`${styles.categoryCard} ${isDragging ? styles.dragging : ''}`}>
                <div
                    className={styles.dragHandle}
                    {...attributes}
                    {...listeners}
                    title="Arraste para reordenar"
                >
                    <FiMove size={16} />
                </div>
                <div
                    className={styles.categoryIcon}
                    style={{ background: `${category.color}20` }}
                >
                    <span>{category.icon}</span>
                </div>
                <div className={styles.categoryInfo}>
                    <h3 className={styles.categoryName}>{category.name}</h3>
                    <span className={styles.productCount}>
                        {category.productCount} produto{category.productCount !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className={styles.categoryActions}>
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
            </Card>
        </div>
    );
}

export default function CategoriasPage() {
    const { user } = useAuth();
    const { getLimit, isWithinLimit } = useSubscription();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        icon: '🌭',
        color: '#ff6b35'
    });
    const [saving, setSaving] = useState(false);

    // Debounce timer ref for saving order
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // State to track dragging and block scroll/refresh
    const [isDragging, setIsDragging] = useState(false);

    const categoriesLimit = getLimit('categories');
    const isAtLimit = !isWithinLimit('categories', categories.length);

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
            fetchCategories();
        }
    }, [user]);

    const fetchCategories = async () => {
        if (!user) return;

        try {
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .order('display_order', { ascending: true });

            if (categoriesData) {
                // Get product counts
                const categoriesWithCounts = await Promise.all(
                    categoriesData.map(async (cat) => {
                        const { count } = await supabase
                            .from('products')
                            .select('*', { count: 'exact', head: true })
                            .eq('category_id', cat.id);
                        return { ...cat, productCount: count || 0 };
                    })
                );
                setCategories(categoriesWithCounts);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
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
            setCategories((items) => {
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
                        // Update display_order for all items
                        await Promise.all(
                            newItems.map((item, index) =>
                                supabase
                                    .from('categories')
                                    .update({ display_order: index })
                                    .eq('id', item.id)
                            )
                        );
                    } catch (error) {
                        console.error('Failed to save category order:', error);
                    }
                }, 500);

                return newItems;
            });
        }
    }, []);

    const openModal = (category?: Category) => {
        // Block new categories if at limit
        if (!category && isAtLimit) {
            alert(`Limite de ${categoriesLimit} categorias atingido! Faça upgrade do seu plano para adicionar mais.`);
            return;
        }

        if (category) {
            setEditingCategory(category);
            setCategoryForm({
                name: category.name,
                icon: category.icon,
                color: category.color
            });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', icon: '🌭', color: '#ff6b35' });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCategory(null);
    };

    const handleSave = async () => {
        if (!user || !categoryForm.name) return;

        setSaving(true);

        try {
            const categoryData = {
                user_id: user.id,
                name: categoryForm.name,
                icon: categoryForm.icon,
                color: categoryForm.color
            };

            if (editingCategory) {
                await supabase
                    .from('categories')
                    .update(categoryData)
                    .eq('id', editingCategory.id);
            } else {
                // Set display_order for new category
                const maxOrder = categories.length > 0
                    ? Math.max(...categories.map(c => c.display_order || 0))
                    : -1;
                await supabase.from('categories').insert({
                    ...categoryData,
                    display_order: maxOrder + 1
                });
            }

            fetchCategories();
            closeModal();
        } catch (error) {
            console.error('Error saving category:', error);
        } finally {
            setSaving(false);
        }
    };

    const deleteCategory = async (id: string) => {
        const category = categories.find(c => c.id === id);
        if (category && (category.productCount || 0) > 0) {
            alert('Não é possível excluir uma categoria que possui produtos.');
            return;
        }

        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

        try {
            await supabase.from('categories').delete().eq('id', id);
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Categorias</h1>
                        <p className={styles.subtitle}>Organize seus produtos em categorias (arraste para reordenar)</p>
                    </div>
                    <Button leftIcon={<FiPlus />} onClick={() => openModal()} disabled={isAtLimit}>
                        Nova Categoria
                    </Button>
                </div>

                <LimitWarning
                    resource="categorias"
                    current={categories.length}
                    limit={categoriesLimit}
                    requiredPlan="Avançado"
                />

                {loading ? (
                    <div className={styles.grid}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                        ))}
                    </div>
                ) : categories.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={categories.map(c => c.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className={styles.grid}>
                                {categories.map((category) => (
                                    <SortableCategoryCard
                                        key={category.id}
                                        category={category}
                                        onEdit={() => openModal(category)}
                                        onDelete={() => deleteCategory(category.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📁</span>
                        <h3>Nenhuma categoria</h3>
                        <p>Crie categorias para organizar seus produtos</p>
                        <Button leftIcon={<FiPlus />} onClick={() => openModal()}>
                            Nova Categoria
                        </Button>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className={styles.modalOverlay} onClick={closeModal}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>
                                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                            </h2>

                            <div className={styles.modalForm}>
                                <Input
                                    label="Nome"
                                    placeholder="Nome da categoria"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    required
                                />

                                <div className={styles.formRow}>
                                    <label>Ícone</label>
                                    <div className={styles.iconGrid}>
                                        {iconOptions.map((icon) => (
                                            <button
                                                key={icon}
                                                className={`${styles.iconBtn} ${categoryForm.icon === icon ? styles.active : ''}`}
                                                onClick={() => setCategoryForm({ ...categoryForm, icon })}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.formRow}>
                                    <label>Cor</label>
                                    <div className={styles.colorInput}>
                                        <input
                                            type="color"
                                            value={categoryForm.color}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                        />
                                        <span>{categoryForm.color}</span>
                                    </div>
                                </div>

                                <div className={styles.preview}>
                                    <div
                                        className={styles.previewIcon}
                                        style={{ background: `${categoryForm.color}20` }}
                                    >
                                        {categoryForm.icon}
                                    </div>
                                    <span>{categoryForm.name || 'Nome da Categoria'}</span>
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="ghost" onClick={closeModal}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSave} isLoading={saving}>
                                    {editingCategory ? 'Salvar' : 'Criar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
