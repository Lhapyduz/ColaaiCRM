'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiShield, FiUser, FiLock, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { validateCredentials, setSuperAdminSession, isSuperAdminAuthenticated } from '@/lib/admin-auth';
import { cn } from '@/lib/utils';

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Check if already authenticated
    useEffect(() => {
        if (isSuperAdminAuthenticated()) {
            router.replace('/admin/dashboard');
        } else {
            setCheckingAuth(false);
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await validateCredentials(username, password);

            if (result.success && result.session) {
                setSuperAdminSession(result.session);
                router.replace('/admin/dashboard');
            } else {
                setError(result.error || 'Erro ao fazer login');
            }
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <FiLoader className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/10 via-transparent to-red-500/10" />

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                <div className="bg-linear-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4">
                            <FiShield className="text-white" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Super Admin</h1>
                        <p className="text-gray-400 text-sm mt-1">Acesso restrito ao backoffice</p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                            <FiAlertCircle className="text-red-400 shrink-0" size={20} />
                            <span className="text-red-400 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                                Usuário
                            </label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={cn(
                                        "w-full pl-10 pr-4 py-3 bg-gray-900/50 border rounded-lg",
                                        "text-white placeholder-gray-500",
                                        "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500",
                                        "transition-all duration-200",
                                        error ? "border-red-500/50" : "border-gray-700"
                                    )}
                                    placeholder="Digite seu usuário"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={cn(
                                        "w-full pl-10 pr-4 py-3 bg-gray-900/50 border rounded-lg",
                                        "text-white placeholder-gray-500",
                                        "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500",
                                        "transition-all duration-200",
                                        error ? "border-red-500/50" : "border-gray-700"
                                    )}
                                    placeholder="Digite sua senha"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className={cn(
                                "w-full py-3 rounded-lg font-semibold transition-all duration-200",
                                "bg-linear-to-r from-orange-500 to-red-500 text-white",
                                "hover:from-orange-600 hover:to-red-600",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "flex items-center justify-center gap-2"
                            )}
                        >
                            {loading ? (
                                <>
                                    <FiLoader className="animate-spin" size={18} />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    <FiShield size={18} />
                                    Entrar no Painel
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
                        <p className="text-gray-500 text-xs">
                            Acesso restrito a administradores autorizados
                        </p>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 text-xs">
                    <FiLock size={12} />
                    <span>Conexão segura</span>
                </div>
            </div>
        </div>
    );
}
