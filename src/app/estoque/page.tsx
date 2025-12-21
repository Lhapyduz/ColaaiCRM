'use client';

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiPackage,
    FiAlertTriangle,
    FiTrendingUp,
    FiTrendingDown,
    FiEdit2,
    FiTrash2,
    FiSearch
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Ingredient {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
    cost_per_unit: number;
}

interface StockMovement {
    id: string;
    ingredient_id: string;
    quantity: number;
    type: 'purchase' | 'usage' | 'adjustment' | 'waste';
    notes: string | null;
    created_at: string;
}

const unitOptions = [
    { value: 'kg', label: 'Quilogramas (kg)' },
    { value: 'g', label: 'Gramas (g)' },
    { value: 'L', label: 'Litros (L)' },
    { value: 'ml', label: 'Mililitros (ml)' },
    { value: 'un', label: 'Unidades' },
    { value: 'pct', label: 'Pacotes' },
    { value: 'cx', label: 'Caixas' }
];

export default function EstoquePage() {
    const { user } = useAuth();
    const { plan, canAccess } = useSubscription();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);


    // Form states
    const [formName, setFormName] = useState('');
    const [formUnit, setFormUnit] = useState('un');
    const [formMinStock, setFormMinStock] = useState('');
    const [formCostPerUnit, setFormCostPerUnit] = useState('');

    // Movement form states
    const [movementType, setMovementType] = useState<'purchase' | 'adjustment' | 'waste'>('purchase');
    const [movementQuantity, setMovementQuantity] = useState('');
    const [movementNotes, setMovementNotes] = useState('');

    useEffect(() => {
        if (user && canAccess('inventory')) {
            fetchIngredients();
        }
    }, [user, canAccess]);

    const fetchIngredients = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('ingredients')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (error) throw error;
            setIngredients(data || []);
        } catch (error) {
            console.error('Error fetching ingredients:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingIngredient(null);
        setFormName('');
        setFormUnit('un');
        setFormMinStock('');
        setFormCostPerUnit('');
        setShowModal(true);
    };

    const openEditModal = (ingredient: Ingredient) => {
        setEditingIngredient(ingredient);
        setFormName(ingredient.name);
        setFormUnit(ingredient.unit);
        setFormMinStock(ingredient.min_stock.toString());
        setFormCostPerUnit(ingredient.cost_per_unit.toString());
        setShowModal(true);
    };

    const openMovementModal = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient);
        setMovementType('purchase');
        setMovementQuantity('');
        setMovementNotes('');
        setShowMovementModal(true);
    };

    const handleSaveIngredient = async () => {
        if (!user || !formName) return;

        try {
            const ingredientData = {
                user_id: user.id,
                name: formName,
                unit: formUnit,
                min_stock: parseFloat(formMinStock) || 0,
                cost_per_unit: parseFloat(formCostPerUnit) || 0
            };

            if (editingIngredient) {
                const { error } = await supabase
                    .from('ingredients')
                    .update(ingredientData)
                    .eq('id', editingIngredient.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('ingredients')
                    .insert(ingredientData);

                if (error) throw error;
            }

            setShowModal(false);
            fetchIngredients();
        } catch (error) {
            console.error('Error saving ingredient:', error);
        }
    };

    const handleDeleteIngredient = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este ingrediente?')) return;

        try {
            const { error } = await supabase
                .from('ingredients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchIngredients();
        } catch (error) {
            console.error('Error deleting ingredient:', error);
        }
    };

    const handleStockMovement = async () => {
        if (!user || !selectedIngredient || !movementQuantity) return;

        try {
            const quantity = movementType === 'waste'
                ? -Math.abs(parseFloat(movementQuantity))
                : parseFloat(movementQuantity);

            // Insert movement record
            const { error: movementError } = await supabase
                .from('stock_movements')
                .insert({
                    ingredient_id: selectedIngredient.id,
                    user_id: user.id,
                    quantity,
                    type: movementType,
                    notes: movementNotes || null
                });

            if (movementError) throw movementError;

            // Update ingredient stock
            const newStock = selectedIngredient.current_stock + quantity;
            const { error: updateError } = await supabase
                .from('ingredients')
                .update({
                    current_stock: Math.max(0, newStock),
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedIngredient.id);

            if (updateError) throw updateError;

            setShowMovementModal(false);
            fetchIngredients();
        } catch (error) {
            console.error('Error adding stock movement:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const getLowStockIngredients = () => {
        return ingredients.filter(i => i.current_stock <= i.min_stock && i.min_stock > 0);
    };

    const getTotalStockValue = () => {
        return ingredients.reduce((sum, i) => sum + (i.current_stock * i.cost_per_unit), 0);
    };

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lowStockIngredients = getLowStockIngredients();

    // Check if user has access to inventory feature
    if (!canAccess('inventory')) {
        return (
            <MainLayout>
                <UpgradePrompt
                    feature="Controle de Estoque"
                    requiredPlan="Avançado"
                    currentPlan={plan}
                    fullPage
                />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Estoque</h1>
                        <p className={styles.subtitle}>Controle seus ingredientes e suprimentos</p>
                    </div>
                    <Button leftIcon={<FiPlus />} onClick={openAddModal}>
                        Novo Ingrediente
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <Card className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <FiPackage />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{ingredients.length}</span>
                            <span className={styles.statLabel}>Ingredientes</span>
                        </div>
                    </Card>
                    <Card className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.warning}`}>
                            <FiAlertTriangle />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{lowStockIngredients.length}</span>
                            <span className={styles.statLabel}>Estoque Baixo</span>
                        </div>
                    </Card>
                    <Card className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.success}`}>
                            <FiTrendingUp />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{formatCurrency(getTotalStockValue())}</span>
                            <span className={styles.statLabel}>Valor em Estoque</span>
                        </div>
                    </Card>
                </div>

                {/* Low Stock Alert */}
                {lowStockIngredients.length > 0 && (
                    <Card className={styles.alertCard}>
                        <FiAlertTriangle className={styles.alertIcon} />
                        <div className={styles.alertContent}>
                            <h3>Estoque Baixo!</h3>
                            <p>
                                {lowStockIngredients.map(i => i.name).join(', ')}
                                {lowStockIngredients.length === 1 ? ' está' : ' estão'} com estoque baixo
                            </p>
                        </div>
                    </Card>
                )}

                {/* Search */}
                <Card className={styles.searchCard}>
                    <Input
                        placeholder="Buscar ingredientes..."
                        leftIcon={<FiSearch />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Card>

                {/* Ingredients List */}
                <div className={styles.ingredientsList}>
                    {loading ? (
                        <div className={styles.loading}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
                            ))}
                        </div>
                    ) : filteredIngredients.length > 0 ? (
                        filteredIngredients.map((ingredient) => {
                            const isLowStock = ingredient.current_stock <= ingredient.min_stock && ingredient.min_stock > 0;

                            return (
                                <Card key={ingredient.id} className={`${styles.ingredientCard} ${isLowStock ? styles.lowStock : ''}`}>
                                    <div className={styles.ingredientInfo}>
                                        <h3 className={styles.ingredientName}>{ingredient.name}</h3>
                                        <div className={styles.ingredientMeta}>
                                            <span className={styles.stock}>
                                                {ingredient.current_stock} {ingredient.unit}
                                            </span>
                                            {ingredient.min_stock > 0 && (
                                                <span className={styles.minStock}>
                                                    Mínimo: {ingredient.min_stock} {ingredient.unit}
                                                </span>
                                            )}
                                            {ingredient.cost_per_unit > 0 && (
                                                <span className={styles.cost}>
                                                    {formatCurrency(ingredient.cost_per_unit)}/{ingredient.unit}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.ingredientActions}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<FiTrendingUp />}
                                            onClick={() => openMovementModal(ingredient)}
                                        >
                                            Movimentar
                                        </Button>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => openEditModal(ingredient)}
                                        >
                                            <FiEdit2 />
                                        </button>
                                        <button
                                            className={`${styles.iconBtn} ${styles.danger}`}
                                            onClick={() => handleDeleteIngredient(ingredient.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className={styles.emptyState}>
                            <FiPackage className={styles.emptyIcon} />
                            <h3>Nenhum ingrediente cadastrado</h3>
                            <p>Adicione ingredientes para controlar seu estoque</p>
                            <Button leftIcon={<FiPlus />} onClick={openAddModal}>
                                Adicionar Ingrediente
                            </Button>
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2>{editingIngredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}</h2>

                            <div className={styles.formGroup}>
                                <label>Nome do Ingrediente</label>
                                <Input
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ex: Salsicha, Pão, Ketchup..."
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Unidade de Medida</label>
                                    <select
                                        value={formUnit}
                                        onChange={(e) => setFormUnit(e.target.value)}
                                        className={styles.select}
                                    >
                                        {unitOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Estoque Mínimo</label>
                                    <Input
                                        type="number"
                                        value={formMinStock}
                                        onChange={(e) => setFormMinStock(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Custo por Unidade (R$)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formCostPerUnit}
                                    onChange={(e) => setFormCostPerUnit(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="outline" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveIngredient}>
                                    {editingIngredient ? 'Salvar' : 'Adicionar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stock Movement Modal */}
                {showMovementModal && selectedIngredient && (
                    <div className={styles.modalOverlay} onClick={() => setShowMovementModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2>Movimentar Estoque</h2>
                            <p className={styles.modalSubtitle}>
                                {selectedIngredient.name} - Atual: {selectedIngredient.current_stock} {selectedIngredient.unit}
                            </p>

                            <div className={styles.formGroup}>
                                <label>Tipo de Movimentação</label>
                                <div className={styles.typeButtons}>
                                    <button
                                        className={`${styles.typeBtn} ${movementType === 'purchase' ? styles.active : ''}`}
                                        onClick={() => setMovementType('purchase')}
                                    >
                                        <FiTrendingUp /> Entrada
                                    </button>
                                    <button
                                        className={`${styles.typeBtn} ${movementType === 'adjustment' ? styles.active : ''}`}
                                        onClick={() => setMovementType('adjustment')}
                                    >
                                        <FiPackage /> Ajuste
                                    </button>
                                    <button
                                        className={`${styles.typeBtn} ${styles.waste} ${movementType === 'waste' ? styles.active : ''}`}
                                        onClick={() => setMovementType('waste')}
                                    >
                                        <FiTrendingDown /> Perda
                                    </button>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>
                                    Quantidade ({selectedIngredient.unit})
                                    {movementType === 'waste' && ' - será removido do estoque'}
                                </label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={movementQuantity}
                                    onChange={(e) => setMovementQuantity(e.target.value)}
                                    placeholder="0"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Observações (opcional)</label>
                                <Input
                                    value={movementNotes}
                                    onChange={(e) => setMovementNotes(e.target.value)}
                                    placeholder="Ex: Compra fornecedor X..."
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="outline" onClick={() => setShowMovementModal(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleStockMovement}>
                                    Confirmar Movimentação
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
