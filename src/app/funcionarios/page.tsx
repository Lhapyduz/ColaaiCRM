'use client';

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiUser,
    FiUsers,
    FiShield,
    FiPhone,
    FiMail,
    FiToggleLeft,
    FiToggleRight
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { supabase } from '@/lib/supabase';
import { hashPin, validatePinStrength, isLegacyPin } from '@/lib/pinSecurity';
import styles from './page.module.css';

interface Employee {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'attendant' | 'delivery';
    pin_code: string | null;
    is_active: boolean;
    permissions: Record<string, boolean>;
    hourly_rate: number | null;
    created_at: string;
}

const ROLES = [
    { value: 'admin', label: 'Administrador', icon: '👑', color: '#9b59b6' },
    { value: 'manager', label: 'Gerente', icon: '📋', color: '#3498db' },
    { value: 'cashier', label: 'Caixa', icon: '💵', color: '#27ae60' },
    { value: 'kitchen', label: 'Cozinha', icon: '👨‍🍳', color: '#e67e22' },
    { value: 'attendant', label: 'Atendente', icon: '🧑‍💼', color: '#1abc9c' },
    { value: 'delivery', label: 'Entregador', icon: '🚴', color: '#e74c3c' }
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
    admin: {
        orders: true, products: true, categories: true, customers: true,
        reports: true, settings: true, employees: true, finance: true
    },
    manager: {
        orders: true, products: true, categories: true, customers: true,
        reports: true, settings: false, employees: true, finance: true
    },
    cashier: {
        orders: true, products: false, categories: false, customers: true,
        reports: false, settings: false, employees: false, finance: true
    },
    kitchen: {
        orders: true, products: false, categories: false, customers: false,
        reports: false, settings: false, employees: false, finance: false
    },
    attendant: {
        orders: true, products: true, categories: false, customers: true,
        reports: false, settings: false, employees: false, finance: false
    },
    delivery: {
        orders: true, products: false, categories: false, customers: true,
        reports: false, settings: false, employees: false, finance: false
    }
};

