'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { 
    fetchProducts, fetchCategories, fetchOrders, fetchCustomers, 
    fetchMesas, fetchEmployeesCached, fetchLoyaltyRewards, 
    fetchLoyaltySettings, fetchCoupons, fetchAppSettings,
    fetchProductAddons, fetchAddonGroups, fetchProductAddonGroups,
    fetchAddonGroupItems, fetchCashFlow, fetchBills, fetchBillCategories,
    fetchMesaSessions, fetchMesaSessionItems, fetchOrderById, fetchMesaById
} from '@/lib/dataAccess';
import type { 
    CachedClient, CachedTable, CachedEmployee, CachedOrder,
    CachedLoyaltyReward, CachedLoyaltySettings, CachedCoupon, CachedAppSetting,
    CachedActionLog, CachedMesaSession, CachedMesaSessionItem,
    CachedCashFlow, CachedBill, CachedBillCategory
} from '@/types/db';


export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    available: boolean;
    category_id: string;
    display_order: number;
    promo_enabled: boolean;
    promo_value: number;
    promo_type: 'value' | 'percentage';
    user_id?: string;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    display_order?: number;
    user_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTIVE LOCAL-FIRST HOOKS
// These hooks use Dexie's useLiveQuery. They instantly reflect any changes 
// made to the local database. They also trigger a background sync from the cloud
// on mount to ensure the local database remains up-to-date.
// ─────────────────────────────────────────────────────────────────────────────

export function useProductsCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Reactive DB query (Source of Truth)
    // Dexie's useLiveQuery returns undefined while loading the initial set
    const products = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const data = await db.products.where('user_id').equals(user.id).toArray();
            return data.sort((a, b) => {
                if (a.display_order !== b.display_order) {
                    return (a.display_order ?? 0) - (b.display_order ?? 0);
                }
                return a.name.localeCompare(b.name);
            });
        } catch (err: unknown) {
            console.error('Dexie products query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = products === undefined;

    // 2. Background Sync from Cloud
    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchProducts(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing products from cloud:', err);
            setError('Erro ao sincronizar produtos');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            syncFromCloud();
        }
    }, [user, syncFromCloud]);

    return { 
        products: (products || []) as Product[], 
        loading, 
        isSyncing,
        error, 
        refetch: syncFromCloud 
    };
}

export function useCategoriesCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const categories = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const data = await db.categories.where('user_id').equals(user.id).toArray();
            return data.sort((a, b) => {
                if (a.display_order !== b.display_order) {
                    return (a.display_order ?? 0) - (b.display_order ?? 0);
                }
                return a.name.localeCompare(b.name);
            });
        } catch (err) {
            console.error('Dexie categories query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = categories === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchCategories(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing categories from cloud:', err);
            setError('Erro ao sincronizar categorias');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            syncFromCloud();
        }
    }, [user, syncFromCloud]);

    return { 
        categories: (categories || []) as Category[], 
        loading, 
        isSyncing,
        error, 
        refetch: syncFromCloud 
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW CACHE HOOKS (Customers, Mesas, Employees, Orders)
// ─────────────────────────────────────────────────────────────────────────────

export interface Addon {
    id: string;
    name: string;
    price: number;
}

export interface AddonGroup {
    id: string;
    name: string;
    description: string | null;
    required: boolean;
    max_selection: number;
    addons: Addon[];
}

export function useOrdersCache(options: { limit?: number; date?: string } = {}) {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const orders = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const data = await db.orders.where('user_id').equals(user.id).toArray();
            return data.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        } catch (err: unknown) {
            console.error('Dexie orders query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = orders === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchOrders(user.id, options);
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro desconhecido');
        } finally {
            setIsSyncing(false);
        }
    }, [user, options]);

    useEffect(() => {
        if (user) {
            syncFromCloud();
        }
    }, [user, syncFromCloud]);

    return { 
        orders: (orders || []) as CachedOrder[], 
        loading, 
        isSyncing,
        error, 
        refetch: syncFromCloud 
    };
}

