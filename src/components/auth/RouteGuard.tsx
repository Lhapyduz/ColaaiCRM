'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import SubscriptionExpiredScreen from '@/components/subscription/SubscriptionExpiredScreen';

// Define which permission is required for each route
export const ROUTE_PERMISSIONS: Record<string, string> = {
    '/dashboard': 'orders',
    '/pedidos': 'orders',
    '/cozinha': 'orders',
    '/entregas': 'orders',
    '/produtos': 'products',
    '/adicionais': 'products',
    '/categorias': 'categories',
    '/estoque': 'products',
    '/clientes': 'customers',
    '/fidelidade': 'customers',
    '/cupons': 'customers',
    '/relatorios': 'reports',
    '/historico': 'reports',
    '/caixa': 'finance',
    '/fluxo-caixa': 'finance',
    '/contas': 'finance',
    '/configuracoes': 'settings',
    '/funcionarios': 'employees',
};

// Routes that specific roles can access
export const ROLE_SPECIFIC_ROUTES: Record<string, string[]> = {
    '/cozinha': ['admin', 'manager', 'kitchen'],
    '/entregas': ['admin', 'manager', 'delivery'],
};

// Routes that are allowed even when subscription is expired
const ALLOWED_WHEN_EXPIRED = ['/assinatura', '/login', '/registro'];

interface RouteGuardProps {
    children: ReactNode;
    requiredPermission?: string;
    pathname: string;
}

export default function RouteGuard({ children, requiredPermission, pathname }: RouteGuardProps) {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { activeEmployee, hasPermission, isLocked, loading: employeeLoading } = useEmployee();
    const { isBlocked, loading: subscriptionLoading } = useSubscription();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    const isPathAllowedWhenExpired = ALLOWED_WHEN_EXPIRED.some(route => pathname.startsWith(route));

    useEffect(() => {
        if (authLoading || employeeLoading) return;

        if (!user) {
            router.replace('/login');
            return;
        }

        if (isLocked) {
            setChecking(false);
            setAuthorized(false);
            return;
        }

        const permission = requiredPermission || ROUTE_PERMISSIONS[pathname];

        if (!permission) {
            setAuthorized(true);
            setChecking(false);
            return;
        }

        if (!activeEmployee) {
            setAuthorized(true);
            setChecking(false);
            return;
        }

        const roleSpecific = ROLE_SPECIFIC_ROUTES[pathname];
        if (roleSpecific) {
            if (roleSpecific.includes(activeEmployee.role)) {
                setAuthorized(true);
                setChecking(false);
                return;
            }
        }

        const canAccess = hasPermission(permission);
        setAuthorized(canAccess);
        setChecking(false);

    }, [user, authLoading, employeeLoading, activeEmployee, isLocked, pathname, requiredPermission, hasPermission, router]);

    // Still loading
    if (authLoading || employeeLoading || subscriptionLoading || checking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-text-secondary">
                <div className="w-10 h-10 border-[3px] border-border border-t-primary rounded-full animate-spin" />
                <p>Verificando permissões...</p>
            </div>
        );
    }

    // Check subscription expiration
    if (user && isBlocked && !isPathAllowedWhenExpired) {
        return <SubscriptionExpiredScreen />;
    }

    // Locked screen
    if (isLocked) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] p-8">
                <div className="text-center max-w-[400px] p-12 bg-bg-card rounded-2xl border border-border shadow-lg">
                    <span className="text-[4rem] block mb-6">🔒</span>
                    <h2 className="m-0 mb-2 text-2xl text-text-primary">Tela Bloqueada</h2>
                    <p className="m-0 text-text-secondary">Faça login com seu PIN para continuar.</p>
                </div>
            </div>
        );
    }

    // Not authorized
    if (!authorized) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] p-8">
                <div className="text-center max-w-[400px] p-12 bg-bg-card rounded-2xl border border-border shadow-lg">
                    <span className="text-[4rem] block mb-6">🚫</span>
                    <h2 className="m-0 mb-2 text-2xl text-text-primary">Acesso Negado</h2>
                    <p className="m-0 mb-2 text-text-secondary">Você não tem permissão para acessar esta página.</p>
                    <p className="mt-4 px-3 py-3 bg-bg-tertiary rounded-lg text-[0.9rem]">
                        Seu cargo: <strong className="text-primary">{getRoleLabel(activeEmployee?.role)}</strong>
                    </p>
                    <button
                        className="mt-6 px-6 py-3 bg-primary text-white border-none rounded-lg text-base font-medium cursor-pointer transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
                        onClick={() => router.push('/pedidos')}
                    >
                        Voltar para Pedidos
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

// Helper to get role label
function getRoleLabel(role?: string): string {
    const labels: Record<string, string> = {
        admin: 'Administrador',
        manager: 'Gerente',
        cashier: 'Caixa',
        kitchen: 'Cozinha',
        attendant: 'Atendente',
        delivery: 'Entregador'
    };
    return labels[role || ''] || 'Desconhecido';
}
