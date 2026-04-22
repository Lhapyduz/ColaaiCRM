'use client';

import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiUsers, FiShield, FiPhone, FiMail, FiToggleLeft, FiToggleRight, FiLock } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useEmployeesCache } from '@/hooks/useDataCache';
import { cn } from '@/lib/utils';
import EditEmployeeSheet, { EmployeeData } from '@/components/funcionarios/EditEmployeeSheet';
import type { CachedEmployee } from '@/types/db';

type Employee = CachedEmployee;

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
    const { employees, loading } = useEmployeesCache();
    const [showModal, setShowModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    const handleAddClick = () => { 
        const regularEmployees = employees.filter(e => !e.is_fixed); 
        if (!isWithinLimit('employees', regularEmployees.length)) { 
            setShowUpgradeModal(true); 
            return; 
        } 
        setEditingEmployee(null); 
        setShowModal(true); 
    };

    const handleSave = async (updatedData: EmployeeData) => {
        if (!user) return;
        
        const isCreating = !editingEmployee;
        const { createEmployee, updateEmployee } = await import('@/lib/dataAccess');
        
        if (editingEmployee?.is_fixed) {
            await updateEmployee(editingEmployee.id, { pin_code: updatedData.pin_code || null });
            setShowModal(false);
            setEditingEmployee(null);
            return;
        }

        const employeeData = {
            user_id: user.id,
            name: updatedData.name,
            email: updatedData.email || null,
            phone: updatedData.phone || null,
            role: updatedData.role,
            pin_code: updatedData.pin_code || null,
            hourly_rate: updatedData.hourly_rate || null,
            salario_fixo: updatedData.salario_fixo || 0,
            is_active: updatedData.is_active,
            permissions: DEFAULT_PERMISSIONS[updatedData.role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.attendant
        };

        if (isCreating) {
            await createEmployee(employeeData);
        } else {
            await updateEmployee(editingEmployee.id, employeeData);
        }

        setShowModal(false);
        setEditingEmployee(null);
    };

    const handleToggleActive = async (employee: Employee) => { 
        if (!user) return; 
        const { updateEmployee } = await import('@/lib/dataAccess');
        await updateEmployee(employee.id, { is_active: !employee.is_active }); 
    };

    const handleDelete = async (employee: Employee) => { 
        if (!user) return; 
        if (employee.is_fixed) { 
            alert('Este funcionário é fixo e não pode ser removido.'); 
            return; 
        } 
        if (!confirm('Excluir este funcionário?')) return; 
        const { deleteEmployee } = await import('@/lib/dataAccess');
        await deleteEmployee(employee.id); 
    };
    const openEdit = (employee: Employee) => { setEditingEmployee(employee); setShowModal(true); };
    const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[4];

    const regularEmployees = employees.filter((e: Employee) => !e.is_fixed);
    const fixedEmployees = employees.filter((e: Employee) => e.is_fixed);
    const stats = { 
        total: regularEmployees.length, 
        active: regularEmployees.filter((e: Employee) => e.is_active).length, 
        byRole: ROLES.map(r => ({ ...r, count: employees.filter((e: Employee) => e.role === r.value).length })) 
    };

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="flex justify-between items-start mb-8 gap-5 max-md:flex-col">
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
                                    <div className="flex gap-2 w-full md:w-auto justify-end mt-2 md:mt-0"><button className="p-2 bg-transparent border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:text-primary hover:border-primary" onClick={() => window.location.href = `/funcionarios/${employee.id}`} title="Painel de Ganhos">📊</button><button className="p-2 bg-transparent border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:text-text-primary hover:border-border-light" onClick={() => openEdit(employee)} title={employee.is_fixed ? 'Alterar PIN' : 'Editar'}><FiEdit2 /></button>{!employee.is_fixed && <button className="p-2 bg-transparent border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:text-error hover:border-error" onClick={() => handleDelete(employee)}><FiTrash2 /></button>}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Unified Employee Modal */}
            <EditEmployeeSheet 
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                employee={editingEmployee as unknown as EmployeeData}
                onSave={handleSave}
            />

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
