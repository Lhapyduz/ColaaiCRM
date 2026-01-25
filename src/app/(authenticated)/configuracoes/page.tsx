'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    FiUpload, FiSave, FiCheck, FiTrash2, FiLink, FiCopy, FiLock,
    FiEye, FiEyeOff, FiMenu, FiDroplet, FiUser, FiDollarSign,
    FiSettings, FiSmartphone, FiUsers, FiStar, FiMessageSquare, FiSend, FiClock
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import QRCodeGenerator from '@/components/ui/QRCodeGenerator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import {
    updateStoreStatus,
    updateDeliveryTime,
    updateSidebarColor,
    saveOpeningHours,
    getOpeningHours,
    getRecentRatings,
    toggleStoreRatingVisibility,
    toggleProductRatingVisibility,
    deleteStoreRating,
    deleteProductRating,
    replyToStoreRating,
    replyToProductRating,
    type OpeningHourInput
} from '@/app/actions/store';
import styles from './page.module.css';
import OpeningHoursScheduler from '@/components/settings/OpeningHoursScheduler';

const colorPresets = [
    { name: 'Laranja', primary: '#ff6b35', secondary: '#2d3436' },
    { name: 'Vermelho', primary: '#e74c3c', secondary: '#2c3e50' },
    { name: 'Azul', primary: '#3498db', secondary: '#1a1a2e' },
    { name: 'Verde', primary: '#00b894', secondary: '#1e272e' },
    { name: 'Roxo', primary: '#9b59b6', secondary: '#1a1a2e' },
    { name: 'Rosa', primary: '#e84393', secondary: '#2d3436' },
    { name: 'Amarelo', primary: '#f39c12', secondary: '#2c3e50' },
    { name: 'Cyan', primary: '#00cec9', secondary: '#1e272e' }
];

type SettingsTab = 'geral' | 'aparencia' | 'cardapio' | 'pagamento' | 'menu' | 'links' | 'conta' | 'avaliacoes';

