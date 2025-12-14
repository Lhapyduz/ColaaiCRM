'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
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
    color: string;
    productCount?: number;
}

const iconOptions = ['🌭', '🍔', '🍟', '🥤', '🍕', '🌮', '🥪', '🍗', '🍦', '🧁', '🥗', '🍜'];

export default function CategoriasPage() {
    const { user } = useAuth();
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
                .order('name');

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

    const openModal = (category?: Category) => {
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
                await supabase.from('categories').insert(categoryData);
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
                        <p className={styles.subtitle}>Organize seus produtos em categorias</p>
                    </div>
                    <Button leftIcon={<FiPlus />} onClick={() => openModal()}>
                        Nova Categoria
                    </Button>
                </div>

                {loading ? (
                    <div className={styles.grid}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                        ))}
                    </div>
                ) : categories.length > 0 ? (
                    <div className={styles.grid}>
                        {categories.map((category) => (
                            <Card key={category.id} className={styles.categoryCard}>
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
                                    <button className={styles.actionBtn} onClick={() => openModal(category)}>
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        className={`${styles.actionBtn} ${styles.danger}`}
                                        onClick={() => deleteCategory(category.id)}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
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
