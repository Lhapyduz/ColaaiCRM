'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiUsers, FiShield, FiPhone, FiMail, FiToggleLeft, FiToggleRight, FiLock } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Employee { id: string; name: string; email: string | null; phone: string | null; role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'attendant' | 'delivery'; pin_code: string | null; is_active: boolean; is_fixed?: boolean; permissions: Record<string, boolean>; hourly_rate: number | null; created_at: string; }

const ROLES = [
    { value: 'admin', label: 'Administrador', icon: '👑', color: '#9b59b6' },
    { value: 'manager', label: 'Gerente', icon: '📋', color: '#3498db' },
    { value: 'cashier', label: 'Caixa', icon: '💵', color: '#27ae60' },
    { value: 'kitchen', label: 'Cozinha', icon: '👨‍🍳', color: '#e67e22' },
    { value: 'attendant', label: 'Atendente', icon: '🧑‍💼', color: '#1abc9c' },
    { value: 'delivery', label: 'Entregador', icon: '🚴', color: '#e74c3c' }
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
    admin: { orders: true, products: true, categories: true, customers: true, reports: true, settings: true, employees: true, finance: true },
    manager: { orders: true, products: true, categories: true, customers: true, reports: true, settings: false, employees: true, finance: true },
    cashier: { orders: true, products: false, categories: false, customers: true, reports: false, settings: false, employees: false, finance: true },
    kitchen: { orders: true, products: false, categories: false, customers: false, reports: false, settings: false, employees: false, finance: false },
    attendant: { orders: true, products: true, categories: false, customers: true, reports: false, settings: false, employees: false, finance: false },
    delivery: { orders: true, products: false, categories: false, customers: true, reports: false, settings: false, employees: false, finance: false }
};

