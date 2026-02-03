'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin';
import { isSuperAdminAuthenticated } from '@/lib/admin-auth';
import { FiLoader } from 'react-icons/fi';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    // Check authentication on mount and route changes
    useEffect(() => {
        // Skip auth check for login page
        if (pathname === '/admin/login') {
            return;
        }

        const authenticated = isSuperAdminAuthenticated();
        setIsAuthenticated(authenticated);

        if (!authenticated) {
            router.replace('/admin/login');
        }
    }, [pathname, router]);

    // Login page has its own layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Show loading while checking auth
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <FiLoader className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    // Not authenticated - will redirect
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <FiLoader className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <AdminSidebar />
            <main className="ml-64 min-h-screen">
                {children}
            </main>
        </div>
    );
}
