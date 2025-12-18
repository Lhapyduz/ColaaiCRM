'use client';

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch,
    FiLayers,
    FiTag
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

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
    const [addons, setAddons] = useState<Addon[]>([]);
    const [groups, setGroups] = useState<AddonGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'addons' | 'groups'>('addons');
    const [searchTerm, setSearchTerm] = useState('');

    // Addon Modal
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
    const [addonName, setAddonName] = useState('');
    const [addonPrice, setAddonPrice] = useState('');

    // Group Modal
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupMinSelection, setGroupMinSelection] = useState('0');
    const [groupMaxSelection, setGroupMaxSelection] = useState('1');
    const [groupRequired, setGroupRequired] = useState(false);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user) return;

        try {
            // Fetch addons
            const { data: addonsData } = await supabase
                .from('product_addons')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            setAddons(addonsData || []);

            // Fetch groups with their addons
            const { data: groupsData } = await supabase
                .from('addon_groups')
                .select(`
                    *,
                    addon_group_items (
                        addon_id,
                        product_addons (*)
                    )
                `)
                .eq('user_id', user.id)
                .order('name');

            if (groupsData) {
                const formattedGroups = groupsData.map(g => ({
                    ...g,
                    addons: g.addon_group_items?.map((item: any) => item.product_addons).filter(Boolean) || []
                }));
                setGroups(formattedGroups);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Addon Functions
    const openAddAddonModal = () => {
        setEditingAddon(null);
        setAddonName('');
        setAddonPrice('');
        setShowAddonModal(true);
    };

    const openEditAddonModal = (addon: Addon) => {
        setEditingAddon(addon);
        setAddonName(addon.name);
        setAddonPrice(addon.price.toString());
        setShowAddonModal(true);
    };

    const handleSaveAddon = async () => {
        if (!user || !addonName) return;

        try {
            const addonData = {
                user_id: user.id,
                name: addonName,
                price: parseFloat(addonPrice) || 0
            };

            if (editingAddon) {
                await supabase
                    .from('product_addons')
                    .update(addonData)
                    .eq('id', editingAddon.id);
            } else {
                await supabase
                    .from('product_addons')
                    .insert(addonData);
            }

            setShowAddonModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving addon:', error);
        }
    };

    const handleDeleteAddon = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este adicional?')) return;

        try {
            await supabase.from('product_addons').delete().eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error deleting addon:', error);
        }
    };

    const toggleAddonAvailability = async (addon: Addon) => {
        try {
            await supabase
                .from('product_addons')
                .update({ available: !addon.available })
                .eq('id', addon.id);
            fetchData();
        } catch (error) {
            console.error('Error toggling addon:', error);
        }
    };

    // Group Functions
    const openAddGroupModal = () => {
        setEditingGroup(null);
        setGroupName('');
        setGroupDescription('');
        setGroupMinSelection('0');
        setGroupMaxSelection('1');
        setGroupRequired(false);
        setSelectedAddons([]);
        setShowGroupModal(true);
    };

    const openEditGroupModal = (group: AddonGroup) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setGroupDescription(group.description || '');
        setGroupMinSelection(group.min_selection.toString());
        setGroupMaxSelection(group.max_selection.toString());
        setGroupRequired(group.required);
        setSelectedAddons(group.addons?.map(a => a.id) || []);
        setShowGroupModal(true);
    };

    const handleSaveGroup = async () => {
        if (!user || !groupName) return;

        try {
            const groupData = {
                user_id: user.id,
                name: groupName,
                description: groupDescription || null,
                min_selection: parseInt(groupMinSelection) || 0,
                max_selection: parseInt(groupMaxSelection) || 1,
                required: groupRequired
            };

            let groupId: string;

            if (editingGroup) {
                await supabase
                    .from('addon_groups')
                    .update(groupData)
                    .eq('id', editingGroup.id);
                groupId = editingGroup.id;
            } else {
                const { data } = await supabase
                    .from('addon_groups')
                    .insert(groupData)
                    .select()
                    .single();
                groupId = data.id;
            }

            // Update group items
            await supabase
                .from('addon_group_items')
                .delete()
                .eq('group_id', groupId);

            if (selectedAddons.length > 0) {
                await supabase
                    .from('addon_group_items')
                    .insert(selectedAddons.map(addonId => ({
                        group_id: groupId,
                        addon_id: addonId
                    })));
            }

            setShowGroupModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving group:', error);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

        try {
            await supabase.from('addon_groups').delete().eq('id', id);
            fetchData();
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const filteredAddons = addons.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Adicionais</h1>
                        <p className={styles.subtitle}>Gerencie extras e complementos para seus produtos</p>
                    </div>
                    <Button
                        leftIcon={<FiPlus />}
                        onClick={activeTab === 'addons' ? openAddAddonModal : openAddGroupModal}
                    >
                        {activeTab === 'addons' ? 'Novo Adicional' : 'Novo Grupo'}
                    </Button>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'addons' ? styles.active : ''}`}
                        onClick={() => setActiveTab('addons')}
                    >
                        <FiTag /> Adicionais ({addons.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
                        onClick={() => setActiveTab('groups')}
                    >
                        <FiLayers /> Grupos ({groups.length})
                    </button>
                </div>

                {/* Search */}
                <Card className={styles.searchCard}>
                    <Input
                        placeholder={`Buscar ${activeTab === 'addons' ? 'adicionais' : 'grupos'}...`}
                        leftIcon={<FiSearch />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Card>

                {/* Content */}
                {loading ? (
                    <div className={styles.loading}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: 70, borderRadius: 10 }} />
                        ))}
                    </div>
                ) : activeTab === 'addons' ? (
                    /* Addons List */
                    <div className={styles.list}>
                        {filteredAddons.length > 0 ? (
                            filteredAddons.map((addon) => (
                                <Card key={addon.id} className={`${styles.itemCard} ${!addon.available ? styles.unavailable : ''}`}>
                                    <div className={styles.itemInfo}>
                                        <h3 className={styles.itemName}>{addon.name}</h3>
                                        <span className={styles.itemPrice}>
                                            {addon.price > 0 ? `+ ${formatCurrency(addon.price)}` : 'Grátis'}
                                        </span>
                                    </div>
                                    <div className={styles.itemActions}>
                                        <button
                                            className={`${styles.toggleBtn} ${addon.available ? styles.active : ''}`}
                                            onClick={() => toggleAddonAvailability(addon)}
                                        >
                                            {addon.available ? 'Disponível' : 'Indisponível'}
                                        </button>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => openEditAddonModal(addon)}
                                        >
                                            <FiEdit2 />
                                        </button>
                                        <button
                                            className={`${styles.iconBtn} ${styles.danger}`}
                                            onClick={() => handleDeleteAddon(addon.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                <FiTag className={styles.emptyIcon} />
                                <h3>Nenhum adicional cadastrado</h3>
                                <p>Crie adicionais para personalizar seus produtos</p>
                                <Button leftIcon={<FiPlus />} onClick={openAddAddonModal}>
                                    Criar Adicional
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Groups List */
                    <div className={styles.list}>
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map((group) => (
                                <Card key={group.id} className={styles.itemCard}>
                                    <div className={styles.itemInfo}>
                                        <h3 className={styles.itemName}>
                                            {group.name}
                                            {group.required && <span className={styles.requiredBadge}>Obrigatório</span>}
                                        </h3>
                                        <p className={styles.groupMeta}>
                                            {group.addons?.length || 0} adicionais •
                                            {group.max_selection > 1
                                                ? ` Até ${group.max_selection} seleções`
                                                : ' 1 seleção'
                                            }
                                        </p>
                                        {group.addons && group.addons.length > 0 && (
                                            <div className={styles.groupAddons}>
                                                {group.addons.slice(0, 5).map(a => (
                                                    <span key={a.id} className={styles.addonChip}>
                                                        {a.name}
                                                    </span>
                                                ))}
                                                {group.addons.length > 5 && (
                                                    <span className={styles.moreChip}>
                                                        +{group.addons.length - 5}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.itemActions}>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => openEditGroupModal(group)}
                                        >
                                            <FiEdit2 />
                                        </button>
                                        <button
                                            className={`${styles.iconBtn} ${styles.danger}`}
                                            onClick={() => handleDeleteGroup(group.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                <FiLayers className={styles.emptyIcon} />
                                <h3>Nenhum grupo cadastrado</h3>
                                <p>Agrupe adicionais para facilitar a seleção nos produtos</p>
                                <Button leftIcon={<FiPlus />} onClick={openAddGroupModal}>
                                    Criar Grupo
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Addon Modal */}
                {showAddonModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowAddonModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2>{editingAddon ? 'Editar Adicional' : 'Novo Adicional'}</h2>

                            <div className={styles.formGroup}>
                                <label>Nome do Adicional</label>
                                <Input
                                    value={addonName}
                                    onChange={(e) => setAddonName(e.target.value)}
                                    placeholder="Ex: Bacon extra, Queijo cheddar..."
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Preço (R$)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={addonPrice}
                                    onChange={(e) => setAddonPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="outline" onClick={() => setShowAddonModal(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveAddon}>
                                    {editingAddon ? 'Salvar' : 'Criar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Group Modal */}
                {showGroupModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowGroupModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2>{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</h2>

                            <div className={styles.formGroup}>
                                <label>Nome do Grupo</label>
                                <Input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Ex: Molhos, Extras, Acompanhamentos..."
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Descrição (opcional)</label>
                                <Input
                                    value={groupDescription}
                                    onChange={(e) => setGroupDescription(e.target.value)}
                                    placeholder="Ex: Escolha seus molhos favoritos"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Mínimo de seleções</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={groupMinSelection}
                                        onChange={(e) => setGroupMinSelection(e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Máximo de seleções</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={groupMaxSelection}
                                        onChange={(e) => setGroupMaxSelection(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={groupRequired}
                                        onChange={(e) => setGroupRequired(e.target.checked)}
                                    />
                                    Seleção obrigatória
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Adicionais do Grupo</label>
                                <div className={styles.addonGrid}>
                                    {addons.map(addon => (
                                        <label
                                            key={addon.id}
                                            className={`${styles.addonOption} ${selectedAddons.includes(addon.id) ? styles.selected : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAddons.includes(addon.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedAddons([...selectedAddons, addon.id]);
                                                    } else {
                                                        setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                                    }
                                                }}
                                            />
                                            <span>{addon.name}</span>
                                            {addon.price > 0 && (
                                                <span className={styles.optionPrice}>
                                                    +{formatCurrency(addon.price)}
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="outline" onClick={() => setShowGroupModal(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveGroup}>
                                    {editingGroup ? 'Salvar' : 'Criar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