export default function FuncionariosPage() {
    const { user } = useAuth();
    const { plan, isWithinLimit, getLimit } = useSubscription();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'attendant' as Employee['role'], pin_code: '', hourly_rate: 0, is_active: true });

    useEffect(() => { if (user) fetchEmployees(); }, [user]);

    const fetchEmployees = async () => { if (!user) return; setLoading(true); const { data, error } = await supabase.from('employees').select('*').eq('user_id', user.id).order('name'); if (!error && data) setEmployees(data); setLoading(false); };
    const handleAddClick = () => { const regularEmployees = employees.filter(e => !e.is_fixed); if (!isWithinLimit('employees', regularEmployees.length)) { setShowUpgradeModal(true); return; } resetForm(); setShowModal(true); };

    const handleSave = async () => {
        if (!user) return;
        if (editingEmployee?.is_fixed) { await supabase.from('employees').update({ pin_code: form.pin_code || null }).eq('id', editingEmployee.id); setShowModal(false); resetForm(); fetchEmployees(); return; }
        const employeeData = { user_id: user.id, name: form.name, email: form.email || null, phone: form.phone || null, role: form.role, pin_code: form.pin_code || null, hourly_rate: form.hourly_rate || null, is_active: form.is_active, permissions: DEFAULT_PERMISSIONS[form.role] };
        if (editingEmployee) await supabase.from('employees').update(employeeData).eq('id', editingEmployee.id);
        else await supabase.from('employees').insert(employeeData);
        setShowModal(false); resetForm(); fetchEmployees();
    };

    const handleToggleActive = async (employee: Employee) => { await supabase.from('employees').update({ is_active: !employee.is_active }).eq('id', employee.id); fetchEmployees(); };
    const handleDelete = async (employee: Employee) => { if (employee.is_fixed) { alert('Este funcionário é fixo e não pode ser removido.'); return; } if (!confirm('Excluir este funcionário?')) return; await supabase.from('employees').delete().eq('id', employee.id); fetchEmployees(); };
    const resetForm = () => { setForm({ name: '', email: '', phone: '', role: 'attendant', pin_code: '', hourly_rate: 0, is_active: true }); setEditingEmployee(null); };
    const openEdit = (employee: Employee) => { setEditingEmployee(employee); setForm({ name: employee.name, email: employee.email || '', phone: employee.phone || '', role: employee.role, pin_code: employee.pin_code || '', hourly_rate: employee.hourly_rate || 0, is_active: employee.is_active }); setShowModal(true); };
    const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[4];
    const generatePin = () => { const pin = Math.floor(1000 + Math.random() * 9000).toString(); setForm({ ...form, pin_code: pin }); };

    const regularEmployees = employees.filter(e => !e.is_fixed);
    const fixedEmployees = employees.filter(e => e.is_fixed);
    const stats = { total: regularEmployees.length, active: regularEmployees.filter(e => e.is_active).length, byRole: ROLES.map(r => ({ ...r, count: employees.filter(e => e.role === r.value).length })) };

    return (
        <div className="max-w-[1200px] mx-auto">
            <div className="flex justify-between items-start mb-6 gap-5 max-md:flex-col">
                <div><h1 className="text-[2rem] font-bold mb-2">Funcionários</h1><p className="text-text-secondary">Gerencie sua equipe ({regularEmployees.length}/{getLimit('employees') === Infinity ? '∞' : getLimit('employees')}){fixedEmployees.length > 0 && <span className="opacity-70 ml-2">+ {fixedEmployees.length} fixo(s)</span>}</p></div>
                <Button leftIcon={<FiPlus />} onClick={handleAddClick}>Novo Funcionário</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-2 max-[480px]:grid-cols-1">
                <Card className="flex items-center gap-4 p-5!"><FiUsers className="text-2xl text-primary" /><div className="flex flex-col"><span className="text-xl font-bold">{stats.total}</span><span className="text-[0.8125rem] text-text-muted">Total</span></div></Card>
                <Card className="flex items-center gap-4 p-5!"><FiUser className="text-2xl text-[#27ae60]" /><div className="flex flex-col"><span className="text-xl font-bold">{stats.active}</span><span className="text-[0.8125rem] text-text-muted">Ativos</span></div></Card>
                {stats.byRole.filter(r => r.count > 0).slice(0, 2).map(r => (
                    <Card key={r.value} className="flex items-center gap-4 p-5!"><span className="text-2xl">{r.icon}</span><div className="flex flex-col"><span className="text-xl font-bold">{r.count}</span><span className="text-[0.8125rem] text-text-muted">{r.label}</span></div></Card>
                ))}
            </div>

            {/* Employees List */}
            <Card>
                {loading ? <div className="p-12 text-center text-text-secondary">Carregando...</div> : employees.length === 0 ? (
                    <div className="flex flex-col items-center p-12 text-center text-text-muted"><FiUsers size={48} className="mb-4 opacity-50" /><h3 className="text-lg font-semibold text-text-secondary mb-2">Nenhum funcionário cadastrado</h3><p>Adicione sua equipe para gerenciar permissões</p></div>
                ) : (
                    <div className="flex flex-col">
                        {employees.map(employee => {
                            const roleInfo = getRoleInfo(employee.role);
                            return (
                                <div key={employee.id} className={cn('flex items-center gap-4 p-4 border-b border-border transition-all duration-fast hover:bg-bg-tertiary last:border-b-0 max-md:flex-wrap', !employee.is_active && 'opacity-50')}>
                                    <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 text-xl" style={{ borderColor: roleInfo.color }}><span>{roleInfo.icon}</span></div>
                                    <div className="flex-1 min-w-[150px]"><span className="font-medium block">{employee.name}</span><div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">{employee.email && <span className="flex items-center gap-1"><FiMail size={12} /> {employee.email}</span>}{employee.phone && <span className="flex items-center gap-1"><FiPhone size={12} /> {employee.phone}</span>}</div></div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: `${roleInfo.color}20`, color: roleInfo.color }}><FiShield size={12} />{roleInfo.label}{employee.is_fixed && <span className="flex items-center gap-1 ml-1 text-[10px] opacity-70" title="Fixo"><FiLock size={10} /> FIXO</span>}</div>
                                    <button className={cn('p-1 bg-transparent border-none cursor-pointer transition-all duration-fast', employee.is_active ? 'text-[#27ae60]' : 'text-text-muted')} onClick={() => handleToggleActive(employee)} title={employee.is_active ? 'Desativar' : 'Ativar'} disabled={employee.is_fixed}>{employee.is_active ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}</button>
                                    <div className="flex gap-2"><button className="p-2 bg-transparent border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:text-text-primary hover:border-border-light" onClick={() => openEdit(employee)} title={employee.is_fixed ? 'Alterar PIN' : 'Editar'}><FiEdit2 /></button>{!employee.is_fixed && <button className="p-2 bg-transparent border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:text-error hover:border-error" onClick={() => handleDelete(employee)}><FiTrash2 /></button>}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* New Employee Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold mb-6">{editingEmployee?.is_fixed ? 'Alterar PIN do ADM' : (editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário')}</h2>
                        {editingEmployee?.is_fixed && <div className="bg-[#9b59b6]/10 border border-[#9b59b6]/30 rounded-md p-3 mb-4 flex items-center gap-2.5 text-sm"><FiLock size={16} className="text-[#9b59b6]" /><span>Este é um funcionário fixo. Apenas o PIN pode ser alterado.</span></div>}
                        {!editingEmployee?.is_fixed && (
                            <>
                                <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Nome Completo</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do funcionário" /></div>
                                <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1"><div><label className="block text-sm text-text-secondary mb-2">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div><div><label className="block text-sm text-text-secondary mb-2">Telefone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" /></div></div>
                                <div className="mb-4"><label className="block text-sm text-text-secondary mb-2">Função</label><div className="grid grid-cols-3 gap-2 max-md:grid-cols-2">{ROLES.map(role => (<button key={role.value} className={cn('p-3 bg-bg-tertiary border-2 border-border rounded-md cursor-pointer transition-all duration-fast flex flex-col items-center gap-1', form.role === role.value && 'border-primary bg-primary/10')} style={{ borderColor: form.role === role.value ? role.color : undefined }} onClick={() => setForm({ ...form, role: role.value as Employee['role'] })}><span className="text-xl">{role.icon}</span><span className="text-xs">{role.label}</span></button>))}</div></div>
                            </>
                        )}
                        <div className={cn('mb-4', !editingEmployee?.is_fixed && 'grid grid-cols-2 gap-4 max-md:grid-cols-1')}>
                            <div><label className="block text-sm text-text-secondary mb-2">PIN de Acesso</label><div className="flex gap-2"><Input value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} placeholder="4 dígitos" maxLength={6} /><Button variant="outline" size="sm" onClick={generatePin}>Gerar</Button></div></div>
                            {!editingEmployee?.is_fixed && <div><label className="block text-sm text-text-secondary mb-2">Valor por Hora (R$)</label><Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })} min={0} step={0.01} /></div>}
                        </div>
                        {!editingEmployee?.is_fixed && (
                            <div className="bg-bg-tertiary rounded-md p-4 mb-4"><h4 className="flex items-center gap-2 text-sm font-medium mb-2"><FiShield /> Permissões do cargo:</h4><div className="flex flex-wrap gap-2">{Object.entries(DEFAULT_PERMISSIONS[form.role]).map(([perm, allowed]) => (<span key={perm} className={cn('px-2 py-1 rounded-sm text-xs', allowed ? 'bg-[#27ae60]/10 text-[#27ae60]' : 'bg-error/10 text-error')}>{allowed ? '✓' : '✗'} {perm}</span>))}</div></div>
                        )}
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border"><Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>{editingEmployee ? 'Salvar' : 'Adicionar'}</Button></div>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4" onClick={() => setShowUpgradeModal(false)}>
                    <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-[600px]" onClick={e => e.stopPropagation()}>
                        <UpgradePrompt feature="Limite de Funcionários Atingido" requiredPlan={plan === 'Basico' ? 'Avançado' : 'Profissional'} currentPlan={plan} />
                        <div className="mt-4 text-center"><Button variant="ghost" onClick={() => setShowUpgradeModal(false)}>Fechar</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
