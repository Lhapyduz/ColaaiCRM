'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useEmployee } from '@/contexts/EmployeeContext';

// Define role types to match EmployeeContext
type Role = 'admin' | 'manager' | 'cashier' | 'kitchen' | 'attendant' | 'delivery';

// Permission Matrix
// Maps URL prefixes to allowed roles
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
    '/dashboard': ['admin', 'manager'],
    '/configuracoes': ['admin'],
    '/funcionarios': ['admin'],
    '/relatorios': ['admin', 'manager'],
    '/estoque': ['admin', 'manager'],
    '/caixa': ['admin', 'manager', 'cashier'],
    '/pedidos': ['admin', 'manager', 'cashier', 'attendant'],
    '/cozinha': ['admin', 'manager', 'kitchen'],
    '/entregas': ['admin', 'manager', 'delivery'],
    '/menu': ['admin', 'manager', 'cashier', 'attendant'], // Assuming menu management/viewing
};

// Default redirect paths for each role if they try to access a restricted page
const ROLE_REDIRECTS: Record<Role, string> = {
    admin: '/dashboard',
    manager: '/dashboard',
    cashier: '/caixa',
    kitchen: '/cozinha',
    attendant: '/pedidos',
    delivery: '/entregas'
};

export function RouteGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { activeEmployee, loading } = useEmployee();


    // Derived state
    const checkAuthorization = () => {
        if (loading) return false;
        if (!activeEmployee) return true;
        if (activeEmployee.role === 'admin') return true;

        let matchedRule = null;
        let restrictedPath = null;

        for (const [path, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
            if (pathname.startsWith(path)) {
                if (!restrictedPath || path.length > restrictedPath.length) {
                    restrictedPath = path;
                    matchedRule = allowedRoles;
                }
            }
        }

        if (!matchedRule) return true;
        return matchedRule.includes(activeEmployee.role);
    };

    const authorized = checkAuthorization();

    useEffect(() => {
        if (loading) return;

        if (!authorized && activeEmployee) {
            const role = activeEmployee.role;
            const redirectTarget = ROLE_REDIRECTS[role] || '/';
            console.warn(`Access denied for role ${role} at ${pathname}. Redirecting to ${redirectTarget}`);
            router.push(redirectTarget);
        }
    }, [pathname, activeEmployee, loading, router, authorized]);

    // If loading or checking authorization, you might want to show a spinner or nothing
    // For better UX during redirects, showing nothing or a skeleton is preferred to prevent flash of content
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>;
    }

    // If unauthorized (and waiting for redirect), hide content
    if (!authorized && activeEmployee) {
        // Return null while redirecting to avoid flashing protected content
        return null;
    }

    return <>{children}</>;
}
