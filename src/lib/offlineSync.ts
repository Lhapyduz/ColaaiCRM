// Offline Sync Service
// Handles synchronization between IndexedDB and Supabase
// Uses batch upserts for efficiency and Zustand for state

import { supabase } from './supabase';
import {
    getAll,
    saveAll,
    getPendingActions,
    removePendingActions,
    clearStore,
    isOnline,
} from './offlineStorage';
import { useStorageStore } from '@/stores/useStorageStore';
import type { CachedProduct, CachedCategory, CachedOrder, PendingAction } from './db';

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
 * Group pending actions by table and type for batch processing
 */
function groupActions(actions: PendingAction[]) {
    const groups: Record<string, Record<string, PendingAction[]>> = {};

    for (const action of actions) {
        if (!groups[action.table]) groups[action.table] = {};
        if (!groups[action.table][action.type]) groups[action.table][action.type] = [];
        groups[action.table][action.type].push(action);
    }

    return groups;
}

/**
 * Sync pending actions to server using batch upserts
 */
export async function syncPendingActions(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };
    const store = useStorageStore.getState();

    if (!isOnline()) {
        result.errors.push('Sem conexão com a internet');
        return result;
    }

    const pendingActions = await getPendingActions();
    if (pendingActions.length === 0) return result;

    const groups = groupActions(pendingActions);
    const syncedIds: string[] = [];

    for (const [table, types] of Object.entries(groups)) {
        // Handle complex full POS orders specially
        const fullOrderActions = types['create_full_order'] || [];
        if (fullOrderActions.length > 0) {
            for (const action of fullOrderActions) {
                try {
                    const { orderData, orderItems, itemAddons, loyaltyData, couponData } = action.data;
                    
                    const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select().single();
                    if (orderError) throw orderError;

                    if (orderItems && orderItems.length > 0) {
                        const mappedItems = orderItems.map((item: any) => ({ ...item, order_id: order.id }));
                        const { data: insertedItems, error: itemsError } = await supabase.from('order_items').insert(mappedItems).select('id');
                        if (itemsError) throw itemsError;

                        if (insertedItems && itemAddons && itemAddons.length > 0) {
                            const mappedAddons = [];
                            let itemIndex = 0;
                            for (const addon of itemAddons) {
                                if (addon.itemIndex !== undefined) itemIndex = addon.itemIndex;
                                mappedAddons.push({
                                    ...addon,
                                    order_item_id: insertedItems[itemIndex]?.id
                                });
                            }
                            const cleanAddons = mappedAddons.map(({ itemIndex, ...rest }) => rest);
                            if (cleanAddons.length > 0) {
                                await supabase.from('order_item_addons').insert(cleanAddons);
                            }
                        }
                    }

                    if (couponData && couponData.appliedCoupon) {
                        try {
                            const { data: cData } = await supabase.from('coupons').select('usage_count').eq('id', couponData.appliedCoupon.id).single();
                            if (cData) {
                                await supabase.from('coupons').update({ usage_count: (cData.usage_count || 0) + 1 }).eq('id', couponData.appliedCoupon.id);
                            }
                            await supabase.from('coupon_usage').insert({
                                coupon_id: couponData.appliedCoupon.id,
                                order_id: order.id,
                                customer_phone: couponData.customerPhone || null,
                                discount_applied: couponData.discount
                            });
                        } catch (err) { console.warn('Coupon usage tracking failed syncing:', err); }
                    }

                    if (loyaltyData) {
                        try {
                            if (loyaltyData.customer) {
                                if (loyaltyData.pointsEarned > 0) {
                                    await supabase.from('points_transactions').insert({
                                        user_id: loyaltyData.customer.user_id,
                                        customer_id: loyaltyData.customer.id,
                                        points: loyaltyData.pointsEarned,
                                        type: 'earned',
                                        description: `Pedido #${orderData.order_number}`,
                                        order_id: order.id
                                    });
                                }
                                await supabase.from('customers').update(loyaltyData.updateData).eq('id', loyaltyData.customer.id);
                            } else if (loyaltyData.newCustomer) {
                                await supabase.from('customers').insert(loyaltyData.newCustomer);
                            }
                        } catch (err) { console.warn('Loyalty tracking failed syncing:', err); }
                    }

                    result.synced++;
                    syncedIds.push(action.id);
                } catch (err) {
                    result.failed++;
                    const msg = err instanceof Error ? err.message : String(err);
                    result.errors.push(`Erro inesperado ao sincronizar pedido complexo: ${msg}`);
                }
            }
        }

        // Handle creates + updates together via upsert
        const upsertActions = [
            ...(types['create'] || []),
            ...(types['update'] || []),
        ];

        if (upsertActions.length > 0) {
            try {
                const records = upsertActions.map((a) => a.data);
                const { error } = await supabase
                    .from(table)
                    .upsert(records, { onConflict: 'id' });

                if (error) {
                    result.failed += upsertActions.length;
                    result.errors.push(`Erro ao upsert ${table}: ${error.message}`);
                } else {
                    result.synced += upsertActions.length;
                    syncedIds.push(...upsertActions.map((a) => a.id));
                }
            } catch (err) {
                result.failed += upsertActions.length;
                result.errors.push(`Erro inesperado em upsert ${table}: ${err}`);
            }
        }

        // Handle deletes
        const deleteActions = types['delete'] || [];
        if (deleteActions.length > 0) {
            try {
                const idsToDelete = deleteActions
                    .map((a) => a.data.id as string)
                    .filter(Boolean);

                if (idsToDelete.length > 0) {
                    const { error } = await supabase
                        .from(table)
                        .delete()
                        .in('id', idsToDelete);

                    if (error) {
                        result.failed += deleteActions.length;
                        result.errors.push(`Erro ao deletar ${table}: ${error.message}`);
                    } else {
                        result.synced += deleteActions.length;
                        syncedIds.push(...deleteActions.map((a) => a.id));
                    }
                }
            } catch (err) {
                result.failed += deleteActions.length;
                result.errors.push(`Erro inesperado ao deletar ${table}: ${err}`);
            }
        }
    }

    // Bulk remove synced actions from Dexie
    if (syncedIds.length > 0) {
        await removePendingActions(syncedIds);
    }

    // Update Zustand store
    if (result.synced > 0) {
        const now = new Date().toISOString();
        // Recalculate remaining pending count
        const remaining = await getPendingActions();
        if (remaining.length === 0) {
            store.resetPending();
        } else {
            // Set exact count from source of truth
            useStorageStore.setState({ pendingChangesCount: remaining.length });
        }
        store.setLastSyncedAt(now);

        // Also persist in localStorage for backward compat
        if (typeof window !== 'undefined') {
            localStorage.setItem('lastSync', now);
        }
    }

    return result;
}

