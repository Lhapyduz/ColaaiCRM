'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { StorageIndicator } from "@/components/ui/StorageIndicator";

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SubscriptionProvider>
            <OfflineProvider>
                <EmployeeProvider>
                    <KeyboardShortcutsProvider>
                        <MainLayout>
                            {children}
                            <StorageIndicator />
                        </MainLayout>
                    </KeyboardShortcutsProvider>
                </EmployeeProvider>
            </OfflineProvider>
        </SubscriptionProvider>
    );
}
