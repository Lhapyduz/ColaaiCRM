'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiDollarSign, FiArrowUp, FiArrowDown, FiCheck, FiAlertCircle, FiClock, FiRepeat } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useBillsCache, useBillCategoriesCache } from '@/hooks/useDataCache';
import { 
    createBillDAL, 
    updateBillDAL, 
    deleteBillDAL, 
    createBillCategoryDAL, 
    deleteBillCategoryDAL,
    markBillPaidDAL 
} from '@/repositories/dataAccess';
import { formatCurrency } from '@/hooks/useFormatters';
import { cn } from '@/utils/utils';
import { supabase } from '@/infra/persistence/supabase';
import { CachedBill } from '@/types/db';

type RecurrenceType = 'none' | 'weekly' | 'monthly' | 'yearly';
type TabType = 'payable' | 'receivable' | 'all';

export default function ContasPage() {
    const { user } = useAuth();
    const { canAccess, plan } = useSubscription();
    
    // Reactive cache hooks
    const { bills, loading: loadingBills } = useBillsCache();
    const { categories, loading: loadingCategories } = useBillCategoriesCache();
    
    const loading = loadingBills || loadingCategories;
    
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [editingBill, setEditingBill] = useState<CachedBill | null>(null);
    const [form, setForm] = useState({ type: 'payable' as 'payable' | 'receivable', description: '', category: '', amount: '' as string | number, due_date: '', supplier_customer: '', notes: '', recurrence: 'none' as RecurrenceType, recurrence_end_date: '' });
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', type: 'both' as 'payable' | 'receivable' | 'both', icon: '📁', color: '#6366f1' });

    const hasAccess = canAccess('bills');
    const toast = useToast();




    // Initialize defaults if no categories exist
    useEffect(() => {
        if (user && hasAccess && categories.length === 0 && !loadingCategories) {
            const defaults: { name: string; type: 'payable' | 'receivable' | 'both'; icon: string; color: string }[] = [
                { name: 'Fornecedores', type: 'payable', icon: '📦', color: '#e74c3c' },
                { name: 'Aluguel', type: 'payable', icon: '🏠', color: '#9b59b6' },
                { name: 'Energia', type: 'payable', icon: '⚡', color: '#f39c12' },
                { name: 'Funcionários', type: 'payable', icon: '👥', color: '#e67e22' },
                { name: 'Vendas', type: 'receivable', icon: '💰', color: '#27ae60' },
                { name: 'Outros', type: 'both', icon: '📝', color: '#7f8c8d' }
            ];
            
            defaults.forEach(cat => createBillCategoryDAL({ user_id: user.id, ...cat }));
        }
    }, [user, hasAccess, categories.length, loadingCategories]);

    useEffect(() => {
        if (user && hasAccess) {
            // Background update for overdue status
            supabase.rpc('update_overdue_bills').then(({error}) => {
                if (error) console.warn('RPC update_overdue_bills failed:', error.message);
            });
        }
    }, [user, hasAccess]);

    if (!hasAccess) {
        return <UpgradePrompt feature="Contas a Pagar/Receber" requiredPlan="Avançado" currentPlan={plan} fullPage />;
    }

    const handleSave = async () => {
        if (!user) return;
        const billData: Partial<CachedBill> = {
            user_id: user.id, type: form.type, description: form.description, category: form.category,
            amount: Number(form.amount) || 0, due_date: form.due_date, supplier_customer: form.supplier_customer || null,
            notes: form.notes || null, status: 'pending' as const,
            recurrence: form.recurrence || 'none',
            recurrence_end_date: form.recurrence_end_date || null
        };
        
        try {
            if (editingBill) await updateBillDAL(editingBill.id, billData);
            else await createBillDAL(billData);
            
            toast.success(editingBill ? 'Conta atualizada!' : 'Conta adicionada!');
            setShowModal(false); 
            resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao salvar conta: ' + message);
        }
    };

    const getNextDueDate = (currentDueDate: string, recurrence: string): string => {
        const date = new Date(currentDueDate + 'T12:00:00');
        switch (recurrence) {
            case 'weekly': date.setDate(date.getDate() + 7); break;
            case 'monthly': date.setMonth(date.getMonth() + 1); break;
            case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
        }
        return date.toISOString().split('T')[0];
    };

    const handleMarkPaid = async (bill: CachedBill) => {
        let nextDueDate: string | undefined;
        if (bill.recurrence && bill.recurrence !== 'none') {
            const calculatedNext = getNextDueDate(bill.due_date, bill.recurrence);
            const endDate = bill.recurrence_end_date ? new Date(bill.recurrence_end_date + 'T12:00:00') : null;
            const nextDate = new Date(calculatedNext + 'T12:00:00');

            if (!endDate || nextDate <= endDate) {
                nextDueDate = calculatedNext;
            }
        }

        try {
            await markBillPaidDAL(
                bill, 
                user!.id, 
                new Date().toISOString().split('T')[0], 
                nextDueDate
            );
            
            if (nextDueDate) {
                toast.success('Conta paga! Próxima parcela gerada automaticamente 🔄');
            } else if (bill.recurrence && bill.recurrence !== 'none') {
                toast.success('Conta paga! Recorrência finalizada.');
            } else {
                toast.success('Conta marcada como paga!');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao processar pagamento: ' + message);
        }
    };

    const handleDelete = async (id: string) => { 
        if (!confirm('Excluir esta conta?')) return; 
        try {
            await deleteBillDAL(id);
            toast.success('Conta excluída!'); 
        } catch (error) {
            toast.error('Erro ao excluir conta: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleSaveCategory = async () => {
        if (!user || !newCategory.name.trim()) return;
        try {
            await createBillCategoryDAL({ 
                user_id: user.id, 
                name: newCategory.name, 
                type: newCategory.type, 
                icon: newCategory.icon, 
                color: newCategory.color 
            });
            setNewCategory({ name: '', type: 'both', icon: '📁', color: '#6366f1' });
            setShowCategoryModal(false);
        } catch (error) {
            toast.error('Erro ao salvar categoria: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        if (!confirm(`Excluir a categoria "${categoryName}"? Esta ação não pode ser desfeita.`)) return;
        try {
            await deleteBillCategoryDAL(categoryId);
            toast.success('Categoria excluída!');
        } catch (error) {
            toast.error('Erro ao excluir categoria: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const resetForm = () => { setForm({ type: 'payable', description: '', category: '', amount: '', due_date: '', supplier_customer: '', notes: '', recurrence: 'none', recurrence_end_date: '' }); setEditingBill(null); };
    const openEdit = (bill: CachedBill) => { setEditingBill(bill); setForm({ type: bill.type, description: bill.description, category: bill.category, amount: bill.amount, due_date: bill.due_date, supplier_customer: bill.supplier_customer || '', notes: bill.notes || '', recurrence: (bill.recurrence || 'none') as RecurrenceType, recurrence_end_date: bill.recurrence_end_date || '' }); setShowModal(true); };

    const recurrenceLabels: Record<RecurrenceType, string> = { none: 'Única vez', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };

    const formatDateForBill = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
            pending: { label: 'Pendente', icon: <FiClock />, class: 'bg-warning/10 text-warning' },
            paid: { label: 'Pago', icon: <FiCheck />, class: 'bg-accent/10 text-accent' },
            overdue: { label: 'Vencido', icon: <FiAlertCircle />, class: 'bg-error/10 text-error' },
            cancelled: { label: 'Cancelado', icon: null, class: 'bg-bg-tertiary text-text-muted' }
        };
        return badges[status] || badges.pending;
    };

    const filteredBills = bills.filter((b: CachedBill) => { if (activeTab !== 'all' && b.type !== activeTab) return false; if (filterStatus && b.status !== filterStatus) return false; return true; });

    const recurringBills = bills.filter((b: CachedBill) => b.recurrence && b.recurrence !== 'none' && b.status === 'pending');
    const stats = {
        totalPayable: bills.filter((b: CachedBill) => b.type === 'payable' && b.status === 'pending').reduce((sum: number, b: CachedBill) => sum + b.amount, 0),
        totalReceivable: bills.filter((b: CachedBill) => b.type === 'receivable' && b.status === 'pending').reduce((sum: number, b: CachedBill) => sum + b.amount, 0),
        overdue: bills.filter((b: CachedBill) => b.status === 'overdue').length,
        dueThisWeek: bills.filter((b: CachedBill) => { if (b.status !== 'pending') return false; const due = new Date(b.due_date); const now = new Date(); const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); return due <= weekFromNow && due >= now; }).length,
        recurring: recurringBills.length,
        recurringTotal: recurringBills.reduce((sum: number, b: CachedBill) => sum + b.amount, 0)
    };

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="flex justify-between items-start mb-8 gap-5 max-md:flex-col">
                <div><h1 className="text-[2rem] font-bold mb-2">Contas a Pagar/Receber</h1><p className="text-text-secondary">Gerencie suas obrigações financeiras</p></div>
                <Button leftIcon={<FiPlus />} onClick={() => { resetForm(); setShowModal(true); }}>Nova Conta</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6 max-[1024px]:grid-cols-2 max-[480px]:grid-cols-1">
                <Card className="flex items-center gap-4 p-5!">
                    <FiArrowDown className="text-2xl p-3 rounded-md bg-error/10 text-error" />
                    <div className="flex flex-col"><span className="text-xl font-bold">{formatCurrency(stats.totalPayable)}</span><span className="text-[0.8125rem] text-text-muted">A Pagar</span></div>
                </Card>
                <Card className="flex items-center gap-4 p-5!">
                    <FiArrowUp className="text-2xl p-3 rounded-md bg-accent/10 text-accent" />
                    <div className="flex flex-col"><span className="text-xl font-bold">{formatCurrency(stats.totalReceivable)}</span><span className="text-[0.8125rem] text-text-muted">A Receber</span></div>
                </Card>
                <Card className="flex items-center gap-4 p-5!">
                    <FiAlertCircle className="text-2xl p-3 rounded-md bg-warning/10 text-warning" />
                    <div className="flex flex-col"><span className="text-xl font-bold">{stats.overdue}</span><span className="text-[0.8125rem] text-text-muted">Vencidas</span></div>
                </Card>
                <Card className="flex items-center gap-4 p-5!">
                    <FiCalendar className="text-2xl p-3 rounded-md bg-info/10 text-info" />
                    <div className="flex flex-col"><span className="text-xl font-bold">{stats.dueThisWeek}</span><span className="text-[0.8125rem] text-text-muted">Vencem esta semana</span></div>
                </Card>
                <Card className="flex items-center gap-4 p-5!">
                    <FiRepeat className="text-2xl p-3 rounded-md bg-primary/10 text-primary" />
                    <div className="flex flex-col"><span className="text-xl font-bold">{stats.recurring}</span><span className="text-[0.8125rem] text-text-muted">Recorrentes ({formatCurrency(stats.recurringTotal)})</span></div>
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
                                        {bill.type === 'payable' ? <span className="w-9 h-9 flex items-center justify-center rounded-full bg-error/10 text-error"><FiArrowDown /></span> : <span className="w-9 h-9 flex items-center justify-center rounded-full bg-accent/10 text-accent"><FiArrowUp /></span>}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium flex items-center gap-1.5">
                                            {bill.description}
                                            {bill.recurrence && bill.recurrence !== 'none' && (
                                                <span className="inline-flex items-center gap-1 text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary" title={`Recorrência: ${recurrenceLabels[bill.recurrence as RecurrenceType]}`}>
                                                    <FiRepeat size={10} /> {recurrenceLabels[bill.recurrence as RecurrenceType]}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-text-muted">{bill.category}</span>
                                        {bill.supplier_customer && <span className="text-xs text-text-secondary">{bill.supplier_customer}</span>}
                                    </div>
                                    <div className="text-right"><span className={bill.type === 'payable' ? 'font-semibold text-error' : 'font-semibold text-accent'}>{bill.type === 'payable' ? '-' : '+'}{formatCurrency(bill.amount)}</span></div>
                                    <div className="flex flex-col items-center max-[1024px]:hidden"><span className="text-[0.6875rem] text-text-muted uppercase">Vencimento</span><span className="text-sm font-medium">{formatDateForBill(bill.due_date)}</span></div>
                                    <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-sm justify-center max-[1024px]:hidden', statusBadge.class)}>{statusBadge.icon} {statusBadge.label}</div>
                                    <div className="flex gap-2 justify-end">
                                        {bill.status === 'pending' && <button className="p-2 bg-transparent border border-accent rounded-sm text-accent cursor-pointer transition-all duration-fast hover:bg-accent/10" onClick={() => handleMarkPaid(bill)} title="Marcar como pago"><FiCheck /></button>}
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
                            <div>
                                <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Categoria</label>
                                <div className="flex gap-2">
                                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="flex-1 px-4 py-3 bg-bg-tertiary border border-border rounded-md text-text-primary text-[0.9375rem]">
                                        <option value="">Selecione...</option>
                                        {categories.filter(c => c.type === 'both' || c.type === form.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setShowCategoryModal(true)} className="px-3 py-3 bg-primary text-white rounded-md hover:bg-primary-hover transition-all" title="Criar categoria"><FiPlus /></button>
                                </div>
                            </div>
                            <div><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Valor (R$)</label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} min={0} step={0.01} placeholder="Digite o valor" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                            <div><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Vencimento</label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                            <div><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">{form.type === 'payable' ? 'Fornecedor' : 'Cliente'}</label><Input value={form.supplier_customer} onChange={(e) => setForm({ ...form, supplier_customer: e.target.value })} placeholder="Nome (opcional)" /></div>
                        </div>
                        {/* Recorrência */}
                        <div className="mb-4">
                            <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Recorrência</label>
                            <div className="flex gap-2">
                                {(['none', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map(rec => (
                                    <button key={rec} className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-bg-tertiary border-2 border-border rounded-md text-sm font-medium cursor-pointer transition-all duration-fast hover:border-text-muted', form.recurrence === rec && 'border-primary text-primary bg-primary/10')} onClick={() => setForm({ ...form, recurrence: rec })}>
                                        {rec !== 'none' && <FiRepeat size={14} />} {recurrenceLabels[rec]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {form.recurrence !== 'none' && (
                            <div className="mb-4">
                                <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Data final da recorrência (opcional)</label>
                                <Input type="date" value={form.recurrence_end_date} onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })} />
                                <p className="text-xs text-text-muted mt-1">Deixe em branco para repetir indefinidamente</p>
                            </div>
                        )}
                        <div className="mb-4"><label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Observações</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais..." /></div>
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border"><Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>{editingBill ? 'Salvar' : 'Adicionar'}</Button></div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1001 p-5" onClick={() => setShowCategoryModal(false)}>
                    <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold mb-6">Gerenciar Categorias</h2>

                        {/* Existing Categories */}
                        {categories.length > 0 && (
                            <div className="mb-8">
                                <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Categorias Existentes</label>
                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto bg-bg-tertiary rounded-md p-2">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between px-3 py-2 bg-bg-card rounded-md border border-border">
                                            <div className="flex items-center gap-2">
                                                <span>{cat.icon}</span>
                                                <span className="font-medium">{cat.name}</span>
                                                <span className="text-xs text-text-muted px-2 py-0.5 bg-bg-tertiary rounded-full">
                                                    {cat.type === 'payable' ? 'Pagar' : cat.type === 'receivable' ? 'Receber' : 'Ambos'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-all"
                                                title="Excluir categoria"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Category Form */}
                        <div className="border-t border-border pt-4">
                            <label className="block text-[0.875rem] font-semibold text-text-primary mb-4">Criar Nova Categoria</label>
                            <div className="mb-4">
                                <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Nome</label>
                                <Input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="Ex: Impostos" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Tipo</label>
                                <div className="flex gap-2">
                                    <button className={cn('flex-1 px-3 py-2 bg-bg-tertiary border-2 border-border rounded-md text-sm font-medium transition-all', newCategory.type === 'payable' && 'border-primary text-primary bg-primary/10')} onClick={() => setNewCategory({ ...newCategory, type: 'payable' })}>A Pagar</button>
                                    <button className={cn('flex-1 px-3 py-2 bg-bg-tertiary border-2 border-border rounded-md text-sm font-medium transition-all', newCategory.type === 'receivable' && 'border-primary text-primary bg-primary/10')} onClick={() => setNewCategory({ ...newCategory, type: 'receivable' })}>A Receber</button>
                                    <button className={cn('flex-1 px-3 py-2 bg-bg-tertiary border-2 border-border rounded-md text-sm font-medium transition-all', newCategory.type === 'both' && 'border-primary text-primary bg-primary/10')} onClick={() => setNewCategory({ ...newCategory, type: 'both' })}>Ambos</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Ícone</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {['📁', '💰', '🏠', '⚡', '📦', '👥', '🚗', '📝', '💳', '🛒'].map(icon => (
                                            <button key={icon} className={cn('w-10 h-10 flex items-center justify-center text-lg bg-bg-tertiary border-2 border-border rounded-md transition-all', newCategory.icon === icon && 'border-primary bg-primary/10')} onClick={() => setNewCategory({ ...newCategory, icon })}>{icon}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[0.8125rem] font-medium text-text-secondary mb-2">Cor</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {['#e74c3c', '#27ae60', '#3498db', '#9b59b6', '#f39c12', '#e67e22', '#1abc9c', '#6366f1'].map(color => (
                                            <button key={color} className={cn('w-10 h-10 rounded-md border-2 border-transparent transition-all', newCategory.color === color && 'border-white ring-2 ring-white/30')} style={{ backgroundColor: color }} onClick={() => setNewCategory({ ...newCategory, color })} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border">
                            <Button variant="ghost" onClick={() => setShowCategoryModal(false)}>Fechar</Button>
                            <Button onClick={handleSaveCategory} disabled={!newCategory.name.trim()}>Criar Categoria</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
