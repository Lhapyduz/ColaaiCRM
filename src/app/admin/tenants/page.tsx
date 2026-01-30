'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, StatsCard } from '@/components/admin';
import type { Column } from '@/components/admin';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { listAllUsers } from '@/actions/admin-users';
import {
    FiUsers,
    FiToggleLeft,
    FiToggleRight,
    FiMoreVertical,
    FiEdit2,
    FiGift,
    FiUserX,
    FiLogIn,
    FiX,
    FiCheck,
    FiAlertCircle,
    FiPlus,
    FiSave,
    FiCalendar,
    FiRefreshCw
} from 'react-icons/fi';
import { syncStripeData } from '@/actions/sync-stripe';

interface Tenant {
    id: string;
    email: string;
    store_name: string;
    plan_name: string | null;
    status: string;
    created_at: string;
    mrr_cents: number;
}

interface FeatureFlag {
    feature_key: string;
    enabled: boolean;
    description: string;
}

const AVAILABLE_FEATURES: FeatureFlag[] = [
    { feature_key: 'beta_menu', enabled: false, description: 'Novo sistema de menu com IA' },
    { feature_key: 'advanced_reports', enabled: false, description: 'Relatórios avançados e predições' },
    { feature_key: 'ai_predictions', enabled: false, description: 'Previsões de vendas com Machine Learning' },
    { feature_key: 'multi_branch', enabled: false, description: 'Suporte a múltiplas filiais' },
    { feature_key: 'priority_support', enabled: false, description: 'Suporte prioritário 24/7' },
    { feature_key: 'custom_branding', enabled: false, description: 'Personalização avançada de marca' },
];

