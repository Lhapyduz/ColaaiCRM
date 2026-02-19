'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
    FiX,
    FiCheck,
    FiAlertCircle,
    FiPlus,
    FiSave,
    FiCalendar,
    FiRefreshCw,
    FiTrash2,
    FiClock,
    FiDollarSign,
    FiSlash,
    FiAlertTriangle,
} from 'react-icons/fi';
import { syncStripeData } from '@/actions/sync-stripe';
import { updateClientFeatureFlags } from '@/actions/admin/manage-plan';
import { deleteClient, editClient, grantPlanAccess, revokeAccess } from '@/actions/admin/manage-clients';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface Tenant {
    id: string;
    email: string;
    store_name: string;
    plan_name: string | null;
    status: string;
    created_at: string;
    mrr_cents: number;
    current_period_end: string | null;
}

interface FeatureFlag {
    feature_key: string;
    enabled: boolean;
    description: string;
}

interface Plan {
    id: string;
    name: string;
    price_cents: number;
    active: boolean;
    stripe_price_id?: string;
    billing_interval?: 'monthly' | 'semiannual' | 'annual';
}

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

const AVAILABLE_FEATURES: FeatureFlag[] = [
    { feature_key: 'beta_menu', enabled: false, description: 'Novo sistema de menu com IA' },
    { feature_key: 'advanced_reports', enabled: false, description: 'Relatórios avançados e predições' },
    { feature_key: 'ai_predictions', enabled: false, description: 'Previsões de vendas com Machine Learning' },
    { feature_key: 'multi_branch', enabled: false, description: 'Suporte a múltiplas filiais' },
    { feature_key: 'priority_support', enabled: false, description: 'Suporte prioritário 24/7' },
    { feature_key: 'custom_branding', enabled: false, description: 'Personalização avançada de marca' },
];

const DURATION_PRESETS = [
    { label: '1 Dia', value: 1, unit: 'days' as const },
    { label: '7 Dias', value: 7, unit: 'days' as const },
    { label: '15 Dias', value: 15, unit: 'days' as const },
    { label: '1 Mês', value: 1, unit: 'months' as const },
    { label: '3 Meses', value: 3, unit: 'months' as const },
    { label: '6 Meses', value: 6, unit: 'months' as const },
    { label: '1 Ano', value: 1, unit: 'years' as const },
];