export function useSingleOrderCache(orderId: string) {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const order = useLiveQuery(async () => {
        if (!user || !orderId || typeof window === 'undefined') return null;
        try {
            const o = await db.orders.get(orderId);
            if (!o || o.user_id !== user.id) return null;
            
            const items = await db.order_items.where('order_id').equals(orderId).toArray();
            const itemIds = items.map(i => i.id);
            const addons = await db.order_item_addons.where('order_item_id').anyOf(itemIds).toArray();
            
            return {
                ...o,
                order_items: items.map(item => ({
                    ...item,
                    order_item_addons: addons.filter(a => a.order_item_id === item.id)
                }))
            } as CachedOrder;
        } catch (err: unknown) {
            console.error('Dexie fetchOrderById error:', err);
            return null;
        }
    }, [user?.id, orderId]);

    const loading = order === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user || !orderId) return;
        try {
            setIsSyncing(true);
            await fetchOrderById(orderId);
            setError(null);
        } catch (err) {
            console.error('Error syncing order from cloud:', err);
            setError('Erro ao sincronizar pedido');
        } finally {
            setIsSyncing(false);
        }
    }, [user, orderId]);

    useEffect(() => {
        if (user && orderId) {
            syncFromCloud();
        }
    }, [user, orderId, syncFromCloud]);

    return { order: (order || null) as CachedOrder | null, loading, isSyncing, error, refetch: syncFromCloud };
}

export function useCustomersCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const customers = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const data = await db.customers.where('user_id').equals(user.id).toArray();
            return data.sort((a: CachedClient, b: CachedClient) => a.name.localeCompare(b.name));
        } catch (err: unknown) {
            console.error('Dexie customers query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = customers === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchCustomers(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing customers from cloud:', err);
            setError('Erro ao sincronizar clientes');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            syncFromCloud();
        }
    }, [user, syncFromCloud]);

    return { 
        customers: (customers || []) as CachedClient[], 
        loading, 
        isSyncing,
        error, 
        refetch: syncFromCloud 
    };
}

export function useTableDetailCache(tableId: string) {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tableData = useLiveQuery(async () => {
        if (!user || !tableId || typeof window === 'undefined') return null;
        try {
            const table = await db.mesas.get(tableId);
            if (!table || table.user_id !== user.id) return null;

            const sessions = await db.mesa_sessions.where('mesa_id').equals(tableId).toArray();
            // Robust check for active session: not closed AND status is not 'livre'
            const activeSession = sessions.find((s: CachedMesaSession) => !s.closed_at && s.status !== 'livre');
            
            let items: CachedMesaSessionItem[] = [];
            if (activeSession) {
                items = await db.mesa_session_items.where('session_id').equals(activeSession.id).toArray();
            }

            return {
                ...table,
                active_session: activeSession ? {
                    ...activeSession,
                    items
                } : null
            };
        } catch (err: unknown) {
            console.error('Dexie useTableDetailCache error:', err);
            return null;
        }
    }, [user?.id, tableId]);

    const loading = tableData === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user || !tableId) return;
        try {
            setIsSyncing(true);
            await fetchMesaById(tableId);
            setError(null);
        } catch (err) {
            console.error('Error syncing table details from cloud:', err);
            setError('Erro ao sincronizar mesa');
        } finally {
            setIsSyncing(false);
        }
    }, [user, tableId]);

    useEffect(() => {
        if (user && tableId) {
            syncFromCloud();
        }
    }, [user, tableId, syncFromCloud]);

    return { table: tableData || null, loading, isSyncing, error, refetch: syncFromCloud };
}

