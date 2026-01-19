'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiPackage, FiAlertTriangle, FiTrendingUp, FiTrendingDown, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Ingredient {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
    cost_per_unit: number;
}

const unitOptions = [
    { value: 'kg', label: 'Quilogramas (kg)' }, { value: 'g', label: 'Gramas (g)' }, { value: 'L', label: 'Litros (L)' },
    { value: 'ml', label: 'Mililitros (ml)' }, { value: 'un', label: 'Unidades' }, { value: 'pct', label: 'Pacotes' }, { value: 'cx', label: 'Caixas' }
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
    const [formName, setFormName] = useState('');
    const [formUnit, setFormUnit] = useState('un');
    const [formMinStock, setFormMinStock] = useState('');
    const [formCostPerUnit, setFormCostPerUnit] = useState('');
    const [movementType, setMovementType] = useState<'purchase' | 'adjustment' | 'waste'>('purchase');
    const [movementQuantity, setMovementQuantity] = useState('');
    const [movementNotes, setMovementNotes] = useState('');

    useEffect(() => { if (user && canAccess('inventory')) fetchIngredients(); }, [user, canAccess]);

    const fetchIngredients = async () => {
        if (!user) return;
        try { const { data, error } = await supabase.from('ingredients').select('*').eq('user_id', user.id).order('name'); if (error) throw error; setIngredients(data || []); }
        catch (error) { console.error('Error fetching ingredients:', error); } finally { setLoading(false); }
    };

    const openAddModal = () => { setEditingIngredient(null); setFormName(''); setFormUnit('un'); setFormMinStock(''); setFormCostPerUnit(''); setShowModal(true); };
    const openEditModal = (ingredient: Ingredient) => { setEditingIngredient(ingredient); setFormName(ingredient.name); setFormUnit(ingredient.unit); setFormMinStock(ingredient.min_stock.toString()); setFormCostPerUnit(ingredient.cost_per_unit.toString()); setShowModal(true); };
    const openMovementModal = (ingredient: Ingredient) => { setSelectedIngredient(ingredient); setMovementType('purchase'); setMovementQuantity(''); setMovementNotes(''); setShowMovementModal(true); };

    const handleSaveIngredient = async () => {
        if (!user || !formName) return;
        try {
            const ingredientData = { user_id: user.id, name: formName, unit: formUnit, min_stock: parseFloat(formMinStock) || 0, cost_per_unit: parseFloat(formCostPerUnit) || 0 };
            if (editingIngredient) { await supabase.from('ingredients').update(ingredientData).eq('id', editingIngredient.id); }
            else { await supabase.from('ingredients').insert(ingredientData); }
            setShowModal(false); fetchIngredients();
        } catch (error) { console.error('Error saving ingredient:', error); }
    };

    const handleDeleteIngredient = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este ingrediente?')) return;
        try { await supabase.from('ingredients').delete().eq('id', id); fetchIngredients(); }
        catch (error) { console.error('Error deleting ingredient:', error); }
    };

    const handleStockMovement = async () => {
        if (!user || !selectedIngredient || !movementQuantity) return;
        try {
            const quantity = movementType === 'waste' ? -Math.abs(parseFloat(movementQuantity)) : parseFloat(movementQuantity);
            await supabase.from('stock_movements').insert({ ingredient_id: selectedIngredient.id, user_id: user.id, quantity, type: movementType, notes: movementNotes || null });
            const newStock = selectedIngredient.current_stock + quantity;
            await supabase.from('ingredients').update({ current_stock: Math.max(0, newStock), updated_at: new Date().toISOString() }).eq('id', selectedIngredient.id);
            setShowMovementModal(false); fetchIngredients();
        } catch (error) { console.error('Error adding stock movement:', error); }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const getLowStockIngredients = () => ingredients.filter(i => i.current_stock <= i.min_stock && i.min_stock > 0);
    const getTotalStockValue = () => ingredients.reduce((sum, i) => sum + (i.current_stock * i.cost_per_unit), 0);
    const filteredIngredients = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const lowStockIngredients = getLowStockIngredients();

    if (!canAccess('inventory')) {
        return (<MainLayout><UpgradePrompt feature="Controle de Estoque" requiredPlan="Avançado" currentPlan={plan} fullPage /></MainLayout>);
    }

    return (
        <MainLayout>
            <div className="max-w-[1200px] mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 gap-5 max-md:flex-col">
                    <div><h1 className="text-[2rem] font-bold mb-2">Estoque</h1><p className="text-text-secondary">Controle seus ingredientes e suprimentos</p></div>
                    <Button leftIcon={<FiPlus />} onClick={openAddModal}>Novo Ingrediente</Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-1">
                    <Card className="flex items-center gap-4 p-5!">
                        <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-2xl bg-primary/15 text-primary"><FiPackage /></div>
                        <div className="flex flex-col"><span className="text-2xl font-bold">{ingredients.length}</span><span className="text-sm text-text-secondary">Ingredientes</span></div>
                    </Card>
                    <Card className="flex items-center gap-4 p-5!">
                        <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-2xl bg-[#fdcb6e]/15 text-[#fdcb6e]"><FiAlertTriangle /></div>
                        <div className="flex flex-col"><span className="text-2xl font-bold">{lowStockIngredients.length}</span><span className="text-sm text-text-secondary">Estoque Baixo</span></div>
                    </Card>
                    <Card className="flex items-center gap-4 p-5!">
                        <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-2xl bg-accent/15 text-accent"><FiTrendingUp /></div>
                        <div className="flex flex-col"><span className="text-2xl font-bold">{formatCurrency(getTotalStockValue())}</span><span className="text-sm text-text-secondary">Valor em Estoque</span></div>
                    </Card>
                </div>

                {/* Low Stock Alert */}
                {lowStockIngredients.length > 0 && (
                    <Card className="flex items-center gap-4 px-5! py-4! bg-[#fdcb6e]/10! border-[#fdcb6e]/30! mb-6">
                        <FiAlertTriangle className="text-2xl text-[#fdcb6e] shrink-0" />
                        <div><h3 className="text-base font-semibold text-[#fdcb6e] mb-1">Estoque Baixo!</h3><p className="text-sm text-text-secondary">{lowStockIngredients.map(i => i.name).join(', ')} {lowStockIngredients.length === 1 ? 'está' : 'estão'} com estoque baixo</p></div>
                    </Card>
                )}

                {/* Search */}
                <Card className="mb-6 p-4!"><Input placeholder="Buscar ingredientes..." leftIcon={<FiSearch />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></Card>

                {/* Ingredients List */}
                <div className="flex flex-col gap-3">
                    {loading ? [1, 2, 3].map(i => <div key={i} className="h-[80px] rounded-[10px] bg-bg-tertiary animate-pulse" />) : filteredIngredients.length > 0 ? filteredIngredients.map((ingredient) => {
                        const isLowStock = ingredient.current_stock <= ingredient.min_stock && ingredient.min_stock > 0;
                        return (
                            <Card key={ingredient.id} className={cn('flex items-center justify-between px-5! py-4! transition-all duration-fast max-md:flex-col max-md:items-stretch max-md:gap-4', isLowStock && 'border-[#fdcb6e]/50 bg-[#fdcb6e]/5')}>
                                <div className="flex-1">
                                    <h3 className="text-[1.1rem] font-semibold mb-1.5">{ingredient.name}</h3>
                                    <div className="flex flex-wrap gap-4">
                                        <span className={cn('text-base font-semibold', isLowStock ? 'text-[#fdcb6e]' : 'text-primary')}>{ingredient.current_stock} {ingredient.unit}</span>
                                        {ingredient.min_stock > 0 && <span className="text-sm text-text-secondary">Mínimo: {ingredient.min_stock} {ingredient.unit}</span>}
                                        {ingredient.cost_per_unit > 0 && <span className="text-sm text-text-secondary">{formatCurrency(ingredient.cost_per_unit)}/{ingredient.unit}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 max-md:justify-end">
                                    <Button variant="outline" size="sm" leftIcon={<FiTrendingUp />} onClick={() => openMovementModal(ingredient)}>Movimentar</Button>
                                    <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary" onClick={() => openEditModal(ingredient)}><FiEdit2 /></button>
                                    <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-error/10 hover:border-error hover:text-error" onClick={() => handleDeleteIngredient(ingredient.id)}><FiTrash2 /></button>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="text-center py-15 px-5">
                            <FiPackage className="text-6xl text-text-muted mb-4 mx-auto" />
                            <h3 className="text-xl mb-2">Nenhum ingrediente cadastrado</h3>
                            <p className="text-text-secondary mb-5">Adicione ingredientes para controlar seu estoque</p>
                            <Button leftIcon={<FiPlus />} onClick={openAddModal}>Adicionar Ingrediente</Button>
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowModal(false)}>
                        <div className="bg-bg-card rounded-lg p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-semibold mb-5">{editingIngredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}</h2>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Nome do Ingrediente</label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Salsicha, Pão, Ketchup..." /></div>
                            <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                                <div><label className="block text-sm text-text-secondary mb-2">Unidade de Medida</label><select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-md text-text-primary text-base cursor-pointer focus:outline-none focus:border-primary">{unitOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                                <div><label className="block text-sm text-text-secondary mb-2">Estoque Mínimo</label><Input type="number" value={formMinStock} onChange={(e) => setFormMinStock(e.target.value)} placeholder="0" /></div>
                            </div>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Custo por Unidade (R$)</label><Input type="number" step="0.01" value={formCostPerUnit} onChange={(e) => setFormCostPerUnit(e.target.value)} placeholder="0.00" /></div>
                            <div className="flex gap-3 justify-end mt-6"><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSaveIngredient}>{editingIngredient ? 'Salvar' : 'Adicionar'}</Button></div>
                        </div>
                    </div>
                )}

                {/* Stock Movement Modal */}
                {showMovementModal && selectedIngredient && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowMovementModal(false)}>
                        <div className="bg-bg-card rounded-lg p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-semibold mb-2">Movimentar Estoque</h2>
                            <p className="text-text-secondary text-[0.9rem] mb-5">{selectedIngredient.name} - Atual: {selectedIngredient.current_stock} {selectedIngredient.unit}</p>
                            <div className="mb-4">
                                <label className="block text-sm text-text-secondary mb-2">Tipo de Movimentação</label>
                                <div className="flex gap-2 max-md:flex-col">
                                    <button className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-bg-tertiary border border-border rounded-md text-text-secondary text-[0.9rem] cursor-pointer transition-all duration-fast hover:border-border-light', movementType === 'purchase' && 'bg-primary/15 border-primary text-primary')} onClick={() => setMovementType('purchase')}><FiTrendingUp /> Entrada</button>
                                    <button className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-bg-tertiary border border-border rounded-md text-text-secondary text-[0.9rem] cursor-pointer transition-all duration-fast hover:border-border-light', movementType === 'adjustment' && 'bg-primary/15 border-primary text-primary')} onClick={() => setMovementType('adjustment')}><FiPackage /> Ajuste</button>
                                    <button className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-bg-tertiary border border-border rounded-md text-text-secondary text-[0.9rem] cursor-pointer transition-all duration-fast hover:border-border-light', movementType === 'waste' && 'bg-error/15 border-error text-error')} onClick={() => setMovementType('waste')}><FiTrendingDown /> Perda</button>
                                </div>
                            </div>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Quantidade ({selectedIngredient.unit}){movementType === 'waste' && ' - será removido do estoque'}</label><Input type="number" step="0.001" value={movementQuantity} onChange={(e) => setMovementQuantity(e.target.value)} placeholder="0" /></div>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Observações (opcional)</label><Input value={movementNotes} onChange={(e) => setMovementNotes(e.target.value)} placeholder="Ex: Compra fornecedor X..." /></div>
                            <div className="flex gap-3 justify-end mt-6"><Button variant="outline" onClick={() => setShowMovementModal(false)}>Cancelar</Button><Button onClick={handleStockMovement}>Confirmar Movimentação</Button></div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
