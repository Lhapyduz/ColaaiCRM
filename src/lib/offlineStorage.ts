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
 * Get all items from a store
 */
export async function getAll<T>(storeName: string): Promise<T[]> {
    const database = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Get single item by key
 */
export async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
    const database = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Save item to store
 */
export async function saveItem<T>(storeName: string, item: T): Promise<void> {
    const database = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Save multiple items to store
 */
export async function saveAll<T>(storeName: string, items: T[]): Promise<void> {
    const database = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        items.forEach(item => store.put(item));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Delete item from store
 */
export async function deleteItem(storeName: string, key: string): Promise<void> {
    const database = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Clear all items from store
 */
export async function clearStore(storeName: string): Promise<void> {
    const database = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
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
