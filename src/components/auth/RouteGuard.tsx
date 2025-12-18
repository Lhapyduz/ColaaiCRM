'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './RouteGuard.module.css';

// Define which permission is required for each route
export const ROUTE_PERMISSIONS: Record<string, string> = {
    '/dashboard': 'orders',           // All employees with orders permission
    '/pedidos': 'orders',
    '/cozinha': 'orders',             // Kitchen view
    '/entregas': 'orders',            // Deliveries view
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

// Routes that specific roles can access (override for role-specific pages)
export const ROLE_SPECIFIC_ROUTES: Record<string, string[]> = {
    '/cozinha': ['admin', 'manager', 'kitchen'],
    '/entregas': ['admin', 'manager', 'delivery'],
};

interface RouteGuardProps {
    children: ReactNode;
    requiredPermission?: string;
    pathname: string;
}

export default function RouteGuard({ children, requiredPermission, pathname }: RouteGuardProps) {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { activeEmployee, hasPermission, isLocked, loading: employeeLoading } = useEmployee();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (authLoading || employeeLoading) return;

        // Not logged in at all - redirect to login
        if (!user) {
            router.replace('/login');
            return;
        }

        // Screen is locked
        if (isLocked) {
            setChecking(false);
            setAuthorized(false);
            return;
        }

        // Get required permission for this route
        const permission = requiredPermission || ROUTE_PERMISSIONS[pathname];

        // No permission required for this route
        if (!permission) {
            setAuthorized(true);
            setChecking(false);
            return;
        }

        // If no active employee (owner mode), allow everything
        if (!activeEmployee) {
            setAuthorized(true);
            setChecking(false);
            return;
        }

        // Check role-specific routes first
        const roleSpecific = ROLE_SPECIFIC_ROUTES[pathname];
        if (roleSpecific) {
            if (roleSpecific.includes(activeEmployee.role)) {
                setAuthorized(true);
                setChecking(false);
                return;
            }
        }

        // Check general permission
        const canAccess = hasPermission(permission);
        setAuthorized(canAccess);
        setChecking(false);

    }, [user, authLoading, employeeLoading, activeEmployee, isLocked, pathname, requiredPermission, hasPermission, router]);

    // Still loading
    if (authLoading || employeeLoading || checking) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Verificando permissões...</p>
            </div>
        );
    }

    // Locked screen
    if (isLocked) {
        return (
            <div className={styles.accessDenied}>
                <div className={styles.deniedContent}>
                    <span className={styles.lockIcon}>🔒</span>
                    <h2>Tela Bloqueada</h2>
                    <p>Faça login com seu PIN para continuar.</p>
                </div>
            </div>
        );
    }

    // Not authorized
    if (!authorized) {
        return (
            <div className={styles.accessDenied}>
                <div className={styles.deniedContent}>
                    <span className={styles.deniedIcon}>🚫</span>
                    <h2>Acesso Negado</h2>
                    <p>Você não tem permissão para acessar esta página.</p>
                    <p className={styles.roleInfo}>
                        Seu cargo: <strong>{getRoleLabel(activeEmployee?.role)}</strong>
                    </p>
                    <button
                        className={styles.backButton}
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
