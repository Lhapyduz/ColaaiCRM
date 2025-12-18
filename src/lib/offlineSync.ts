// Offline Sync Service
// Handles synchronization between IndexedDB and Supabase

import { supabase } from './supabase';
import {
    getAll,
    saveAll,
    getPendingActions,
    removePendingAction,
    clearStore,
    isOnline
} from './offlineStorage';

interface SyncResult {
    synced: number;
    failed: number;
    errors: string[];
}

/**
 * Cache essential data for offline use
 */
export async function cacheDataForOffline(userId: string): Promise<void> {
    if (!isOnline()) return;

    try {
        // Cache products
        const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId);
        if (products) await saveAll('products', products);

        // Cache categories
        const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId);
        if (categories) await saveAll('categories', categories);

        // Cache recent orders (last 50)
        const { data: orders } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
        if (orders) await saveAll('orders', orders);

        console.log('[Offline] Data cached successfully');
    } catch (error) {
        console.error('[Offline] Failed to cache data:', error);
    }
}

/**
 * Sync pending actions to server
 */
export async function syncPendingActions(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };

    if (!isOnline()) {
        result.errors.push('Sem conexão com a internet');
        return result;
    }

    const pendingActions = await getPendingActions();

    for (const action of pendingActions) {
        try {
            let error = null;

            switch (action.type) {
                case 'create':
                    ({ error } = await supabase
                        .from(action.table)
                        .insert(action.data));
                    break;
                case 'update':
                    ({ error } = await supabase
                        .from(action.table)
                        .update(action.data)
                        .eq('id', action.data.id));
                    break;
                case 'delete':
                    ({ error } = await supabase
                        .from(action.table)
                        .delete()
                        .eq('id', action.data.id));
                    break;
            }

            if (error) {
                result.failed++;
                result.errors.push(`Erro ao sincronizar ${action.table}: ${error.message}`);
            } else {
                await removePendingAction(action.id);
                result.synced++;
            }
        } catch (err) {
            result.failed++;
            result.errors.push(`Erro inesperado: ${err}`);
        }
    }

    return result;
}

/**
 * Get products (from cache if offline)
 */
export async function getProductsOfflineFirst(userId: string) {
    if (isOnline()) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            await saveAll('products', data);
            return data;
        }
    }

    return getAll('products');
}

/**
 * Get categories (from cache if offline)
 */
export async function getCategoriesOfflineFirst(userId: string) {
    if (isOnline()) {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            await saveAll('categories', data);
            return data;
        }
    }

    return getAll('categories');
}

/**
 * Get orders (from cache if offline)
 */
export async function getOrdersOfflineFirst(userId: string) {
    if (isOnline()) {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            await saveAll('orders', data);
            return data;
        }
    }

    return getAll('orders');
}

/**
 * Clear all offline caches
 */
export async function clearOfflineCache(): Promise<void> {
    await clearStore('products');
    await clearStore('categories');
    await clearStore('orders');
    await clearStore('settings');
    await clearStore('pendingActions');
}

/**
 * Get offline status summary
 */
export async function getOfflineStatus() {
    const pendingActions = await getPendingActions();
    const products = await getAll('products');
    const categories = await getAll('categories');
    const orders = await getAll('orders');

    return {
        isOnline: isOnline(),
        pendingActionsCount: pendingActions.length,
        cachedProducts: products.length,
        cachedCategories: categories.length,
        cachedOrders: orders.length,
        lastSync: localStorage.getItem('lastSync') || null
    };
}

/**
 * Update last sync timestamp
 */
export function updateLastSync(): void {
    localStorage.setItem('lastSync', new Date().toISOString());
}