/**
 * Get products (from cache if offline)
 */
export async function getProductsOfflineFirst(userId: string): Promise<CachedProduct[]> {
    if (isOnline()) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            await saveAll('products', data);
            return data as CachedProduct[];
        }
    }

    return getAll<CachedProduct>('products');
}

/**
 * Get categories (from cache if offline)
 */
export async function getCategoriesOfflineFirst(userId: string): Promise<CachedCategory[]> {
    if (isOnline()) {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            await saveAll('categories', data);
            return data as CachedCategory[];
        }
    }

    return getAll<CachedCategory>('categories');
}

/**
 * Get orders (from cache if offline)
 */
export async function getOrdersOfflineFirst(userId: string): Promise<CachedOrder[]> {
    if (isOnline()) {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            await saveAll('orders', data);
            return data as CachedOrder[];
        }
    }

    return getAll<CachedOrder>('orders');
}

/**
 * Clear all offline caches
 */
export async function clearOfflineCache(): Promise<void> {
    await clearStore('products');
    await clearStore('categories');
    await clearStore('orders');
    await clearStore('userSettings');
    await clearStore('pendingActions');
}

/**
 * Get offline status summary
 */
export async function getOfflineStatus() {
    const pendingActions = await getPendingActions();
    const products = await getAll<CachedProduct>('products');
    const categories = await getAll<CachedCategory>('categories');
    const orders = await getAll<CachedOrder>('orders');

    return {
        isOnline: isOnline(),
        pendingActionsCount: pendingActions.length,
        cachedProducts: products.length,
        cachedCategories: categories.length,
        cachedOrders: orders.length,
        lastSync: typeof window !== 'undefined' ? localStorage.getItem('lastSync') : null
    };
}

/**
 * Update last sync timestamp
 */
export function updateLastSync(): void {
    const now = new Date().toISOString();
    if (typeof window !== 'undefined') {
        localStorage.setItem('lastSync', now);
    }
    useStorageStore.getState().setLastSyncedAt(now);
}
