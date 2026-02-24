// Offline Storage Utility
// Uses IndexedDB to store data for offline access

const DB_NAME = 'ligeirinho-offline';
const DB_VERSION = 1;

interface PendingAction {
    id: string;
    type: 'create' | 'update' | 'delete';
    table: string;
    data: Record<string, unknown>;
    timestamp: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            db = request.result;

            if (db) {
                db.onclose = () => {
                    db = null;
                };
                db.onversionchange = () => {
                    db?.close();
                    db = null;
                };
            }

            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Store for cached data
            if (!database.objectStoreNames.contains('products')) {
                database.createObjectStore('products', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('categories')) {
                database.createObjectStore('categories', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('orders')) {
                const ordersStore = database.createObjectStore('orders', { keyPath: 'id' });
                ordersStore.createIndex('status', 'status', { unique: false });
            }
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }

            // Store for pending sync actions
            if (!database.objectStoreNames.contains('pendingActions')) {
                const pendingStore = database.createObjectStore('pendingActions', { keyPath: 'id' });
                pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

/**
 * Retorna uma transação segura, forçando a reabertura do banco caso esteja fechado.
 */
async function getSafeTransaction(storeName: string, mode: IDBTransactionMode): Promise<{ transaction: IDBTransaction; store: IDBObjectStore }> {
    try {
        const database = await initOfflineDB();
        const transaction = database.transaction(storeName, mode);
        return { transaction, store: transaction.objectStore(storeName) };
    } catch (error) {
        if (error instanceof Error && error.name === 'InvalidStateError') {
            console.warn('[OfflineStorage] Conexão com banco fechada. Reabrindo...');
            db = null; // Força reabertura
            const newDatabase = await initOfflineDB();
            const transaction = newDatabase.transaction(storeName, mode);
            return { transaction, store: transaction.objectStore(storeName) };
        }
        throw error;
    }
}

/**
 * Get all items from a store
 */
export async function getAll<T>(storeName: string): Promise<T[]> {
    return new Promise(async (resolve, reject) => {
        try {
            const { store } = await getSafeTransaction(storeName, 'readonly');
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get single item by key
 */
export async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
    return new Promise(async (resolve, reject) => {
        try {
            const { store } = await getSafeTransaction(storeName, 'readonly');
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Save item to store
 */
export async function saveItem<T>(storeName: string, item: T): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const { store } = await getSafeTransaction(storeName, 'readwrite');
            const request = store.put(item);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Save multiple items to store
 */
export async function saveAll<T>(storeName: string, items: T[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const { transaction, store } = await getSafeTransaction(storeName, 'readwrite');

            items.forEach(item => store.put(item));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Delete item from store
 */
export async function deleteItem(storeName: string, key: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const { store } = await getSafeTransaction(storeName, 'readwrite');
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Clear all items from store
 */
export async function clearStore(storeName: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const { store } = await getSafeTransaction(storeName, 'readwrite');
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        } catch (error) {
            reject(error);
        }
    });
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
    await saveItem('pendingActions', pendingAction);
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
    return getAll<PendingAction>('pendingActions');
}

/**
 * Remove a pending action after successful sync
 */
export async function removePendingAction(id: string): Promise<void> {
    await deleteItem('pendingActions', id);
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}
