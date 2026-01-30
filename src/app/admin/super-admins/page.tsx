'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, StatsCard } from '@/components/admin';
import type { Column } from '@/components/admin';
import { cn } from '@/lib/utils';
import {
    listSuperAdmins,
    createSuperAdmin,
    toggleSuperAdminStatus,
    deleteSuperAdmin,
    type SuperAdminCredential
} from '@/lib/admin-auth';
import {
    FiUsers,
    FiPlus,
    FiTrash2,
    FiToggleLeft,
    FiToggleRight,
    FiX,
    FiEye,
    FiEyeOff,
    FiShield,
    FiUserCheck,
    FiUserX
} from 'react-icons/fi';

export default function SuperAdminsPage() {
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState<SuperAdminCredential[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [createForm, setCreateForm] = useState({
        username: '',
        password: '',
        displayName: ''
    });
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listSuperAdmins();
            setAdmins(data);
        } catch (error) {
            console.error('Error fetching admins:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleCreate = async () => {
        if (!createForm.username || !createForm.password || !createForm.displayName) {
            setCreateError('Preencha todos os campos');
            return;
        }

        if (createForm.password.length < 8) {
            setCreateError('Senha deve ter pelo menos 8 caracteres');
            return;
        }

        setCreating(true);
        setCreateError('');

        const result = await createSuperAdmin(
            createForm.username,
            createForm.password,
            createForm.displayName
        );

        if (result.success) {
            setShowCreateModal(false);
            setCreateForm({ username: '', password: '', displayName: '' });
            fetchAdmins();
        } else {
            setCreateError(result.error || 'Erro ao criar conta');
        }

        setCreating(false);
    };

    const handleToggleStatus = async (admin: SuperAdminCredential) => {
        const success = await toggleSuperAdminStatus(admin.id, !admin.is_active);
        if (success) {
            fetchAdmins();
        }
    };

    const handleDelete = async (id: string) => {
        const success = await deleteSuperAdmin(id);
        if (success) {
            setShowDeleteConfirm(null);
            fetchAdmins();
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const columns: Column<SuperAdminCredential>[] = [
        {
            key: 'display_name',
            header: 'Administrador',
            sortable: true,
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                        <FiShield className="text-white" size={18} />
                    </div>
                    <div>
                        <p className="font-medium text-white">{row.display_name}</p>
                        <p className="text-gray-500 text-xs">@{row.username}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'is_active',
            header: 'Status',
            sortable: true,
            render: (value) => (
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    value
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                )}>
                    {value ? 'Ativo' : 'Inativo'}
                </span>
            )
        },
        {
            key: 'last_login_at',
            header: 'Último Login',
            sortable: true,
            render: (value) => (
                <span className="text-gray-400">{formatDate(value as string | null)}</span>
            )
        },
        {
            key: 'created_at',
            header: 'Criado em',
            sortable: true,
            render: (value) => formatDate(value as string)
        }
    ];

    const renderActions = (row: SuperAdminCredential) => (
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleToggleStatus(row)}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    row.is_active
                        ? "hover:bg-red-500/20 text-red-400"
                        : "hover:bg-emerald-500/20 text-emerald-400"
                )}
                title={row.is_active ? 'Desativar' : 'Ativar'}
            >
                {row.is_active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
            </button>
            <button
                onClick={() => setShowDeleteConfirm(row.id)}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Excluir"
            >
                <FiTrash2 size={18} />
            </button>
        </div>
    );

    const activeCount = admins.filter(a => a.is_active).length;
    const inactiveCount = admins.filter(a => !a.is_active).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Super Administradores</h1>
                    <p className="text-gray-400 mt-1">Gerencie contas de acesso ao painel administrativo</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25"
                >
                    <FiPlus size={18} />
                    Novo Super Admin
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    title="Total de Admins"
                    value={admins.length}
                    icon={<FiUsers size={24} />}
                />
                <StatsCard
                    title="Admins Ativos"
                    value={activeCount}
                    icon={<FiUserCheck size={24} />}
                    variant="success"
                />
                <StatsCard
                    title="Admins Inativos"
                    value={inactiveCount}
                    icon={<FiUserX size={24} />}
                    variant="danger"
                />
            </div>

            {/* Table */}
            <DataTable<SuperAdminCredential>
                data={admins}
                columns={columns}
                keyField="id"
                loading={loading}
                searchPlaceholder="Buscar administradores..."
                actions={renderActions}
            />

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <FiShield className="text-orange-400" />
                                Novo Super Admin
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreateError('');
                                    setCreateForm({ username: '', password: '', displayName: '' });
                                }}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {createError && (
                                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    {createError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nome de Exibição
                                </label>
                                <input
                                    type="text"
                                    value={createForm.displayName}
                                    onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Ex: Gregory Volpi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Ex: gregory"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Senha
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12"
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-gray-700">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreateError('');
                                    setCreateForm({ username: '', password: '', displayName: '' });
                                }}
                                className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="flex-1 px-4 py-3 bg-linear-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
                            >
                                {creating ? 'Criando...' : 'Criar Conta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl p-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiTrash2 className="text-red-400" size={28} />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Excluir Admin?</h3>
                            <p className="text-gray-400 mb-6">
                                Esta ação não pode ser desfeita. O administrador perderá acesso ao sistema.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(showDeleteConfirm)}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
