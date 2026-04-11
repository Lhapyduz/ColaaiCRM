// Offline Storage Utility
// Uses Dexie wrapper for IndexedDB to store data for offline access

import { getDb, db } from './db';
import { supabase } from './supabase';
import type {
    CachedProduct, CachedCategory, CachedOrder, CachedUserSetting, 
    CachedClient, CachedTable, CachedEmployee, CachedMesaSession, 
    CachedMesaSessionItem, CachedLoyaltyReward, CachedLoyaltySettings, 
    CachedCoupon, CachedAppSetting, CachedProductAddon, CachedAddonGroup, 
    CachedProductAddonGroup, CachedAddonGroupItem, CachedBill, CachedBillCategory,
    PendingAction, StoreName
} from '@/types/db';

// Re-export types from central module (type-only)
export type { StoreName };

/**
 * Initialize IndexedDB database
 */
export async function initOfflineDB() {
    try {
        return getDb();
    } catch (err) {
        console.error('[offlineStorage] Failed to initialize DB:', err);
        throw err;
    }
}

/**
 * Get all items from a store
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
    try {
        return await db.table(storeName).toArray() as T[];
    } catch (err) {
        console.error(`[offlineStorage] Error getAll from ${storeName}:`, err);
        return [];
    }
}

/**
 * Get single item by key
 */
export async function getItem<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    try {
        return await db.table(storeName).get(key) as T | undefined;
    } catch (err) {
        console.error(`[offlineStorage] Error getItem from ${storeName} [${key}]:`, err);
        return undefined;
    }
}

/**
 * Save item to store
 */
export async function saveItem<T>(storeName: StoreName, item: T): Promise<void> {
    try {
        await db.table(storeName).put(item);
    } catch (err) {
        console.error(`[offlineStorage] Error saveItem to ${storeName}:`, err);
        throw err;
    }
}

/**
 * Save multiple items to store
 */
export async function saveAll<T>(storeName: StoreName, items: T[]): Promise<void> {
    try {
        await db.table(storeName).bulkPut(items);
    } catch (err) {
        console.error(`[offlineStorage] Error saveAll to ${storeName}:`, err);
        throw err;
    }
}

/**
 * Delete item from store
 */
export async function deleteItem(storeName: StoreName, key: string): Promise<void> {
    try {
        await db.table(storeName).delete(key);
    } catch (err) {
        console.error(`[offlineStorage] Error deleteItem from ${storeName} [${key}]:`, err);
        throw err;
    }
}

/**
 * Clear all items from store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
    try {
        await db.table(storeName).clear();
    } catch (err) {
        console.error(`[offlineStorage] Error clearStore ${storeName}:`, err);
        throw err;
    }
}

/**
 * Add a pending action for sync
 */
export async function addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<void> {
    try {
        const pendingAction: PendingAction = {
            ...action,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        await db.pendingActions.put(pendingAction);
    } catch (err) {
        console.error('[offlineStorage] Error addPendingAction:', err);
        throw err;
    }
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
    try {
        return await db.pendingActions.orderBy('timestamp').toArray();
    } catch (err) {
        console.error('[offlineStorage] Error getPendingActions:', err);
        return [];
    }
}

/**
 * Remove a pending action after successful sync
 */
export async function removePendingAction(id: string): Promise<void> {
    try {
        await db.pendingActions.delete(id);
    } catch (err) {
        console.error(`[offlineStorage] Error removePendingAction [${id}]:`, err);
        throw err;
    }
}

/**
 * Remove multiple pending actions after successful sync
 */
export async function removePendingActions(ids: string[]): Promise<void> {
    try {
        await db.pendingActions.bulkDelete(ids);
    } catch (err) {
        console.error('[offlineStorage] Error removePendingActions:', err);
        throw err;
    }
}

/**
 * Check if we're online (hardware level)
 */
export function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Robust connectivity check (pings Supabase)
 * This helps bypass false positives from navigator.onLine caused by blockers.
 */
export async function checkConnectivity(): Promise<boolean> {
    if (!isOnline()) return false;
    try {
        // Use a lightweight request to check if we can reach Supabase
        const { error, status } = await supabase.from('products').select('id', { count: 'exact', head: true }).limit(1);
        // Status 0 means network failure/blocked by client
        if (status === 0) return false;
        // 503 Service Unavailable
        if (status === 503) return false;
        return true;
    } catch {
        return false;
    }
}

/**
 * Listen for online/offline events
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => { };

    const handleOnline = async () => {
        const reallyOnline = await checkConnectivity();
        callback(reallyOnline);
    };
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also periodic check
    const interval = setInterval(async () => {
        if (navigator.onLine) {
            const reallyOnline = await checkConnectivity();
            callback(reallyOnline);
        } else {
            callback(false);
        }
    }, 30000);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
    };
}