export default function ConfiguracoesPage() {
    const { user, userSettings, updateSettings, signOut, previewSettings } = useAuth();
    const { canAccess } = useSubscription();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<SettingsTab>('geral');
    const [appName, setAppName] = useState(userSettings?.app_name || 'Cola Aí');
    const [primaryColor, setPrimaryColor] = useState(userSettings?.primary_color || '#ff6b35');
    const [secondaryColor, setSecondaryColor] = useState(userSettings?.secondary_color || '#2d3436');
    const [whatsappNumber, setWhatsappNumber] = useState(userSettings?.whatsapp_number || '');
    const [publicSlug, setPublicSlug] = useState(userSettings?.public_slug || '');
    const [pixKey, setPixKey] = useState(userSettings?.pix_key || '');
    const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>(userSettings?.pix_key_type || 'cpf');
    const [merchantCity, setMerchantCity] = useState(userSettings?.merchant_city || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [slugError, setSlugError] = useState('');
    const [copied, setCopied] = useState(false);
    const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>(userSettings?.hidden_sidebar_items || []);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const [deliveryFee, setDeliveryFee] = useState<number>(userSettings?.delivery_fee_value ?? 5);

    // New Store Settings State
    const [storeOpen, setStoreOpen] = useState(userSettings?.store_open ?? true);
    const [deliveryTimeMin, setDeliveryTimeMin] = useState<number>(userSettings?.delivery_time_min ?? 30);
    const [deliveryTimeMax, setDeliveryTimeMax] = useState<number>(userSettings?.delivery_time_max ?? 45);
    const [sidebarColor, setSidebarColor] = useState(userSettings?.sidebar_color ?? userSettings?.secondary_color ?? '#2d3436');
    const [openingHours, setOpeningHours] = useState<OpeningHourInput[]>([]);

    // Ratings State
    const [storeRatings, setStoreRatings] = useState<any[]>([]);
    const [productRatings, setProductRatings] = useState<any[]>([]);
    const [ratingTab, setRatingTab] = useState<'store' | 'product'>('store');
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const SIDEBAR_MENU_ITEMS = [
        { href: '/dashboard', label: 'Dashboard', feature: 'dashboard' },
        { href: '/produtos', label: 'Produtos', feature: 'products' },
        { href: '/adicionais', label: 'Adicionais', feature: 'addons' },
        { href: '/categorias', label: 'Categorias', feature: 'categories' },
        { href: '/pedidos', label: 'Pedidos', feature: 'orders' },
        { href: '/cozinha', label: 'Cozinha', feature: 'kitchen' },
        { href: '/entregas', label: 'Entregas', feature: 'deliveries' },
        { href: '/estoque', label: 'Estoque', feature: 'inventory' },
        { href: '/cupons', label: 'Cupons', feature: 'coupons' },
        { href: '/fidelidade', label: 'Fidelidade', feature: 'loyalty' },
        { href: '/caixa', label: 'Caixa', feature: 'dashboard' },
        { href: '/contas', label: 'Contas', feature: 'bills' },
        { href: '/fluxo-caixa', label: 'Fluxo de Caixa', feature: 'cashFlow' },
        { href: '/funcionarios', label: 'Funcionários', feature: 'dashboard' },
        { href: '/relatorios', label: 'Relatórios', feature: 'reports' },
        { href: '/historico', label: 'Histórico', feature: 'actionHistory' },
        { href: '/assinatura', label: 'Assinatura', feature: 'dashboard' },
    ];

    const TABS = [
        { id: 'geral' as SettingsTab, label: 'Geral', icon: FiSettings },
        { id: 'aparencia' as SettingsTab, label: 'Aparência', icon: FiDroplet },
        { id: 'cardapio' as SettingsTab, label: 'Cardápio Online', icon: FiSmartphone },
        { id: 'pagamento' as SettingsTab, label: 'Pagamento', icon: FiDollarSign },
        { id: 'menu' as SettingsTab, label: 'Menu Lateral', icon: FiMenu },
        { id: 'avaliacoes' as SettingsTab, label: 'Avaliações', icon: FiStar },
        { id: 'links' as SettingsTab, label: 'Links de Acesso', icon: FiUsers },
        { id: 'conta' as SettingsTab, label: 'Conta', icon: FiUser },
    ];

    useEffect(() => {
        if (userSettings) {
            setAppName(userSettings.app_name || 'Cola Aí');
            setPrimaryColor(userSettings.primary_color || '#ff6b35');
            setSecondaryColor(userSettings.secondary_color || '#2d3436');
            setWhatsappNumber(userSettings.whatsapp_number || '');
            setPublicSlug(userSettings.public_slug || '');
            setPixKey(userSettings.pix_key || '');
            setPixKeyType(userSettings.pix_key_type || 'cpf');
            setMerchantCity(userSettings.merchant_city || '');
            setHiddenSidebarItems(userSettings.hidden_sidebar_items || []);
            setDeliveryFee(userSettings.delivery_fee_value ?? 5);
            setStoreOpen(userSettings.store_open ?? true);
            setDeliveryTimeMin(userSettings.delivery_time_min ?? 30);
            setDeliveryTimeMax(userSettings.delivery_time_max ?? 45);
            setSidebarColor(userSettings.sidebar_color ?? userSettings.secondary_color ?? '#2d3436');
        }
    }, [userSettings]);

    useEffect(() => {
        if (user?.id) {
            getOpeningHours(user.id).then((data: any[]) => {
                if (data && data.length > 0) {
                    setOpeningHours(data.map(h => ({
                        day_of_week: h.day_of_week,
                        open_time: h.open_time,
                        close_time: h.close_time,
                        is_closed: h.is_closed
                    })));
                } else {
                    setOpeningHours(Array.from({ length: 7 }).map((_, i) => ({
                        day_of_week: i,
                        open_time: '18:00',
                        close_time: '23:00',
                        is_closed: false
                    })));
                }
            });
        }
    }, [user?.id]);

    const loadRatings = () => {
        if (user?.id) {
            getRecentRatings(user.id).then(data => {
                setStoreRatings(data.storeRatings);
                setProductRatings(data.productRatings);
            });
        }
    };

    useEffect(() => {
        if (activeTab === 'avaliacoes') {
            loadRatings();
        }
    }, [activeTab, user?.id]);

    const getMenuUrl = () => {
        if (typeof window !== 'undefined' && publicSlug) {
            return `${window.location.origin}/menu/${publicSlug}`;
        }
        return '';
    };

    const handleSlugChange = (value: string) => {
        const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        setPublicSlug(sanitized);
        setSlugError('');
    };

    const checkSlugAvailability = async (slug: string): Promise<boolean> => {
        if (!slug) return true;
        const { data, error } = await supabase.from('user_settings').select('user_id').eq('public_slug', slug).neq('user_id', user?.id).maybeSingle();
        return !data && !error;
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setSlugError('');
        try {
            if (publicSlug) {
                const isAvailable = await checkSlugAvailability(publicSlug);
                if (!isAvailable) { setSlugError('Este link já está em uso. Escolha outro.'); setSaving(false); return; }
            }
            const { error } = await updateSettings({
                app_name: appName, primary_color: primaryColor, secondary_color: secondaryColor, sidebar_color: sidebarColor,
                whatsapp_number: whatsappNumber || null, public_slug: publicSlug || null, pix_key: pixKey || null, pix_key_type: pixKeyType || null,
                merchant_city: merchantCity || null, delivery_fee_value: deliveryFee, store_open: storeOpen, delivery_time_min: deliveryTimeMin, delivery_time_max: deliveryTimeMax
            });
            await Promise.all([updateStoreStatus(storeOpen), updateDeliveryTime(deliveryTimeMin, deliveryTimeMax), updateSidebarColor(sidebarColor), saveOpeningHours(openingHours)]);
            if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
        } catch (error) { console.error('Error saving settings:', error); } finally { setSaving(false); }
    };

    const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const handleOpeningHourChange = (index: number, field: keyof OpeningHourInput, value: any) => {
        setOpeningHours(prev => { const newHours = [...prev]; newHours[index] = { ...newHours[index], [field]: value }; return newHours; });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || !user) return; setUploading(true);
        try {
            const fileExt = file.name.split('.').pop(); const fileName = `${user.id}/logo.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
            await updateSettings({ logo_url: publicUrl });
        } catch (error) { console.error('Error uploading logo:', error); } finally { setUploading(false); }
    };

    const applyPreset = (preset: typeof colorPresets[0]) => {
        setPrimaryColor(preset.primary); setSecondaryColor(preset.secondary); setSidebarColor(preset.secondary);
        previewSettings({ primary_color: preset.primary, secondary_color: preset.secondary, sidebar_color: preset.secondary });
    };

    const handleRemoveLogo = async () => {
        if (!user || !userSettings?.logo_url) return;
        try {
            const urlParts = userSettings.logo_url.split('/'); const fileName = `${user.id}/${urlParts[urlParts.length - 1]}`;
            await supabase.storage.from('logos').remove([fileName]); await updateSettings({ logo_url: null } as any);
        } catch (error) { console.error('Error removing logo:', error); }
    };

    const copyMenuLink = () => { const url = getMenuUrl(); if (url) { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
    const formatWhatsApp = (value: string) => { const digits = value.replace(/\D/g, ''); if (digits.length <= 2) return digits; if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`; return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`; };
    const toggleSidebarItem = (href: string) => { setHiddenSidebarItems(prev => prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]); };
    const hideUnavailableFeatures = () => { const toHide: string[] = []; SIDEBAR_MENU_ITEMS.forEach(item => { if (!canAccess(item.feature as any)) toHide.push(item.href); }); setHiddenSidebarItems(toHide); };
    const saveSidebarVisibility = async () => { setSaving(true); try { await updateSettings({ hidden_sidebar_items: hiddenSidebarItems } as any); setSaved(true); setTimeout(() => setSaved(false), 3000); } catch (error) { console.error('Error saving sidebar visibility:', error); } finally { setSaving(false); } };

    // Rating Handlers
    const handleToggleRatingVisibility = async (id: string, currentHidden: boolean, type: 'store' | 'product') => {
        try {
            if (type === 'store') await toggleStoreRatingVisibility(id, !currentHidden);
            else await toggleProductRatingVisibility(id, !currentHidden);
            loadRatings();
        } catch (error) { console.error('Error toggling visibility:', error); }
    };

    const handleDeleteRating = async (id: string, type: 'store' | 'product') => {
        if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;
        try {
            if (type === 'store') await deleteStoreRating(id);
            else await deleteProductRating(id);
            loadRatings();
        } catch (error) { console.error('Error deleting rating:', error); }
    };

    const handleReplyRating = async (id: string, type: 'store' | 'product') => {
        if (!replyText.trim()) return;
        try {
            if (type === 'store') await replyToStoreRating(id, replyText);
            else await replyToProductRating(id, replyText);
            setReplyingId(null);
            setReplyText('');
            loadRatings();
        } catch (error) { console.error('Error replying rating:', error); }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'geral':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}><h2>Informações do Negócio</h2><p>Configure as informações básicas do seu estabelecimento</p></div>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}><label>Nome do Negócio</label><Input value={appName} onChange={(e) => { setAppName(e.target.value); previewSettings({ app_name: e.target.value }); }} placeholder="Nome do seu negócio" /><span className={styles.hint}>Este nome aparece no topo da sidebar</span></div>
                            <div className={styles.formGroup}><label><FaWhatsapp style={{ marginRight: '8px', color: '#25D366' }} />WhatsApp</label><Input value={formatWhatsApp(whatsappNumber)} onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))} placeholder="(11) 99999-9999" maxLength={16} /><span className={styles.hint}>Usado para receber pedidos via WhatsApp</span></div>
                        </div>
                        <div className={styles.formGroup}><label>Logo do Negócio</label><div className={styles.logoUpload}><div className={styles.currentLogo}>{userSettings?.logo_url ? <img src={userSettings.logo_url} alt="Logo" /> : <span className={styles.logoEmoji}>🌭</span>}</div><div className={styles.logoActions}><input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} hidden /><Button variant="outline" leftIcon={<FiUpload />} onClick={() => fileInputRef.current?.click()} isLoading={uploading}>{userSettings?.logo_url ? 'Trocar' : 'Carregar'}</Button>{userSettings?.logo_url && <Button variant="danger" leftIcon={<FiTrash2 />} onClick={handleRemoveLogo}>Remover</Button>}</div></div></div>
                        <div className={styles.saveSection}><Button size="lg" leftIcon={saved ? <FiCheck /> : <FiSave />} onClick={handleSave} isLoading={saving} style={saved ? { background: 'var(--accent)' } : {}}>{saved ? 'Salvo!' : 'Salvar Alterações'}</Button></div>
                    </div>
                );
            case 'aparencia':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}><h2>Personalização Visual</h2><p>Customize as cores do seu aplicativo</p></div>
                        <div className={styles.formGroup}><label>Temas Prontos</label><div className={styles.colorPresets}>{colorPresets.map((preset) => (<button key={preset.name} className={`${styles.presetBtn} ${primaryColor === preset.primary ? styles.active : ''}`} onClick={() => applyPreset(preset)} title={preset.name}><span className={styles.presetColor} style={{ background: preset.primary }} /><span className={styles.presetName}>{preset.name}</span></button>))}</div></div>
                        <div className={styles.formGroup}><label>Cores Personalizadas</label><div className={styles.customColors}>
                            <div className={styles.colorPicker}><span>Cor Principal</span><div className={styles.colorInput}><input type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); previewSettings({ primary_color: e.target.value }); }} /><span>{primaryColor}</span></div></div>
                            <div className={styles.colorPicker}><span>Cor Secundária</span><div className={styles.colorInput}><input type="color" value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); previewSettings({ secondary_color: e.target.value }); }} /><span>{secondaryColor}</span></div></div>
                            <div className={styles.colorPicker}><span>Cor da Sidebar</span><div className={styles.colorInput}><input type="color" value={sidebarColor} onChange={(e) => { setSidebarColor(e.target.value); previewSettings({ sidebar_color: e.target.value }); }} /><span>{sidebarColor}</span></div></div>
                        </div></div>
                        <div className={styles.formGroup}><label>Prévia</label><div className={styles.preview}><div className={styles.previewSidebar} style={{ background: sidebarColor }}><div className={styles.previewLogo} style={{ background: `${primaryColor}20` }}>{userSettings?.logo_url ? <img src={userSettings.logo_url} alt="" /> : <span>🌭</span>}</div><div className={styles.previewName} style={{ color: primaryColor }}>{appName}</div></div><div className={styles.previewContent}><div className={styles.previewButton} style={{ background: primaryColor }}>Exemplo de Botão</div></div></div></div>
                        <div className={styles.saveSection}><Button size="lg" leftIcon={saved ? <FiCheck /> : <FiSave />} onClick={handleSave} isLoading={saving} style={saved ? { background: 'var(--accent)' } : {}}>{saved ? 'Salvo!' : 'Salvar Alterações'}</Button></div>
                    </div>
                );
            case 'cardapio':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="flex flex-col gap-2 border-b border-border pb-6">
                            <h2 className="text-2xl font-bold text-text-primary">Cardápio Online</h2>
                            <p className="text-text-secondary">Configure a disponibilidade e horários da sua loja digital.</p>
                        </div>

                        {!canAccess('digitalMenu') ? (
                            <div className={styles.blockedFeature}>
                                <FiLock className={styles.blockedIcon} />
                                <h3>Recurso não disponível no seu plano</h3>
                                <p>O Cardápio Online está disponível nos planos Avançado e Profissional.</p>
                                <a href="/assinatura" className={styles.upgradeLink}>Fazer Upgrade</a>
                            </div>
                        ) : (
                            <>
                                {/* Status & Key Info Card */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Store Status */}
                                    <div className="bg-bg-tertiary border border-border rounded-xl p-6 flex flex-col justify-between hover:border-border-light transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-bg-card rounded-lg border border-white/5">
                                                <FiSmartphone className="text-2xl text-primary" />
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={storeOpen}
                                                    onChange={(e) => setStoreOpen(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-14 h-7 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-text-primary mb-1">Status da Loja</h3>
                                            <p className={cn(
                                                "text-sm font-medium",
                                                storeOpen ? "text-success" : "text-error"
                                            )}>
                                                {storeOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}
                                            </p>
                                            <p className="text-xs text-text-muted mt-2">
                                                Quando fechada, o sistema bloqueia novos pedidos automaticamente.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Link Share */}
                                    <div className="bg-bg-tertiary border border-border rounded-xl p-6 flex flex-col gap-4 hover:border-border-light transition-colors">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-text-primary">Link do Cardápio</h3>
                                            {publicSlug && userSettings?.public_slug && (
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => window.open(getMenuUrl(), '_blank')}>
                                                        <FiLink size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center bg-bg-card border border-border rounded-lg overflow-hidden group focus-within:border-primary transition-colors">
                                                <span className="bg-bg-secondary px-3 py-3 text-sm text-text-muted border-r border-border h-full flex items-center">
                                                    /menu/
                                                </span>
                                                <input
                                                    value={publicSlug}
                                                    onChange={(e) => handleSlugChange(e.target.value)}
                                                    placeholder="seu-negocio"
                                                    className="bg-transparent border-none px-3 py-2 text-text-primary flex-1 focus:outline-none"
                                                />
                                            </div>
                                            {slugError && <p className="text-xs text-error">{slugError}</p>}
                                        </div>

                                        {publicSlug && userSettings?.public_slug && (
                                            <div className="flex gap-2 mt-auto">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1"
                                                    leftIcon={copied ? <FiCheck /> : <FiCopy />}
                                                    onClick={copyMenuLink}
                                                >
                                                    {copied ? 'Copiado!' : 'Copiar'}
                                                </Button>
                                                <QRCodeGenerator url={getMenuUrl()} appName={appName} primaryColor={primaryColor} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Delivery Settings */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-bg-tertiary border border-border rounded-xl p-6 hover:border-border-light transition-colors">
                                        <div className="flex items-center gap-3 mb-4">
                                            <FiClock className="text-xl text-text-secondary" />
                                            <h3 className="text-lg font-semibold text-text-primary">Tempo de Entrega</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs text-text-muted mb-1 block">Mínimo (min)</label>
                                                <Input
                                                    type="number"
                                                    value={deliveryTimeMin}
                                                    onChange={(e) => setDeliveryTimeMin(parseInt(e.target.value) || 0)}
                                                    className="text-center w-full"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-text-muted mb-1 block">Máximo (min)</label>
                                                <Input
                                                    type="number"
                                                    value={deliveryTimeMax}
                                                    onChange={(e) => setDeliveryTimeMax(parseInt(e.target.value) || 0)}
                                                    className="text-center w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-bg-tertiary border border-border rounded-xl p-6 hover:border-border-light transition-colors">
                                        <div className="flex items-center gap-3 mb-4">
                                            <FiDollarSign className="text-xl text-text-secondary" />
                                            <h3 className="text-lg font-semibold text-text-primary">Taxa de Entrega</h3>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={deliveryFee}
                                                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                style={{ paddingLeft: '40px' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Opening Hours Scheduler */}
                                <div className="bg-bg-tertiary border border-border rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-text-primary">Horário de Funcionamento</h3>
                                            <p className="text-sm text-text-secondary mt-1">Configure os horários em que sua loja recebe pedidos automaticamente.</p>
                                        </div>
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <FiClock className="text-primary text-xl" />
                                        </div>
                                    </div>

                                    <OpeningHoursScheduler
                                        hours={openingHours}
                                        onChange={handleOpeningHourChange}
                                    />
                                </div>

                                {/* Save Button */}
                                <div className="sticky bottom-4 z-10 pt-4 bg-bg-primary/80 backdrop-blur-sm border-t border-border mt-8 flex justify-end">
                                    <Button
                                        size="lg"
                                        leftIcon={saved ? <FiCheck /> : <FiSave />}
                                        onClick={handleSave}
                                        isLoading={saving}
                                        className={cn(
                                            "min-w-[200px] shadow-lg transition-all duration-300",
                                            saved ? "bg-success hover:bg-success" : "bg-primary hover:bg-primary-dark"
                                        )}
                                    >
                                        {saved ? 'Salvo com Sucesso!' : 'Salvar Alterações'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'pagamento':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}><h2>Pagamento PIX</h2><p>Configure sua chave PIX para receber pagamentos</p></div>
                        <div className={styles.formGroup}><label>Tipo de Chave PIX</label><div className={styles.pixKeyTypes}>{[{ value: 'cpf', label: 'CPF' }, { value: 'cnpj', label: 'CNPJ' }, { value: 'email', label: 'E-mail' }, { value: 'phone', label: 'Telefone' }, { value: 'random', label: 'Aleatória' }].map((type) => (<button key={type.value} className={`${styles.keyTypeBtn} ${pixKeyType === type.value ? styles.active : ''}`} onClick={() => setPixKeyType(type.value as typeof pixKeyType)} type="button">{type.label}</button>))}</div></div>
                        <div className={styles.formGrid}><div className={styles.formGroup}><label>Chave PIX</label><Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder={pixKeyType === 'cpf' ? '000.000.000-00' : pixKeyType === 'cnpj' ? '00.000.000/0000-00' : pixKeyType === 'email' ? 'email@exemplo.com' : pixKeyType === 'phone' ? '+5511999999999' : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'} /><span className={styles.hint}>Esta chave será usada para gerar QR Codes PIX nos pedidos</span></div><div className={styles.formGroup}><label>Cidade do Estabelecimento</label><Input value={merchantCity} onChange={(e) => setMerchantCity(e.target.value)} placeholder="São Paulo" maxLength={15} /><span className={styles.hint}>Cidade que aparecerá no comprovante PIX (máx. 15 caracteres)</span></div></div>
                        <div className={styles.saveSection}><Button size="lg" leftIcon={saved ? <FiCheck /> : <FiSave />} onClick={handleSave} isLoading={saving} style={saved ? { background: 'var(--accent)' } : {}}>{saved ? 'Salvo!' : 'Salvar Alterações'}</Button></div>
                    </div>
                );
            case 'menu':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}><h2>Visibilidade do Menu</h2><p>Escolha quais itens aparecem no menu lateral</p></div>
                        <div className={styles.menuActions}><Button variant="outline" onClick={hideUnavailableFeatures} leftIcon={<FiEyeOff />}>Ocultar Itens Fora do Plano</Button><Button variant="outline" onClick={() => setHiddenSidebarItems([])} leftIcon={<FiEye />}>Mostrar Todos</Button></div>
                        <div className={styles.sidebarItemsGrid}>{SIDEBAR_MENU_ITEMS.map((item) => { const isHidden = hiddenSidebarItems.includes(item.href); const isAvailable = canAccess(item.feature as any); return (<label key={item.href} className={`${styles.sidebarItemOption} ${isHidden ? styles.hidden : ''} ${!isAvailable ? styles.unavailable : ''}`}><input type="checkbox" checked={!isHidden} onChange={() => toggleSidebarItem(item.href)} /><span className={styles.sidebarItemLabel}>{isHidden ? <FiEyeOff size={14} /> : <FiEye size={14} />}{item.label}</span>{!isAvailable && (<span className={styles.planBadge}><FiLock size={10} /> Upgrade</span>)}</label>); })}</div>
                        <div className={styles.saveSection}><Button size="lg" leftIcon={saved ? <FiCheck /> : <FiSave />} onClick={saveSidebarVisibility} isLoading={saving} style={saved ? { background: 'var(--accent)' } : {}}>{saved ? 'Salvo!' : 'Salvar Visibilidade'}</Button></div>
                    </div>
                );
            case 'avaliacoes':
                const ratings = ratingTab === 'store' ? storeRatings : productRatings;
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}><h2>Avaliações</h2><p>Gerencie as avaliações recebidas</p></div>
                        <div className="flex gap-4 mb-6">
                            <button onClick={() => setRatingTab('store')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${ratingTab === 'store' ? 'bg-primary text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>Loja ({storeRatings.length})</button>
                            <button onClick={() => setRatingTab('product')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${ratingTab === 'product' ? 'bg-primary text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>Produtos ({productRatings.length})</button>
                        </div>
                        <div className="space-y-4">
                            {ratings.length === 0 ? (
                                <div className="text-center py-12 text-text-muted"><FiStar size={48} className="mx-auto mb-4 opacity-50" /><p>Nenhuma avaliação recebida ainda.</p></div>
                            ) : (
                                ratings.map((rating) => (
                                    <div key={rating.id} className="bg-bg-card border border-white/5 rounded-xl p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-1 mb-1">{Array.from({ length: 5 }).map((_, i) => (<FiStar key={i} size={16} className={i < rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-text-muted'} />))}</div>
                                                <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                    <span className="font-semibold text-text-primary">{rating.customer_name || 'Anônimo'}</span>
                                                    <span>•</span>
                                                    <span>{new Date(rating.created_at).toLocaleDateString()}</span>
                                                    {ratingTab === 'product' && rating.products && (
                                                        <><span>•</span><span className="text-primary">{rating.products.name}</span></>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleToggleRatingVisibility(rating.id, rating.hidden, ratingTab)} className={`p-2 rounded-lg transition-colors ${rating.hidden ? 'bg-error/10 text-error' : 'bg-bg-tertiary text-text-muted hover:text-primary'}`} title={rating.hidden ? 'Mostrar' : 'Ocultar'}>{rating.hidden ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
                                                <button onClick={() => handleDeleteRating(rating.id, ratingTab)} className="p-2 rounded-lg bg-bg-tertiary text-text-muted hover:bg-error/10 hover:text-error transition-colors" title="Excluir"><FiTrash2 size={18} /></button>
                                            </div>
                                        </div>
                                        {rating.comment && <p className="text-text-primary mb-4 bg-bg-tertiary/50 p-3 rounded-lg">{rating.comment}</p>}
                                        {rating.reply ? (
                                            <div className="ml-4 pl-4 border-l-2 border-primary">
                                                <p className="text-xs text-primary font-bold mb-1">Sua resposta:</p>
                                                <p className="text-sm text-text-secondary">{rating.reply}</p>
                                            </div>
                                        ) : (
                                            replyingId === rating.id ? (
                                                <div className="mt-4 animate-fadeIn">
                                                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full bg-bg-tertiary border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none mb-2" placeholder="Escreva sua resposta..." autoFocus />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => { setReplyingId(null); setReplyText(''); }}>Cancelar</Button>
                                                        <Button size="sm" onClick={() => handleReplyRating(rating.id, ratingTab)} disabled={!replyText.trim()} leftIcon={<FiSend />}>Responder</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => setReplyingId(rating.id)} className="text-sm text-primary font-medium hover:underline flex items-center gap-1"><FiMessageSquare size={14} /> Responder</button>
                                            )
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            case 'links':
                const accessToken = userSettings?.access_token; const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                const accessLinks = [{ id: 'cozinha', title: 'Cozinha', icon: '👨‍🍳', description: 'Funcionários da cozinha podem visualizar e gerenciar pedidos pendentes', url: accessToken ? `${baseUrl}/acesso/${accessToken}/cozinha` : null }, { id: 'entregas', title: 'Entregas', icon: '🚚', description: 'Entregadores podem visualizar pedidos prontos para entrega', url: accessToken ? `${baseUrl}/acesso/${accessToken}/entregas` : null }];
                const copyAccessLink = (url: string, id: string) => { navigator.clipboard.writeText(url); setCopiedLink(id); setTimeout(() => setCopiedLink(null), 2000); };
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}><h2>Links de Acesso</h2><p>Compartilhe links com funcionários para acessar páginas específicas com PIN</p></div>
                        {!accessToken ? (<div className={styles.blockedFeature}><FiLink className={styles.blockedIcon} /><h3>Carregando...</h3><p>Aguarde enquanto geramos seus links de acesso</p></div>) : (<div className={styles.accessLinksGrid}>{accessLinks.map((link) => (<div key={link.id} className={styles.accessLinkCard}><div className={styles.accessLinkHeader}><span className={styles.accessLinkIcon}>{link.icon}</span><h3>{link.title}</h3></div><p className={styles.accessLinkDesc}>{link.description}</p>{link.url && (<><div className={styles.accessLinkUrl}><code>{link.url}</code></div><div className={styles.accessLinkActions}><Button variant="outline" size="sm" leftIcon={copiedLink === link.id ? <FiCheck /> : <FiCopy />} onClick={() => copyAccessLink(link.url!, link.id)}>{copiedLink === link.id ? 'Copiado!' : 'Copiar Link'}</Button><Button variant="outline" size="sm" leftIcon={<FiLink />} onClick={() => window.open(link.url!, '_blank')}>Abrir</Button></div></>)}</div>))}</div>)}
                        <div className={styles.formGroup} style={{ marginTop: '24px' }}><div className={styles.hint}><strong>Como funciona:</strong><br />1. Copie o link desejado<br />2. Envie para o funcionário (WhatsApp, etc)<br />3. Funcionário acessa e digita seu PIN de 4 dígitos<br />4. Funcionário terá acesso apenas à página específica</div></div>
                    </div>
                );
            case 'conta':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.sectionHeader}><h2>Minha Conta</h2><p>Informações da sua conta</p></div>
                        <div className={styles.accountInfo}><div className={styles.infoRow}><span className={styles.infoLabel}>Email</span><span className={styles.infoValue}>{user?.email}</span></div><div className={styles.infoRow}><span className={styles.infoLabel}>Membro desde</span><span className={styles.infoValue}>{user?.created_at && new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(user.created_at))}</span></div></div>
                        <div className={styles.dangerZone}><h3>Sair da Conta</h3><p>Você será desconectado do sistema</p><Button variant="danger" onClick={signOut}>Sair</Button></div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}><h1 className={styles.title}>Configurações</h1><p className={styles.subtitle}>Personalize seu aplicativo</p></div>
            <div className={styles.settingsLayout}>
                <div className={styles.tabsSidebar}>{TABS.map((tab) => (<button key={tab.id} className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`} onClick={() => setActiveTab(tab.id)}><tab.icon /><span>{tab.label}</span></button>))}</div>
                <Card className={styles.settingsCard}>{renderTabContent()}</Card>
            </div>
        </div>
    );
}
