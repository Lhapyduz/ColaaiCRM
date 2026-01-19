'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiDollarSign, FiArrowUp, FiArrowDown, FiCheck, FiAlertCircle, FiClock } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
    const [form, setForm] = useState({ type: 'payable' as 'payable' | 'receivable', description: '', category: '', amount: 0, due_date: '', supplier_customer: '', notes: '' });

    const hasAccess = canAccess('bills');

    useEffect(() => { if (user && hasAccess) fetchData(); }, [user, hasAccess]);

    if (!hasAccess) {
        return (<MainLayout><UpgradePrompt feature="Contas a Pagar/Receber" requiredPlan="Avançado" currentPlan={plan} fullPage /></MainLayout>);
    }

    const fetchData = async () => { setLoading(true); await Promise.all([fetchBills(), fetchCategories()]); setLoading(false); };

    const fetchBills = async () => {
        if (!user) return;
        try { await supabase.rpc('update_overdue_bills'); } catch { }
        const { data, error } = await supabase.from('bills').select('*').eq('user_id', user.id).order('due_date', { ascending: true });
        if (!error && data) setBills(data);
    };

    const fetchCategories = async () => {
        if (!user) return;
        const { data, error } = await supabase.from('bill_categories').select('*').eq('user_id', user.id);
        if (!error && data) setCategories(data);
        else {
            const defaults = [
                { name: 'Fornecedores', type: 'payable', icon: '📦', color: '#e74c3c' },
                { name: 'Aluguel', type: 'payable', icon: '🏠', color: '#9b59b6' },
                { name: 'Energia', type: 'payable', icon: '⚡', color: '#f39c12' },
                { name: 'Funcionários', type: 'payable', icon: '👥', color: '#e67e22' },
                { name: 'Vendas', type: 'receivable', icon: '💰', color: '#27ae60' },
                { name: 'Outros', type: 'both', icon: '📝', color: '#7f8c8d' }
            ];
            for (const cat of defaults) await supabase.from('bill_categories').insert({ user_id: user.id, ...cat });
            fetchCategories();
        }
    };

    const handleSave = async () => {
        if (!user) return;
        const billData = { user_id: user.id, type: form.type, description: form.description, category: form.category, amount: form.amount, due_date: form.due_date, supplier_customer: form.supplier_customer || null, notes: form.notes || null, status: 'pending' };
        if (editingBill) await supabase.from('bills').update(billData).eq('id', editingBill.id);
        else await supabase.from('bills').insert(billData);
        setShowModal(false); resetForm(); fetchBills();
    };

    const handleMarkPaid = async (bill: Bill) => {
        await supabase.from('bills').update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] }).eq('id', bill.id);
        await supabase.from('cash_flow').insert({ user_id: user!.id, type: bill.type === 'payable' ? 'expense' : 'income', category: bill.category, description: bill.description, amount: bill.amount, transaction_date: new Date().toISOString().split('T')[0], reference_type: 'bill', reference_id: bill.id });
        fetchBills();
    };

    const handleDelete = async (id: string) => { if (!confirm('Excluir esta conta?')) return; await supabase.from('bills').delete().eq('id', id); fetchBills(); };
    const resetForm = () => { setForm({ type: 'payable', description: '', category: '', amount: 0, due_date: '', supplier_customer: '', notes: '' }); setEditingBill(null); };
    const openEdit = (bill: Bill) => { setEditingBill(bill); setForm({ type: bill.type, description: bill.description, category: bill.category, amount: bill.amount, due_date: bill.due_date, supplier_customer: bill.supplier_customer || '', notes: bill.notes || '' }); setShowModal(true); };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const formatDate = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
            pending: { label: 'Pendente', icon: <FiClock />, class: 'bg-[#f39c12]/10 text-[#f39c12]' },
            paid: { label: 'Pago', icon: <FiCheck />, class: 'bg-[#27ae60]/10 text-[#27ae60]' },
            overdue: { label: 'Vencido', icon: <FiAlertCircle />, class: 'bg-[#e74c3c]/10 text-[#e74c3c]' },
            cancelled: { label: 'Cancelado', icon: null, class: 'bg-bg-tertiary text-text-muted' }
        };
        return badges[status] || badges.pending;
    };

    const filteredBills = bills.filter(b => { if (activeTab !== 'all' && b.type !== activeTab) return false; if (filterStatus && b.status !== filterStatus) return false; return true; });

    const stats = {
        totalPayable: bills.filter(b => b.type === 'payable' && b.status === 'pending').reduce((sum, b) => sum + b.amount, 0),
        totalReceivable: bills.filter(b => b.type === 'receivable' && b.status === 'pending').reduce((sum, b) => sum + b.amount, 0),
        overdue: bills.filter(b => b.status === 'overdue').length,
        dueThisWeek: bills.filter(b => { if (b.status !== 'pending') return false; const due = new Date(b.due_date); const now = new Date(); const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); return due <= weekFromNow && due >= now; }).length
    };

    return (
        <MainLayout>
            <div className="max-w-[1200px] mx-auto">
                <div className="flex justify-between items-start mb-6 max-md:flex-col max-md:gap-4">
                    <div><h1 className="text-[2rem] font-bold mb-2">Contas a Pagar/Receber</h1><p className="text-text-secondary">Gerencie suas obrigações financeiras</p></div>
                    <Button leftIcon={<FiPlus />} onClick={() => { resetForm(); setShowModal(true); }}>Nova Conta</Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6 max-[1024px]:grid-cols-2 max-[480px]:grid-cols-1">
                    <Card className="flex items-center gap-4 p-5!">
                        <FiArrowDown className="text-2xl p-3 rounded-md bg-[#e74c3c]/10 text-[#e74c3c]" />
                        <div className="flex flex-col"><span className="text-xl font-bold">{formatCurrency(stats.totalPayable)}</span><span className="text-[0.8125rem] text-text-muted">A Pagar</span></div>
                    </Card>
                    <Card className="flex items-center gap-4 p-5!">
                        <FiArrowUp className="text-2xl p-3 rounded-md bg-[#27ae60]/10 text-[#27ae60]" />
                        <div className="flex flex-col"><span className="text-xl font-bold">{formatCurrency(stats.totalReceivable)}</span><span className="text-[0.8125rem] text-text-muted">A Receber</span></div>
                    </Card>
                    <Card className="flex items-center gap-4 p-5!">
                        <FiAlertCircle className="text-2xl p-3 rounded-md bg-[#f39c12]/10 text-[#f39c12]" />
                        <div className="flex flex-col"><span className="text-xl font-bold">{stats.overdue}</span><span className="text-[0.8125rem] text-text-muted">Vencidas</span></div>
                    </Card>
                    <Card className="flex items-center gap-4 p-5!">
                        <FiCalendar className="text-2xl p-3 rounded-md bg-[#3498db]/10 text-[#3498db]" />
                        <div className="flex flex-col"><span className="text-xl font-bold">{stats.dueThisWeek}</span><span className="text-[0.8125rem] text-text-muted">Vencem esta semana</span></div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex justify-between items-center mb-4 max-md:flex-col max-md:gap-3 max-md:items-stretch">
                    <div className="flex gap-2">
                        {[{ value: 'all', label: 'Todas' }, { value: 'payable', label: 'A Pagar' }, { value: 'receivable', label: 'A Receber' }].map(tab => (
                            <button key={tab.value} className={cn('px-5 py-2.5 bg-transparent border border-border rounded-md text-text-secondary text-sm font-medium cursor-pointer transition-all duration-fast hover:bg-bg-tertiary', activeTab === tab.value && 'bg-primary border-primary text-white')} onClick={() => setActiveTab(tab.value as TabType)}>{tab.label}</button>
                        ))}
                    </div>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm">
                        <option value="">Todos os status</option><option value="pending">Pendentes</option><option value="paid">Pagas</option><option value="overdue">Vencidas</option>
                    </select>
                </div>

                {/* Bills List */}
                <Card>
                    {loading ? <div className="p-12 text-center text-text-secondary">Carregando...</div> : filteredBills.length === 0 ? (
                        <div className="flex flex-col items-center p-12 text-center text-text-muted"><FiDollarSign size={48} className="mb-4 opacity-50" /><h3 className="text-lg font-semibold text-text-secondary mb-2">Nenhuma conta encontrada</h3><p>Adicione suas contas a pagar e receber</p></div>
                    ) : (
                        <div className="flex flex-col">
                            {filteredBills.map(bill => {
                                const statusBadge = getStatusBadge(bill.status);
                                return (
                                    <div key={bill.id} className="grid grid-cols-[40px_1fr_120px_100px_100px_100px] items-center gap-4 p-4 border-b border-border transition-all duration-fast hover:bg-bg-tertiary last:border-b-0 max-[1024px]:grid-cols-[40px_1fr_100px_80px] max-md:grid-cols-1 max-md:gap-3">
                                        <div className="max-md:hidden">
                                            {bill.type === 'payable' ? <span className="w-9 h-9 flex items-center justify-center rounded-full bg-[#e74c3c]/10 text-[#e74c3c]"><FiArrowDown /></span> : <span className="w-9 h-9 flex items-center justify-center rounded-full bg-[#27ae60]/10 text-[#27ae60]"><FiArrowUp /></span>}
                                        </div>
                                        <div className="flex flex-col gap-0.5"><span className="font-medium">{bill.description}</span><span className="text-xs text-text-muted">{bill.category}</span>{bill.supplier_customer && <span className="text-xs text-text-secondary">{bill.supplier_customer}</span>}</div>
                                        <div className="text-right"><span className={bill.type === 'payable' ? 'font-semibold text-[#e74c3c]' : 'font-semibold text-[#27ae60]'}>{bill.type === 'payable' ? '-' : '+'}{formatCurrency(bill.amount)}</span></div>
                                        <div className="flex flex-col items-center max-[1024px]:hidden"><span className="text-[0.6875rem] text-text-muted uppercase">Vencimento</span><span className="text-sm font-medium">{formatDate(bill.due_date)}</span></div>
                                        <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-sm justify-center max-[1024px]:hidden', statusBadge.class)}>{statusBadge.icon} {statusBadge.label}</div>
                                        <div className="flex gap-2 justify-end">
                                            {bill.status === 'pending' && <button className="p-2 bg-transparent border border-[#27ae60] rounded-sm text-[#27ae60] cursor-pointer transition-all duration-fast hover:bg-[#27ae60]/10" onClick={() => handleMarkPaid(bill)} title="Marcar como pago"><FiCheck /></button>}
                                            <button className="p-2 bg-transparent border border-border rounded-sm text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-card hover:text-text-primary" onClick={() => openEdit(bill)}><FiEdit2 /></button>
                                            <button className="p-2 bg-transparent border border-border rounded-sm text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-card hover:text-text-primary" onClick={() => handleDelete(bill.id)}><FiTrash2 /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-5" onClick={() => setShowModal(false)}>
                        <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-semibold mb-6">{editingBill ? 'Editar Conta' : 'Nova Conta'}</h2>
                            <div className="mb-4">
                                <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Tipo</label>
                                <div className="flex gap-3">
                                    <button className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-bg-tertiary border-2 border-border rounded-md text-text-secondary font-medium cursor-pointer transition-all duration-fast hover:border-text-muted', form.type === 'payable' && 'border-primary text-primary bg-primary/10')} onClick={() => setForm({ ...form, type: 'payable' })}><FiArrowDown /> A Pagar</button>
                                    <button className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-bg-tertiary border-2 border-border rounded-md text-text-secondary font-medium cursor-pointer transition-all duration-fast hover:border-text-muted', form.type === 'receivable' && 'border-primary text-primary bg-primary/10')} onClick={() => setForm({ ...form, type: 'receivable' })}><FiArrowUp /> A Receber</button>
                                </div>
                            </div>
                            <div className="mb-4"><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Descrição</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Conta de luz" /></div>
                            <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                                <div><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Categoria</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-md text-text-primary text-[0.9375rem]"><option value="">Selecione...</option>{categories.filter(c => c.type === 'both' || c.type === form.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}</select></div>
                                <div><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Valor (R$)</label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} min={0} step={0.01} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                                <div><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Vencimento</label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                                <div><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">{form.type === 'payable' ? 'Fornecedor' : 'Cliente'}</label><Input value={form.supplier_customer} onChange={(e) => setForm({ ...form, supplier_customer: e.target.value })} placeholder="Nome (opcional)" /></div>
                            </div>
                            <div className="mb-4"><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Observações</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais..." /></div>
                            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border"><Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>{editingBill ? 'Salvar' : 'Adicionar'}</Button></div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