// ═══════════════════════════════════════════════════════════════
// TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-9999 flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        "px-4 py-3 rounded-lg shadow-xl border backdrop-blur-sm flex items-center gap-3 animate-in slide-in-from-right duration-300",
                        toast.type === 'success' && "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                        toast.type === 'error' && "bg-red-500/20 border-red-500/40 text-red-300",
                        toast.type === 'info' && "bg-blue-500/20 border-blue-500/40 text-blue-300",
                    )}
                >
                    {toast.type === 'success' && <FiCheck size={16} />}
                    {toast.type === 'error' && <FiAlertCircle size={16} />}
                    {toast.type === 'info' && <FiRefreshCw size={16} />}
                    <span className="text-sm flex-1">{toast.message}</span>
                    <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
                        <FiX size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function ClientsPage() {
    // Core state
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [activePlans, setActivePlans] = useState<Plan[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Feature Flags
    const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
    const [showFlagsPanel, setShowFlagsPanel] = useState(false);
    const [savingFlags, setSavingFlags] = useState(false);

    // Create Client Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ email: '', store_name: '', plan_id: '', expiration_date: '' });
    const [creatingTenant, setCreatingTenant] = useState(false);

    // Edit Client Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ email: '', store_name: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    // Grant Plan Modal
    const [showGrantModal, setShowGrantModal] = useState(false);
    const [grantForm, setGrantForm] = useState({ plan_id: '', duration_value: 1, duration_unit: 'months' as 'days' | 'months' | 'years' });
    const [savingGrant, setSavingGrant] = useState(false);

    // Bonus Days Modal
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [bonusDays, setBonusDays] = useState(7);
    const [savingBonus, setSavingBonus] = useState(false);

    // Delete Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    // Revoke state
    const [revoking, setRevoking] = useState(false);

    // ═══════════════════════════════════════════════════════════
    // TOAST HELPER
    // ═══════════════════════════════════════════════════════════
    const addToast = useCallback((type: Toast['type'], message: string) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ═══════════════════════════════════════════════════════════
    // DATA FETCHING
    // ═══════════════════════════════════════════════════════════
    const fetchTenants = useCallback(async () => {
        try {
            const { data: settings, error: settingsError } = await supabase
                .from('user_settings')
                .select('user_id, app_name, created_at');

            if (settingsError) throw settingsError;

            const { data: subscriptions } = await supabase
                .from('subscriptions_cache')
                .select('tenant_id, plan_name, status, amount_cents, current_period_end');

            const users = await listAllUsers();

            const combined: Tenant[] = (settings || []).map(s => {
                const sub = subscriptions?.find(sub => sub.tenant_id === s.user_id);
                const user = users?.find(u => u.id === s.user_id);
                return {
                    id: s.user_id,
                    email: user?.email || 'N/A',
                    store_name: s.app_name || 'Sem nome',
                    plan_name: sub?.plan_name || 'Gratuito',
                    status: sub?.status === 'active' || sub?.status === 'trialing' ? 'active' : (sub?.status || 'inactive'),
                    created_at: s.created_at || new Date().toISOString(),
                    mrr_cents: sub?.amount_cents || 0,
                    current_period_end: sub?.current_period_end || null,
                };
            });

            setTenants(combined);
        } catch (error: unknown) {
            console.error('Error fetching tenants:', error instanceof Error ? error.message : error);
            addToast('error', 'Erro ao carregar clientes');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const fetchPlans = useCallback(async () => {
        const { data } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('price_cents', { ascending: true });

        if (data) {
            setActivePlans(data.map(p => ({
                id: p.id,
                name: p.name,
                price_cents: p.price_cents,
                active: p.is_active,
                stripe_price_id: p.stripe_price_id,
                billing_interval: p.billing_interval,
            })));
        }
    }, []);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);
    useEffect(() => { fetchTenants(); }, [fetchTenants]);

    // ═══════════════════════════════════════════════════════════
    // FEATURE FLAGS
    // ═══════════════════════════════════════════════════════════
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
        } catch {
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

    const toggleFlag = (key: string) => setFeatureFlags(prev => ({ ...prev, [key]: !prev[key] }));

    const saveFeatureFlags = async () => {
        if (!selectedTenant) return;
        setSavingFlags(true);
        try {
            const { success, error } = await updateClientFeatureFlags(selectedTenant.id, featureFlags);
            if (!success) throw new Error(error);
            setShowFlagsPanel(false);
            addToast('success', 'Funcionalidades atualizadas!');
        } catch (error: unknown) {
            addToast('error', `Erro ao salvar flags: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setSavingFlags(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // SYNC STRIPE
    // ═══════════════════════════════════════════════════════════
    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await syncStripeData();
            await fetchTenants();
            if (result.success) {
                const count = 'subscriptions' in result ? result.subscriptions : 0;
                addToast('success', `Sincronizado! ${count} assinaturas processadas.`);
            } else {
                addToast('error', 'Erro na sincronização');
            }
        } catch {
            addToast('error', 'Falha na sincronização');
        } finally {
            setSyncing(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // CREATE CLIENT
    // ═══════════════════════════════════════════════════════════
    const handleCreateClient = async () => {
        if (!createForm.email || !createForm.store_name || !createForm.plan_id) return;
        setCreatingTenant(true);

        const selectedPlan = activePlans.find(p => p.id === createForm.plan_id);

        try {
            const newUserId = crypto.randomUUID();

            await supabase.from('user_settings').insert({
                user_id: newUserId,
                app_name: createForm.store_name,
                created_at: new Date().toISOString(),
            });

            await supabase.from('subscriptions_cache').insert({
                tenant_id: newUserId,
                plan_name: selectedPlan?.name || 'Unknown',
                status: 'active',
                amount_cents: selectedPlan?.price_cents || 0,
                current_period_end: createForm.expiration_date ? new Date(createForm.expiration_date).toISOString() : null,
            });

            setShowCreateModal(false);
            setCreateForm({ email: '', store_name: '', plan_id: '', expiration_date: '' });
            addToast('success', 'Cliente criado com sucesso!');
            fetchTenants();
        } catch (error: unknown) {
            addToast('error', `Erro ao criar: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setCreatingTenant(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // EDIT CLIENT
    // ═══════════════════════════════════════════════════════════
    const handleOpenEdit = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setEditForm({ email: tenant.email, store_name: tenant.store_name });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedTenant) return;
        setSavingEdit(true);
        try {
            const { success, error } = await editClient({
                userId: selectedTenant.id,
                email: editForm.email !== selectedTenant.email ? editForm.email : undefined,
                storeName: editForm.store_name !== selectedTenant.store_name ? editForm.store_name : undefined,
            });
            if (!success) throw new Error(error);
            setShowEditModal(false);
            addToast('success', 'Dados atualizados!');
            fetchTenants();
        } catch (error: unknown) {
            addToast('error', `Erro: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setSavingEdit(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // GRANT PLAN ACCESS
    // ═══════════════════════════════════════════════════════════
    const handleOpenGrant = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        const matchingPlan = activePlans.find(p => p.name === tenant.plan_name);
        setGrantForm({ plan_id: matchingPlan?.id || (activePlans[0]?.id || ''), duration_value: 1, duration_unit: 'months' });
        setShowGrantModal(true);
    };

    const handleSaveGrant = async () => {
        if (!selectedTenant || !grantForm.plan_id) return;
        setSavingGrant(true);
        try {
            const { success, error } = await grantPlanAccess({
                userId: selectedTenant.id,
                planId: grantForm.plan_id,
                duration: { value: grantForm.duration_value, unit: grantForm.duration_unit },
            });
            if (!success) throw new Error(error);
            setShowGrantModal(false);
            addToast('success', 'Plano concedido com sucesso!');
            fetchTenants();
        } catch (error: unknown) {
            addToast('error', `Erro: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setSavingGrant(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // BONUS DAYS
    // ═══════════════════════════════════════════════════════════
    const handleOpenBonus = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setBonusDays(7);
        setShowBonusModal(true);
    };

    const handleGiveBonusDays = async () => {
        if (!selectedTenant) return;
        setSavingBonus(true);
        try {
            const { data: sub } = await supabase
                .from('subscriptions_cache')
                .select('current_period_end')
                .eq('tenant_id', selectedTenant.id)
                .single();

            const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end) : new Date();
            const baseDate = currentEnd > new Date() ? currentEnd : new Date();
            baseDate.setDate(baseDate.getDate() + bonusDays);

            const { error } = await supabase
                .from('subscriptions_cache')
                .update({ current_period_end: baseDate.toISOString(), status: 'active' })
                .eq('tenant_id', selectedTenant.id);

            if (error) throw error;

            setShowBonusModal(false);
            addToast('success', `${bonusDays} dias bônus adicionados!`);
            fetchTenants();
        } catch (error: unknown) {
            addToast('error', `Erro: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setSavingBonus(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // REVOKE ACCESS
    // ═══════════════════════════════════════════════════════════
    const handleRevoke = async (tenant: Tenant) => {
        if (!confirm(`Tem certeza que deseja revogar o acesso de "${tenant.store_name}"?`)) return;
        setRevoking(true);
        try {
            const { success, error } = await revokeAccess(tenant.id);
            if (!success) throw new Error(error);
            addToast('success', 'Acesso revogado!');
            fetchTenants();
        } catch (error: unknown) {
            addToast('error', `Erro: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setRevoking(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // DELETE CLIENT
    // ═══════════════════════════════════════════════════════════
    const handleOpenDelete = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedTenant || deleteConfirmText !== 'EXCLUIR') return;
        setDeleting(true);
        try {
            const result = await deleteClient(selectedTenant.id);
            if (!result.success) throw new Error(result.error);

            setShowDeleteModal(false);
            if (result.partial) {
                addToast('info', 'Cliente excluído com avisos parciais.');
            } else {
                addToast('success', 'Cliente excluído permanentemente!');
            }
            fetchTenants();
        } catch (error: unknown) {
            addToast('error', `Erro ao excluir: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setDeleting(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // FORMATTERS & HELPERS
    // ═══════════════════════════════════════════════════════════
    const formatCurrency = (cents: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

    const getExpirationStatus = (dateStr: string | null) => {
        if (!dateStr) return { label: 'Sem prazo', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' };
        const now = new Date();
        const end = new Date(dateStr);
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return { label: `Expirado há ${Math.abs(daysLeft)}d`, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
        if (daysLeft <= 3) return { label: `${daysLeft}d restantes`, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
        if (daysLeft <= 7) return { label: `${daysLeft}d restantes`, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
        if (daysLeft <= 30) return { label: `${daysLeft}d restantes`, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
        return { label: formatDate(dateStr), color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            trialing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            past_due: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            canceled: 'bg-red-500/20 text-red-400 border-red-500/30',
            banned: 'bg-red-700/20 text-red-500 border-red-700/30',
            inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        };
        const labels: Record<string, string> = {
            active: 'Ativo',
            trialing: 'Trial',
            past_due: 'Pendente',
            canceled: 'Cancelado',
            banned: 'Banido',
            inactive: 'Inativo',
        };
        return (
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", styles[status] || styles.inactive)}>
                {labels[status] || status}
            </span>
        );
    };

    // ═══════════════════════════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════════════════════════
    const activeCount = tenants.filter(t => t.status === 'active' || t.status === 'trialing').length;
    const totalMRR = tenants.filter(t => t.status === 'active').reduce((sum, t) => sum + t.mrr_cents, 0);
    const expiringCount = tenants.filter(t => {
        if (!t.current_period_end) return false;
        const daysLeft = Math.ceil((new Date(t.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysLeft >= 0 && daysLeft <= 7;
    }).length;

    // ═══════════════════════════════════════════════════════════
    // TABLE COLUMNS
    // ═══════════════════════════════════════════════════════════
    const columns: Column<Tenant>[] = [
        {
            key: 'store_name',
            header: 'Loja',
            sortable: true,
            render: (_, row) => (
                <div className="min-w-0">
                    <p className="font-medium text-white truncate">{row.store_name}</p>
                    <p className="text-gray-500 text-xs truncate">{row.email}</p>
                </div>
            ),
        },
        {
            key: 'plan_name',
            header: 'Plano',
            sortable: true,
            render: (value) => (
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium whitespace-nowrap">
                    {value as string}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (value) => getStatusBadge(value as string),
        },
        {
            key: 'current_period_end',
            header: 'Expiração',
            sortable: true,
            render: (_, row) => {
                const exp = getExpirationStatus(row.current_period_end);
                return (
                    <span className={cn("px-2 py-1 rounded-md text-xs font-medium border whitespace-nowrap", exp.bg, exp.color)}>
                        {exp.label}
                    </span>
                );
            },
        },
        {
            key: 'mrr_cents',
            header: 'MRR',
            sortable: true,
            render: (value) => (
                <span className="text-white font-medium whitespace-nowrap">{formatCurrency(value as number)}</span>
            ),
        },
    ];

    // ═══════════════════════════════════════════════════════════
    // ACTIONS MENU RENDER
    // ═══════════════════════════════════════════════════════════
    const renderActions = (row: Tenant) => (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === row.id ? null : row.id); }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
                <FiMoreVertical size={18} />
            </button>

            {actionMenuOpen === row.id && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                    <div className="absolute right-0 top-10 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); setActionMenuOpen(null); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                        >
                            <FiEdit2 size={15} /> Editar Dados
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenGrant(row); setActionMenuOpen(null); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                        >
                            <FiCalendar size={15} /> Conceder Plano
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenBonus(row); setActionMenuOpen(null); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                        >
                            <FiGift size={15} /> Adicionar Dias
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); openFlagsPanel(row); setActionMenuOpen(null); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                        >
                            <FiToggleRight size={15} /> Feature Flags
                        </button>
                        <hr className="my-1 border-gray-700" />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRevoke(row); setActionMenuOpen(null); }}
                            disabled={revoking}
                            className="w-full px-4 py-2.5 text-left text-sm text-amber-400 hover:bg-amber-500/10 flex items-center gap-3"
                        >
                            <FiSlash size={15} /> Revogar Acesso
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDelete(row); setActionMenuOpen(null); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                        >
                            <FiTrash2 size={15} /> Excluir Cliente
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <div className="p-4 md:p-8 max-w-full overflow-x-hidden">
            {/* Toasts */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Gestão de Clientes</h1>
                    <p className="text-gray-400 text-sm mt-1">Gerencie todos os clientes, planos e acessos — sincronizado com Stripe</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 text-sm",
                            syncing && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <FiRefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 text-sm"
                    >
                        <FiPlus size={16} /> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <StatsCard title="Total de Clientes" value={tenants.length} icon={<FiUsers size={22} />} loading={loading} />
                <StatsCard title="Clientes Ativos" value={activeCount} icon={<FiCheck size={22} />} variant="success" loading={loading} />
                <StatsCard title="MRR Total" value={formatCurrency(totalMRR)} icon={<FiDollarSign size={22} />} loading={loading} />
                <StatsCard
                    title="Expirando em 7d"
                    value={expiringCount}
                    icon={<FiClock size={22} />}
                    variant={expiringCount > 0 ? 'warning' : 'default'}
                    loading={loading}
                />
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={tenants}
                keyField="id"
                searchPlaceholder="Buscar por nome ou email..."
                actions={renderActions}
                loading={loading}
                selectable
            />

            {/* ═══ MODAL: Editar Dados ═══ */}
            {showEditModal && selectedTenant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-gray-700">
                            <h2 className="text-lg font-bold text-white">Editar Cliente</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome da Loja</label>
                                <input
                                    type="text"
                                    value={editForm.store_name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, store_name: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
                            <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">Cancelar</button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                            >
                                <FiSave size={16} />
                                {savingEdit ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Conceder Plano ═══ */}
            {showGrantModal && selectedTenant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold text-white">Conceder Plano</h2>
                                <p className="text-gray-400 text-xs mt-0.5">{selectedTenant.store_name}</p>
                            </div>
                            <button onClick={() => setShowGrantModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Plan Select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Plano</label>
                                {activePlans.length === 0 ? (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                                        Nenhum plano ativo. <Link href="/admin/plans" className="underline font-bold">Criar Planos</Link>.
                                    </div>
                                ) : (
                                    <select
                                        value={grantForm.plan_id}
                                        onChange={(e) => setGrantForm(prev => ({ ...prev, plan_id: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                        {activePlans.map(plan => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.name} — {formatCurrency(plan.price_cents)}/{plan.billing_interval === 'annual' ? 'ano' : 'mês'}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Duration Presets */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Duração do Acesso</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {DURATION_PRESETS.map((preset) => {
                                        const isActive = grantForm.duration_value === preset.value && grantForm.duration_unit === preset.unit;
                                        return (
                                            <button
                                                key={preset.label}
                                                onClick={() => setGrantForm(prev => ({ ...prev, duration_value: preset.value, duration_unit: preset.unit }))}
                                                className={cn(
                                                    "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                                    isActive
                                                        ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                                                        : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                                                )}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom Duration */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Personalizado</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={grantForm.duration_value}
                                        onChange={(e) => setGrantForm(prev => ({ ...prev, duration_value: Math.max(1, parseInt(e.target.value) || 1) }))}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Unidade</label>
                                    <select
                                        value={grantForm.duration_unit}
                                        onChange={(e) => setGrantForm(prev => ({ ...prev, duration_unit: e.target.value as 'days' | 'months' | 'years' }))}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                        <option value="days">Dias</option>
                                        <option value="months">Meses</option>
                                        <option value="years">Anos</option>
                                    </select>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                                <p className="text-xs text-gray-400">
                                    O acesso será válido por <strong className="text-orange-400">{grantForm.duration_value} {grantForm.duration_unit === 'days' ? 'dia(s)' : grantForm.duration_unit === 'months' ? 'mês(es)' : 'ano(s)'}</strong> a partir de agora.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
                            <button onClick={() => setShowGrantModal(false)} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">Cancelar</button>
                            <button
                                onClick={handleSaveGrant}
                                disabled={savingGrant || !grantForm.plan_id}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
                            >
                                <FiCheck size={16} />
                                {savingGrant ? 'Concedendo...' : 'Conceder Acesso'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Criar Cliente ═══ */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-gray-700">
                            <h2 className="text-lg font-bold text-white">Novo Cliente</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email *</label>
                                <input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome da Loja *</label>
                                <input
                                    type="text"
                                    value={createForm.store_name}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, store_name: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    placeholder="Nome da lanchonete"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Plano</label>
                                {activePlans.length === 0 ? (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                                        Nenhum plano ativo. <Link href="/admin/plans" className="underline font-bold">Criar Planos</Link>.
                                    </div>
                                ) : (
                                    <select
                                        value={createForm.plan_id}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, plan_id: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                        <option value="">Selecione um plano...</option>
                                        {activePlans.map(plan => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.name} — {formatCurrency(plan.price_cents)}/mês
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    <FiCalendar className="inline mr-1.5" size={14} />
                                    Data de Expiração (opcional)
                                </label>
                                <input
                                    type="date"
                                    value={createForm.expiration_date}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, expiration_date: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
                            <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">Cancelar</button>
                            <button
                                onClick={handleCreateClient}
                                disabled={creatingTenant || !createForm.email || !createForm.store_name}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
                            >
                                <FiSave size={16} />
                                {creatingTenant ? 'Criando...' : 'Criar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Dias Bônus ═══ */}
            {showBonusModal && selectedTenant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-gray-700">
                            <h2 className="text-lg font-bold text-white">Dar Dias Bônus</h2>
                            <button onClick={() => setShowBonusModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-gray-300 text-sm">Quantos dias adicionar à assinatura de <strong className="text-white">{selectedTenant.store_name}</strong>?</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 3, 7, 15, 30, 60, 90, 365].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setBonusDays(d)}
                                        className={cn(
                                            "px-2 py-2 rounded-lg text-xs font-medium border transition-all",
                                            bonusDays === d
                                                ? "bg-green-500/20 border-green-500/40 text-green-400"
                                                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                                        )}
                                    >
                                        {d}d
                                    </button>
                                ))}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Dias personalizados</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={bonusDays}
                                    onChange={(e) => setBonusDays(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
                            <button onClick={() => setShowBonusModal(false)} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">Cancelar</button>
                            <button
                                onClick={handleGiveBonusDays}
                                disabled={savingBonus}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                            >
                                <FiGift size={16} />
                                {savingBonus ? 'Adicionando...' : `Adicionar ${bonusDays} dias`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Excluir Cliente ═══ */}
            {showDeleteModal && selectedTenant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-red-500/30 w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-700">
                            <div className="flex items-center gap-2 text-red-400">
                                <FiAlertTriangle size={20} />
                                <h2 className="text-lg font-bold">Excluir Permanentemente</h2>
                            </div>
                            <button onClick={() => setShowDeleteModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-300 text-sm font-medium mb-2">⚠️ Esta ação é IRREVERSÍVEL!</p>
                                <p className="text-red-300/80 text-xs">
                                    Todos os dados de <strong>&quot;{selectedTenant.store_name}&quot;</strong> serão removidos permanentemente:
                                </p>
                                <ul className="text-red-300/70 text-xs mt-2 space-y-1 list-disc pl-4">
                                    <li>Conta de autenticação (Supabase Auth)</li>
                                    <li>Configurações e dados da loja</li>
                                    <li>Assinatura e cache de plano</li>
                                    <li>Feature flags</li>
                                    <li>Customer e assinatura no Stripe</li>
                                </ul>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">
                                    Digite <strong className="text-red-400">EXCLUIR</strong> para confirmar
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-900 border border-red-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                    placeholder="EXCLUIR"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
                            <button onClick={() => setShowDeleteModal(false)} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">Cancelar</button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleting || deleteConfirmText !== 'EXCLUIR'}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FiTrash2 size={16} />
                                {deleting ? 'Excluindo...' : 'Excluir Permanentemente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PAINEL: Feature Flags ═══ */}
            {showFlagsPanel && selectedTenant && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowFlagsPanel(false)} />
                    <div className="fixed right-0 top-0 h-screen w-80 md:w-96 bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Feature Flags</h2>
                                    <p className="text-gray-400 text-xs">{selectedTenant.store_name}</p>
                                </div>
                                <button onClick={() => setShowFlagsPanel(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
                                    <FiX size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {AVAILABLE_FEATURES.map((feature) => (
                                    <div
                                        key={feature.feature_key}
                                        className={cn(
                                            "p-3 rounded-lg border transition-all cursor-pointer",
                                            featureFlags[feature.feature_key]
                                                ? "bg-orange-500/10 border-orange-500/30"
                                                : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                                        )}
                                        onClick={() => toggleFlag(feature.feature_key)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium text-sm">{feature.feature_key}</p>
                                                <p className="text-gray-400 text-xs mt-0.5 truncate">{feature.description}</p>
                                            </div>
                                            <button className="ml-3 shrink-0">
                                                {featureFlags[feature.feature_key] ? (
                                                    <FiToggleRight size={24} className="text-orange-500" />
                                                ) : (
                                                    <FiToggleLeft size={24} className="text-gray-500" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-700">
                                <button
                                    onClick={saveFeatureFlags}
                                    disabled={savingFlags}
                                    className="w-full py-2.5 rounded-lg font-medium bg-linear-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-sm"
                                >
                                    {savingFlags ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