export function useMesasCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mesas = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const mesasData = (await db.mesas.where('user_id').equals(user.id).toArray())
                .filter(m => m.ativa !== false);
            
            // Robust check for open sessions: closed_at is falsy AND status is not 'livre'
            const sessionsData = await db.mesa_sessions.where('user_id').equals(user.id)
                .filter(s => !s.closed_at && s.status !== 'livre').toArray();
                
            const sessionIds = sessionsData.map(s => s.id);
            const itemsData = await db.mesa_session_items.where('session_id').anyOf(sessionIds).toArray();
            
            const sessionsWithItems = sessionsData.map(session => ({
                ...session,
                items: itemsData.filter(i => i.session_id === session.id)
            }));
            
            const mapped = mesasData.map(mesa => ({
                ...mesa,
                active_session: sessionsWithItems.find(s => s.mesa_id === mesa.id) || null
            }));
            
            return mapped.sort((a, b) => a.numero_mesa - b.numero_mesa);
        } catch (err: unknown) {
            console.error('Dexie mesas query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = mesas === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            // Fetch mesas, sessions AND items from cloud to keep local Dexie in sync
            await Promise.all([
                fetchMesas(user.id),
                fetchMesaSessions(user.id),
                fetchMesaSessionItems(user.id),
            ]);
            setError(null);
        } catch (err) {
            console.error('Error syncing mesas from cloud:', err);
            setError('Erro ao sincronizar mesas');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    // Initial sync on mount
    useEffect(() => {
        if (user) {
            syncFromCloud();
        }
    }, [user, syncFromCloud]);

    // Supabase Realtime: auto-sync when other browsers change mesa data
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!user) return;

        // Debounced sync to avoid rapid-fire re-fetches on batch changes
        const debouncedSync = () => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            syncTimerRef.current = setTimeout(() => {
                syncFromCloud();
            }, 500);
        };

        const channel = supabase.channel(`mesas-realtime-${user.id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'mesa_sessions', filter: `user_id=eq.${user.id}` },
                debouncedSync
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'mesas', filter: `user_id=eq.${user.id}` },
                debouncedSync
            )
            .subscribe();

        return () => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            supabase.removeChannel(channel);
        };
    }, [user, syncFromCloud]);

    return { 
        mesas: (mesas || []) as CachedTable[], 
        loading, 
        isSyncing,
        error, 
        refetch: syncFromCloud 
    };
}

export function useEmployeesCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const employees = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const data = await db.employees.where('user_id').equals(user.id).toArray();
            // Default sort by name, active first
            return data.sort((a, b) => {
                if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        } catch (err: unknown) {
            console.error('Dexie employees query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = employees === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchEmployeesCached(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing employees from cloud:', err);
            setError('Erro ao sincronizar funcionários');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            syncFromCloud();
        }
    }, [user, syncFromCloud]);

    return { employees: (employees || []) as CachedEmployee[], loading, isSyncing, error, refetch: syncFromCloud };
}

export function useLoyaltyRewardsCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const rewards = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            return await db.loyalty_rewards.where('user_id').equals(user.id).toArray();
        } catch (err: unknown) {
            console.error('Dexie loyalty rewards query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = rewards === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchLoyaltyRewards(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing loyalty rewards from cloud:', err);
            setError('Erro ao sincronizar recompensas');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { rewards: (rewards || []) as CachedLoyaltyReward[], loading, isSyncing, error, refetch: syncFromCloud };
}

export function useLoyaltySettingsCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const settings = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return null;
        try {
            const data = await db.loyalty_settings.where('user_id').equals(user.id).toArray();
            return data[0] || null;
        } catch (err: unknown) {
            console.error('Dexie loyalty settings query error:', err);
            return null;
        }
    }, [user?.id]);

    const loading = settings === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchLoyaltySettings(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing loyalty settings from cloud:', err);
            setError('Erro ao sincronizar configurações');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { settings: (settings || null) as CachedLoyaltySettings | null, loading, isSyncing, error, refetch: syncFromCloud };
}

export function useCouponsCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const coupons = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            return await db.coupons.where('user_id').equals(user.id).toArray();
        } catch (err: unknown) {
            console.error('Dexie coupons query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = coupons === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchCoupons(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing coupons from cloud:', err);
            setError('Erro ao sincronizar cupons');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { coupons: (coupons || []) as CachedCoupon[], loading, isSyncing, error, refetch: syncFromCloud };
}

export function useAppSettingsCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const settings = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return null;
        try {
            const data = await db.app_settings.where('user_id').equals(user.id).toArray();
            return data[0] || null;
        } catch (err: unknown) {
            console.error('Dexie app settings query error:', err);
            return null;
        }
    }, [user?.id]);

    const loading = settings === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchAppSettings(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing app settings from cloud:', err);
            setError('Erro ao sincronizar configurações');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { settings: (settings || null) as CachedAppSetting | null, loading, isSyncing, error, refetch: syncFromCloud };
}

export function useAddonsCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addonsData = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return null;
        try {
            const [addons, groups, allProductGroups, allGroupItems] = await Promise.all([
                db.product_addons.where('user_id').equals(user.id).toArray(),
                db.addon_groups.where('user_id').equals(user.id).toArray(),
                db.product_addon_groups.toArray(),
                db.addon_group_items.toArray()
            ]);
            // Filter junction tables to only include user-owned addons/groups
            const userGroupIds = new Set(groups.map(g => g.id));
            const userAddonIds = new Set(addons.map(a => a.id));
            const productGroups = allProductGroups.filter(pg => userGroupIds.has(pg.group_id));
            const groupItems = allGroupItems.filter(gi => userGroupIds.has(gi.group_id) && userAddonIds.has(gi.addon_id));
            return { addons, groups, productGroups, groupItems };
        } catch (err: unknown) {
            console.error('Dexie addons query error:', err);
            return null;
        }
    }, [user?.id]);

    const loading = addonsData === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await Promise.all([
                fetchProductAddons(user.id),
                fetchAddonGroups(user.id),
                fetchProductAddonGroups(user.id),
                fetchAddonGroupItems(user.id)
            ]);
            setError(null);
        } catch (err) {
            console.error('Error syncing addons from cloud:', err);
            setError('Erro ao sincronizar complementos');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    const getProductAddons = useCallback((productId: string): AddonGroup[] => {
        if (!addonsData) return [];
        const { addons, groups, productGroups, groupItems } = addonsData;

        // 1. Get groups linked to this product
        const relevantGroupIds = productGroups
            .filter(pg => pg.product_id === productId)
            .map(pg => pg.group_id);

        const relevantGroups = groups.filter(g => relevantGroupIds.includes(g.id));

        // 2. For each group, get its items (addons)
        return relevantGroups.map(group => {
            const itemIds = groupItems
                .filter(gi => gi.group_id === group.id)
                .map(gi => gi.addon_id);

            const groupAddons = addons
                .filter(a => itemIds.includes(a.id) && a.available)
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    price: a.price
                }));

            return {
                id: group.id,
                name: group.name,
                description: group.description,
                required: group.required,
                max_selection: group.max_selection,
                addons: groupAddons
            };
        }).filter(g => g.addons.length > 0);
    }, [addonsData]);

    return { 
        loading, 
        isSyncing,
        error, 
        addonGroups: addonsData?.groups || [],
        addons: addonsData?.addons || [],
        getProductAddons, 
        refetch: syncFromCloud 
    };
}

export function useActionLogsCache(pageSize: number = 20, page: number = 1, filters: { action?: string, entity?: string, from?: string, to?: string } = {}) {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const logs = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const query = db.action_logs.where('user_id').equals(user.id);

            // Fetch all for count and filtering (not the most efficient but works for local)
            let allLogs = await query.toArray();

            if (filters.action) allLogs = allLogs.filter(l => l.action_type === filters.action);
            if (filters.entity) allLogs = allLogs.filter(l => l.entity_type === filters.entity);
            if (filters.from) allLogs = allLogs.filter(l => l.created_at >= `${filters.from}T00:00:00`);
            if (filters.to) allLogs = allLogs.filter(l => l.created_at <= `${filters.to}T23:59:59`);

            allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setTotalCount(allLogs.length);

            const start = (page - 1) * pageSize;
            return allLogs.slice(start, start + pageSize);
        } catch (err: unknown) {
            console.error('Dexie logs query error:', err);
            return [];
        }
    }, [user?.id, page, pageSize, filters.action, filters.entity, filters.from, filters.to]);

    const loading = logs === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            const { data, error } = await supabase
                .from('action_logs')
                .select('id, user_id, action_type, entity_type, entity_id, entity_name, description, metadata, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            if (data) {
                await db.action_logs.bulkPut(data as CachedActionLog[]);
            }
            setError(null);
        } catch (err) {
            console.error('Error syncing logs from cloud:', err);
            setError('Erro ao sincronizar histórico');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { logs: (logs || []) as CachedActionLog[], totalCount, loading, isSyncing, error, refetch: syncFromCloud };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC MENU (Unaffected by authenticated Local-First logic)
// ─────────────────────────────────────────────────────────────────────────────

interface CacheData<T> {
    data: T[];
    timestamp: number;
    userId: string;
}
const CACHE_DURATION = 5 * 60 * 1000;

function getCachedData<T>(key: string, userId: string): T[] | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const parsed: CacheData<T> = JSON.parse(cached);
        if (parsed.userId !== userId) return null;
        if (Date.now() - parsed.timestamp > CACHE_DURATION) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

function setCachedData<T>(key: string, data: T[], userId: string): void {
    if (typeof window === 'undefined') return;
    try {
        const cacheData: CacheData<T> = { data, timestamp: Date.now(), userId };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Failed to cache data:', error);
    }
}

export function useCashFlowCache(from?: string, to?: string) {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const entries = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const query = db.cash_flow.where('user_id').equals(user.id);
            
            let data = await query.toArray();
            if (from) data = data.filter(c => c.transaction_date >= (from.includes('T') ? from.split('T')[0] : from));
            if (to) data = data.filter(c => c.transaction_date <= (to.includes('T') ? to.split('T')[0] : to));
            
            return data.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
        } catch (err: unknown) {
            console.error('Dexie cash_flow query error:', err);
            return [];
        }
    }, [user?.id, from, to]);

    const loading = entries === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchCashFlow(user.id, from, to);
            setError(null);
        } catch (err) {
            console.error('Error syncing cash flow from cloud:', err);
            setError('Erro ao sincronizar fluxo de caixa');
        } finally {
            setIsSyncing(false);
        }
    }, [user, from, to]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { entries: (entries || []) as CachedCashFlow[], loading, isSyncing, error, refetch: syncFromCloud };
}

export function useBillsCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const bills = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            const data = await db.bills.where('user_id').equals(user.id).toArray();
            return data.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        } catch (err: unknown) {
            console.error('Dexie bills query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = bills === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchBills(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing bills from cloud:', err);
            setError('Erro ao sincronizar contas');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { bills: (bills || []) as CachedBill[], loading, isSyncing, error, refetch: syncFromCloud };
}

export function useBillCategoriesCache() {
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const categories = useLiveQuery(async () => {
        if (!user || typeof window === 'undefined') return [];
        try {
            return await db.bill_categories.where('user_id').equals(user.id).toArray();
        } catch (err: unknown) {
            console.error('Dexie bill categories query error:', err);
            return [];
        }
    }, [user?.id]);

    const loading = categories === undefined;

    const syncFromCloud = useCallback(async () => {
        if (!user) return;
        try {
            setIsSyncing(true);
            await fetchBillCategories(user.id);
            setError(null);
        } catch (err) {
            console.error('Error syncing bill categories from cloud:', err);
            setError('Erro ao sincronizar categorias de contas');
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) syncFromCloud();
    }, [user, syncFromCloud]);

    return { categories: (categories || []) as CachedBillCategory[], loading, isSyncing, error, refetch: syncFromCloud };
}

export function usePublicMenuCache(userId: string) {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const cachedProducts = getCachedData<Product>(`public_products_${userId}`, userId);
            const cachedCategories = getCachedData<Category>(`public_categories_${userId}`, userId);

            if (cachedProducts && cachedCategories) {
                setProducts(cachedProducts);
                setCategories(cachedCategories);
                setLoading(false);
                return;
            }

            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    supabase
                        .from('products')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('available', true)
                        .order('display_order', { ascending: true }),
                    supabase
                        .from('categories')
                        .select('*')
                        .eq('user_id', userId)
                        .order('display_order', { ascending: true })
                ]);

                const productData = productsRes.data || [];
                const categoryData = categoriesRes.data || [];

                setProducts(productData);
                setCategories(categoryData);

                setCachedData(`public_products_${userId}`, productData, userId);
                setCachedData(`public_categories_${userId}`, categoryData, userId);
            } catch (error) {
                console.error('Error fetching public menu:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId]);

    return { products, categories, loading };
}

export function clearAllCache() {
    if (typeof window === 'undefined') return;
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('cola_ai_') || key.startsWith('public_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('Failed to clear cache:', error);
    }
}

