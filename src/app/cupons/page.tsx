'use client';

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch,
    FiPercent,
    FiDollarSign,
    FiCopy,
    FiCheck
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

    // Check if user has access to coupons feature (Enterprise only)
    if (!canAccess('coupons')) {
        return (
            <MainLayout>
                <UpgradePrompt
                    feature="Cupons de Desconto"
                    requiredPlan="Profissional"
                    currentPlan={plan}
                    fullPage
                />
            </MainLayout>
        );
    }

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Form states
    const [formCode, setFormCode] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [formDiscountValue, setFormDiscountValue] = useState('');
    const [formMinOrderValue, setFormMinOrderValue] = useState('');
    const [formMaxDiscount, setFormMaxDiscount] = useState('');
    const [formUsageLimit, setFormUsageLimit] = useState('');
    const [formValidUntil, setFormValidUntil] = useState('');
    const [formFirstOrderOnly, setFormFirstOrderOnly] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCoupons();
        }
    }, [user]);

    const fetchCoupons = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (error) {
            console.error('Error fetching coupons:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormCode(code);
    };

    const openAddModal = () => {
        setEditingCoupon(null);
        setFormCode('');
        setFormDescription('');
        setFormDiscountType('percentage');
        setFormDiscountValue('');
        setFormMinOrderValue('');
        setFormMaxDiscount('');
        setFormUsageLimit('');
        setFormValidUntil('');
        setFormFirstOrderOnly(false);
        setShowModal(true);
    };

    const openEditModal = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setFormCode(coupon.code);
        setFormDescription(coupon.description || '');
        setFormDiscountType(coupon.discount_type);
        setFormDiscountValue(coupon.discount_value.toString());
        setFormMinOrderValue(coupon.min_order_value.toString());
        setFormMaxDiscount(coupon.max_discount?.toString() || '');
        setFormUsageLimit(coupon.usage_limit?.toString() || '');
        setFormValidUntil(coupon.valid_until ? coupon.valid_until.split('T')[0] : '');
        setFormFirstOrderOnly(coupon.first_order_only);
        setShowModal(true);
    };

    const handleSaveCoupon = async () => {
        if (!user || !formCode || !formDiscountValue) return;

        try {
            const couponData = {
                user_id: user.id,
                code: formCode.toUpperCase(),
                description: formDescription || null,
                discount_type: formDiscountType,
                discount_value: parseFloat(formDiscountValue),
                min_order_value: parseFloat(formMinOrderValue) || 0,
                max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
                usage_limit: formUsageLimit ? parseInt(formUsageLimit) : null,
                valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null,
                first_order_only: formFirstOrderOnly
            };

            if (editingCoupon) {
                const { error } = await supabase
                    .from('coupons')
                    .update(couponData)
                    .eq('id', editingCoupon.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('coupons')
                    .insert(couponData);

                if (error) throw error;
            }

            setShowModal(false);
            fetchCoupons();
        } catch (error) {
            console.error('Error saving coupon:', error);
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

        try {
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
        }
    };

    const toggleCouponActive = async (coupon: Coupon) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ active: !coupon.active })
                .eq('id', coupon.id);

            if (error) throw error;
            fetchCoupons();
        } catch (error) {
            console.error('Error toggling coupon:', error);
        }
    };

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(new Date(date));
    };

    const isExpired = (coupon: Coupon) => {
        if (!coupon.valid_until) return false;
        return new Date(coupon.valid_until) < new Date();
    };

    const isLimitReached = (coupon: Coupon) => {
        if (!coupon.usage_limit) return false;
        return coupon.usage_count >= coupon.usage_limit;
    };

    const getDiscountLabel = (coupon: Coupon) => {
        if (coupon.discount_type === 'percentage') {
            return `${coupon.discount_value}%`;
        }
        return formatCurrency(coupon.discount_value);
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Cupons de Desconto</h1>
                        <p className={styles.subtitle}>Crie promoções e códigos de desconto</p>
                    </div>
                    <Button leftIcon={<FiPlus />} onClick={openAddModal}>
                        Novo Cupom
                    </Button>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <Card className={styles.statCard}>
                        <span className={styles.statValue}>{coupons.length}</span>
                        <span className={styles.statLabel}>Total de Cupons</span>
                    </Card>
                    <Card className={styles.statCard}>
                        <span className={styles.statValue}>{coupons.filter(c => c.active).length}</span>
                        <span className={styles.statLabel}>Ativos</span>
                    </Card>
                    <Card className={styles.statCard}>
                        <span className={styles.statValue}>
                            {coupons.reduce((sum, c) => sum + c.usage_count, 0)}
                        </span>
                        <span className={styles.statLabel}>Usos Totais</span>
                    </Card>
                </div>

                {/* Search */}
                <Card className={styles.searchCard}>
                    <Input
                        placeholder="Buscar cupons..."
                        leftIcon={<FiSearch />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Card>

                {/* Coupons List */}
                <div className={styles.list}>
                    {loading ? (
                        <div className={styles.loading}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 10 }} />
                            ))}
                        </div>
                    ) : filteredCoupons.length > 0 ? (
                        filteredCoupons.map((coupon) => (
                            <Card
                                key={coupon.id}
                                className={`${styles.couponCard} ${!coupon.active || isExpired(coupon) || isLimitReached(coupon) ? styles.inactive : ''}`}
                            >
                                <div className={styles.couponMain}>
                                    <div className={styles.couponCode}>
                                        <span className={styles.code}>{coupon.code}</span>
                                        <button
                                            className={styles.copyBtn}
                                            onClick={() => copyCode(coupon.code, coupon.id)}
                                        >
                                            {copiedId === coupon.id ? <FiCheck /> : <FiCopy />}
                                        </button>
                                    </div>
                                    <div className={styles.couponDiscount}>
                                        {coupon.discount_type === 'percentage' ? <FiPercent /> : <FiDollarSign />}
                                        <span>{getDiscountLabel(coupon)}</span>
                                    </div>
                                </div>

                                <div className={styles.couponDetails}>
                                    {coupon.description && (
                                        <p className={styles.description}>{coupon.description}</p>
                                    )}
                                    <div className={styles.tags}>
                                        {coupon.min_order_value > 0 && (
                                            <span className={styles.tag}>
                                                Mín: {formatCurrency(coupon.min_order_value)}
                                            </span>
                                        )}
                                        {coupon.usage_limit && (
                                            <span className={styles.tag}>
                                                {coupon.usage_count}/{coupon.usage_limit} usos
                                            </span>
                                        )}
                                        {coupon.valid_until && (
                                            <span className={`${styles.tag} ${isExpired(coupon) ? styles.expired : ''}`}>
                                                Até {formatDate(coupon.valid_until)}
                                            </span>
                                        )}
                                        {coupon.first_order_only && (
                                            <span className={styles.tag}>Primeira compra</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.couponActions}>
                                    <button
                                        className={`${styles.toggleBtn} ${coupon.active ? styles.active : ''}`}
                                        onClick={() => toggleCouponActive(coupon)}
                                    >
                                        {coupon.active ? 'Ativo' : 'Inativo'}
                                    </button>
                                    <button
                                        className={styles.iconBtn}
                                        onClick={() => openEditModal(coupon)}
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        className={`${styles.iconBtn} ${styles.danger}`}
                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <FiPercent className={styles.emptyIcon} />
                            <h3>Nenhum cupom cadastrado</h3>
                            <p>Crie cupons de desconto para atrair mais clientes</p>
                            <Button leftIcon={<FiPlus />} onClick={openAddModal}>
                                Criar Cupom
                            </Button>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</h2>

                            <div className={styles.formGroup}>
                                <label>Código do Cupom</label>
                                <div className={styles.codeInput}>
                                    <Input
                                        value={formCode}
                                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                        placeholder="Ex: PROMO10"
                                    />
                                    <Button variant="outline" onClick={generateRandomCode}>
                                        Gerar
                                    </Button>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Descrição (opcional)</label>
                                <Input
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Ex: Desconto de inauguração"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Tipo de Desconto</label>
                                    <select
                                        value={formDiscountType}
                                        onChange={(e) => setFormDiscountType(e.target.value as 'percentage' | 'fixed')}
                                        className={styles.select}
                                    >
                                        <option value="percentage">Porcentagem (%)</option>
                                        <option value="fixed">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Valor do Desconto</label>
                                    <Input
                                        type="number"
                                        step={formDiscountType === 'percentage' ? '1' : '0.01'}
                                        value={formDiscountValue}
                                        onChange={(e) => setFormDiscountValue(e.target.value)}
                                        placeholder={formDiscountType === 'percentage' ? '10' : '5.00'}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Pedido Mínimo (R$)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formMinOrderValue}
                                        onChange={(e) => setFormMinOrderValue(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                {formDiscountType === 'percentage' && (
                                    <div className={styles.formGroup}>
                                        <label>Desconto Máximo (R$)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formMaxDiscount}
                                            onChange={(e) => setFormMaxDiscount(e.target.value)}
                                            placeholder="Sem limite"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Limite de Usos</label>
                                    <Input
                                        type="number"
                                        value={formUsageLimit}
                                        onChange={(e) => setFormUsageLimit(e.target.value)}
                                        placeholder="Ilimitado"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Válido Até</label>
                                    <Input
                                        type="date"
                                        value={formValidUntil}
                                        onChange={(e) => setFormValidUntil(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formFirstOrderOnly}
                                        onChange={(e) => setFormFirstOrderOnly(e.target.checked)}
                                    />
                                    Válido apenas para primeira compra
                                </label>
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="outline" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveCoupon}>
                                    {editingCoupon ? 'Salvar' : 'Criar Cupom'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