export default function FuncionariosPage() {
    const { user } = useAuth();
    const { plan, isWithinLimit, getLimit } = useSubscription();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'attendant' as Employee['role'],
        pin_code: '',
        hourly_rate: 0,
        is_active: true
    });

    useEffect(() => {
        if (user) {
            fetchEmployees();
        }
    }, [user]);

    const fetchEmployees = async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', user.id)
            .order('name');

        if (!error && data) {
            setEmployees(data);
        }
        setLoading(false);
    };

    const handleAddClick = () => {
        if (!isWithinLimit('employees', employees.length)) {
            setShowUpgradeModal(true);
            return;
        }
        resetForm();
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!user) return;

        const employeeData = {
            user_id: user.id,
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            role: form.role,
            pin_code: form.pin_code || null,
            hourly_rate: form.hourly_rate || null,
            is_active: form.is_active,
            permissions: DEFAULT_PERMISSIONS[form.role]
        };

        if (editingEmployee) {
            await supabase.from('employees').update(employeeData).eq('id', editingEmployee.id);
        } else {
            await supabase.from('employees').insert(employeeData);
        }

        setShowModal(false);
        resetForm();
        fetchEmployees();
    };

    const handleToggleActive = async (employee: Employee) => {
        await supabase.from('employees').update({
            is_active: !employee.is_active
        }).eq('id', employee.id);
        fetchEmployees();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este funcionário?')) return;
        await supabase.from('employees').delete().eq('id', id);
        fetchEmployees();
    };

    const resetForm = () => {
        setForm({
            name: '',
            email: '',
            phone: '',
            role: 'attendant',
            pin_code: '',
            hourly_rate: 0,
            is_active: true
        });
        setEditingEmployee(null);
    };

    const openEdit = (employee: Employee) => {
        setEditingEmployee(employee);
        setForm({
            name: employee.name,
            email: employee.email || '',
            phone: employee.phone || '',
            role: employee.role,
            pin_code: employee.pin_code || '',
            hourly_rate: employee.hourly_rate || 0,
            is_active: employee.is_active
        });
        setShowModal(true);
    };

    const getRoleInfo = (role: string) =>
        ROLES.find(r => r.value === role) || ROLES[4];

    const generatePin = () => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        setForm({ ...form, pin_code: pin });
    };

    const stats = {
        total: employees.length,
        active: employees.filter(e => e.is_active).length,
        byRole: ROLES.map(r => ({
            ...r,
            count: employees.filter(e => e.role === r.value).length
        }))
    };

    return (
        <MainLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Funcionários</h1>
                        <p className={styles.subtitle}>
                            Gerencie sua equipe ({employees.length}/{getLimit('employees') === Infinity ? '∞' : getLimit('employees')})
                        </p>
                    </div>
                    <Button leftIcon={<FiPlus />} onClick={handleAddClick}>
                        Novo Funcionário
                    </Button>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <Card className={styles.statCard}>
                        <FiUsers className={styles.statIcon} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{stats.total}</span>
                            <span className={styles.statLabel}>Total</span>
                        </div>
                    </Card>
                    <Card className={`${styles.statCard} ${styles.active}`}>
                        <FiUser className={styles.statIcon} />
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{stats.active}</span>
                            <span className={styles.statLabel}>Ativos</span>
                        </div>
                    </Card>
                    {stats.byRole.filter(r => r.count > 0).slice(0, 2).map(r => (
                        <Card key={r.value} className={styles.statCard}>
                            <span className={styles.roleEmoji}>{r.icon}</span>
                            <div className={styles.statContent}>
                                <span className={styles.statValue}>{r.count}</span>
                                <span className={styles.statLabel}>{r.label}</span>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Employees List */}
                <Card>
                    {loading ? (
                        <div className={styles.loading}>Carregando...</div>
                    ) : employees.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FiUsers size={48} />
                            <h3>Nenhum funcionário cadastrado</h3>
                            <p>Adicione sua equipe para gerenciar permissões</p>
                        </div>
                    ) : (
                        <div className={styles.employeesList}>
                            {employees.map(employee => {
                                const roleInfo = getRoleInfo(employee.role);
                                return (
                                    <div key={employee.id} className={`${styles.employeeRow} ${!employee.is_active ? styles.inactive : ''}`}>
                                        <div className={styles.employeeAvatar} style={{ borderColor: roleInfo.color }}>
                                            <span>{roleInfo.icon}</span>
                                        </div>
                                        <div className={styles.employeeInfo}>
                                            <span className={styles.employeeName}>{employee.name}</span>
                                            <div className={styles.employeeMeta}>
                                                {employee.email && (
                                                    <span><FiMail size={12} /> {employee.email}</span>
                                                )}
                                                {employee.phone && (
                                                    <span><FiPhone size={12} /> {employee.phone}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.employeeRole} style={{ background: `${roleInfo.color}20`, color: roleInfo.color }}>
                                            <FiShield size={12} />
                                            {roleInfo.label}
                                        </div>
                                        <div className={styles.employeeStatus}>
                                            <button
                                                className={`${styles.toggleBtn} ${employee.is_active ? styles.active : ''}`}
                                                onClick={() => handleToggleActive(employee)}
                                                title={employee.is_active ? 'Desativar' : 'Ativar'}
                                            >
                                                {employee.is_active ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
                                            </button>
                                        </div>
                                        <div className={styles.employeeActions}>
                                            <button onClick={() => openEdit(employee)}><FiEdit2 /></button>
                                            <button onClick={() => handleDelete(employee.id)}><FiTrash2 /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* New Employee Modal */}
                {showModal && (
                    <div className={styles.modal}>
                        <div className={styles.modalContent}>
                            <h2>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>

                            <div className={styles.formGroup}>
                                <label>Nome Completo</label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Nome do funcionário"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Email</label>
                                    <Input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Telefone</label>
                                    <Input
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Função</label>
                                <div className={styles.roleGrid}>
                                    {ROLES.map(role => (
                                        <button
                                            key={role.value}
                                            className={`${styles.roleBtn} ${form.role === role.value ? styles.selected : ''}`}
                                            style={{ '--role-color': role.color } as React.CSSProperties}
                                            onClick={() => setForm({ ...form, role: role.value as Employee['role'] })}
                                        >
                                            <span className={styles.roleIcon}>{role.icon}</span>
                                            <span className={styles.roleLabel}>{role.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>PIN de Acesso</label>
                                    <div className={styles.pinInput}>
                                        <Input
                                            value={form.pin_code}
                                            onChange={(e) => setForm({ ...form, pin_code: e.target.value })}
                                            placeholder="4 dígitos"
                                            maxLength={6}
                                        />
                                        <Button variant="outline" size="sm" onClick={generatePin}>
                                            Gerar
                                        </Button>
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Valor por Hora (R$)</label>
                                    <Input
                                        type="number"
                                        value={form.hourly_rate}
                                        onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })}
                                        min={0}
                                        step={0.01}
                                    />
                                </div>
                            </div>

                            <div className={styles.permissionsPreview}>
                                <h4><FiShield /> Permissões do cargo:</h4>
                                <div className={styles.permissionsList}>
                                    {Object.entries(DEFAULT_PERMISSIONS[form.role]).map(([perm, allowed]) => (
                                        <span key={perm} className={allowed ? styles.allowed : styles.denied}>
                                            {allowed ? '✓' : '✗'} {perm}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button onClick={handleSave}>
                                    {editingEmployee ? 'Salvar' : 'Adicionar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upgrade Modal */}
                {showUpgradeModal && (
                    <div className={styles.modal}>
                        <div className={styles.modalContent} style={{ maxWidth: 600 }}>
                            <UpgradePrompt
                                feature="Limite de Funcionários Atingido"
                                requiredPlan={plan === 'Basico' ? 'Avançado' : 'Profissional'}
                                currentPlan={plan}
                            />
                            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <Button variant="ghost" onClick={() => setShowUpgradeModal(false)}>
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
