'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { initOfflineDB, onNetworkChange, isOnline, getPendingActions } from '@/lib/offlineStorage';
import { syncPendingActions, cacheDataForOffline, updateLastSync, getOfflineStatus } from '@/lib/offlineSync';
import { useAuth } from './AuthContext';

interface OfflineContextType {
    online: boolean;
    pendingCount: number;
    syncing: boolean;
    lastSync: string | null;
    syncNow: () => Promise<void>;
    refreshCache: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [online, setOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);



    const updatePendingCount = useCallback(async () => {
        const actions = await getPendingActions();
        setPendingCount(actions.length);
    }, []);

    const syncNow = useCallback(async () => {
        if (!online || syncing) return;

        setSyncing(true);
        try {
            const result = await syncPendingActions();
            if (result.synced > 0) {
                updateLastSync();
                setLastSync(new Date().toISOString());
            }
            await updatePendingCount();

            // Refresh cache after sync
            if (user) {
                await cacheDataForOffline(user.id);
            }
        } catch (error) {
            console.error('[Offline] Sync failed:', error);
        }
        setSyncing(false);
    }, [online, syncing, user, updatePendingCount]);

    const refreshCache = useCallback(async () => {
        if (!online || !user) return;
        await cacheDataForOffline(user.id);
    }, [online, user]);

    // Initialize IndexedDB and check status
    useEffect(() => {
        const init = async () => {
            await initOfflineDB();
            setOnline(isOnline());
            await updatePendingCount();
            setLastSync(localStorage.getItem('lastSync'));
        };
        init();
    }, [updatePendingCount]);

    // Listen for online/offline changes
    useEffect(() => {
        const unsubscribe = onNetworkChange(async (isOnline) => {
            setOnline(isOnline);
            if (isOnline && user) {
                // Auto-sync when coming back online
                await syncNow();
            }
        });
        return unsubscribe;
    }, [user, syncNow]);

    // Cache data when user logs in
    useEffect(() => {
        if (user && online) {
            cacheDataForOffline(user.id);
        }
    }, [user, online]);

    return (
        <OfflineContext.Provider value={{
            online,
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