export default function TenantsPage() {
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
    const [showFlagsPanel, setShowFlagsPanel] = useState(false);
    const [savingFlags, setSavingFlags] = useState(false);
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // Create tenant modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '',
        store_name: '',
        plan_name: 'Plano Básico',
        expiration_date: ''
    });
    const [creatingTenant, setCreatingTenant] = useState(false);

    const fetchTenants = useCallback(async () => {

        try {
            // Join user_settings with subscriptions_cache
            const { data: settings, error: settingsError } = await supabase
                .from('user_settings')
                .select('user_id, app_name, created_at');

            if (settingsError) {
                console.error('Settings fetch error:', settingsError);
                throw settingsError;
            }

            const { data: subscriptions, error: subError } = await supabase
                .from('subscriptions_cache')
                .select('tenant_id, plan_name, status, amount_cents');

            if (subError) {
                console.error('Subscriptions fetch error:', subError);
            }

            const users = await listAllUsers();

            // Combine data
            const combined: Tenant[] = (settings || []).map(s => {
                const sub = subscriptions?.find(sub => sub.tenant_id === s.user_id);
                const user = users?.find(u => u.id === s.user_id);
                return {
                    id: s.user_id,
                    email: user?.email || 'N/A',
                    store_name: (s as any).app_name || 'Sem nome', // Use app_name from database
                    plan_name: sub?.plan_name || 'Gratuito',
                    status: sub?.status === 'active' || sub?.status === 'trialing' ? 'active' : 'inactive',
                    created_at: new Date().toISOString(), // Fallback
                    mrr_cents: sub?.amount_cents || 0
                };
            });

            setTenants(combined);
        } catch (error: any) {
            console.error('Error fetching tenants details:', error?.message || error);
            // Demo data for development
            setTenants([
                { id: '1', email: 'lanchonete@exemplo.com', store_name: 'Hot Dog Express', plan_name: 'Profissional', status: 'active', created_at: '2025-01-15', mrr_cents: 9900 },
                { id: '2', email: 'fastfood@mail.com', store_name: 'Fast Burger', plan_name: 'Avançado', status: 'active', created_at: '2025-02-20', mrr_cents: 4900 },
                { id: '3', email: 'dogao@mail.com', store_name: 'Dogão do Zé', plan_name: 'Básico', status: 'past_due', created_at: '2024-12-01', mrr_cents: 2900 },
                { id: '4', email: 'lanches@teste.com', store_name: 'Lanches da Maria', plan_name: 'Profissional', status: 'active', created_at: '2025-03-10', mrr_cents: 9900 },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const loadFeatureFlags = async (tenantId: string) => {

        try {
            const { data } = await supabase
                .from('tenant_feature_flags')
                .select('feature_key, enabled')
                .eq('tenant_id', tenantId);

            const flags: Record<string, boolean> = {};
            AVAILABLE_FEATURES.forEach(f => {
                const existing = data?.find(d => d.feature_key === f.feature_key);
                flags[f.feature_key] = existing?.enabled || false;
            });
            setFeatureFlags(flags);
        } catch (error) {
            console.error('Error loading feature flags:', error);
            const flags: Record<string, boolean> = {};
            AVAILABLE_FEATURES.forEach(f => { flags[f.feature_key] = false; });
            setFeatureFlags(flags);
        }
    };

    const openFlagsPanel = async (tenant: Tenant) => {
        setSelectedTenant(tenant);
        await loadFeatureFlags(tenant.id);
        setShowFlagsPanel(true);
    };

    const toggleFlag = (key: string) => {
        setFeatureFlags(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const saveFeatureFlags = async () => {
        if (!selectedTenant) return;
        setSavingFlags(true);

        try {
            // Upsert all flags
            const upserts = Object.entries(featureFlags).map(([feature_key, enabled]) => ({
                tenant_id: selectedTenant.id,
                feature_key,
                enabled,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('tenant_feature_flags')
                .upsert(upserts, { onConflict: 'tenant_id,feature_key' });

            if (error) throw error;
            setShowFlagsPanel(false);
        } catch (error) {
            console.error('Error saving feature flags:', error);
        } finally {
            setSavingFlags(false);
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            past_due: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            canceled: 'bg-red-500/20 text-red-400 border-red-500/30',
            inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        };
        const labels: Record<string, string> = {
            active: 'Ativo',
            past_due: 'Pendente',
            canceled: 'Cancelado',
            inactive: 'Inativo',
        };
        return (
            <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium border",
                styles[status] || styles.inactive
            )}>
                {labels[status] || status}
            </span>
        );
    };

    const columns: Column<Tenant>[] = [
        {
            key: 'store_name',
            header: 'Loja',
            sortable: true,
            render: (_, row) => (
                <div>
                    <p className="font-medium text-white">{row.store_name}</p>
                    <p className="text-gray-500 text-xs">{row.email}</p>
                </div>
            )
        },
        {
            key: 'plan_name',
            header: 'Plano',
            sortable: true,
            render: (value) => (
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
                    {value as string}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value) => getStatusBadge(value as string)
        },
        {
            key: 'mrr_cents',
            header: 'MRR',
            sortable: true,
            render: (value) => (
                <span className="text-white font-medium">{formatCurrency(value as number)}</span>
            )
        },
        {
            key: 'created_at',
            header: 'Cliente Desde',
            sortable: true,
            render: (value) => formatDate(value as string)
        },
    ];

    const renderActions = (row: Tenant) => (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(actionMenuOpen === row.id ? null : row.id);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
                <FiMoreVertical size={18} />
            </button>

            {actionMenuOpen === row.id && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setActionMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-10 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openFlagsPanel(row);
                                setActionMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                        >
                            <FiToggleRight size={16} />
                            Feature Flags
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3">
                            <FiEdit2 size={16} />
                            Editar Plano
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3">
                            <FiGift size={16} />
                            Dar Dias de Bônus
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3">
                            <FiLogIn size={16} />
                            Login as User
                        </button>
                        <hr className="my-2 border-gray-700" />
                        <button className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3">
                            <FiUserX size={16} />
                            Banir Usuário
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    const activeCount = tenants.filter(t => t.status === 'active').length;
    const totalMRR = tenants.reduce((sum, t) => sum + t.mrr_cents, 0);
    const pendingCount = tenants.filter(t => t.status === 'past_due').length;

    // Create tenant function
    const handleCreateTenant = async () => {
        if (!createForm.email || !createForm.store_name) return;
        setCreatingTenant(true);

        try {
            // Create user settings (in production, you'd create auth user first)
            const newUserId = crypto.randomUUID();

            await supabase.from('user_settings').insert({
                user_id: newUserId,
                app_name: createForm.store_name, // Fix: use app_name in database
                created_at: new Date().toISOString()
            });

            // Create subscription cache entry
            await supabase.from('subscriptions_cache').insert({
                tenant_id: newUserId,
                plan_name: createForm.plan_name,
                status: 'active',
                mrr_cents: createForm.plan_name === 'Plano Básico' ? 2990 : createForm.plan_name === 'Plano Avançado' ? 4990 : 9990,
                current_period_end: createForm.expiration_date ? new Date(createForm.expiration_date).toISOString() : null
            });

            setShowCreateModal(false);
            setCreateForm({ email: '', store_name: '', plan_name: 'Plano Básico', expiration_date: '' });
            fetchTenants();
        } catch (error) {
            console.error('Error creating tenant:', error);
        } finally {
            setCreatingTenant(false);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestão de Tenants</h1>
                    <p className="text-gray-400 mt-1">Gerencie todas as lanchonetes cadastradas no sistema</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            setSyncing(true);
                            try {
                                await syncStripeData();
                                await fetchTenants();
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setSyncing(false);
                            }
                        }}
                        disabled={syncing}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700",
                            syncing && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <FiRefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                            "bg-linear-to-r from-orange-500 to-red-500 text-white",
                            "hover:from-orange-600 hover:to-red-600"
                        )}
                    >
                        <FiPlus size={18} />
                        Novo Usuário
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCard
                    title="Total de Lojas"
                    value={tenants.length}
                    icon={<FiUsers size={24} />}
                    loading={loading}
                />
                <StatsCard
                    title="Lojas Ativas"
                    value={activeCount}
                    icon={<FiCheck size={24} />}
                    variant="success"
                    loading={loading}
                />
                <StatsCard
                    title="Pagamento Pendente"
                    value={pendingCount}
                    icon={<FiAlertCircle size={24} />}
                    variant={pendingCount > 0 ? 'warning' : 'default'}
                    loading={loading}
                />
            </div>

            {/* Tenants Table */}
            <DataTable
                columns={columns}
                data={tenants}
                keyField="id"
                searchPlaceholder="Buscar por nome ou email..."
                actions={renderActions}
                loading={loading}
                selectable
            />

            {/* Feature Flags Panel */}
            {showFlagsPanel && selectedTenant && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowFlagsPanel(false)}
                    />
                    <div className="fixed right-0 top-0 h-screen w-96 bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto">
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Feature Flags</h2>
                                    <p className="text-gray-400 text-sm">{selectedTenant.store_name}</p>
                                </div>
                                <button
                                    onClick={() => setShowFlagsPanel(false)}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Flags List */}
                            <div className="space-y-4">
                                {AVAILABLE_FEATURES.map((feature) => (
                                    <div
                                        key={feature.feature_key}
                                        className={cn(
                                            "p-4 rounded-lg border transition-all cursor-pointer",
                                            featureFlags[feature.feature_key]
                                                ? "bg-orange-500/10 border-orange-500/30"
                                                : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                                        )}
                                        onClick={() => toggleFlag(feature.feature_key)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{feature.feature_key}</p>
                                                <p className="text-gray-400 text-sm mt-1">{feature.description}</p>
                                            </div>
                                            <button className="ml-4">
                                                {featureFlags[feature.feature_key] ? (
                                                    <FiToggleRight size={28} className="text-orange-500" />
                                                ) : (
                                                    <FiToggleLeft size={28} className="text-gray-500" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Save Button */}
                            <div className="mt-8 pt-6 border-t border-gray-700">
                                <button
                                    onClick={saveFeatureFlags}
                                    disabled={savingFlags}
                                    className={cn(
                                        "w-full py-3 rounded-lg font-medium transition-all",
                                        "bg-linear-to-r from-orange-500 to-red-500 text-white",
                                        "hover:from-orange-600 hover:to-red-600",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                >
                                    {savingFlags ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Create Tenant Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white">Novo Usuário</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    placeholder="email@exemplo.com"
                                />
                            </div>

                            {/* Store Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nome da Loja *
                                </label>
                                <input
                                    type="text"
                                    value={createForm.store_name}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, store_name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    placeholder="Nome da lanchonete"
                                />
                            </div>

                            {/* Plan Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Plano
                                </label>
                                <select
                                    value={createForm.plan_name}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, plan_name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                >
                                    <option value="Plano Básico">Plano Básico - R$ 29,90/mês</option>
                                    <option value="Plano Avançado">Plano Avançado - R$ 49,90/mês</option>
                                    <option value="Plano Profissional">Plano Profissional - R$ 99,90/mês</option>
                                </select>
                            </div>

                            {/* Expiration Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <FiCalendar className="inline mr-2" size={16} />
                                    Data de Expiração (opcional)
                                </label>
                                <input
                                    type="date"
                                    value={createForm.expiration_date}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, expiration_date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                                <p className="text-gray-500 text-xs mt-1">
                                    Deixe em branco para assinatura sem data de término fixa
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateTenant}
                                disabled={creatingTenant || !createForm.email || !createForm.store_name}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                                    "bg-linear-to-r from-orange-500 to-red-500 text-white",
                                    "hover:from-orange-600 hover:to-red-600",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                <FiSave size={18} />
                                {creatingTenant ? 'Criando...' : 'Criar Usuário'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
