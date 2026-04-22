"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiLock, FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/utils';

// Employee Data Type without mocks
export interface EmployeeData {
    id?: string;
    name: string;
    role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'attendant' | 'delivery' | string;
    is_fixed?: boolean;
    is_active: boolean;
    email?: string | null;
    phone?: string | null;
    pin_code?: string | null;
    hourly_rate?: number | null;
    salario_fixo?: number | null;
    cpf?: string | null;
    data_nascimento?: string | null;
    turno?: string | null;
    departamento?: string | null;
    contrato?: string | null;
    created_at?: string;
}

interface EditEmployeeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    employee?: EmployeeData | null;
    onSave: (updatedData: EmployeeData) => Promise<void>;
    title?: string;
}

const ROLES = [
    { value: 'admin', label: 'Administrador', icon: '👑', color: '#9b59b6' },
    { value: 'manager', label: 'Gerente', icon: '📋', color: '#3498db' },
    { value: 'cashier', label: 'Caixa', icon: '💵', color: '#27ae60' },
    { value: 'kitchen', label: 'Cozinha', icon: '👨‍🍳', color: '#e67e22' },
    { value: 'attendant', label: 'Atendente', icon: '🧑‍💼', color: '#1abc9c' },
    { value: 'delivery', label: 'Entregador', icon: '🚴', color: '#e74c3c' }
];

export default function EditEmployeeSheet({ isOpen, onClose, employee, onSave, title }: EditEmployeeSheetProps) {
    const [formData, setFormData] = useState<EmployeeData>({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        data_nascimento: '',
        turno: '',
        departamento: '',
        contrato: '',
        role: 'attendant',
        pin_code: '',
        hourly_rate: 0,
        salario_fixo: 0,
        is_active: true,
    });

    const [isSaving, setIsSaving] = useState(false);

    // Sync form data when employee prop changes
    useEffect(() => {
        if (isOpen) {
            if (employee) {
                setFormData({
                    ...employee,
                    name: employee.name || '',
                    email: employee.email || '',
                    phone: employee.phone || '',
                    cpf: employee.cpf || '',
                    data_nascimento: employee.data_nascimento || '',
                    turno: employee.turno || '',
                    departamento: employee.departamento || '',
                    contrato: employee.contrato || '',
                    role: employee.role || 'attendant',
                    pin_code: employee.pin_code || '',
                    hourly_rate: employee.hourly_rate || 0,
                    salario_fixo: employee.salario_fixo || 0,
                    is_active: employee.is_active ?? true,
                });
            } else {
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    cpf: '',
                    data_nascimento: '',
                    turno: '',
                    departamento: '',
                    contrato: '',
                    role: 'attendant',
                    pin_code: '',
                    hourly_rate: 0,
                    salario_fixo: 0,
                    is_active: true,
                });
            }
        }
    }, [employee, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const generatePin = () => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        setFormData(prev => ({ ...prev, pin_code: pin }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving employee:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-[500px] bg-bg-card max-h-[90vh] overflow-hidden border border-border shadow-2xl rounded-xl flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-white">{title || (employee ? 'Editar Perfil' : 'Novo Funcionário')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Nome Completo</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        {employee?.is_fixed && (
                            <div className="bg-primary/10 border border-primary/30 rounded-md p-3 flex items-center gap-2.5 text-sm text-primary">
                                <FiLock size={16} />
                                <span>Este é um funcionário fixo. Apenas o PIN pode ser alterado.</span>
                            </div>
                        )}

                        {!employee?.is_fixed && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text-secondary">CPF</label>
                                        <input
                                            type="text"
                                            name="cpf"
                                            value={formData.cpf || ''}
                                            onChange={handleChange}
                                            placeholder="000.000.000-00"
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text-secondary">Data Nascimento</label>
                                        <input
                                            type="text"
                                            name="data_nascimento"
                                            value={formData.data_nascimento || ''}
                                            onChange={handleChange}
                                            placeholder="DD/MM/AAAA"
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">E-mail</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Telefone / WhatsApp</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">PIN de Acesso</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        name="pin_code"
                                        value={formData.pin_code || ''}
                                        onChange={handleChange}
                                        placeholder="4 dígitos"
                                        maxLength={6}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                    <Button variant="outline" size="sm" onClick={generatePin} type="button">
                                        Gerar
                                    </Button>
                                </div>
                            </div>
                            {!employee?.is_fixed && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Valor por Hora (R$)</label>
                                    <input
                                        type="number"
                                        name="hourly_rate"
                                        value={formData.hourly_rate || 0}
                                        onChange={handleChange}
                                        min={0}
                                        step={0.01}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        {!employee?.is_fixed && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">Salário Fixo / Base (R$)</label>
                                <input
                                    type="number"
                                    name="salario_fixo"
                                    value={formData.salario_fixo || 0}
                                    onChange={handleChange}
                                    min={0}
                                    step={0.01}
                                    placeholder="0.00"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                />
                            </div>
                        )}

                        <div className="pt-4 pb-2">
                            <h3 className="text-white font-medium border-b border-border pb-2">Profissional</h3>
                        </div>

                        {!employee?.is_fixed && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Cargo</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ROLES.map(role => (
                                            <button
                                                key={role.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: role.value })}
                                                className={cn(
                                                    'p-3 bg-bg-tertiary border-2 border-border rounded-xl cursor-pointer transition-all duration-fast flex flex-col items-center gap-1',
                                                    formData.role === role.value && 'border-primary bg-primary/10'
                                                )}
                                                style={{ borderColor: formData.role === role.value ? role.color : undefined }}
                                            >
                                                <span className="text-xl">{role.icon}</span>
                                                <span className="text-[10px] uppercase font-bold text-text-secondary">{role.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Turno</label>
                                    <input
                                        type="text"
                                        name="turno"
                                        value={formData.turno || ''}
                                        onChange={handleChange}
                                        placeholder="Ex: 16h as 00h (Noturno)"
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Departamento</label>
                                    <input
                                        type="text"
                                        name="departamento"
                                        value={formData.departamento || ''}
                                        onChange={handleChange}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Tipo de Contrato</label>
                                    <input
                                        type="text"
                                        name="contrato"
                                        value={formData.contrato || ''}
                                        onChange={handleChange}
                                        placeholder="Ex: Diarista, CLT..."
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>
                            </>
                        )}
                    </form>
                </div>

                <div className="p-4 sm:p-6 border-t border-border bg-bg-card">
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 border border-border bg-transparent text-white hover:bg-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            form="edit-employee-form"
                            variant="primary"
                            className="flex-1 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                            isLoading={isSaving}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null;
}
