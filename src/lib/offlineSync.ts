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
import type { 
    CachedProduct, 
    CachedCategory, 
    CachedOrder, 
    PendingAction 
} from '@/types/db';

interface SyncResult {
    synced: number;
    failed: number;
    errors: string[];
}

/**
 * Maps old or incorrect table names to current ones to handle stale DB state.
 */
const TABLE_NAME_MAP: Record<string, string> = {
    'loyalty_reward_variants': 'loyalty_rewards'
};

/** Cooldown: minimum 5 minutes between full cache refreshes */
let _lastCacheRun = 0;
const CACHE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cache essential data for offline use (throttled: max once per 5 min)
 */
export async function cacheDataForOffline(userId: string, force = false): Promise<void> {
    if (!isOnline()) return;

    const now = Date.now();
    if (!force && now - _lastCacheRun < CACHE_COOLDOWN_MS) {
        console.log('[Offline] Cache cooldown active, skipping refresh');
        return;
    }
    _lastCacheRun = now;

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

        // Cache recent orders (last 30 — reduced for egress optimization)
        const { data: orders } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (orders) await saveAll('orders', orders);

        const [rCustomers, rMesas, rEmployees, rMesaSessions] = await Promise.all([
            supabase.from('customers').select('*').eq('user_id', userId),
            supabase.from('mesas').select('*').eq('user_id', userId),
            supabase.from('employees').select('*').eq('user_id', userId),
            supabase.from('mesa_sessions').select('*').eq('user_id', userId).is('closed_at', null),
        ]);

        if (rCustomers.data?.length) await saveAll('customers', rCustomers.data);
        if (rMesas.data?.length) await saveAll('mesas', rMesas.data);
        if (rEmployees.data?.length) await saveAll('employees', rEmployees.data);
        
        if (rMesaSessions.data?.length) {
            await saveAll('mesa_sessions', rMesaSessions.data);
            const sessionIds = rMesaSessions.data.map(s => s.id);
            const rSessionItems = await supabase.from('mesa_session_items').select('*').in('session_id', sessionIds);
            if (rSessionItems.data?.length) {
                await saveAll('mesa_session_items', rSessionItems.data);
            }
        }

        // Cache recent cash flow (reduced from 100 to 50 for egress)
        const { data: cashFlow } = await supabase
            .from('cash_flow')
            .select('*')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false })
            .limit(50);
        if (cashFlow) await saveAll('cash_flow', cashFlow);

        // Cache recent action logs (reduced from 50 to 20 for egress)
        const { data: logs } = await supabase
            .from('action_logs')
            .select('id, user_id, action_type, entity_type, entity_id, entity_name, description, metadata, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (logs) await saveAll('action_logs', logs);

        // Cache bill categories
        const { data: billCats } = await supabase
            .from('bill_categories')
            .select('*')
            .eq('user_id', userId);
        if (billCats) await saveAll('bill_categories', billCats);

        // Cache recent bills (reduced from 100 to 50 for egress)
        const { data: bills } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', userId)
            .order('due_date', { ascending: false })
            .limit(50);
        if (bills) await saveAll('bills', bills);

        // Cache Addons and Loyalty
        const [rAddons, rAddonGroups, rProductAddonGroups, rAddonGroupItems, rLoyaltyRewards, rLoyaltySettings, rCoupons, rAppSettings] = await Promise.all([
            supabase.from('product_addons').select('*').eq('user_id', userId),
            supabase.from('addon_groups').select('*').eq('user_id', userId),
            supabase.from('product_addon_groups').select('*'), // Link-only table
            supabase.from('addon_group_items').select('*'), // Link-only table
            supabase.from('loyalty_rewards').select('*').eq('user_id', userId),
            supabase.from('loyalty_settings').select('*').eq('user_id', userId),
            supabase.from('coupons').select('*').eq('user_id', userId),
            supabase.from('app_settings').select('*').eq('user_id', userId),
        ]);

        if (rAddons.data) await saveAll('product_addons', rAddons.data);
        if (rAddonGroups.data) await saveAll('addon_groups', rAddonGroups.data);
        if (rProductAddonGroups.data) await saveAll('product_addon_groups', rProductAddonGroups.data);
        if (rAddonGroupItems.data) await saveAll('addon_group_items', rAddonGroupItems.data);
        if (rLoyaltyRewards.data) await saveAll('loyalty_rewards', rLoyaltyRewards.data); // Corrected table name
        if (rLoyaltySettings.data) await saveAll('loyalty_settings', rLoyaltySettings.data);
        if (rCoupons.data) await saveAll('coupons', rCoupons.data);
        if (rAppSettings.data) await saveAll('app_settings', rAppSettings.data);

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
        // Auto-correct stale table names from old versions
        const actualTable = TABLE_NAME_MAP[action.table] || action.table;
        
        if (!groups[actualTable]) groups[actualTable] = {};
        if (!groups[actualTable][action.type]) groups[actualTable][action.type] = [];
        groups[actualTable][action.type].push({ ...action, table: actualTable });
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

    const tableProcessingOrder = [
        'customers',
        'mesas',
        'employees',
        'products',
        'categories',
        'orders',
        'order_items',
        'mesa_sessions',
        'mesa_session_items',
        'bill_categories',
        'bills'
    ];

    const sortedEntries = Object.entries(groups).sort(([tableA], [tableB]) => {
        const indexA = tableProcessingOrder.indexOf(tableA);
        const indexB = tableProcessingOrder.indexOf(tableB);
        const weightA = indexA === -1 ? 999 : indexA;
        const weightB = indexB === -1 ? 999 : indexB;
        return weightA - weightB;
    });

    for (const [table, types] of sortedEntries) {
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

        // Handle mass relationship replacement (e.g. product_addon_groups)
        const replaceActions = types['replace_relationships'] || [];
        if (replaceActions.length > 0) {
            for (const action of replaceActions) {
                try {
                    const { productId, groupIds } = action.data;
                    
                    // Transactional delete + insert on server
                    const { error: delError } = await supabase
                        .from(table)
                        .delete()
                        .eq('product_id', productId);
                    
                    if (delError) throw delError;

                    if (groupIds && groupIds.length > 0) {
                        const newRels = groupIds.map((groupId: string) => ({
                            product_id: productId,
                            group_id: groupId
                        }));
                        const { error: insError } = await supabase
                            .from(table)
                            .insert(newRels);
                        if (insError) throw insError;
                    }

                    result.synced++;
                    syncedIds.push(action.id);
                } catch (err) {
                    result.failed++;
                    const msg = err instanceof Error ? err.message : String(err);
                    result.errors.push(`Erro ao sincronizar relações em ${table}: ${msg}`);
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
                let records = upsertActions.map((a) => a.data);

                // Resilience for action_logs: ensure only valid columns are sent
                if (table === 'action_logs') {
                    records = records.map(r => ({
                        id: r.id,
                        user_id: r.user_id,
                        action_type: r.action_type,
                        entity_type: r.entity_type,
                        entity_id: r.entity_id || null,
                        entity_name: r.entity_name || null,
                        description: r.description,
                        metadata: r.metadata || {},
                        created_at: r.created_at
                    }));
                }

                const { error } = await supabase
                    .from(table)
                    .upsert(records, { onConflict: 'id' });

                if (error) {
                    if (error.code === '23505' || (error as any).status === 409) {
                        console.warn(`[Sync] Batch upsert conflict for ${table}, falling back to individual processing`);
                        for (const action of upsertActions) {
                            try {
                                const { error: indError } = await supabase
                                    .from(table)
                                    .upsert(action.data, { onConflict: 'id' });
                                
                                if (indError) {
                                    // Special handling for 409 Conflict in individual mode
                                    const isConflict = indError.code === '23505' || (indError as any).status === 409;
                                    
                                    if (isConflict) {
                                        console.warn(`[Sync] Conflict reconciled for ${table}: ${action.data.id}. Treating as synced.`);
                                        result.synced++;
                                        syncedIds.push(action.id);
                                    } else {
                                        result.failed++;
                                        result.errors.push(`Erro ao individual upsert ${table}: ${indError.message}`);
                                    }
                                } else {
                                    result.synced++;
                                    syncedIds.push(action.id);
                                }
                            } catch (err) {
                                result.failed++;
                                result.errors.push(`Erro inesperado individual ${table}: ${err}`);
                            }
                        }
                    } else {
                        result.failed += upsertActions.length;
                        result.errors.push(`Erro ao upsert ${table}: ${error.message}`);
                    }
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

        // Handle mass cleanups/deletes for action_logs
        if (table === 'action_logs') {
            const clearLogsActions = types['clear_logs'] || [];
            for (const action of clearLogsActions) {
                try {
                    const { userId, olderThan } = action.data;
                    const { error } = await supabase.from('action_logs').delete().eq('user_id', userId).lt('created_at', olderThan);
                    if (error) throw error;
                    result.synced++;
                    syncedIds.push(action.id);
                } catch (err) {
                    result.failed++;
                    result.errors.push(`Erro ao limpar logs: ${err}`);
                }
            }

            const deleteAllActions = types['delete_all'] || [];
            for (const action of deleteAllActions) {
                try {
                    const { userId } = action.data;
                    const { error } = await supabase.from('action_logs').delete().eq('user_id', userId);
                    if (error) throw error;
                    result.synced++;
                    syncedIds.push(action.id);
                } catch (err) {
                    result.failed++;
                    result.errors.push(`Erro ao apagar todos os logs: ${err}`);
                }
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
