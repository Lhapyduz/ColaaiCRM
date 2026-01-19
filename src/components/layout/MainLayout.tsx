'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { loading } = useAuth();
    const pathname = usePathname();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-bg-primary">
                <div className="flex flex-col items-center gap-4">
                    <span className="text-[4rem] animate-bounce">🌭</span>
                    <p className="text-text-secondary text-lg">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-sidebar p-6 transition-[margin-left] duration-normal bg-bg-primary max-md:ml-0 max-md:pt-20 max-md:px-4 max-md:pb-4">
                <RouteGuard pathname={pathname}>
                    {children}
                </RouteGuard>
            </main>
        </div>
    );
}
