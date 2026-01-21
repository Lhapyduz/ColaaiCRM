'use client';

import React, { useState, useEffect } from 'react';
import { FiGift, FiUsers, FiPlus, FiEdit2, FiTrash2, FiSearch, FiStar, FiSettings, FiTrendingUp, FiToggleLeft, FiToggleRight, FiTag, FiShoppingBag, FiDollarSign } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

interface Customer { id: string; phone: string; name: string; email: string | null; total_points: number; total_spent: number; total_orders: number; coupons_used: number; total_discount_savings: number; tier: 'bronze' | 'silver' | 'gold' | 'platinum'; created_at: string; }
interface LoyaltyReward { id: string; name: string; description: string | null; points_cost: number; reward_type: 'discount_percent' | 'discount_fixed' | 'free_product' | 'free_delivery'; reward_value: number | null; min_order_value: number; is_active: boolean; }
interface LoyaltySettings { id: string; points_per_real: number; min_points_to_redeem: number; points_expiry_days: number; tier_bronze_min: number; tier_silver_min: number; tier_gold_min: number; tier_platinum_min: number; silver_multiplier: number; gold_multiplier: number; platinum_multiplier: number; is_active: boolean; }
interface AppSettings { id: string; loyalty_enabled: boolean; coupons_enabled: boolean; }
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
    const [rewardForm, setRewardForm] = useState({ name: '', description: '', points_cost: 100, reward_type: 'discount_percent' as LoyaltyReward['reward_type'], reward_value: 10, min_order_value: 0 });
    const toast = useToast();

    useEffect(() => { if (user && canAccess('loyalty')) fetchData(); }, [user, canAccess]);

    if (!canAccess('loyalty')) return <MainLayout><UpgradePrompt feature="Programa de Fidelidade" requiredPlan="Avançado" currentPlan={plan} fullPage /></MainLayout>;

    const fetchData = async () => { setLoading(true); await Promise.all([fetchCustomers(), fetchRewards(), fetchSettings(), fetchAppSettings()]); setLoading(false); };
    const fetchCustomers = async () => { if (!user) return; const { data, error } = await supabase.from('customers').select('*').eq('user_id', user.id).gt('total_orders', 0).order('total_points', { ascending: false }); if (!error && data) setCustomers(data); };
    const fetchRewards = async () => { if (!user) return; const { data, error } = await supabase.from('loyalty_rewards').select('*').eq('user_id', user.id).order('points_cost', { ascending: true }); if (!error && data) setRewards(data); };
    const fetchSettings = async () => { if (!user) return; const { data, error } = await supabase.from('loyalty_settings').select('*').eq('user_id', user.id).single(); if (error?.code === 'PGRST116') { const { data: newSettings } = await supabase.from('loyalty_settings').insert({ user_id: user.id, points_per_real: 1, min_points_to_redeem: 100, points_expiry_days: 365, tier_bronze_min: 0, tier_silver_min: 500, tier_gold_min: 2000, tier_platinum_min: 5000, silver_multiplier: 1.25, gold_multiplier: 1.50, platinum_multiplier: 2.00, is_active: true }).select().single(); if (newSettings) setSettings(newSettings); } else if (data) setSettings(data); };
    const fetchAppSettings = async () => { if (!user) return; const { data, error } = await supabase.from('app_settings').select('*').eq('user_id', user.id).single(); if (error?.code === 'PGRST116') { const { data: newSettings } = await supabase.from('app_settings').insert({ user_id: user.id, loyalty_enabled: true, coupons_enabled: true }).select().single(); if (newSettings) setAppSettings(newSettings); } else if (data) setAppSettings(data); };

    const toggleLoyalty = async () => { if (!appSettings || !user) return; const newValue = !appSettings.loyalty_enabled; await supabase.from('app_settings').update({ loyalty_enabled: newValue, updated_at: new Date().toISOString() }).eq('id', appSettings.id); setAppSettings({ ...appSettings, loyalty_enabled: newValue }); };
    const toggleCoupons = async () => { if (!appSettings || !user) return; const newValue = !appSettings.coupons_enabled; await supabase.from('app_settings').update({ coupons_enabled: newValue, updated_at: new Date().toISOString() }).eq('id', appSettings.id); setAppSettings({ ...appSettings, coupons_enabled: newValue }); };

    const handleSaveReward = async () => { if (!user) return; const rewardData = { user_id: user.id, name: rewardForm.name, description: rewardForm.description || null, points_cost: rewardForm.points_cost, reward_type: rewardForm.reward_type, reward_value: rewardForm.reward_value, min_order_value: rewardForm.min_order_value, is_active: true }; if (editingReward) await supabase.from('loyalty_rewards').update(rewardData).eq('id', editingReward.id); else await supabase.from('loyalty_rewards').insert(rewardData); toast.success(editingReward ? 'Recompensa atualizada!' : 'Recompensa criada!'); setShowRewardModal(false); setEditingReward(null); resetRewardForm(); fetchRewards(); };
    const handleDeleteReward = async (id: string) => { if (!confirm('Excluir esta recompensa?')) return; await supabase.from('loyalty_rewards').delete().eq('id', id); toast.success('Recompensa excluída!'); fetchRewards(); };
    const handleSaveSettings = async () => { if (!user || !settings) return; await supabase.from('loyalty_settings').update({ ...settings, updated_at: new Date().toISOString() }).eq('id', settings.id); toast.success('Configurações salvas!'); };
    const resetRewardForm = () => setRewardForm({ name: '', description: '', points_cost: 100, reward_type: 'discount_percent', reward_value: 10, min_order_value: 0 });
    const openEditReward = (reward: LoyaltyReward) => { setEditingReward(reward); setRewardForm({ name: reward.name, description: reward.description || '', points_cost: reward.points_cost, reward_type: reward.reward_type, reward_value: reward.reward_value || 0, min_order_value: reward.min_order_value }); setShowRewardModal(true); };

    const getTierIcon = (tier: string) => tier === 'platinum' ? '💎' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉';
    const getTierColor = (tier: string) => tier === 'platinum' ? '#a855f7' : tier === 'gold' ? '#f59e0b' : tier === 'silver' ? '#94a3b8' : '#d97706';
    const filteredCustomers = customers.filter(c => { const searchLower = searchTerm.toLowerCase(); const searchDigits = searchTerm.replace(/\D/g, ''); return c.name.toLowerCase().includes(searchLower) || c.phone.includes(searchDigits) || c.phone.includes(searchTerm); });
    const stats = { totalCustomers: customers.length, totalPoints: customers.reduce((sum, c) => sum + (c.total_points || 0), 0), avgPoints: customers.length ? Math.round(customers.reduce((sum, c) => sum + (c.total_points || 0), 0) / customers.length) : 0, totalSavings: customers.reduce((sum, c) => sum + (c.total_discount_savings || 0), 0) };

    if (appSettings && !appSettings.loyalty_enabled) {
        return (
            <MainLayout>
                <div className="max-w-[1200px] mx-auto">
                    <div className="flex items-start justify-between mb-6"><div><h1 className="text-[2rem] font-bold mb-2">Programa de Fidelidade</h1><p className="text-text-secondary">Gerencie seus clientes e recompensas</p></div></div>
                    <Card className="text-center py-12"><FiToggleLeft className="text-5xl mb-4 text-text-muted mx-auto" /><h2 className="text-xl font-semibold mb-2">Programa de Fidelidade Desativado</h2><p className="text-text-secondary mb-5">O programa de fidelidade está desativado. Ative-o para visualizar clientes e gerenciar recompensas.</p><Button onClick={toggleLoyalty} leftIcon={<FiToggleRight />}>Ativar Fidelidade</Button></Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-[1200px] mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-5 mb-6 flex-wrap">
                    <div><h1 className="text-[2rem] font-bold mb-2">Programa de Fidelidade</h1><p className="text-text-secondary">Gerencie seus clientes e recompensas</p></div>
                    <div className="flex gap-2">
                        <button className={cn('flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border rounded-md text-sm font-medium cursor-pointer transition-all duration-fast', appSettings?.loyalty_enabled && 'bg-accent/10 border-accent text-accent')} onClick={toggleLoyalty}>{appSettings?.loyalty_enabled ? <FiToggleRight /> : <FiToggleLeft />} Fidelidade</button>
                        <button className={cn('flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border rounded-md text-sm font-medium cursor-pointer transition-all duration-fast', appSettings?.coupons_enabled && 'bg-accent/10 border-accent text-accent')} onClick={toggleCoupons}>{appSettings?.coupons_enabled ? <FiToggleRight /> : <FiToggleLeft />} Cupons</button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-2 max-[480px]:grid-cols-1">
                    <Card className="flex items-center gap-4 p-5!"><FiUsers className="text-2xl text-primary" /><div className="flex flex-col"><span className="text-xl font-bold">{stats.totalCustomers}</span><span className="text-[0.8125rem] text-text-muted">Clientes</span></div></Card>
                    <Card className="flex items-center gap-4 p-5!"><FiStar className="text-2xl text-[#f59e0b]" /><div className="flex flex-col"><span className="text-xl font-bold">{stats.totalPoints.toLocaleString()}</span><span className="text-[0.8125rem] text-text-muted">Pontos Totais</span></div></Card>
                    <Card className="flex items-center gap-4 p-5!"><FiTrendingUp className="text-2xl text-[#10b981]" /><div className="flex flex-col"><span className="text-xl font-bold">{stats.avgPoints}</span><span className="text-[0.8125rem] text-text-muted">Média por Cliente</span></div></Card>
                    <Card className="flex items-center gap-4 p-5!"><FiTag className="text-2xl text-[#8b5cf6]" /><div className="flex flex-col"><span className="text-xl font-bold">{formatCurrency(stats.totalSavings)}</span><span className="text-[0.8125rem] text-text-muted">Economias em Cupons</span></div></Card>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-border pb-4">
                    {[{ value: 'customers' as TabType, label: 'Clientes', icon: <FiUsers /> }, { value: 'rewards' as TabType, label: 'Recompensas', icon: <FiGift /> }, { value: 'settings' as TabType, label: 'Configurações', icon: <FiSettings /> }].map(tab => (
                        <button key={tab.value} className={cn('flex items-center gap-2 px-5 py-2.5 bg-transparent border border-border rounded-md text-text-secondary text-sm font-medium cursor-pointer transition-all duration-fast hover:bg-bg-tertiary', activeTab === tab.value && 'bg-primary border-primary text-white')} onClick={() => setActiveTab(tab.value)}>{tab.icon} {tab.label}</button>
                    ))}
                </div>

                {/* Customers Tab */}
                {activeTab === 'customers' && (
                    <Card>
                        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-bg-tertiary rounded-md"><FiSearch className="text-text-muted" /><input type="text" className="flex-1 bg-transparent border-none outline-none text-text-primary" placeholder="Buscar por nome ou telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                        {loading ? <div className="p-12 text-center text-text-secondary">Carregando...</div> : filteredCustomers.length === 0 ? (
                            <div className="flex flex-col items-center p-12 text-center text-text-muted"><span className="text-5xl mb-4">👥</span><h3 className="text-lg font-semibold text-text-secondary mb-2">Nenhum cliente cadastrado</h3><p>Os clientes aparecerão aqui quando fizerem pedidos</p></div>
                        ) : (
                            <div className="flex flex-col">
                                {filteredCustomers.map((customer) => (
                                    <div key={customer.id} className="flex items-center justify-between gap-4 p-4 border-b border-border last:border-b-0 max-md:flex-col max-md:items-start">
                                        <div className="flex items-center gap-3">
                                            <span className="w-10 h-10 flex items-center justify-center rounded-full text-lg" style={{ background: getTierColor(customer.tier) }}>{getTierIcon(customer.tier)}</span>
                                            <div className="flex flex-col"><span className="font-medium">{customer.name}</span><span className="text-sm text-text-muted">{customer.phone}</span></div>
                                        </div>
                                        <div className="flex items-center gap-6 flex-wrap max-md:gap-4">
                                            <div className="flex items-center gap-1 text-sm"><FiStar className="text-[#f59e0b]" /><span className="font-semibold">{customer.total_points || 0}</span><span className="text-text-muted">pts</span></div>
                                            <div className="flex items-center gap-1 text-sm"><FiShoppingBag className="text-primary" /><span className="font-semibold">{customer.total_orders || 0}</span><span className="text-text-muted">ped</span></div>
                                            <div className="flex items-center gap-1 text-sm"><FiDollarSign className="text-[#27ae60]" /><span className="font-semibold">{formatCurrency(customer.total_spent || 0)}</span></div>
                                            <div className="flex items-center gap-1 text-sm"><FiTag className="text-[#8b5cf6]" /><span className="font-semibold">{customer.coupons_used || 0}</span><span className="text-text-muted">cup</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* Rewards Tab */}
                {activeTab === 'rewards' && (
                    <Card>
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border"><h2 className="text-lg font-semibold">Recompensas Disponíveis</h2><Button leftIcon={<FiPlus />} onClick={() => { resetRewardForm(); setEditingReward(null); setShowRewardModal(true); }}>Nova Recompensa</Button></div>
                        {rewards.length === 0 ? (
                            <div className="flex flex-col items-center p-12 text-center text-text-muted"><span className="text-5xl mb-4">🎁</span><h3 className="text-lg font-semibold text-text-secondary mb-2">Nenhuma recompensa cadastrada</h3><p>Crie recompensas para seus clientes resgatarem</p></div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {rewards.map((reward) => (
                                    <div key={reward.id} className="flex items-center justify-between gap-4 p-4 bg-bg-tertiary rounded-md">
                                        <div className="flex items-center gap-4"><span className="text-3xl">🎁</span><div><h3 className="font-medium">{reward.name}</h3>{reward.description && <p className="text-sm text-text-muted">{reward.description}</p>}<div className="flex items-center gap-3 mt-1"><span className="flex items-center gap-1 text-xs text-primary font-medium"><FiStar /> {reward.points_cost} pts</span><span className="text-xs text-text-secondary">{reward.reward_type === 'discount_percent' && `${reward.reward_value}% off`}{reward.reward_type === 'discount_fixed' && `${formatCurrency(reward.reward_value || 0)} off`}{reward.reward_type === 'free_delivery' && 'Frete Grátis'}{reward.reward_type === 'free_product' && 'Produto Grátis'}</span></div></div></div>
                                        <div className="flex gap-2"><button className="p-2 bg-transparent border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:text-text-primary" onClick={() => openEditReward(reward)}><FiEdit2 /></button><button className="p-2 bg-transparent border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:text-error hover:border-error" onClick={() => handleDeleteReward(reward.id)}><FiTrash2 /></button></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && settings && (
                    <Card>
                        <h2 className="text-lg font-semibold mb-6 pb-4 border-b border-border">Configurações do Programa</h2>
                        <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-1">
                            <div><label className="block text-sm text-text-secondary mb-2">Pontos por R$ 1,00 gasto</label><Input type="number" value={settings.points_per_real} onChange={(e) => setSettings({ ...settings, points_per_real: parseFloat(e.target.value) || 0 })} min={0} step={0.1} /></div>
                            <div><label className="block text-sm text-text-secondary mb-2">Mínimo de pontos para resgatar</label><Input type="number" value={settings.min_points_to_redeem} onChange={(e) => setSettings({ ...settings, min_points_to_redeem: parseInt(e.target.value) || 0 })} min={0} /></div>
                            <div><label className="block text-sm text-text-secondary mb-2">Expiração de pontos (dias)</label><Input type="number" value={settings.points_expiry_days} onChange={(e) => setSettings({ ...settings, points_expiry_days: parseInt(e.target.value) || 365 })} min={30} /></div>
                        </div>
                        <h3 className="text-base font-medium mb-4">Níveis de Fidelidade</h3>
                        <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-2">
                            <div className="p-4 bg-bg-tertiary rounded-md text-center"><span className="text-2xl">🥉</span><div className="text-sm font-medium mt-1">Bronze</div><div className="text-xs text-text-muted">0 - {settings.tier_silver_min - 1} pts</div><div className="text-xs text-text-muted">1x pontos</div></div>
                            <div className="p-4 bg-bg-tertiary rounded-md text-center"><span className="text-2xl">🥈</span><div className="text-sm font-medium mt-1">Silver</div><Input type="number" className="mt-1 text-center text-sm" value={settings.tier_silver_min} onChange={(e) => setSettings({ ...settings, tier_silver_min: parseInt(e.target.value) || 0 })} /><div className="text-xs text-text-muted">{settings.silver_multiplier}x pts</div></div>
                            <div className="p-4 bg-bg-tertiary rounded-md text-center"><span className="text-2xl">🥇</span><div className="text-sm font-medium mt-1">Gold</div><Input type="number" className="mt-1 text-center text-sm" value={settings.tier_gold_min} onChange={(e) => setSettings({ ...settings, tier_gold_min: parseInt(e.target.value) || 0 })} /><div className="text-xs text-text-muted">{settings.gold_multiplier}x pts</div></div>
                            <div className="p-4 bg-bg-tertiary rounded-md text-center"><span className="text-2xl">💎</span><div className="text-sm font-medium mt-1">Platinum</div><Input type="number" className="mt-1 text-center text-sm" value={settings.tier_platinum_min} onChange={(e) => setSettings({ ...settings, tier_platinum_min: parseInt(e.target.value) || 0 })} /><div className="text-xs text-text-muted">{settings.platinum_multiplier}x pts</div></div>
                        </div>
                        <div className="flex justify-end"><Button onClick={handleSaveSettings}>Salvar Configurações</Button></div>
                    </Card>
                )}

                {/* Reward Modal */}
                {showRewardModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowRewardModal(false)}>
                        <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-semibold mb-6">{editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}</h2>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Nome da Recompensa</label><Input value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="Ex: 10% de desconto" /></div>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Descrição (opcional)</label><Input value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Descrição da recompensa" /></div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><label className="block text-sm text-text-secondary mb-2">Custo em Pontos</label><Input type="number" value={rewardForm.points_cost} onChange={(e) => setRewardForm({ ...rewardForm, points_cost: parseInt(e.target.value) || 0 })} min={1} /></div>
                                <div><label className="block text-sm text-text-secondary mb-2">Pedido Mínimo</label><Input type="number" value={rewardForm.min_order_value} onChange={(e) => setRewardForm({ ...rewardForm, min_order_value: parseFloat(e.target.value) || 0 })} min={0} step={0.01} /></div>
                            </div>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Tipo de Recompensa</label><select value={rewardForm.reward_type} onChange={(e) => setRewardForm({ ...rewardForm, reward_type: e.target.value as LoyaltyReward['reward_type'] })} className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-md text-text-primary"><option value="discount_percent">Desconto Percentual</option><option value="discount_fixed">Desconto Fixo (R$)</option><option value="free_delivery">Entrega Grátis</option><option value="free_product">Produto Grátis</option></select></div>
                            {(rewardForm.reward_type === 'discount_percent' || rewardForm.reward_type === 'discount_fixed') && <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">{rewardForm.reward_type === 'discount_percent' ? 'Porcentagem de Desconto' : 'Valor do Desconto (R$)'}</label><Input type="number" value={rewardForm.reward_value} onChange={(e) => setRewardForm({ ...rewardForm, reward_value: parseFloat(e.target.value) || 0 })} min={0} step={rewardForm.reward_type === 'discount_percent' ? 1 : 0.01} /></div>}
                            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border"><Button variant="ghost" onClick={() => setShowRewardModal(false)}>Cancelar</Button><Button onClick={handleSaveReward}>{editingReward ? 'Salvar' : 'Criar Recompensa'}</Button></div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
