'use client';

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiFilter,
    FiCalendar,
    FiDollarSign,
    FiArrowUp,
    FiArrowDown,
    FiCheck,
    FiAlertCircle,
    FiClock
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

interface Bill {
    id: string;
    type: 'payable' | 'receivable';
    description: string;
    category: string;
    amount: number;
    due_date: string;
    payment_date: string | null;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    supplier_customer: string | null;
    notes: string | null;
}

interface BillCategory {
    id: string;
    name: string;
    type: 'payable' | 'receivable' | 'both';
    icon: string;
    color: string;
}

type TabType = 'payable' | 'receivable' | 'all';

export default function ContasPage() {
    const { user } = useAuth();
    const { canAccess, plan } = useSubscription();
    const [bills, setBills] = useState<Bill[]>([]);
    const [categories, setCategories] = useState<BillCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);

    const [form, setForm] = useState({
        type: 'payable' as 'payable' | 'receivable',
        description: '',
        category: '',
        amount: 0,
        due_date: '',
        supplier_customer: '',
        notes: ''
    });

    const hasAccess = canAccess('bills');

    useEffect(() => {
        if (user && hasAccess) {
            fetchData();
        }
    }, [user, hasAccess]);

    // Check access after hooks
    if (!hasAccess) {
        return (
            <MainLayout>
                <UpgradePrompt
                    feature="Contas a Pagar/Receber"
                    requiredPlan="Avançado"
                    currentPlan={plan}
                    fullPage
                />
            </MainLayout>
        );
    }

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchBills(), fetchCategories()]);
        setLoading(false);
    };

    const fetchBills = async () => {
        if (!user) return;

        // Update overdue bills (ignore if function doesn't exist)
        try {
            await supabase.rpc('update_overdue_bills');
        } catch {
            // Function may not exist yet - ignore
        }

        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        if (!error && data) {
            setBills(data);
        }
    };

    const fetchCategories = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('bill_categories')
            .select('*')
            .eq('user_id', user.id);

        if (!error && data) {
            setCategories(data);
        } else {
            // Create default categories if none exist
            const defaults = [
                { name: 'Fornecedores', type: 'payable', icon: '📦', color: '#e74c3c' },
                { name: 'Aluguel', type: 'payable', icon: '🏠', color: '#9b59b6' },
                { name: 'Energia', type: 'payable', icon: '⚡', color: '#f39c12' },
                { name: 'Funcionários', type: 'payable', icon: '👥', color: '#e67e22' },
                { name: 'Vendas', type: 'receivable', icon: '💰', color: '#27ae60' },
                { name: 'Outros', type: 'both', icon: '📝', color: '#7f8c8d' }
            ];
            for (const cat of defaults) {
                await supabase.from('bill_categories').insert({ user_id: user.id, ...cat });
            }
            fetchCategories();
        }
    };

    const handleSave = async () => {
        if (!user) return;

        const billData = {
            user_id: user.id,
            type: form.type,
            description: form.description,
            category: form.category,
            amount: form.amount,
            due_date: form.due_date,
            supplier_customer: form.supplier_customer || null,
            notes: form.notes || null,
            status: 'pending'
        };

        if (editingBill) {
            await supabase.from('bills').update(billData).eq('id', editingBill.id);
        } else {
            await supabase.from('bills').insert(billData);
        }

        setShowModal(false);
        resetForm();
        fetchBills();
    };

    const handleMarkPaid = async (bill: Bill) => {
        await supabase.from('bills').update({
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0]
        }).eq('id', bill.id);

        // Add to cash flow
        await supabase.from('cash_flow').insert({
            user_id: user!.id,
            type: bill.type === 'payable' ? 'expense' : 'income',
            category: bill.category,
            description: bill.description,
            amount: bill.amount,
            transaction_date: new Date().toISOString().split('T')[0],
            reference_type: 'bill',
            reference_id: bill.id
        });

        fetchBills();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta conta?')) return;
        await supabase.from('bills').delete().eq('id', id);
        fetchBills();
    };

    const resetForm = () => {
        setForm({
            type: 'payable',
            description: '',
            category: '',
            amount: 0,
            due_date: '',
            supplier_customer: '',
            notes: ''
        });
        setEditingBill(null);
    };

    const openEdit = (bill: Bill) => {
        setEditingBill(bill);
        setForm({
            type: bill.type,
            description: bill.description,
            category: bill.category,
            amount: bill.amount,
            due_date: bill.due_date,
            supplier_customer: bill.supplier_customer || '',
            notes: bill.notes || ''
        });
        setShowModal(true);
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (date: string) =>
        new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: { label: 'Pendente', icon: <FiClock />, class: styles.pending },
            paid: { label: 'Pago', icon: <FiCheck />, class: styles.paid },
            overdue: { label: 'Vencido', icon: <FiAlertCircle />, class: styles.overdue },
            cancelled: { label: 'Cancelado', icon: null, class: styles.cancelled }
        };
        return badges[status as keyof typeof badges] || badges.pending;
    };

    const filteredBills = bills.filter(b => {
        if (activeTab !== 'all' && b.type !== activeTab) return false;
        if (filterStatus && b.status !== filterStatus) return false;
        return true;
    });

    const stats = {
        totalPayable: bills.filter(b => b.type === 'payable' && b.status === 'pending')
            .reduce((sum, b) => sum + b.amount, 0),
        totalReceivable: bills.filter(b => b.type === 'receivable' && b.status === 'pending')
            .reduce((sum, b) => sum + b.amount, 0),
        overdue: bills.filter(b => b.status === 'overdue').length,
        dueThisWeek: bills.filter(b => {
            if (b.status !== 'pending') return false;
            const due = new Date(b.due_date);
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return due <= weekFromNow && due >= now;
        }).length
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Contas a Pagar/Receber</h1>
                        <p className={styles.subtitle}>Gerencie suas obrigações financeiras</p>
                    </div>
                    <Button leftIcon={<FiPlus />} onClick={() => { resetForm(); setShowModal(true); }}>
                        Nova Conta
                    </Button>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <Card className={`${styles.statCard} ${styles.payable}`}>
                        <FiArrowDown className={styles.statIcon} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{formatCurrency(stats.totalPayable)}</span>
                            <span className={styles.statLabel}>A Pagar</span>
                        </div>
                    </Card>
                    <Card className={`${styles.statCard} ${styles.receivable}`}>
                        <FiArrowUp className={styles.statIcon} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{formatCurrency(stats.totalReceivable)}</span>
                            <span className={styles.statLabel}>A Receber</span>
                        </div>
                    </Card>
                    <Card className={`${styles.statCard} ${styles.overdueStat}`}>
                        <FiAlertCircle className={styles.statIcon} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{stats.overdue}</span>
                            <span className={styles.statLabel}>Vencidas</span>
                        </div>
                    </Card>
                    <Card className={`${styles.statCard} ${styles.dueSoon}`}>
                        <FiCalendar className={styles.statIcon} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{stats.dueThisWeek}</span>
                            <span className={styles.statLabel}>Vencem esta semana</span>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className={styles.filters}>
                    <div className={styles.tabs}>
                        {[
                            { value: 'all', label: 'Todas' },
                            { value: 'payable', label: 'A Pagar' },
                            { value: 'receivable', label: 'A Receber' }
                        ].map(tab => (
                            <button
                                key={tab.value}
                                className={`${styles.tab} ${activeTab === tab.value ? styles.active : ''}`}
                                onClick={() => setActiveTab(tab.value as TabType)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">Todos os status</option>
                        <option value="pending">Pendentes</option>
                        <option value="paid">Pagas</option>
                        <option value="overdue">Vencidas</option>
                    </select>
                </div>

                {/* Bills List */}
                <Card>
                    {loading ? (
                        <div className={styles.loading}>Carregando...</div>
                    ) : filteredBills.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FiDollarSign size={48} />
                            <h3>Nenhuma conta encontrada</h3>
                            <p>Adicione suas contas a pagar e receber</p>
                        </div>
                    ) : (
                        <div className={styles.billsList}>
                            {filteredBills.map(bill => {
                                const statusBadge = getStatusBadge(bill.status);
                                return (
                                    <div key={bill.id} className={styles.billRow}>
                                        <div className={styles.billType}>
                                            {bill.type === 'payable' ? (
                                                <span className={styles.typePayable}><FiArrowDown /></span>
                                            ) : (
                                                <span className={styles.typeReceivable}><FiArrowUp /></span>
                                            )}
                                        </div>
                                        <div className={styles.billInfo}>
                                            <span className={styles.billDescription}>{bill.description}</span>
                                            <span className={styles.billCategory}>{bill.category}</span>
                                            {bill.supplier_customer && (
                                                <span className={styles.billSupplier}>{bill.supplier_customer}</span>
                                            )}
                                        </div>
                                        <div className={styles.billAmount}>
                                            <span className={bill.type === 'payable' ? styles.amountNegative : styles.amountPositive}>
                                                {bill.type === 'payable' ? '-' : '+'}{formatCurrency(bill.amount)}
                                            </span>
                                        </div>
                                        <div className={styles.billDue}>
                                            <span className={styles.dueLabel}>Vencimento</span>
                                            <span className={styles.dueDate}>{formatDate(bill.due_date)}</span>
                                        </div>
                                        <div className={`${styles.billStatus} ${statusBadge.class}`}>
                                            {statusBadge.icon} {statusBadge.label}
                                        </div>
                                        <div className={styles.billActions}>
                                            {bill.status === 'pending' && (
                                                <button
                                                    className={styles.payBtn}
                                                    onClick={() => handleMarkPaid(bill)}
                                                    title="Marcar como pago"
                                                >
                                                    <FiCheck />
                                                </button>
                                            )}
                                            <button onClick={() => openEdit(bill)}><FiEdit2 /></button>
                                            <button onClick={() => handleDelete(bill.id)}><FiTrash2 /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* Modal */}
                {showModal && (
                    <div className={styles.modal}>
                        <div className={styles.modalContent}>
                            <h2>{editingBill ? 'Editar Conta' : 'Nova Conta'}</h2>

                            <div className={styles.formGroup}>
                                <label>Tipo</label>
                                <div className={styles.typeSelector}>
                                    <button
                                        className={`${styles.typeBtn} ${form.type === 'payable' ? styles.active : ''}`}
                                        onClick={() => setForm({ ...form, type: 'payable' })}
                                    >
                                        <FiArrowDown /> A Pagar
                                    </button>
                                    <button
                                        className={`${styles.typeBtn} ${form.type === 'receivable' ? styles.active : ''}`}
                                        onClick={() => setForm({ ...form, type: 'receivable' })}
                                    >
                                        <FiArrowUp /> A Receber
                                    </button>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Descrição</label>
                                <Input
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Ex: Conta de luz"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Categoria</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className={styles.select}
                                    >
                                        <option value="">Selecione...</option>
                                        {categories
                                            .filter(c => c.type === 'both' || c.type === form.type)
                                            .map(c => (
                                                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Valor (R$)</label>
                                    <Input
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                                        min={0}
                                        step={0.01}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Vencimento</label>
                                    <Input
                                        type="date"
                                        value={form.due_date}
                                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>{form.type === 'payable' ? 'Fornecedor' : 'Cliente'}</label>
                                    <Input
                                        value={form.supplier_customer}
                                        onChange={(e) => setForm({ ...form, supplier_customer: e.target.value })}
                                        placeholder="Nome (opcional)"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Observações</label>
                                <Input
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Notas adicionais..."
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button onClick={handleSave}>
                                    {editingBill ? 'Salvar' : 'Adicionar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
