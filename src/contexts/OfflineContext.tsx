'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { initOfflineDB, onNetworkChange, isOnline, getPendingActions } from '@/lib/offlineStorage';
import { syncPendingActions, cacheDataForOffline, updateLastSync } from '@/lib/offlineSync';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

export type StorageMode = 'cloud' | 'local';

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

    // Estados base
    const [hardwareOnline, setHardwareOnline] = useState(true);
    const [storageMode, setStorageModeState] = useState<StorageMode>('cloud');

    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    const isEffectivelyOnline = hardwareOnline && storageMode === 'cloud';

    const setStorageMode = useCallback((mode: StorageMode) => {
        setStorageModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('storageMode', mode);
        }
    }, []);

    const updatePendingCount = useCallback(async () => {
        const actions = await getPendingActions();
        setPendingCount(actions.length);
    }, []);

    const syncNow = useCallback(async () => {
        // Só sync se houver internet de fato The hardware must be online 
        if (!hardwareOnline || syncing) return;

        setSyncing(true);
        try {
            const result = await syncPendingActions();
            if (result.synced > 0) {
                updateLastSync();
                setLastSync(new Date().toISOString());
                toast.success(`${result.synced} itens sincronizados com a nuvem!`);
            }
            if (result.failed > 0) {
                toast.error(`Falha ao sincronizar ${result.failed} itens.`);
            }

            await updatePendingCount();

            // Refresh cache after sync
            if (user && isEffectivelyOnline) {
                await cacheDataForOffline(user.id);
            }
        } catch (error) {
            console.error('[Offline] Sync failed:', error);
            toast.error('Erro ao sincronizar com servidor.');
        }
        setSyncing(false);
    }, [hardwareOnline, syncing, user, isEffectivelyOnline, updatePendingCount]);

    const refreshCache = useCallback(async () => {
        if (!isEffectivelyOnline || !user) return;
        await cacheDataForOffline(user.id);
    }, [isEffectivelyOnline, user]);

    // Initialize IndexedDB and check status
    useEffect(() => {
        const init = async () => {
            await initOfflineDB();
            setHardwareOnline(isOnline());

            const savedMode = localStorage.getItem('storageMode') as StorageMode;
            if (savedMode === 'local' || savedMode === 'cloud') {
                setStorageModeState(savedMode);
            }

            await updatePendingCount();
            setLastSync(localStorage.getItem('lastSync'));

            // Registra um event listener para mudanças no banco do dexie se outros tabs mudarem,
            // mas de modo simples, criaremos um custom event se quisermos auto-refresh
        };
        init();
    }, [updatePendingCount]);

    // Listen for online/offline events
    useEffect(() => {
        const unsubscribe = onNetworkChange(async (isOnlineNow) => {
            setHardwareOnline(isOnlineNow);
            if (isOnlineNow && storageMode === 'cloud' && user) {
                // Auto-sync when coming back online locally in cloud mode
                await syncNow();
            }
        });
        return unsubscribe;
    }, [user, syncNow, storageMode]);

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
