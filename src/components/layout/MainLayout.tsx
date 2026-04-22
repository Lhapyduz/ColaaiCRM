'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/utils/utils';
import RouteGuard from '@/components/auth/RouteGuard';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
    const { collapsed, isHydrated } = useSidebar();
    const pathname = usePathname();
    const { loading: authLoading } = useAuth();
    const [showSafetyBanner, setShowSafetyBanner] = useState(false);

    // Show banner if auth took too long (safety fallback active)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (authLoading) setShowSafetyBanner(true);
        }, 10000); // Only show if still loading after 10s
        return () => clearTimeout(timer);
    }, [authLoading]);

    return (
        <div className="flex min-h-screen">
            <a 
                href="#main-content" 
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-dropdown focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
            >
                Pular para o conteúdo
            </a>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {showSafetyBanner && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top duration-500 z-50">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div className="flex flex-col">
                                <span className="text-amber-500 font-medium text-sm">Serviço de Nuvem Instável</span>
                                <span className="text-text-secondary text-xs">Exibindo dados locais. Algumas ações podem ser limitadas.</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowSafetyBanner(false)}
                            className="text-text-muted hover:text-text-primary transition-colors p-1"
                            aria-label="Fechar aviso de instabilidade"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <main 
                    id="main-content"
                    className={cn(
                        "relative flex-1 p-6 bg-bg-primary will-change-[margin-left]",
                        // Only enable transitions after hydration to prevent FOUC
                        isHydrated ? "transition-[margin-left] duration-normal" : "",
                        "max-md:ml-0 max-md:pt-20 max-md:px-4 max-md:pb-4",
                        collapsed ? "ml-sidebar-collapsed" : "ml-sidebar"
                    )}
                >
                    <RouteGuard pathname={pathname}>
                        {children}
                    </RouteGuard>
                </main>
            </div>
        </div>
    );
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { loading, userSettings } = useAuth();
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Safety timeout: if loading takes more than 5s, force continue
    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (loading) {
            timerRef.current = setTimeout(() => {
                setLoadingTimedOut(true);
            }, 5000);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
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
            <div className="flex items-center justify-center min-h-screen bg-bg-primary" role="status" aria-live="polite">
                <div className="flex flex-col items-center gap-4">
                    <span className="text-[4rem] animate-bounce" aria-hidden="true">🌭</span>
                    <p className="text-text-secondary text-lg">Carregando Cola Aí CRM...</p>
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

