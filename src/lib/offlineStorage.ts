// Offline Storage Utility
// Uses Dexie wrapper for IndexedDB to store data for offline access

import { db, type PendingAction } from './db';
import type {
    CachedProduct,
    CachedCategory,
    CachedOrder,
    CachedUserSetting,
} from './db';

// Re-export dos tipos para conveniência
export type { CachedProduct, CachedCategory, CachedOrder, CachedUserSetting, PendingAction };

// Tipo helper para stores válidos
export type StoreName = 'products' | 'categories' | 'orders' | 'userSettings' | 'pendingActions';

/**
 * Initialize IndexedDB database
 */
export async function initOfflineDB() {
    // A inicialização no Dexie é automática quando chamado db.open() ou ao interagir com as tabelas.
    return db;
}

/**
 * Get all items from a store
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
    return db.table(storeName).toArray() as Promise<T[]>;
}

/**
 * Get single item by key
 */
export async function getItem<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    return db.table(storeName).get(key) as Promise<T | undefined>;
}

/**
 * Save item to store
 */
export async function saveItem<T>(storeName: StoreName, item: T): Promise<void> {
    await db.table(storeName).put(item);
}

/**
 * Save multiple items to store
 */
export async function saveAll<T>(storeName: StoreName, items: T[]): Promise<void> {
    await db.table(storeName).bulkPut(items);
}

/**
 * Delete item from store
 */
export async function deleteItem(storeName: StoreName, key: string): Promise<void> {
    await db.table(storeName).delete(key);
}

/**
 * Clear all items from store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
    await db.table(storeName).clear();
}

/**
 * Add a pending action for sync
 */
export async function addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<void> {
    const pendingAction: PendingAction = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };
    await db.pendingActions.put(pendingAction);
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
    return db.pendingActions.orderBy('timestamp').toArray();
}

/**
 * Remove a pending action after successful sync
 */
export async function removePendingAction(id: string): Promise<void> {
    await db.pendingActions.delete(id);
}

/**
 * Check if we're online (hardware level)
 */
export function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Listen for online/offline events
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => { };

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}
