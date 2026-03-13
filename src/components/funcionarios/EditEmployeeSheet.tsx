"use client";

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';

// Employee Data Type without mocks
export interface EmployeeData {
    id: string;
    name: string;
    role: string;
    is_fixed: boolean;
    is_active: boolean;
    email?: string;
    phone?: string;
    created_at: string;
    salario_fixo?: number;
    cpf?: string;
    data_nascimento?: string;
    turno?: string;
    departamento?: string;
    contrato?: string;
}

interface EditEmployeeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    employee: EmployeeData;
    onSave: (updatedData: Partial<EmployeeData>) => Promise<void>;
}

export default function EditEmployeeSheet({ isOpen, onClose, employee, onSave }: EditEmployeeSheetProps) {
    const [formData, setFormData] = useState<Partial<EmployeeData>>({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        cpf: employee.cpf || '',
        data_nascimento: employee.data_nascimento || '',
        turno: employee.turno || '',
        departamento: employee.departamento || '',
        contrato: employee.contrato || '',
        role: employee.role || '',
    });

    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-md bg-[#1e1e24] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">CPF</label>
                                <input
                                    type="text"
                                    name="cpf"
                                    value={formData.cpf}
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
                                    value={formData.data_nascimento}
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
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Telefone / WhatsApp</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="pt-4 pb-2">
                            <h3 className="text-white font-medium border-b border-border pb-2">Profissional</h3>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Cargo</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            >
                                <option value="admin">Administrador</option>
                                <option value="manager">Gerente</option>
                                <option value="cashier">Caixa</option>
                                <option value="garcom">Garçom / Atendente</option>
                                <option value="kitchen">Cozinha / Chapeiro</option>
                                <option value="delivery">Motoboy / Entregador</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Turno</label>
                            <input
                                type="text"
                                name="turno"
                                value={formData.turno}
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
                                value={formData.departamento}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Tipo de Contrato</label>
                            <input
                                type="text"
                                name="contrato"
                                value={formData.contrato}
                                onChange={handleChange}
                                placeholder="Ex: Diarista, CLT..."
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-border bg-[#1e1e24]">
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
}
