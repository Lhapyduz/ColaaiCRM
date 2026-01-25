'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPercent, FiDollarSign, FiCopy, FiCheck } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';

interface Coupon {
    id: string;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_value: number;
    max_discount: number | null;
    usage_limit: number | null;
    usage_count: number;
    valid_from: string;
    valid_until: string | null;
    active: boolean;
    first_order_only: boolean;
}

export default function CuponsPage() {
    const { user } = useAuth();
    const { plan, canAccess } = useSubscription();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [formCode, setFormCode] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [formDiscountValue, setFormDiscountValue] = useState('');
    const [formMinOrderValue, setFormMinOrderValue] = useState('');
    const [formMaxDiscount, setFormMaxDiscount] = useState('');
    const [formUsageLimit, setFormUsageLimit] = useState('');
    const [formValidUntil, setFormValidUntil] = useState('');
    const [formFirstOrderOnly, setFormFirstOrderOnly] = useState(false);
    const toast = useToast();

    useEffect(() => { if (user && canAccess('coupons')) fetchCoupons(); }, [user, canAccess]);

    if (!canAccess('coupons')) {
        return <UpgradePrompt feature="Cupons de Desconto" requiredPlan="Profissional" currentPlan={plan} fullPage />;
    }

    const fetchCoupons = async () => {
        if (!user) return;
        try { const { data, error } = await supabase.from('coupons').select('*').eq('user_id', user.id).order('created_at', { ascending: false }); if (error) throw error; setCoupons(data || []); }
        catch (error) { console.error('Error fetching coupons:', error); } finally { setLoading(false); }
    };

    const generateRandomCode = () => { const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let code = ''; for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length)); setFormCode(code); };
    const openAddModal = () => { setEditingCoupon(null); setFormCode(''); setFormDescription(''); setFormDiscountType('percentage'); setFormDiscountValue(''); setFormMinOrderValue(''); setFormMaxDiscount(''); setFormUsageLimit(''); setFormValidUntil(''); setFormFirstOrderOnly(false); setShowModal(true); };
    const openEditModal = (coupon: Coupon) => { setEditingCoupon(coupon); setFormCode(coupon.code); setFormDescription(coupon.description || ''); setFormDiscountType(coupon.discount_type); setFormDiscountValue(coupon.discount_value.toString()); setFormMinOrderValue(coupon.min_order_value.toString()); setFormMaxDiscount(coupon.max_discount?.toString() || ''); setFormUsageLimit(coupon.usage_limit?.toString() || ''); setFormValidUntil(coupon.valid_until ? coupon.valid_until.split('T')[0] : ''); setFormFirstOrderOnly(coupon.first_order_only); setShowModal(true); };

    const handleSaveCoupon = async () => {
        if (!user || !formCode || !formDiscountValue) return;
        try {
            const couponData = { user_id: user.id, code: formCode.toUpperCase(), description: formDescription || null, discount_type: formDiscountType, discount_value: parseFloat(formDiscountValue), min_order_value: parseFloat(formMinOrderValue) || 0, max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : null, usage_limit: formUsageLimit ? parseInt(formUsageLimit) : null, valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null, first_order_only: formFirstOrderOnly };
            if (editingCoupon) await supabase.from('coupons').update(couponData).eq('id', editingCoupon.id);
            else await supabase.from('coupons').insert(couponData);
            toast.success(editingCoupon ? 'Cupom atualizado!' : 'Cupom criado!');
            setShowModal(false); fetchCoupons();
        } catch (error) { console.error('Error saving coupon:', error); toast.error('Erro ao salvar cupom'); }
    };

    const handleDeleteCoupon = async (id: string) => { if (!confirm('Tem certeza que deseja excluir este cupom?')) return; try { await supabase.from('coupons').delete().eq('id', id); toast.success('Cupom excluído!'); fetchCoupons(); } catch (error) { console.error('Error deleting coupon:', error); toast.error('Erro ao excluir cupom'); } };
    const toggleCouponActive = async (coupon: Coupon) => { try { await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id); toast.success(coupon.active ? 'Cupom desativado!' : 'Cupom ativado!'); fetchCoupons(); } catch (error) { console.error('Error toggling coupon:', error); } };
    const copyCode = (code: string, id: string) => { navigator.clipboard.writeText(code); setCopiedId(id); toast.success('Código copiado!'); setTimeout(() => setCopiedId(null), 2000); };
    const formatDateShort = (date: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
    const isExpired = (coupon: Coupon) => coupon.valid_until ? new Date(coupon.valid_until) < new Date() : false;
    const isLimitReached = (coupon: Coupon) => coupon.usage_limit ? coupon.usage_count >= coupon.usage_limit : false;
    const getDiscountLabel = (coupon: Coupon) => coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value);
    const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()) || c.description?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 gap-5 max-md:flex-col">
                <div><h1 className="text-[2rem] font-bold mb-2">Cupons de Desconto</h1><p className="text-text-secondary">Crie promoções e códigos de desconto</p></div>
                <Button leftIcon={<FiPlus />} onClick={openAddModal}>Novo Cupom</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-1">
                <Card className="p-5! text-center"><span className="block text-2xl font-bold mb-1">{coupons.length}</span><span className="text-sm text-text-muted">Total de Cupons</span></Card>
                <Card className="p-5! text-center"><span className="block text-2xl font-bold mb-1">{coupons.filter(c => c.active).length}</span><span className="text-sm text-text-muted">Ativos</span></Card>
                <Card className="p-5! text-center"><span className="block text-2xl font-bold mb-1">{coupons.reduce((sum, c) => sum + c.usage_count, 0)}</span><span className="text-sm text-text-muted">Usos Totais</span></Card>
            </div>

            {/* Search */}
            <Card className="mb-6 p-4!"><Input placeholder="Buscar cupons..." leftIcon={<FiSearch />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></Card>

            {/* Coupons List */}
            <div className="flex flex-col gap-3">
                {loading ? [1, 2, 3].map(i => <div key={i} className="h-[100px] rounded-md bg-bg-tertiary animate-pulse" />) : filteredCoupons.length > 0 ? filteredCoupons.map((coupon) => (
                    <Card key={coupon.id} className={cn('p-5! transition-all duration-fast', (!coupon.active || isExpired(coupon) || isLimitReached(coupon)) && 'opacity-60')}>
                        <div className="flex items-start justify-between gap-4 max-md:flex-col">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg font-bold text-primary tracking-wide">{coupon.code}</span>
                                    <button className="p-1.5 bg-transparent border-none text-text-muted cursor-pointer transition-all duration-fast hover:text-primary" onClick={() => copyCode(coupon.code, coupon.id)}>{copiedId === coupon.id ? <FiCheck /> : <FiCopy />}</button>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 rounded-full text-primary font-semibold">
                                    {coupon.discount_type === 'percentage' ? <FiPercent /> : <FiDollarSign />}
                                    <span>{getDiscountLabel(coupon)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 max-md:justify-end max-md:w-full">
                                <button className={cn('px-3 py-1.5 bg-bg-tertiary border border-border rounded-full text-text-secondary text-[0.8rem] cursor-pointer transition-all duration-fast', coupon.active && 'bg-accent/15 border-accent text-accent')} onClick={() => toggleCouponActive(coupon)}>{coupon.active ? 'Ativo' : 'Inativo'}</button>
                                <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:border-border-light hover:text-text-primary" onClick={() => openEditModal(coupon)}><FiEdit2 /></button>
                                <button className="w-9 h-9 flex items-center justify-center bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-error/10 hover:border-error hover:text-error" onClick={() => handleDeleteCoupon(coupon.id)}><FiTrash2 /></button>
                            </div>
                        </div>
                        <div className="mt-3">
                            {coupon.description && <p className="text-sm text-text-secondary mb-2">{coupon.description}</p>}
                            <div className="flex flex-wrap gap-2">
                                {coupon.min_order_value > 0 && <span className="px-2.5 py-1 bg-bg-tertiary rounded-full text-xs text-text-secondary">Mín: {formatCurrency(coupon.min_order_value)}</span>}
                                {coupon.usage_limit && <span className="px-2.5 py-1 bg-bg-tertiary rounded-full text-xs text-text-secondary">{coupon.usage_count}/{coupon.usage_limit} usos</span>}
                                {coupon.valid_until && <span className={cn('px-2.5 py-1 bg-bg-tertiary rounded-full text-xs text-text-secondary', isExpired(coupon) && 'text-error')}>Até {formatDateShort(coupon.valid_until)}</span>}
                                {coupon.first_order_only && <span className="px-2.5 py-1 bg-bg-tertiary rounded-full text-xs text-text-secondary">Primeira compra</span>}
                            </div>
                        </div>
                    </Card>
                )) : (
                    <div className="text-center py-15 px-5">
                        <FiPercent className="text-6xl text-text-muted mb-4 mx-auto" />
                        <h3 className="text-xl mb-2">Nenhum cupom cadastrado</h3>
                        <p className="text-text-secondary mb-5">Crie cupons de desconto para atrair mais clientes</p>
                        <Button leftIcon={<FiPlus />} onClick={openAddModal}>Criar Cupom</Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-bg-card rounded-lg p-6 w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold mb-5">{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</h2>
                        <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Código do Cupom</label><div className="flex gap-2"><Input value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="Ex: PROMO10" /><Button variant="outline" onClick={generateRandomCode}>Gerar</Button></div></div>
                        <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Descrição (opcional)</label><Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Desconto de inauguração" /></div>
                        <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                            <div><label className="block text-sm text-text-secondary mb-2">Tipo de Desconto</label><select value={formDiscountType} onChange={(e) => setFormDiscountType(e.target.value as 'percentage' | 'fixed')} className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-md text-text-primary text-base cursor-pointer"><option value="percentage">Porcentagem (%)</option><option value="fixed">Valor Fixo (R$)</option></select></div>
                            <div><label className="block text-sm text-text-secondary mb-2">Valor do Desconto</label><Input type="number" step={formDiscountType === 'percentage' ? '1' : '0.01'} value={formDiscountValue} onChange={(e) => setFormDiscountValue(e.target.value)} placeholder={formDiscountType === 'percentage' ? '10' : '5.00'} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                            <div><label className="block text-sm text-text-secondary mb-2">Pedido Mínimo (R$)</label><Input type="number" step="0.01" value={formMinOrderValue} onChange={(e) => setFormMinOrderValue(e.target.value)} placeholder="0.00" /></div>
                            {formDiscountType === 'percentage' && <div><label className="block text-sm text-text-secondary mb-2">Desconto Máximo (R$)</label><Input type="number" step="0.01" value={formMaxDiscount} onChange={(e) => setFormMaxDiscount(e.target.value)} placeholder="Sem limite" /></div>}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                            <div><label className="block text-sm text-text-secondary mb-2">Limite de Usos</label><Input type="number" value={formUsageLimit} onChange={(e) => setFormUsageLimit(e.target.value)} placeholder="Ilimitado" /></div>
                            <div><label className="block text-sm text-text-secondary mb-2">Válido Até</label><Input type="date" value={formValidUntil} onChange={(e) => setFormValidUntil(e.target.value)} /></div>
                        </div>
                        <div className="mb-4"><label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" className="w-[18px] h-[18px] accent-primary" checked={formFirstOrderOnly} onChange={(e) => setFormFirstOrderOnly(e.target.checked)} />Válido apenas para primeira compra</label></div>
                        <div className="flex gap-3 justify-end mt-6"><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSaveCoupon}>{editingCoupon ? 'Salvar' : 'Criar Cupom'}</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
