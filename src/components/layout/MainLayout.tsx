'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import RouteGuard from '@/components/auth/RouteGuard';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
    const { collapsed, isHydrated } = useSidebar();
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className={cn(
                "flex-1 p-6 bg-bg-primary will-change-[margin-left]",
                // Only enable transitions after hydration to prevent FOUC
                isHydrated ? "transition-[margin-left] duration-normal" : "",
                "max-md:ml-0 max-md:pt-20 max-md:px-4 max-md:pb-4",
                collapsed ? "ml-sidebar-collapsed" : "ml-sidebar"
            )}>
                <RouteGuard pathname={pathname}>
                    {children}
                </RouteGuard>
            </main>
        </div>
    );
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { loading, userSettings } = useAuth();
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);

    // Safety timeout: if loading takes more than 10s, force continue
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setLoadingTimedOut(true);
            }, 10000);
            return () => clearTimeout(timer);
        } else {
            setLoadingTimedOut(false);
        }
    }, [loading]);

    // Apply theme settings
    React.useEffect(() => {
        if (userSettings && typeof document !== 'undefined') {
            const root = document.documentElement;
            if (userSettings.primary_color) {
                root.style.setProperty('--color-primary', userSettings.primary_color);
                root.style.setProperty('--primary', userSettings.primary_color); // Keep for legacy compatibility
            }
            if (userSettings.secondary_color) {
                root.style.setProperty('--color-secondary', userSettings.secondary_color);
            }
            if (userSettings.sidebar_color) {
                root.style.setProperty('--sidebar-bg', userSettings.sidebar_color);
            }
        }
    }, [userSettings]);

    if (loading && !loadingTimedOut) {
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
        <SidebarProvider>
            <MainLayoutContent>{children}</MainLayoutContent>
        </SidebarProvider>
    );
}

