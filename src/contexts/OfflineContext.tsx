'use client';

import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { initOfflineDB, onNetworkChange, isOnline, getPendingActions, checkConnectivity } from '@/lib/offlineStorage';
import { syncPendingActions, cacheDataForOffline, updateLastSync } from '@/lib/offlineSync';
import { useStorageStore, type StorageMode } from '@/stores/useStorageStore';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

export type { StorageMode };

interface OfflineContextType {
    hardwareOnline: boolean;     // Se o dispositivo tem internet física
    storageMode: StorageMode;    // Se o usuário escolheu forçar local
    setStorageMode: (mode: StorageMode) => void;
    isEffectivelyOnline: boolean; // hardwareOnline === true e storageMode === 'cloud'

    pendingCount: number;
    syncing: boolean;
    lastSync: string | null;
    syncNow: () => Promise<void>;
    refreshCache: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    // ─── Estado vindo do Zustand ─────────────────────
    const hardwareOnline = useStorageStore((s) => s.hardwareOnline);
    const storageMode = useStorageStore((s) => s.storageMode);
    const pendingCount = useStorageStore((s) => s.pendingChangesCount);
    const syncing = useStorageStore((s) => s.syncing);
    const lastSync = useStorageStore((s) => s.lastSyncedAt);

    const setStorageMode = useStorageStore((s) => s.setStorageMode);
    const setHardwareOnline = useStorageStore((s) => s.setHardwareOnline);
    const setSyncing = useStorageStore((s) => s.setSyncing);

    const isEffectivelyOnline = hardwareOnline && storageMode === 'cloud';

    const updatePendingCount = useCallback(async () => {
        try {
            const actions = await getPendingActions();
            useStorageStore.setState({ pendingChangesCount: actions.length });
        } catch {
            // Silently fail if DB not ready
        }
    }, []);

    const syncNow = useCallback(async () => {
        // Só sync se houver internet de fato
        if (!hardwareOnline || syncing) return;

        setSyncing(true);
        try {
            const result = await syncPendingActions();
            if (result.synced > 0) {
                updateLastSync();
                toast.success(`${result.synced} itens sincronizados com a nuvem!`);
            }
            if (result.failed > 0) {
                toast.error(`Falha ao sincronizar ${result.failed} itens.`);
            }

            await updatePendingCount();

            // Note: cacheDataForOffline has its own 5-min cooldown guard,
            // so calling it here won't cause redundant fetches
        } catch (error) {
            console.error('[Offline] Sync failed:', error);
            toast.error('Erro ao sincronizar com servidor.');
        }
        setSyncing(false);
    }, [hardwareOnline, syncing, user, isEffectivelyOnline, updatePendingCount, setSyncing]);

    const refreshCache = useCallback(async () => {
        if (!isEffectivelyOnline || !user) return;
        await cacheDataForOffline(user.id);
    }, [isEffectivelyOnline, user]);

    // Initialize IndexedDB and check status
    useEffect(() => {
        const init = async () => {
            try {
                await initOfflineDB();
            } catch {
                // DB init may fail on very first SSR render attempt
            }
            // Use robust async check
            const isOnlineNow = await checkConnectivity();
            setHardwareOnline(isOnlineNow);
            await updatePendingCount();

            // Restore lastSync from localStorage for backward compat
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('lastSync');
                if (saved && !lastSync) {
                    useStorageStore.getState().setLastSyncedAt(saved);
                }
            }
        };
        init();
    }, [updatePendingCount, setHardwareOnline, lastSync]);

    // Listen for online/offline events
    useEffect(() => {
        const unsubscribe = onNetworkChange(async (isOnlineNow) => {
            setHardwareOnline(isOnlineNow);
            if (isOnlineNow && storageMode === 'cloud' && user) {
                // Auto-sync when coming back online in cloud mode
                await syncNow();
            }
        });
        return unsubscribe;
    }, [user, syncNow, storageMode, setHardwareOnline]);

    // Cache data when user logs in and is online
    useEffect(() => {
        if (user && isEffectivelyOnline) {
            cacheDataForOffline(user.id);
        }
    }, [user, isEffectivelyOnline]);

    return (
        <OfflineContext.Provider value={{
            hardwareOnline,
            storageMode,
            setStorageMode,
            isEffectivelyOnline,
            pendingCount,
            syncing,
            lastSync,
            syncNow,
            refreshCache
        }}>
            {children}
        </OfflineContext.Provider>
    );
}

export function useOffline() {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within OfflineProvider');
    }
    return context;
}
