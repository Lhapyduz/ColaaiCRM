'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiLayers, FiTag } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UpgradePrompt, { LimitWarning } from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

interface Addon {
    id: string;
    name: string;
    price: number;
    available: boolean;
}

interface AddonGroup {
    id: string;
    name: string;
    description: string | null;
    min_selection: number;
    max_selection: number;
    required: boolean;
    addons?: Addon[];
}

export default function AdicionaisPage() {
    const { user } = useAuth();
    const { canAccess, plan, getLimit, isWithinLimit } = useSubscription();
    const [addons, setAddons] = useState<Addon[]>([]);
    const [groups, setGroups] = useState<AddonGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'addons' | 'groups'>('addons');
    const [searchTerm, setSearchTerm] = useState('');

    const [showAddonModal, setShowAddonModal] = useState(false);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
    const [addonName, setAddonName] = useState('');
    const [addonPrice, setAddonPrice] = useState('');

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupMinSelection, setGroupMinSelection] = useState('0');
    const [groupMaxSelection, setGroupMaxSelection] = useState('1');
    const [groupRequired, setGroupRequired] = useState(false);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

    const hasAccess = canAccess('addons');
    const toast = useToast();

    useEffect(() => { if (user) fetchData(); }, [user]);

    const fetchData = async () => {
        if (!user) return;
        try {
            const { data: addonsData } = await supabase.from('product_addons').select('*').eq('user_id', user.id).order('name');
            setAddons(addonsData || []);
            const { data: groupsData } = await supabase.from('addon_groups').select(`*, addon_group_items (addon_id, product_addons (*))`).eq('user_id', user.id).order('name');
            if (groupsData) {
                const formattedGroups = groupsData.map(g => ({ ...g, addons: g.addon_group_items?.map((item: any) => item.product_addons).filter(Boolean) || [] }));
                setGroups(formattedGroups);
            }
        } catch (error) { console.error('Error fetching data:', error); }
        finally { setLoading(false); }
    };

    const addonsLimit = getLimit('addons');
    const isAtLimit = !isWithinLimit('addons', addons.length);

    const openAddAddonModal = () => {
        if (isAtLimit) { alert(`Limite de ${addonsLimit} adicionais atingido! Faça upgrade do seu plano para adicionar mais.`); return; }
        setEditingAddon(null); setAddonName(''); setAddonPrice(''); setShowAddonModal(true);
    };
    const openEditAddonModal = (addon: Addon) => { setEditingAddon(addon); setAddonName(addon.name); setAddonPrice(addon.price.toString()); setShowAddonModal(true); };

    const handleSaveAddon = async () => {
        if (!user || !addonName) return;
        try {
            const addonData = { user_id: user.id, name: addonName, price: parseFloat(addonPrice) || 0 };
            if (editingAddon) await supabase.from('product_addons').update(addonData).eq('id', editingAddon.id);
            else await supabase.from('product_addons').insert(addonData);
            toast.success(editingAddon ? 'Adicional atualizado!' : 'Adicional criado!');
            setShowAddonModal(false); fetchData();
        } catch (error) { console.error('Error saving addon:', error); toast.error('Erro ao salvar adicional'); }
    };

    const handleDeleteAddon = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este adicional?')) return;
        try { await supabase.from('product_addons').delete().eq('id', id); toast.success('Adicional excluído!'); fetchData(); }
        catch (error) { console.error('Error deleting addon:', error); toast.error('Erro ao excluir adicional'); }
    };

    const toggleAddonAvailability = async (addon: Addon) => {
        try { await supabase.from('product_addons').update({ available: !addon.available }).eq('id', addon.id); fetchData(); }
        catch (error) { console.error('Error toggling addon:', error); }
    };

    const openAddGroupModal = () => { setEditingGroup(null); setGroupName(''); setGroupDescription(''); setGroupMinSelection('0'); setGroupMaxSelection('1'); setGroupRequired(false); setSelectedAddons([]); setShowGroupModal(true); };
    const openEditGroupModal = (group: AddonGroup) => { setEditingGroup(group); setGroupName(group.name); setGroupDescription(group.description || ''); setGroupMinSelection(group.min_selection.toString()); setGroupMaxSelection(group.max_selection.toString()); setGroupRequired(group.required); setSelectedAddons(group.addons?.map(a => a.id) || []); setShowGroupModal(true); };

    const handleSaveGroup = async () => {
        if (!user || !groupName) return;
        try {
            const groupData = { user_id: user.id, name: groupName, description: groupDescription || null, min_selection: parseInt(groupMinSelection) || 0, max_selection: parseInt(groupMaxSelection) || 1, required: groupRequired };
            let groupId: string;
            if (editingGroup) { await supabase.from('addon_groups').update(groupData).eq('id', editingGroup.id); groupId = editingGroup.id; }
            else { const { data } = await supabase.from('addon_groups').insert(groupData).select().single(); groupId = data.id; }
            await supabase.from('addon_group_items').delete().eq('group_id', groupId);
            if (selectedAddons.length > 0) await supabase.from('addon_group_items').insert(selectedAddons.map(addonId => ({ group_id: groupId, addon_id: addonId })));
            setShowGroupModal(false); fetchData();
        } catch (error) { console.error('Error saving group:', error); }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este grupo?')) return;
        try { await supabase.from('addon_groups').delete().eq('id', id); toast.success('Grupo excluído!'); fetchData(); }
        catch (error) { console.error('Error deleting group:', error); toast.error('Erro ao excluir grupo'); }
    };



    const filteredAddons = addons.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-8 gap-5 max-md:flex-col">
                    <div>
                        <h1 className="text-[2rem] font-bold mb-2">Adicionais</h1>
                        <p className="text-text-secondary">Gerencie extras e complementos para seus produtos</p>
                    </div>
                    <Button
                        leftIcon={<FiPlus />}
                        onClick={activeTab === 'addons' ? openAddAddonModal : openAddGroupModal}
                        disabled={activeTab === 'addons' && isAtLimit}
                    >
                        {activeTab === 'addons' ? 'Novo Adicional' : 'Novo Grupo'}
                    </Button>
                </div>

                <LimitWarning resource="adicionais" current={addons.length} limit={addonsLimit} requiredPlan="Avançado" />

                {/* Tabs */}
                <div className="flex gap-2 mb-6 max-md:w-full">
                    <button className={cn('flex items-center gap-2 px-5 py-3 bg-bg-card border border-border rounded-md text-text-secondary text-[0.95rem] cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary max-md:flex-1 max-md:justify-center', activeTab === 'addons' && 'bg-primary border-primary text-white')} onClick={() => setActiveTab('addons')}>
                        <FiTag /> Adicionais ({addons.length})
                    </button>
                    <button className={cn('flex items-center gap-2 px-5 py-3 bg-bg-card border border-border rounded-md text-text-secondary text-[0.95rem] cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary max-md:flex-1 max-md:justify-center', activeTab === 'groups' && 'bg-primary border-primary text-white')} onClick={() => setActiveTab('groups')}>
                        <FiLayers /> Grupos ({groups.length})
                    </button>
                </div>

                {/* Search */}
                <Card className="mb-6 p-4!">
                    <Input placeholder={`Buscar ${activeTab === 'addons' ? 'adicionais' : 'grupos'}...`} leftIcon={<FiSearch />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </Card>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-header rounded-md bg-bg-tertiary animate-pulse" />)}</div>
                ) : activeTab === 'addons' ? (
                    <div className="flex flex-col gap-3">
                        {filteredAddons.length > 0 ? filteredAddons.map((addon) => (
                            <Card key={addon.id} className={cn('flex items-center justify-between px-5! py-4! max-md:flex-col max-md:items-stretch max-md:gap-3', !addon.available && 'opacity-60')}>
                                <div className="flex-1">
                                    <h3 className="text-[1.1rem] font-semibold flex items-center gap-2.5">{addon.name}</h3>
                                    <span className="inline-block mt-1 text-[0.9rem] text-accent font-semibold">{addon.price > 0 ? `+ ${formatCurrency(addon.price)}` : 'Grátis'}</span>
                                </div>
                                <div className="flex items-center gap-2 max-md:justify-end">
                                    <button className={cn('px-3 py-1.5 bg-bg-tertiary border border-border rounded-full text-text-secondary text-[0.8rem] cursor-pointer transition-all duration-fast', addon.available && 'bg-accent/15 border-accent text-accent')} onClick={() => toggleAddonAvailability(addon)}>
                                        {addon.available ? 'Disponível' : 'Indisponível'}
                                    </button>
                                    <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary" onClick={() => openEditAddonModal(addon)}><FiEdit2 /></button>
                                    <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-error/10 hover:border-error hover:text-error" onClick={() => handleDeleteAddon(addon.id)}><FiTrash2 /></button>
                                </div>
                            </Card>
                        )) : (
                            <div className="text-center py-15 px-5">
                                <FiTag className="text-6xl text-text-muted mb-4 mx-auto" />
                                <h3 className="text-xl mb-2">Nenhum adicional cadastrado</h3>
                                <p className="text-text-secondary mb-5">Crie adicionais para personalizar seus produtos</p>
                                <Button leftIcon={<FiPlus />} onClick={openAddAddonModal}>Criar Adicional</Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredGroups.length > 0 ? filteredGroups.map((group) => (
                            <Card key={group.id} className="flex items-center justify-between px-5! py-4! max-md:flex-col max-md:items-stretch max-md:gap-3">
                                <div className="flex-1">
                                    <h3 className="text-[1.1rem] font-semibold flex items-center gap-2.5">
                                        {group.name}
                                        {group.required && <span className="text-[0.7rem] px-2 py-0.5 bg-warning/20 text-warning rounded-full font-medium">Obrigatório</span>}
                                    </h3>
                                    <p className="my-1 text-sm text-text-secondary">{group.addons?.length || 0} adicionais • {group.max_selection > 1 ? `Até ${group.max_selection} seleções` : '1 seleção'}</p>
                                    {group.addons && group.addons.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.addons.slice(0, 5).map(a => <span key={a.id} className="px-2.5 py-1 bg-bg-tertiary rounded-full text-xs text-text-secondary">{a.name}</span>)}
                                            {group.addons.length > 5 && <span className="px-2.5 py-1 bg-primary rounded-full text-xs text-white">+{group.addons.length - 5}</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 max-md:justify-end">
                                    <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary" onClick={() => openEditGroupModal(group)}><FiEdit2 /></button>
                                    <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-error/10 hover:border-error hover:text-error" onClick={() => handleDeleteGroup(group.id)}><FiTrash2 /></button>
                                </div>
                            </Card>
                        )) : (
                            <div className="text-center py-15 px-5">
                                <FiLayers className="text-6xl text-text-muted mb-4 mx-auto" />
                                <h3 className="text-xl mb-2">Nenhum grupo cadastrado</h3>
                                <p className="text-text-secondary mb-5">Agrupe adicionais para facilitar a seleção nos produtos</p>
                                <Button leftIcon={<FiPlus />} onClick={openAddGroupModal}>Criar Grupo</Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Addon Modal */}
                {showAddonModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowAddonModal(false)}>
                        <div className="bg-bg-card rounded-lg p-6 w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-semibold mb-5">{editingAddon ? 'Editar Adicional' : 'Novo Adicional'}</h2>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Nome do Adicional</label><Input value={addonName} onChange={(e) => setAddonName(e.target.value)} placeholder="Ex: Bacon extra, Queijo cheddar..." /></div>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Preço (R$)</label><Input type="number" step="0.01" value={addonPrice} onChange={(e) => setAddonPrice(e.target.value)} placeholder="0.00" /></div>
                            <div className="flex gap-3 justify-end mt-6"><Button variant="outline" onClick={() => setShowAddonModal(false)}>Cancelar</Button><Button onClick={handleSaveAddon}>{editingAddon ? 'Salvar' : 'Criar'}</Button></div>
                        </div>
                    </div>
                )}

                {/* Group Modal */}
                {showGroupModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowGroupModal(false)}>
                        <div className="bg-bg-card rounded-lg p-6 w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-semibold mb-5">{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</h2>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Nome do Grupo</label><Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Molhos, Extras, Acompanhamentos..." /></div>
                            <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Descrição (opcional)</label><Input value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Ex: Escolha seus molhos favoritos" /></div>
                            <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                                <div><label className="block text-sm text-text-secondary mb-2">Mínimo de seleções</label><Input type="number" min="0" value={groupMinSelection} onChange={(e) => setGroupMinSelection(e.target.value)} /></div>
                                <div><label className="block text-sm text-text-secondary mb-2">Máximo de seleções</label><Input type="number" min="1" value={groupMaxSelection} onChange={(e) => setGroupMaxSelection(e.target.value)} /></div>
                            </div>
                            <div className="mb-4"><label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" className="w-[18px] h-[18px] accent-primary" checked={groupRequired} onChange={(e) => setGroupRequired(e.target.checked)} />Seleção obrigatória</label></div>
                            <div className="mb-4">
                                <label className="block text-sm text-text-secondary mb-2">Adicionais do Grupo</label>
                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto p-3 bg-bg-tertiary rounded-md">
                                    {addons.map(addon => (
                                        <label key={addon.id} className={cn('flex items-center gap-2.5 px-3 py-2.5 bg-bg-card border border-border rounded-md cursor-pointer transition-all duration-fast hover:border-border-light', selectedAddons.includes(addon.id) && 'border-primary bg-primary/10')}>
                                            <input type="checkbox" className="accent-primary" checked={selectedAddons.includes(addon.id)} onChange={(e) => { if (e.target.checked) setSelectedAddons([...selectedAddons, addon.id]); else setSelectedAddons(selectedAddons.filter(id => id !== addon.id)); }} />
                                            <span className="flex-1">{addon.name}</span>
                                            {addon.price > 0 && <span className="text-[0.85rem] text-accent font-medium">+{formatCurrency(addon.price)}</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-6"><Button variant="outline" onClick={() => setShowGroupModal(false)}>Cancelar</Button><Button onClick={handleSaveGroup}>{editingGroup ? 'Salvar' : 'Criar'}</Button></div>
                        </div>
                    </div>
                )}
        </div>
    );
}
