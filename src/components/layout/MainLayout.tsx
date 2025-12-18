'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';
import Sidebar from './Sidebar';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { loading } = useAuth();
    const pathname = usePathname();

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}>
                    <span className={styles.loaderIcon}>🌭</span>
                    <p>Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.main}>
                <RouteGuard pathname={pathname}>
                    {children}
                </RouteGuard>
            </main>
        </div>
    );
}
