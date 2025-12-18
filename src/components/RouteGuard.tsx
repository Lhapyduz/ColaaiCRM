'use client';

import { useEffect, useState } from 'react';
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
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // 1. If loading, do nothing yet
        if (loading) return;

        // 2. If no active employee (Owner/Supervisor mode or just logged out), grant full access
        // The requirement implies blocking "employees" specifically. 
        // Usually "Owner" isn't an employee role but the absence of one in this context (auth via Supabase User).
        if (!activeEmployee) {
            setAuthorized(true);
            return;
        }

        const role = activeEmployee.role;

        // 3. Admin has access to everything
        if (role === 'admin') {
            setAuthorized(true);
            return;
        }

        // 4. Check specific route permissions
        // Find the most specific rule that matches the start of the pathname
        // e.g. /configuracoes/geral matches /configuracoes
        let matchedRule = null;
        let restrictedPath = null;

        for (const [path, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
            if (pathname.startsWith(path)) {
                // Keep the longest match to be specific (though currently they are top level)
                if (!restrictedPath || path.length > restrictedPath.length) {
                    restrictedPath = path;
                    matchedRule = allowedRoles;
                }
            }
        }

        // If route is not in our restricted list, allow it (e.g. public pages, login, or undefined routes)
        if (!matchedRule) {
            setAuthorized(true);
            return;
        }

        // 5. Check if role is allowed
        if (matchedRule.includes(role)) {
            setAuthorized(true);
        } else {
            // Access Denied
            setAuthorized(false);
            // Redirect to their safe home
            const redirectTarget = ROLE_REDIRECTS[role] || '/';
            console.warn(`Access denied for role ${role} at ${pathname}. Redirecting to ${redirectTarget}`);
            router.push(redirectTarget);
        }

    }, [pathname, activeEmployee, loading, router]);

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
