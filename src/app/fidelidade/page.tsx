'use client';

import React, { useState, useEffect } from 'react';
import {
    FiGift,
    FiUsers,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch,
    FiStar,
    FiSettings,
    FiTrendingUp,
    FiAward,
    FiToggleLeft,
    FiToggleRight,
    FiTag,
    FiShoppingBag,
    FiDollarSign
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

interface Customer {
    id: string;
    phone: string;
    name: string;
    email: string | null;
    total_points: number;
    total_spent: number;
    total_orders: number;
    coupons_used: number;
    total_discount_savings: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    created_at: string;
}

interface LoyaltyReward {
    id: string;
    name: string;
    description: string | null;
    points_cost: number;
    reward_type: 'discount_percent' | 'discount_fixed' | 'free_product' | 'free_delivery';
    reward_value: number | null;
    min_order_value: number;
    is_active: boolean;
}

interface LoyaltySettings {
    id: string;
    points_per_real: number;
    min_points_to_redeem: number;
    points_expiry_days: number;
    tier_bronze_min: number;
    tier_silver_min: number;
    tier_gold_min: number;
    tier_platinum_min: number;
    silver_multiplier: number;
    gold_multiplier: number;
    platinum_multiplier: number;
    is_active: boolean;
}

interface AppSettings {
    id: string;
    loyalty_enabled: boolean;
    coupons_enabled: boolean;
}

type TabType = 'customers' | 'rewards' | 'settings';

export default function FidelidadePage() {
    const { user } = useAuth();
    const { plan, canAccess } = useSubscription();
    const [activeTab, setActiveTab] = useState<TabType>('customers');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
    const [settings, setSettings] = useState<LoyaltySettings | null>(null);
    const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

    // Check if user has access to loyalty feature
    if (!canAccess('loyalty')) {
        return (
            <MainLayout>
                <UpgradePrompt
                    feature="Programa de Fidelidade"
                    requiredPlan="Avançado"
                    currentPlan={plan}
                    fullPage
                />
            </MainLayout>
        );
    }

    // Form states
    const [rewardForm, setRewardForm] = useState({
        name: '',
        description: '',
        points_cost: 100,
        reward_type: 'discount_percent' as LoyaltyReward['reward_type'],
        reward_value: 10,
        min_order_value: 0
    });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchCustomers(), fetchRewards(), fetchSettings(), fetchAppSettings()]);
        setLoading(false);
    };

    const fetchCustomers = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .gt('total_orders', 0) // Only show customers with at least 1 order
            .order('total_points', { ascending: false });

        if (!error && data) {
            setCustomers(data);
        }
    };

    const fetchRewards = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('loyalty_rewards')
            .select('*')
            .eq('user_id', user.id)
            .order('points_cost', { ascending: true });

        if (!error && data) {
            setRewards(data);
        }
    };

    const fetchSettings = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('loyalty_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error?.code === 'PGRST116') {
            // No settings, create defaults
            const { data: newSettings } = await supabase
                .from('loyalty_settings')
                .insert({
                    user_id: user.id,
                    points_per_real: 1,
                    min_points_to_redeem: 100,
                    points_expiry_days: 365,
                    tier_bronze_min: 0,
                    tier_silver_min: 500,
                    tier_gold_min: 2000,
                    tier_platinum_min: 5000,
                    silver_multiplier: 1.25,
                    gold_multiplier: 1.50,
                    platinum_multiplier: 2.00,
                    is_active: true
                })
                .select()
                .single();
            if (newSettings) {
                setSettings(newSettings);
            }
        } else if (data) {
            setSettings(data);
        }
    };

    const fetchAppSettings = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error?.code === 'PGRST116') {
            // No settings, create defaults
            const { data: newSettings } = await supabase
                .from('app_settings')
                .insert({
                    user_id: user.id,
                    loyalty_enabled: true,
                    coupons_enabled: true
                })
                .select()
                .single();
            if (newSettings) {
                setAppSettings(newSettings);
            }
        } else if (data) {
            setAppSettings(data);
        }
    };

    const toggleLoyalty = async () => {
        if (!appSettings || !user) return;
        const newValue = !appSettings.loyalty_enabled;
        await supabase
            .from('app_settings')
            .update({ loyalty_enabled: newValue, updated_at: new Date().toISOString() })
            .eq('id', appSettings.id);
        setAppSettings({ ...appSettings, loyalty_enabled: newValue });
    };

    const toggleCoupons = async () => {
        if (!appSettings || !user) return;
        const newValue = !appSettings.coupons_enabled;
        await supabase
            .from('app_settings')
            .update({ coupons_enabled: newValue, updated_at: new Date().toISOString() })
            .eq('id', appSettings.id);
        setAppSettings({ ...appSettings, coupons_enabled: newValue });
    };

    const handleSaveReward = async () => {
        if (!user) return;

        const rewardData = {
            user_id: user.id,
            name: rewardForm.name,
            description: rewardForm.description || null,
            points_cost: rewardForm.points_cost,
            reward_type: rewardForm.reward_type,
            reward_value: rewardForm.reward_value,
            min_order_value: rewardForm.min_order_value,
            is_active: true
        };

        if (editingReward) {
            await supabase
                .from('loyalty_rewards')
                .update(rewardData)
                .eq('id', editingReward.id);
        } else {
            await supabase.from('loyalty_rewards').insert(rewardData);
        }

        setShowRewardModal(false);
        setEditingReward(null);
        resetRewardForm();
        fetchRewards();
    };

    const handleDeleteReward = async (id: string) => {
        if (!confirm('Excluir esta recompensa?')) return;
        await supabase.from('loyalty_rewards').delete().eq('id', id);
        fetchRewards();
    };

    const handleSaveSettings = async () => {
        if (!user || !settings) return;
        await supabase
            .from('loyalty_settings')
            .update({
                ...settings,
                updated_at: new Date().toISOString()
            })
            .eq('id', settings.id);
        alert('Configurações salvas!');
    };

    const resetRewardForm = () => {
        setRewardForm({
            name: '',
            description: '',
            points_cost: 100,
            reward_type: 'discount_percent',
            reward_value: 10,
            min_order_value: 0
        });
    };

    const openEditReward = (reward: LoyaltyReward) => {
        setEditingReward(reward);
        setRewardForm({
            name: reward.name,
            description: reward.description || '',
            points_cost: reward.points_cost,
            reward_type: reward.reward_type,
            reward_value: reward.reward_value || 0,
            min_order_value: reward.min_order_value
        });
        setShowRewardModal(true);
    };

    const getTierIcon = (tier: string) => {
        switch (tier) {
            case 'platinum': return '💎';
            case 'gold': return '🥇';
            case 'silver': return '🥈';
            default: return '🥉';
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'platinum': return '#a855f7';
            case 'gold': return '#f59e0b';
            case 'silver': return '#94a3b8';
            default: return '#d97706';
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const filteredCustomers = customers.filter(c => {
        const searchLower = searchTerm.toLowerCase();
        const searchDigits = searchTerm.replace(/\D/g, '');
        return c.name.toLowerCase().includes(searchLower) ||
            c.phone.includes(searchDigits) ||
            c.phone.includes(searchTerm);
    });

    const stats = {
        totalCustomers: customers.length,
        totalPoints: customers.reduce((sum, c) => sum + (c.total_points || 0), 0),
        avgPoints: customers.length ? Math.round(customers.reduce((sum, c) => sum + (c.total_points || 0), 0) / customers.length) : 0,
        platinumCount: customers.filter(c => c.tier === 'platinum').length,
        goldCount: customers.filter(c => c.tier === 'gold').length,
        totalSavings: customers.reduce((sum, c) => sum + (c.total_discount_savings || 0), 0)
    };

    // If loyalty is disabled, show disabled message
    if (appSettings && !appSettings.loyalty_enabled) {
        return (
            <MainLayout>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div>
                            <h1 className={styles.title}>Programa de Fidelidade</h1>
                            <p className={styles.subtitle}>Gerencie seus clientes e recompensas</p>
                        </div>
                    </div>

                    <Card className={styles.disabledCard}>
                        <div className={styles.disabledContent}>
                            <FiToggleLeft className={styles.disabledIcon} />
                            <h2>Programa de Fidelidade Desativado</h2>
                            <p>O programa de fidelidade está desativado. Ative-o para visualizar clientes e gerenciar recompensas.</p>
                            <Button onClick={toggleLoyalty} leftIcon={<FiToggleRight />}>
                                Ativar Fidelidade
                            </Button>
                        </div>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Programa de Fidelidade</h1>
                        <p className={styles.subtitle}>Gerencie seus clientes e recompensas</p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.toggleGroup}>
                            <button
                                className={`${styles.toggleBtn} ${appSettings?.loyalty_enabled ? styles.active : ''}`}
                                onClick={toggleLoyalty}
                                title="Ativar/Desativar Fidelidade"
                            >
                                {appSettings?.loyalty_enabled ? <FiToggleRight /> : <FiToggleLeft />}
                                Fidelidade
                            </button>
                            <button
                                className={`${styles.toggleBtn} ${appSettings?.coupons_enabled ? styles.active : ''}`}
                                onClick={toggleCoupons}
                                title="Ativar/Desativar Cupons"
                            >
                                {appSettings?.coupons_enabled ? <FiToggleRight /> : <FiToggleLeft />}
                                Cupons
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <Card className={styles.statCard}>
                        <FiUsers className={styles.statIcon} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{stats.totalCustomers}</span>
                            <span className={styles.statLabel}>Clientes</span>
                        </div>
                    </Card>
                    <Card className={styles.statCard}>
                        <FiStar className={styles.statIcon} style={{ color: '#f59e0b' }} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{stats.totalPoints.toLocaleString()}</span>
                            <span className={styles.statLabel}>Pontos Totais</span>
                        </div>
                    </Card>
                    <Card className={styles.statCard}>
                        <FiTrendingUp className={styles.statIcon} style={{ color: '#10b981' }} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{stats.avgPoints}</span>
                            <span className={styles.statLabel}>Média por Cliente</span>
                        </div>
                    </Card>
                    <Card className={styles.statCard}>
                        <FiTag className={styles.statIcon} style={{ color: '#8b5cf6' }} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{formatCurrency(stats.totalSavings)}</span>
                            <span className={styles.statLabel}>Economia em Cupons</span>
                        </div>
                    </Card>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'customers' ? styles.active : ''}`}
                        onClick={() => setActiveTab('customers')}
                    >
                        <FiUsers /> Clientes
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'rewards' ? styles.active : ''}`}
                        onClick={() => setActiveTab('rewards')}
                    >
                        <FiGift /> Recompensas
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <FiSettings /> Configurações
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'customers' && (
                    <Card>
                        <div className={styles.searchBar}>
                            <div className={styles.searchInput}>
                                <FiSearch />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou telefone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.loading}>Carregando...</div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className={styles.emptyState}>
                                <span>👥</span>
                                <h3>Nenhum cliente cadastrado</h3>
                                <p>Os clientes aparecerão aqui quando fizerem pedidos com telefone e pagamento confirmado</p>
                            </div>
                        ) : (
                            <div className={styles.customersList}>
                                {filteredCustomers.map((customer) => (
                                    <div key={customer.id} className={styles.customerRow}>
                                        <div className={styles.customerInfo}>
                                            <div
                                                className={styles.tierBadge}
                                                style={{ background: getTierColor(customer.tier) }}
                                            >
                                                {getTierIcon(customer.tier)}
                                            </div>
                                            <div className={styles.customerDetails}>
                                                <span className={styles.customerName}>{customer.name}</span>
                                                <span className={styles.customerPhone}>{customer.phone}</span>
                                            </div>
                                        </div>
                                        <div className={styles.customerStats}>
                                            <div className={styles.customerStat}>
                                                <FiStar className={styles.miniIcon} />
                                                <span className={styles.statNumber}>{customer.total_points || 0}</span>
                                                <span className={styles.statText}>pontos</span>
                                            </div>
                                            <div className={styles.customerStat}>
                                                <FiShoppingBag className={styles.miniIcon} />
                                                <span className={styles.statNumber}>{customer.total_orders || 0}</span>
                                                <span className={styles.statText}>pedidos</span>
                                            </div>
                                            <div className={styles.customerStat}>
                                                <FiDollarSign className={styles.miniIcon} />
                                                <span className={styles.statNumber}>{formatCurrency(customer.total_spent || 0)}</span>
                                                <span className={styles.statText}>gasto</span>
                                            </div>
                                            <div className={styles.customerStat}>
                                                <FiTag className={styles.miniIcon} />
                                                <span className={styles.statNumber}>{customer.coupons_used || 0}</span>
                                                <span className={styles.statText}>cupons</span>
                                            </div>
                                            <div className={styles.customerStat}>
                                                <FiTrendingUp className={styles.miniIcon} style={{ color: '#10b981' }} />
                                                <span className={styles.statNumber}>{formatCurrency(customer.total_discount_savings || 0)}</span>
                                                <span className={styles.statText}>economia</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {activeTab === 'rewards' && (
                    <Card>
                        <div className={styles.sectionHeader}>
                            <h2>Recompensas Disponíveis</h2>
                            <Button
                                leftIcon={<FiPlus />}
                                onClick={() => {
                                    resetRewardForm();
                                    setEditingReward(null);
                                    setShowRewardModal(true);
                                }}
                            >
                                Nova Recompensa
                            </Button>
                        </div>

                        {rewards.length === 0 ? (
                            <div className={styles.emptyState}>
                                <span>🎁</span>
                                <h3>Nenhuma recompensa cadastrada</h3>
                                <p>Crie recompensas para seus clientes resgatarem com pontos</p>
                            </div>
                        ) : (
                            <div className={styles.rewardsList}>
                                {rewards.map((reward) => (
                                    <div key={reward.id} className={styles.rewardCard}>
                                        <div className={styles.rewardIcon}>🎁</div>
                                        <div className={styles.rewardInfo}>
                                            <h3>{reward.name}</h3>
                                            {reward.description && <p>{reward.description}</p>}
                                            <div className={styles.rewardMeta}>
                                                <span className={styles.pointsCost}>
                                                    <FiStar /> {reward.points_cost} pontos
                                                </span>
                                                <span className={styles.rewardType}>
                                                    {reward.reward_type === 'discount_percent' && `${reward.reward_value}% de desconto`}
                                                    {reward.reward_type === 'discount_fixed' && `${formatCurrency(reward.reward_value || 0)} de desconto`}
                                                    {reward.reward_type === 'free_delivery' && 'Entrega Grátis'}
                                                    {reward.reward_type === 'free_product' && 'Produto Grátis'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.rewardActions}>
                                            <button onClick={() => openEditReward(reward)}><FiEdit2 /></button>
                                            <button onClick={() => handleDeleteReward(reward.id)}><FiTrash2 /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {activeTab === 'settings' && settings && (
                    <Card>
                        <h2 className={styles.sectionTitle}>Configurações do Programa</h2>

                        <div className={styles.settingsGrid}>
                            <div className={styles.settingGroup}>
                                <label>Pontos por R$ 1,00 gasto</label>
                                <Input
                                    type="number"
                                    value={settings.points_per_real}
                                    onChange={(e) => setSettings({ ...settings, points_per_real: parseFloat(e.target.value) || 0 })}
                                    min={0}
                                    step={0.1}
                                />
                            </div>
                            <div className={styles.settingGroup}>
                                <label>Mínimo de pontos para resgatar</label>
                                <Input
                                    type="number"
                                    value={settings.min_points_to_redeem}
                                    onChange={(e) => setSettings({ ...settings, min_points_to_redeem: parseInt(e.target.value) || 0 })}
                                    min={0}
                                />
                            </div>
                            <div className={styles.settingGroup}>
                                <label>Expiração de pontos (dias)</label>
                                <Input
                                    type="number"
                                    value={settings.points_expiry_days}
                                    onChange={(e) => setSettings({ ...settings, points_expiry_days: parseInt(e.target.value) || 365 })}
                                    min={30}
                                />
                            </div>
                        </div>

                        <h3 className={styles.subSectionTitle}>Níveis de Fidelidade</h3>
                        <div className={styles.tiersGrid}>
                            <div className={styles.tierSetting}>
                                <span className={styles.tierIcon}>🥉</span>
                                <span className={styles.tierName}>Bronze</span>
                                <span className={styles.tierRange}>0 - {settings.tier_silver_min - 1} pts</span>
                                <span className={styles.tierMultiplier}>1x pontos</span>
                            </div>
                            <div className={styles.tierSetting}>
                                <span className={styles.tierIcon}>🥈</span>
                                <span className={styles.tierName}>Silver</span>
                                <Input
                                    type="number"
                                    value={settings.tier_silver_min}
                                    onChange={(e) => setSettings({ ...settings, tier_silver_min: parseInt(e.target.value) || 0 })}
                                    className={styles.tierInput}
                                />
                                <span className={styles.tierMultiplier}>{settings.silver_multiplier}x pontos</span>
                            </div>
                            <div className={styles.tierSetting}>
                                <span className={styles.tierIcon}>🥇</span>
                                <span className={styles.tierName}>Gold</span>
                                <Input
                                    type="number"
                                    value={settings.tier_gold_min}
                                    onChange={(e) => setSettings({ ...settings, tier_gold_min: parseInt(e.target.value) || 0 })}
                                    className={styles.tierInput}
                                />
                                <span className={styles.tierMultiplier}>{settings.gold_multiplier}x pontos</span>
                            </div>
                            <div className={styles.tierSetting}>
                                <span className={styles.tierIcon}>💎</span>
                                <span className={styles.tierName}>Platinum</span>
                                <Input
                                    type="number"
                                    value={settings.tier_platinum_min}
                                    onChange={(e) => setSettings({ ...settings, tier_platinum_min: parseInt(e.target.value) || 0 })}
                                    className={styles.tierInput}
                                />
                                <span className={styles.tierMultiplier}>{settings.platinum_multiplier}x pontos</span>
                            </div>
                        </div>

                        <div className={styles.settingsActions}>
                            <Button onClick={handleSaveSettings}>Salvar Configurações</Button>
                        </div>
                    </Card>
                )}

                {/* Reward Modal */}
                {showRewardModal && (
                    <div className={styles.modal}>
                        <div className={styles.modalContent}>
                            <h2>{editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}</h2>

                            <div className={styles.formGroup}>
                                <label>Nome da Recompensa</label>
                                <Input
                                    value={rewardForm.name}
                                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                                    placeholder="Ex: 10% de desconto"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Descrição (opcional)</label>
                                <Input
                                    value={rewardForm.description}
                                    onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                                    placeholder="Descrição da recompensa"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Custo em Pontos</label>
                                    <Input
                                        type="number"
                                        value={rewardForm.points_cost}
                                        onChange={(e) => setRewardForm({ ...rewardForm, points_cost: parseInt(e.target.value) || 0 })}
                                        min={1}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Pedido Mínimo</label>
                                    <Input
                                        type="number"
                                        value={rewardForm.min_order_value}
                                        onChange={(e) => setRewardForm({ ...rewardForm, min_order_value: parseFloat(e.target.value) || 0 })}
                                        min={0}
                                        step={0.01}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Tipo de Recompensa</label>
                                <select
                                    value={rewardForm.reward_type}
                                    onChange={(e) => setRewardForm({ ...rewardForm, reward_type: e.target.value as LoyaltyReward['reward_type'] })}
                                    className={styles.select}
                                >
                                    <option value="discount_percent">Desconto Percentual</option>
                                    <option value="discount_fixed">Desconto Fixo (R$)</option>
                                    <option value="free_delivery">Entrega Grátis</option>
                                    <option value="free_product">Produto Grátis</option>
                                </select>
                            </div>

                            {(rewardForm.reward_type === 'discount_percent' || rewardForm.reward_type === 'discount_fixed') && (
                                <div className={styles.formGroup}>
                                    <label>
                                        {rewardForm.reward_type === 'discount_percent' ? 'Porcentagem de Desconto' : 'Valor do Desconto (R$)'}
                                    </label>
                                    <Input
                                        type="number"
                                        value={rewardForm.reward_value}
                                        onChange={(e) => setRewardForm({ ...rewardForm, reward_value: parseFloat(e.target.value) || 0 })}
                                        min={0}
                                        step={rewardForm.reward_type === 'discount_percent' ? 1 : 0.01}
                                    />
                                </div>
                            )}

                            <div className={styles.modalActions}>
                                <Button variant="ghost" onClick={() => setShowRewardModal(false)}>Cancelar</Button>
                                <Button onClick={handleSaveReward}>
                                    {editingReward ? 'Salvar' : 'Criar Recompensa'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
