'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, StatsCard } from '@/components/admin';
import type { Column } from '@/components/admin';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    FiPackage,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiToggleLeft,
    FiToggleRight,
    FiDollarSign,
    FiX,
    FiCheck,
    FiSave
} from 'react-icons/fi';

interface Plan {
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    billing_interval: string;
    features: string[];
    limits: Record<string, number>;
    is_active: boolean;
    trial_days: number;
    display_order: number;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
    created_at: string;
}

interface PlanFormData {
    name: string;
    description: string;
    price_cents: number;
    billing_interval: string;
    features: string[];
    limits: { products: number; addons_per_product: number };
    trial_days: number;
    is_active: boolean;
}

const defaultFormData: PlanFormData = {
    name: '',
    description: '',
    price_cents: 0,
    billing_interval: 'month',
    features: [],
    limits: { products: 25, addons_per_product: 5 },
    trial_days: 0,
    is_active: true
};

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
    const [saving, setSaving] = useState(false);
    const [newFeature, setNewFeature] = useState('');

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const fetchPlans = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('display_order', { ascending: true });

            if (data) {
                setPlans(data as Plan[]);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const openCreateModal = () => {
        setEditingPlan(null);
        setFormData(defaultFormData);
        setShowModal(true);
    };

    const openEditModal = (plan: Plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            description: plan.description || '',
            price_cents: plan.price_cents,
            billing_interval: plan.billing_interval,
            features: Array.isArray(plan.features) ? plan.features : [],
            limits: plan.limits as { products: number; addons_per_product: number },
            trial_days: plan.trial_days,
            is_active: plan.is_active
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                description: formData.description || null,
                price_cents: formData.price_cents,
                billing_interval: formData.billing_interval,
                features: formData.features,
                limits: formData.limits,
                trial_days: formData.trial_days,
                is_active: formData.is_active,
                updated_at: new Date().toISOString()
            };

            if (editingPlan) {
                await supabase
                    .from('subscription_plans')
                    .update(payload)
                    .eq('id', editingPlan.id);
            } else {
                await supabase
                    .from('subscription_plans')
                    .insert({
                        ...payload,
                        display_order: plans.length + 1
                    });
            }

            setShowModal(false);
            fetchPlans();
        } catch (error) {
            console.error('Error saving plan:', error);
        } finally {
            setSaving(false);
        }
    };

    const togglePlanStatus = async (plan: Plan) => {
        try {
            await supabase
                .from('subscription_plans')
                .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() })
                .eq('id', plan.id);
            fetchPlans();
        } catch (error) {
            console.error('Error toggling plan:', error);
        }
    };

    const deletePlan = async (plan: Plan) => {
        if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) return;

        try {
            await supabase
                .from('subscription_plans')
                .delete()
                .eq('id', plan.id);
            fetchPlans();
        } catch (error) {
            console.error('Error deleting plan:', error);
        }
    };

    const addFeature = () => {
        if (newFeature.trim()) {
            setFormData(prev => ({
                ...prev,
                features: [...prev.features, newFeature.trim()]
            }));
            setNewFeature('');
        }
    };

    const removeFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const columns: Column<Plan>[] = [
        {
            key: 'name',
            header: 'Plano',
            sortable: true,
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        row.is_active ? "bg-orange-500/20" : "bg-gray-700"
                    )}>
                        <FiPackage className={row.is_active ? "text-orange-400" : "text-gray-500"} size={18} />
                    </div>
                    <div>
                        <p className="text-white font-medium">{row.name}</p>
                        <p className="text-gray-500 text-xs">{row.description || 'Sem descrição'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'price_cents',
            header: 'Preço',
            sortable: true,
            render: (_, row) => (
                <div>
                    <span className="text-white font-semibold">{formatCurrency(row.price_cents)}</span>
                    <span className="text-gray-500 text-sm">/{row.billing_interval === 'month' ? 'mês' : 'ano'}</span>
                </div>
            )
        },
        {
            key: 'features',
            header: 'Features',
            render: (_, row) => (
                <div className="text-gray-400 text-sm">
                    {Array.isArray(row.features) ? row.features.length : 0} recursos
                </div>
            )
        },
        {
            key: 'trial_days',
            header: 'Trial',
            render: (_, row) => (
                <span className="text-gray-400">
                    {row.trial_days > 0 ? `${row.trial_days} dias` : 'Sem trial'}
                </span>
            )
        },
        {
            key: 'is_active',
            header: 'Status',
            sortable: true,
            render: (_, row) => (
                <button
                    onClick={() => togglePlanStatus(row)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        row.is_active
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    )}
                >
                    {row.is_active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                    {row.is_active ? 'Ativo' : 'Inativo'}
                </button>
            )
        },
        {
            key: 'actions',
            header: '',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openEditModal(row)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={() => deletePlan(row)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const activePlans = plans.filter(p => p.is_active);
    const totalMRRPotential = activePlans.reduce((sum, p) => sum + p.price_cents, 0);

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gerenciar Planos</h1>
                    <p className="text-gray-400 mt-1">Crie e gerencie os planos de assinatura</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                        "bg-linear-to-r from-orange-500 to-red-500 text-white",
                        "hover:from-orange-600 hover:to-red-600"
                    )}
                >
                    <FiPlus size={18} />
                    Novo Plano
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCard
                    title="Total de Planos"
                    value={plans.length}
                    icon={<FiPackage size={24} />}
                />
                <StatsCard
                    title="Planos Ativos"
                    value={activePlans.length}
                    icon={<FiCheck size={24} />}
                    variant="success"
                />
                <StatsCard
                    title="MRR Potencial (por plano)"
                    value={formatCurrency(totalMRRPotential)}
                    icon={<FiDollarSign size={24} />}
                    variant="warning"
                />
            </div>

            {/* Plans Table */}
            <DataTable
                columns={columns}
                data={plans}
                keyField="id"
                loading={loading}
                searchable
                searchPlaceholder="Buscar planos..."
                emptyMessage="Nenhum plano cadastrado"
            />

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white">
                                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Name & Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Nome do Plano *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        placeholder="Ex: Plano Profissional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Descrição
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        placeholder="Descrição breve do plano"
                                    />
                                </div>
                            </div>

                            {/* Price & Billing */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Preço (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(formData.price_cents / 100).toFixed(2)}
                                        onChange={(e) => setFormData(prev => ({ ...prev, price_cents: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        placeholder="29.90"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Cobrança
                                    </label>
                                    <select
                                        value={formData.billing_interval}
                                        onChange={(e) => setFormData(prev => ({ ...prev, billing_interval: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                        <option value="month">Mensal</option>
                                        <option value="year">Anual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Dias de Trial
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.trial_days}
                                        onChange={(e) => setFormData(prev => ({ ...prev, trial_days: parseInt(e.target.value || '0') }))}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Limits */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Limite de Produtos (-1 = ilimitado)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.limits.products}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            limits: { ...prev.limits, products: parseInt(e.target.value || '0') }
                                        }))}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Adicionais por Produto (-1 = ilimitado)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.limits.addons_per_product}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            limits: { ...prev.limits, addons_per_product: parseInt(e.target.value || '0') }
                                        }))}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Recursos do Plano
                                </label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newFeature}
                                        onChange={(e) => setNewFeature(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                                        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        placeholder="Ex: Relatórios avançados"
                                    />
                                    <button
                                        onClick={addFeature}
                                        className="px-4 py-3 bg-orange-500 rounded-lg text-white hover:bg-orange-600 transition-all"
                                    >
                                        <FiPlus size={18} />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {formData.features.map((feature, index) => (
                                        <div key={index} className="flex items-center justify-between px-3 py-2 bg-gray-900 rounded-lg">
                                            <span className="text-gray-300">{feature}</span>
                                            <button
                                                onClick={() => removeFeature(index)}
                                                className="text-gray-500 hover:text-red-400"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.features.length === 0 && (
                                        <p className="text-gray-500 text-sm text-center py-4">
                                            Nenhum recurso adicionado
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="sr-only"
                                />
                                <div className={cn(
                                    "w-12 h-6 rounded-full transition-all relative",
                                    formData.is_active ? "bg-green-500" : "bg-gray-700"
                                )}>
                                    <div className={cn(
                                        "absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all",
                                        formData.is_active ? "left-6" : "left-0.5"
                                    )} />
                                </div>
                                <span className="text-gray-300">Plano ativo</span>
                            </label>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.name}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                                    "bg-linear-to-r from-orange-500 to-red-500 text-white",
                                    "hover:from-orange-600 hover:to-red-600",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                <FiSave size={18} />
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
