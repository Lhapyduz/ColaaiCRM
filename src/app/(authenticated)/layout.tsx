'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MainLayout>
            <PWAInstallPrompt appName="Cola Aí" />
            {children}
        </MainLayout>
    );
}
