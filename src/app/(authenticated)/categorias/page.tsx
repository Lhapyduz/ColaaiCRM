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
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { LimitWarning } from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    productCount?: number;
    display_order: number;
}

const iconOptions = ['🌭', '🍔', '🍟', '🥤', '🍕', '🌮', '🥪', '🍗', '🍦', '🧁', '🥗', '🍜'];

function SortableCategoryCard({ category, onEdit, onDelete }: { category: Category; onEdit: () => void; onDelete: () => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={cn('flex items-center gap-4 p-5! relative transition-all duration-200', isDragging && 'shadow-[0_8px_24px_rgba(0,0,0,0.3)] border-primary')}>
                <div
                    className="flex items-center justify-center w-6 h-6 text-text-muted opacity-100 cursor-grab transition-all duration-fast shrink-0 rounded-sm touch-none select-none hover:text-primary hover:bg-primary/10 active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                    title="Arraste para reordenar"
                >
                    <FiMove size={16} />
                </div>
                <div className="w-14 h-14 rounded-lg flex items-center justify-center text-[1.75rem]" style={{ background: `${category.color}20` }}>
                    <span>{category.icon}</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-semibold mb-1">{category.name}</h3>
                    <span className="text-[0.8125rem] text-text-secondary">{category.productCount} produto{category.productCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-1">
                    <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-tertiary hover:text-text-primary" onClick={onEdit}><FiEdit2 /></button>
                    <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-error/10 hover:text-error" onClick={onDelete}><FiTrash2 /></button>
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
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', icon: '🌭', color: '#ff6b35' });
    const [saving, setSaving] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const categoriesLimit = getLimit('categories');
    const isAtLimit = !isWithinLimit('categories', categories.length);

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

    useEffect(() => { if (user) fetchCategories(); }, [user]);

    const fetchCategories = async () => {
        if (!user) return;
        try {
            const { data: categoriesData } = await supabase.from('categories').select('*').eq('user_id', user.id).order('display_order', { ascending: true });
            if (categoriesData) {
                const categoriesWithCounts = await Promise.all(categoriesData.map(async (cat) => {
                    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', cat.id);
                    return { ...cat, productCount: count || 0 };
                }));
                setCategories(categoriesWithCounts);
            }
        } catch (error) { console.error('Error fetching categories:', error); }
        finally { setLoading(false); }
    };

    const handleDragStart = useCallback((_event: DragStartEvent) => setIsDragging(true), []);
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setIsDragging(false);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setCategories((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(async () => {
                    try { await Promise.all(newItems.map((item, index) => supabase.from('categories').update({ display_order: index }).eq('id', item.id))); }
                    catch (error) { console.error('Failed to save category order:', error); }
                }, 500);
                return newItems;
            });
        }
    }, []);

    const openModal = (category?: Category) => {
        if (!category && isAtLimit) { alert(`Limite de ${categoriesLimit} categorias atingido! Faça upgrade do seu plano para adicionar mais.`); return; }
        if (category) { setEditingCategory(category); setCategoryForm({ name: category.name, icon: category.icon, color: category.color }); }
        else { setEditingCategory(null); setCategoryForm({ name: '', icon: '🌭', color: '#ff6b35' }); }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingCategory(null); };

    const handleSave = async () => {
        if (!user || !categoryForm.name) return;
        setSaving(true);
        try {
            const categoryData = { user_id: user.id, name: categoryForm.name, icon: categoryForm.icon, color: categoryForm.color };
            if (editingCategory) { await supabase.from('categories').update(categoryData).eq('id', editingCategory.id); }
            else {
                const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order || 0)) : -1;
                await supabase.from('categories').insert({ ...categoryData, display_order: maxOrder + 1 });
            }
            fetchCategories(); closeModal();
        } catch (error) { console.error('Error saving category:', error); }
        finally { setSaving(false); }
    };

    const deleteCategory = async (id: string) => {
        const category = categories.find(c => c.id === id);
        if (category && (category.productCount || 0) > 0) { alert('Não é possível excluir uma categoria que possui produtos.'); return; }
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
        try { await supabase.from('categories').delete().eq('id', id); fetchCategories(); }
        catch (error) { console.error('Error deleting category:', error); }
    };

    return (
        <div className="max-w-[1000px] mx-auto overscroll-contain">
            <div className="flex items-start justify-between mb-8 gap-5 max-md:flex-col">
                <div>
                    <h1 className="text-[2rem] font-bold mb-2">Categorias</h1>
                    <p className="text-text-secondary">Organize seus produtos em categorias (arraste para reordenar)</p>
                </div>
                <Button leftIcon={<FiPlus />} onClick={() => openModal()} disabled={isAtLimit}>Nova Categoria</Button>
            </div>

            <LimitWarning resource="categorias" current={categories.length} limit={categoriesLimit} requiredPlan="Avançado" />

            {loading ? (
                <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1 overscroll-y-none">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-[120px] rounded-xl bg-bg-tertiary animate-pulse" />)}
                </div>
            ) : categories.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1 overscroll-y-none">
                            {categories.map((category) => (
                                <SortableCategoryCard key={category.id} category={category} onEdit={() => openModal(category)} onDelete={() => deleteCategory(category.id)} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="flex flex-col items-center justify-center py-15 px-5 text-center">
                    <span className="text-6xl mb-4">📁</span>
                    <h3 className="text-xl mb-2">Nenhuma categoria</h3>
                    <p className="text-text-secondary mb-5">Crie categorias para organizar seus produtos</p>
                    <Button leftIcon={<FiPlus />} onClick={() => openModal()}>Nova Categoria</Button>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-modal p-6" onClick={closeModal}>
                    <div className="w-full max-w-[440px] bg-bg-card rounded-xl border border-border p-7" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold mb-6">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h2>

                        <div className="flex flex-col gap-5 mb-6">
                            <Input label="Nome" placeholder="Nome da categoria" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />

                            <div className="flex flex-col gap-2.5">
                                <label className="text-sm font-medium text-text-secondary">Ícone</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {iconOptions.map((icon) => (
                                        <button key={icon} className={cn('w-11 h-11 flex items-center justify-center bg-bg-tertiary border-2 border-border rounded-md text-xl cursor-pointer transition-all duration-fast hover:border-border-light', categoryForm.icon === icon && 'border-primary bg-primary/10')} onClick={() => setCategoryForm({ ...categoryForm, icon })}>
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <label className="text-sm font-medium text-text-secondary">Cor</label>
                                <div className="flex items-center gap-3 px-3 py-2 bg-bg-tertiary border border-border rounded-md">
                                    <input type="color" className="w-9 h-9 border-none rounded-sm cursor-pointer p-0" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} />
                                    <span className="font-mono text-sm text-text-secondary uppercase">{categoryForm.color}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-bg-tertiary rounded-md">
                                <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl" style={{ background: `${categoryForm.color}20` }}>{categoryForm.icon}</div>
                                <span className="font-medium">{categoryForm.name || 'Nome da Categoria'}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
                            <Button onClick={handleSave} isLoading={saving}>{editingCategory ? 'Salvar' : 'Criar'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
