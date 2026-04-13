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
            .select('id,user_id,name,price,description,image_url,category_id,available,display_order,promo_enabled,promo_value,promo_type,created_at')
            .eq('user_id', userId);
        if (products) try { await saveAll('products', products); } catch(e) { console.warn('[Offline] cache products failed:', e); }

        // Cache categories
        const { data: categories } = await supabase
            .from('categories')
            .select('id,user_id,name,icon,color,display_order,created_at')
            .eq('user_id', userId);
        if (categories) try { await saveAll('categories', categories); } catch(e) { console.warn('[Offline] cache categories failed:', e); }

        // Cache recent orders (last 15 — reduced for egress optimization)
        const { data: orders } = await supabase
            .from('orders')
            .select('id,user_id,order_number,customer_name,customer_phone,customer_address,status,payment_method,payment_status,subtotal,total,delivery_fee,is_delivery,notes,coupon_discount,user_slug,created_at,updated_at,rating_token,order_items(id,order_id,product_id,product_name,quantity,unit_price,total,notes,created_at)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(15);
        if (orders) try { await saveAll('orders', orders); } catch(e) { console.warn('[Offline] cache orders failed:', e); }

        const [rCustomers, rMesas, rEmployees, rMesaSessions] = await Promise.all([
            supabase.from('customers').select('id,user_id,name,email,phone,points,total_orders,total_spent,created_at').eq('user_id', userId).limit(500),
            supabase.from('mesas').select('id,user_id,numero_mesa,capacidade,ativa,created_at').eq('user_id', userId).eq('ativa', true),
            supabase.from('employees').select('id,user_id,name,role,phone,email,pin_code,is_active,salary,hire_date,created_at,is_fixed').eq('user_id', userId).limit(100),
            supabase.from('mesa_sessions').select('id,mesa_id,user_id,garcom_id,garcom,status,opened_at,closed_at,total,valor_parcial,payment_method,taxa_servico_percent,desconto,total_final').eq('user_id', userId).is('closed_at', null),
        ]);

        if (rCustomers.data?.length) try { await saveAll('customers', rCustomers.data); } catch(e) { console.warn('[Offline] cache customers failed:', e); }
        if (rMesas.data?.length) try { await saveAll('mesas', rMesas.data); } catch(e) { console.warn('[Offline] cache mesas failed:', e); }
        if (rEmployees.data?.length) try { await saveAll('employees', rEmployees.data); } catch(e) { console.warn('[Offline] cache employees failed:', e); }
        
        if (rMesaSessions.data?.length) {
            try { await saveAll('mesa_sessions', rMesaSessions.data); } catch(e) { console.warn('[Offline] cache mesa_sessions failed:', e); }
            const sessionIds = rMesaSessions.data.map(s => s.id);
            const rSessionItems = await supabase.from('mesa_session_items').select('id,session_id,product_id,product_name,quantity,unit_price,total,notes,status,created_at,order_id,enviado_cozinha').in('session_id', sessionIds);
            if (rSessionItems.data?.length) {
                try { await saveAll('mesa_session_items', rSessionItems.data); } catch(e) { console.warn('[Offline] cache mesa_session_items failed:', e); }
            }
        }

        // Cache recent cash flow (reduced to 30 for egress)
        const { data: cashFlow } = await supabase
            .from('cash_flow')
            .select('id,user_id,type,category,description,amount,payment_method,transaction_date,created_at')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false })
            .limit(30);
        if (cashFlow) try { await saveAll('cash_flow', cashFlow); } catch(e) { console.warn('[Offline] cache cash_flow failed:', e); }

        // Cache recent action logs (reduced from 50 to 20 for egress)
        const { data: logs } = await supabase
            .from('action_logs')
            .select('id, user_id, action_type, entity_type, entity_id, entity_name, description, metadata, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (logs) try { await saveAll('action_logs', logs); } catch(e) { console.warn('[Offline] cache action_logs failed:', e); }

        // Cache bill categories
        const { data: billCats } = await supabase
            .from('bill_categories')
            .select('id,user_id,name,type,icon,color,created_at')
            .eq('user_id', userId);
        if (billCats) try { await saveAll('bill_categories', billCats); } catch(e) { console.warn('[Offline] cache bill_categories failed:', e); }

        // Cache recent bills (reduced to 30 for egress)
        const { data: bills } = await supabase
            .from('bills')
            .select('id,user_id,title,amount,due_date,status,category_id,recurrence,payment_method,notes,paid_at,created_at')
            .eq('user_id', userId)
            .order('due_date', { ascending: false })
            .limit(30);
        if (bills) try { await saveAll('bills', bills); } catch(e) { console.warn('[Offline] cache bills failed:', e); }

        // Cache Addons and Loyalty
        const [rAddons, rAddonGroups, rLoyaltyRewards, rLoyaltySettings, rCoupons, rAppSettings] = await Promise.all([
            supabase.from('product_addons').select('id,user_id,name,price,available,created_at').eq('user_id', userId),
            supabase.from('addon_groups').select('id,user_id,name,description,required,max_selection,created_at').eq('user_id', userId),
            supabase.from('loyalty_rewards').select('id,user_id,name,description,points_cost,reward_type,reward_value,min_order_value,is_active,created_at').eq('user_id', userId),
            supabase.from('loyalty_settings').select('id,user_id,points_per_real,min_points_to_redeem,points_expiry_days,tier_bronze_min,tier_silver_min,tier_gold_min,tier_platinum_min,silver_multiplier,gold_multiplier,platinum_multiplier,is_active,updated_at').eq('user_id', userId),
            supabase.from('coupons').select('id,user_id,code,description,discount_type,discount_value,min_order_value,max_discount,usage_limit,usage_count,valid_from,valid_until,active,first_order_only,created_at').eq('user_id', userId),
            supabase.from('app_settings').select('id,user_id,loyalty_enabled,coupons_enabled,updated_at').eq('user_id', userId),
        ]);

        if (rAddons.data) try { await saveAll('product_addons', rAddons.data); } catch(e) { console.warn('[Offline] cache product_addons failed:', e); }
        if (rAddonGroups.data) try { await saveAll('addon_groups', rAddonGroups.data); } catch(e) { console.warn('[Offline] cache addon_groups failed:', e); }
        if (rLoyaltyRewards.data) try { await saveAll('loyalty_rewards', rLoyaltyRewards.data); } catch(e) { console.warn('[Offline] cache loyalty_rewards failed:', e); }
        if (rLoyaltySettings.data) try { await saveAll('loyalty_settings', rLoyaltySettings.data); } catch(e) { console.warn('[Offline] cache loyalty_settings failed:', e); }
        if (rCoupons.data) try { await saveAll('coupons', rCoupons.data); } catch(e) { console.warn('[Offline] cache coupons failed:', e); }
        if (rAppSettings.data) try { await saveAll('app_settings', rAppSettings.data); } catch(e) { console.warn('[Offline] cache app_settings failed:', e); }

        // Cache link tables scoped by user's products/groups (avoid fetching ALL rows)
        const productIds = products?.map(p => p.id) || [];
        const groupIds = rAddonGroups.data?.map(g => g.id) || [];
        if (productIds.length > 0) {
            const { data: pag } = await supabase.from('product_addon_groups').select('id,product_id,group_id').in('product_id', productIds.slice(0, 100));
            if (pag) try { await saveAll('product_addon_groups', pag); } catch(e) { console.warn('[Offline] cache product_addon_groups failed:', e); }
        }
        if (groupIds.length > 0) {
            const { data: agi } = await supabase.from('addon_group_items').select('id,group_id,addon_id').in('group_id', groupIds.slice(0, 100));
            if (agi) try { await saveAll('addon_group_items', agi); } catch(e) { console.warn('[Offline] cache addon_group_items failed:', e); }
        }

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

                // Resilience for orders: strip nested join data (order_items, order_item_addons)
                if (table === 'orders') {
                    records = records.map(r => {
                        const { order_items, order_item_addons, ...clean } = r as any;
                        return clean;
                    });
                }

                // Resilience for mesas: strip nested join data (mesa_sessions)
                if (table === 'mesas') {
                    records = records.map(r => {
                        const { mesa_sessions, ...clean } = r as any;
                        return clean;
                    });
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
            .select('id,user_id,name,price,description,image_url,category_id,available,display_order,promo_enabled,promo_value,promo_type,created_at')
            .eq('user_id', userId);

        if (!error && data) {
            try { await saveAll('products', data); } catch(e) { console.warn('[Offline] cache products failed:', e); }
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
            .select('id,user_id,name,icon,color,display_order,created_at')
            .eq('user_id', userId);

        if (!error && data) {
            try { await saveAll('categories', data); } catch(e) { console.warn('[Offline] cache categories failed:', e); }
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
            .select('id,user_id,order_number,customer_name,customer_phone,customer_address,status,payment_method,payment_status,subtotal,total,delivery_fee,is_delivery,notes,coupon_discount,user_slug,created_at,updated_at,rating_token,order_items(id,order_id,product_id,product_name,quantity,unit_price,total,notes,created_at)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(15);

        if (!error && data) {
            try { await saveAll('orders', data); } catch(e) { console.warn('[Offline] cache orders failed:', e); }
            return data as CachedOrder[];
        }
    }

    return getAll<CachedOrder>('orders');
}

/**
 * Clear all offline caches
 */
export async function clearOfflineCache(): Promise<void> {
    const stores: import('@/types/db').StoreName[] = [
        'products', 'categories', 'orders', 'order_items', 'order_item_addons',
        'customers', 'mesas', 'employees', 'mesa_sessions', 'mesa_session_items',
        'loyalty_rewards', 'loyalty_settings', 'coupons', 'app_settings',
        'product_addons', 'addon_groups', 'product_addon_groups', 'addon_group_items',
        'action_logs', 'cash_flow', 'bills', 'bill_categories',
        'userSettings', 'pendingActions',
    ];
    for (const store of stores) {
        try { await clearStore(store); } catch(e) { console.warn(`[Offline] clear ${store} failed:`, e); }
    }
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
