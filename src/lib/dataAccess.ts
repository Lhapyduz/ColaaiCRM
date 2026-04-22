// ─────────────────────────────────────────────────────
// Unified Data Access Layer
// Routes reads/writes through Cloud (Supabase) or Local (Dexie)
// based on the current storageMode from Zustand.
// ─────────────────────────────────────────────────────

import { supabase } from './supabase';
import { db } from './db';
import { useStorageStore } from '@/stores/useStorageStore';
import { 
    addPendingAction, saveAll, saveItem, getAll, getAllByUser, getItem, deleteItem, getPendingActions 
} from './offlineStorage';
import type {
    CachedProduct,
    CachedCategory,
    CachedOrder,
    CachedOrderItem,
    CachedOrderItemAddon,
    CachedClient,
    CachedTable,
    CachedEmployee,
    CachedLoyaltyReward,
    CachedLoyaltySettings,
    CachedCoupon,
    CachedAppSetting,
    CachedProductAddon,
    CachedAddonGroup,
    CachedProductAddonGroup,
    CachedAddonGroupItem,
    CachedActionLog,
    CachedCashFlow,
    CachedBill,
    CachedBillCategory,
    CachedMesaSession,
    CachedMesaSessionItem,
    PendingAction,
    HasId,
} from '@/types/db';

// ─── Helpers ─────────────────────────────────────────

export interface OrderLoyaltyData {
    customer?: CachedClient | null;
    newCustomer?: Partial<CachedClient> | null;
    pointsEarned: number;
    updateData?: Partial<CachedClient> | null;
}

export interface OrderCouponData {
    appliedCoupon: CachedCoupon | null;
    discount: number;
    customerPhone: string | null;
}

export function getMode() {
    const state = useStorageStore.getState();
    // Use local storage if explicitly set OR if the device has no internet connection
    if (!state.hardwareOnline) return 'local';
    return state.storageMode;
}

export function incrPending(count = 1) {
    useStorageStore.getState().incrementPending(count);
}

// ─── Products ────────────────────────────────────────

export async function fetchProducts(userId: string): Promise<CachedProduct[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('products')
            .select('id,user_id,name,price,description,image_url,category_id,available,display_order,promo_enabled,promo_value,promo_type,created_at')
            .eq('user_id', userId);

        if (!error && data) {
            // Get all pending modifications for this table
            const pending = await getPendingActions();
            const pendingIds = new Set(
                pending.filter((a: PendingAction) => a.table === 'products').map((a: PendingAction) => (a.data as HasId).id)
            );
            
            // Only overwrite records that DON'T have pending local changes
            const toSave = data.filter((item: CachedProduct) => !pendingIds.has(item.id));
            
            // Cache locally for offline fallback
            if (toSave.length > 0) {
                await saveAll('products', toSave);
            }
            return data as CachedProduct[];
        }
        // Fallback to local on error
        console.warn('[dataAccess] Supabase fetch failed, falling back to local:', error?.message);
    }

    return getAllByUser('products', userId);
}

export async function createProduct(data: Record<string, unknown>): Promise<void> {
    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('products').insert(record);
        if (error) throw new Error(error.message);
        // Also cache locally
        await saveItem('products', record as unknown as CachedProduct);
    } else {
        await saveItem('products', record as unknown as CachedProduct);
        await addPendingAction({ type: 'create', table: 'products', data: record });
        incrPending();
    }
}

export async function updateProduct(id: string, data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('products').update(data).eq('id', id);
        if (error) throw new Error(error.message);
        // Update local cache
        const existing = await getItem<CachedProduct>('products', id);
        if (existing) {
            await saveItem('products', { ...existing, ...data } as CachedProduct);
        }
    } else {
        const existing = await getItem<CachedProduct>('products', id);
        if (existing) {
            await saveItem('products', { ...existing, ...data } as CachedProduct);
        }
        await addPendingAction({ type: 'update', table: 'products', data: { ...data, id } });
        incrPending();
    }
}

export async function deleteProduct(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('products', id);
    } else {
        await deleteItem('products', id);
        await addPendingAction({ type: 'delete', table: 'products', data: { id } });
        incrPending();
    }
}

export async function bulkUpdateProducts(updates: Array<{ id: string } & Record<string, unknown>>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('products').upsert(updates);
        if (error) throw new Error(error.message);

        // Update local cache
        for (const update of updates) {
            const existing = await getItem<CachedProduct>('products', update.id);
            if (existing) {
                await saveItem('products', { ...existing, ...update } as CachedProduct);
            }
        }
    } else {
        for (const update of updates) {
            const existing = await getItem<CachedProduct>('products', update.id);
            if (existing) {
                await saveItem('products', { ...existing, ...update } as CachedProduct);
            }
            await addPendingAction({ type: 'update', table: 'products', data: update });
        }
        incrPending(updates.length);
    }
}

// ─── Categories ──────────────────────────────────────

export async function fetchCategories(userId: string): Promise<CachedCategory[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('categories')
            .select('id,user_id,name,icon,color,display_order,created_at')
            .eq('user_id', userId);

        if (!error && data) {
            // Get all pending modifications
            const pending = await getPendingActions();
            const pendingIds = new Set(
                pending.filter((a: PendingAction) => a.table === 'categories').map((a: PendingAction) => (a.data as HasId).id)
            );
            
            // Only overwrite records that DON'T have pending local changes
            const toSave = data.filter((item: CachedCategory) => !pendingIds.has(item.id));
            
            if (toSave.length > 0) {
                await saveAll('categories', toSave);
            }
            return data as CachedCategory[];
        }
        console.warn('[dataAccess] Supabase categories fetch failed, falling back to local:', error?.message);
    }

    return getAllByUser('categories', userId);
}

export async function createCategory(data: Record<string, unknown>): Promise<void> {
    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('categories').insert(record);
        if (error) throw new Error(error.message);
        await saveItem('categories', record as unknown as CachedCategory);
    } else {
        await saveItem('categories', record as unknown as CachedCategory);
        await addPendingAction({ type: 'create', table: 'categories', data: record });
        incrPending();
    }
}

export async function updateCategory(id: string, data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('categories').update(data).eq('id', id);
        if (error) throw new Error(error.message);
        const existing = await getItem<CachedCategory>('categories', id);
        if (existing) {
            await saveItem('categories', { ...existing, ...data } as CachedCategory);
        }
    } else {
        const existing = await getItem<CachedCategory>('categories', id);
        if (existing) {
            await saveItem('categories', { ...existing, ...data } as CachedCategory);
        }
        await addPendingAction({ type: 'update', table: 'categories', data: { ...data, id } });
        incrPending();
    }
}

export async function deleteCategory(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('categories', id);
    } else {
        await deleteItem('categories', id);
        await addPendingAction({ type: 'delete', table: 'categories', data: { id } });
        incrPending();
    }
}

export async function bulkUpdateCategories(updates: Array<{ id: string } & Record<string, unknown>>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('categories').upsert(updates);
        if (error) throw new Error(error.message);

        for (const update of updates) {
            const existing = await getItem<CachedCategory>('categories', update.id);
            if (existing) {
                await saveItem('categories', { ...existing, ...update } as CachedCategory);
            }
        }
    } else {
        for (const update of updates) {
            const existing = await getItem<CachedCategory>('categories', update.id);
            if (existing) {
                await saveItem('categories', { ...existing, ...update } as CachedCategory);
            }
            await addPendingAction({ type: 'update', table: 'categories', data: update });
        }
        incrPending(updates.length);
    }
}

// ─── Orders ──────────────────────────────────────────

export async function fetchOrders(userId: string, options: { limit?: number; date?: string } = {}): Promise<CachedOrder[]> {
    const { limit = 50, date } = options;
    if (getMode() === 'cloud') {
        let query = supabase
            .from('orders')
            .select('id,user_id,order_number,customer_name,customer_phone,customer_address,status,payment_method,payment_status,subtotal,total,delivery_fee,is_delivery,notes,discount_amount,user_slug,created_at,updated_at,rating_token,order_items(id,order_id,product_id,product_name,quantity,unit_price,total,notes,order_item_addons(id,order_item_id,addon_id,addon_name,addon_price,quantity))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (date) {
            // Se informada uma data, busca o dia inteiro sem limite (ou limite alto)
            query = query
                .gte('created_at', `${date}T00:00:00`)
                .lte('created_at', `${date}T23:59:59.999`);
        } else {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(
                pending.filter((a: PendingAction) => a.table === 'orders').map((a: PendingAction) => (a.data as HasId).id)
            );
            
            const toSave = data.filter((item: CachedOrder) => !pendingIds.has(item.id));
            
            if (toSave.length > 0) {
                await saveAllOrdersDeep(toSave);
            }
            return data as CachedOrder[];
        }
        console.warn('[dataAccess] Supabase orders fetch failed, falling back to local:', error?.message);
    }

    return getAllByUser('orders', userId);
}

export async function createOrder(data: Record<string, unknown>): Promise<void> {
    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('orders').insert(record);
        if (error) throw new Error(error.message);
        await saveItem('orders', record as unknown as CachedOrder);
    } else {
        await saveItem('orders', record as unknown as CachedOrder);
        await addPendingAction({ type: 'create', table: 'orders', data: record });
        incrPending();
    }
}

export async function updateOrder(id: string, data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('orders').update(data).eq('id', id);
        if (error) throw new Error(error.message);
        const existing = await getItem<CachedOrder>('orders', id);
        if (existing) {
            await saveItem('orders', { ...existing, ...data } as CachedOrder);
        }
    } else {
        const existing = await getItem<CachedOrder>('orders', id);
        if (existing) {
            await saveItem('orders', { ...existing, ...data } as CachedOrder);
        }
        await addPendingAction({ type: 'update', table: 'orders', data: { ...data, id } });
        incrPending();
    }
}

export async function deleteOrder(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('orders', id);
    } else {
        await deleteItem('orders', id);
        await addPendingAction({ type: 'delete', table: 'orders', data: { id } });
        incrPending();
    }
}

export async function createFullOrder(
    orderData: CachedOrder,
    orderItems: CachedOrderItem[],
    itemAddons: (CachedOrderItemAddon & { itemIndex?: number })[],
    loyaltyData?: OrderLoyaltyData | null,
    couponData?: OrderCouponData | null
): Promise<void> {
    const id = orderData.id as string || crypto.randomUUID();
    const record = { ...orderData, id };

    if (getMode() === 'cloud') {
        const { data: order, error: orderError } = await supabase.from('orders').insert(record).select().single();
        if (orderError) throw new Error(orderError.message);

        if (orderItems.length > 0) {
            const mappedItems = orderItems.map(item => ({ ...item, order_id: order.id }));
            const { data: insertedItems, error: itemsError } = await supabase.from('order_items').insert(mappedItems).select('id');
            if (itemsError) throw new Error(itemsError.message);

            if (insertedItems && itemAddons.length > 0) {
                let currentItemIndex = 0;
                const cleanAddons = itemAddons.map(addon => {
                    if (addon.itemIndex !== undefined) {
                        currentItemIndex = addon.itemIndex;
                    }
                    const addonData = { ...addon } as unknown as Record<string, unknown>;
                    delete addonData.itemIndex;
                    return {
                        ...addonData,
                        order_item_id: insertedItems[currentItemIndex]?.id
                    };
                });
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
            } catch (err) { console.warn('Coupon usage tracking failed:', err); }
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
                            description: `Pedido #${record.order_number}`,
                            order_id: order.id
                        });
                    }
                    await supabase.from('customers').update(loyaltyData.updateData).eq('id', loyaltyData.customer.id);
                } else if (loyaltyData.newCustomer) {
                    await supabase.from('customers').insert(loyaltyData.newCustomer);
                }
            } catch (err) { console.warn('Loyalty transaction tracking failed:', err); }
        }

        // Cache order globally
        await saveOrderDeep(record as unknown as CachedOrder);
    } else {
        await saveOrderDeep(record as unknown as CachedOrder);
        await addPendingAction({
            type: 'create_full_order',
            table: 'orders',
            data: { orderData: record, orderItems, itemAddons, loyaltyData, couponData }
        });
        incrPending();
    }
}

export async function fetchOrderById(id: string): Promise<CachedOrder | null> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('orders')
            .select('id,user_id,order_number,customer_name,customer_phone,customer_address,status,payment_method,payment_status,subtotal,total,delivery_fee,is_delivery,notes,coupon_discount,user_slug,created_at,updated_at,rating_token,order_items(id,order_id,product_id,product_name,quantity,unit_price,total,notes,order_item_addons(id,order_item_id,addon_id,addon_name,addon_price,quantity))')
            .eq('id', id)
            .single();

        if (!error && data) {
            await saveOrderDeep(data as CachedOrder);
            return data;
        }
    }

    // Local fetch with joins
    const order = await getItem<CachedOrder>('orders', id);
    if (!order) return null;

    const items = await db.order_items.where('order_id').equals(id).toArray();
    const itemIds = items.map(i => i.id);
    const addons = await db.order_item_addons.where('order_item_id').anyOf(itemIds).toArray();

    return {
        ...order,
        order_items: items.map(item => ({
            ...item,
            order_item_addons: addons.filter(a => a.order_item_id === item.id)
        }))
    } as CachedOrder;
}

export async function saveOrderDeep(order: CachedOrder): Promise<void> {
    const { order_items, ...orderData } = order;
    await saveItem('orders', orderData as CachedOrder);

    if (order_items && order_items.length > 0) {
        const itemsToSave = order_items.map(item => {
            const cleanItem = { ...item } as unknown as Record<string, unknown>;
            delete cleanItem.order_item_addons;
            return cleanItem;
        });
        await saveAll('order_items', itemsToSave);

        const allAddons: CachedOrderItemAddon[] = [];
        for (const item of order_items) {
            if (item.order_item_addons) {
                allAddons.push(...item.order_item_addons);
            }
        }
        if (allAddons.length > 0) {
            await saveAll('order_item_addons', allAddons);
        }
    }
}

export async function saveAllOrdersDeep(orders: CachedOrder[]): Promise<void> {
    const mainOrders: CachedOrder[] = [];
    const allItems: CachedOrderItem[] = [];
    const allAddons: CachedOrderItemAddon[] = [];

    for (const order of orders) {
        const { order_items, ...orderData } = order;
        mainOrders.push(orderData as CachedOrder);

        if (order_items) {
            for (const item of order_items) {
                const { order_item_addons, ...itemData } = item;
                allItems.push(itemData);
                if (order_item_addons) {
                    allAddons.push(...order_item_addons);
                }
            }
        }
    }

    await saveAll('orders', mainOrders);
    if (allItems.length > 0) await saveAll('order_items', allItems);
    if (allAddons.length > 0) await saveAll('order_item_addons', allAddons);
}

export async function confirmOrderPayment(order: CachedOrder, userId: string): Promise<void> {
    const now = new Date().toISOString();
    const updates = { payment_status: 'paid', updated_at: now };
    
    // 1. Update Order
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('orders').update(updates).eq('id', order.id);
        if (error) throw error;
    } else {
        await db.orders.update(order.id, updates);
        await addPendingAction({ type: 'update', table: 'orders', data: { id: order.id, ...updates } });
    }

    // 2. Loyalty Logic (if customer phone exists)
    if (order.customer_phone) {
        const cleanPhone = order.customer_phone.replace(/\D/g, '');
        
        let customer: CachedClient | null = null;
        if (getMode() === 'cloud') {
            const { data } = await supabase.from('customers').select('id,user_id,name,email,phone,total_points,total_spent,total_orders,created_at').eq('user_id', userId).eq('phone', cleanPhone).single();
            customer = data;
        } else {
            const customers = await getAll<CachedClient>('customers');
            customer = customers.find(c => c.phone === cleanPhone) || null;
        }

        if (customer) {
            let pointsPerReal = 1;
            if (getMode() === 'cloud') {
                const { data } = await supabase.from('loyalty_settings').select('points_per_real').eq('user_id', userId).single();
                pointsPerReal = data?.points_per_real || 1;
            } else {
                const settings = await getAll<CachedLoyaltySettings>('loyalty_settings');
                pointsPerReal = settings[0]?.points_per_real || 1;
            }

            const pointsEarned = Math.floor(order.total * pointsPerReal);
            const customerUpdates = {
                total_spent: (customer.total_spent || 0) + order.total,
                total_points: (customer.total_points || 0) + pointsEarned
            };

            if (getMode() === 'cloud') {
                await supabase.from('customers').update(customerUpdates).eq('id', customer.id);
                if (pointsEarned > 0) {
                    await supabase.from('points_transactions').insert({
                        user_id: userId,
                        customer_id: customer.id,
                        points: pointsEarned,
                        type: 'earned',
                        description: `Pedido #${order.order_number}`,
                        order_id: order.id
                    });
                }
            } else {
                await db.customers.update(customer.id, customerUpdates);
                await addPendingAction({ type: 'update', table: 'customers', data: { id: customer.id, ...customerUpdates } });
                
                if (pointsEarned > 0) {
                    await addPendingAction({
                        type: 'create',
                        table: 'points_transactions',
                        data: {
                            user_id: userId,
                            customer_id: customer.id,
                            points: pointsEarned,
                            type: 'earned',
                            description: `Pedido #${order.order_number}`,
                            order_id: order.id
                        }
                    });
                }
            }
        }
    }
}

// ─── Customers ───────────────────────────────────────

export async function fetchCustomers(userId: string): Promise<CachedClient[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('customers')
            .select('id,user_id,name,email,phone,total_points,total_spent,total_orders,created_at')
            .eq('user_id', userId)
            .limit(500);

        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(
                pending.filter((a: PendingAction) => a.table === 'customers').map((a: PendingAction) => (a.data as HasId).id)
            );
            
            const toSave = data.filter((item: CachedClient) => !pendingIds.has(item.id));
            if (toSave.length > 0) {
                await saveAll('customers', toSave);
            }
            return data as CachedClient[];
        }
        console.warn('[dataAccess] Supabase fetch failed, falling back to local:', error?.message);
    }
    return getAllByUser('customers', userId);
}

export async function createCustomer(data: Record<string, unknown>): Promise<void> {
    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('customers').insert(record);
        if (error) throw new Error(error.message);
        await saveItem('customers', record as unknown as CachedClient);
    } else {
        await saveItem('customers', record as unknown as CachedClient);
        await addPendingAction({ type: 'create', table: 'customers', data: record });
        incrPending();
    }
}

export async function updateCustomer(id: string, data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('customers').update(data).eq('id', id);
        if (error) throw new Error(error.message);
        const existing = await getItem<CachedClient>('customers', id);
        if (existing) {
            await saveItem('customers', { ...existing, ...data } as CachedClient);
        }
    } else {
        const existing = await getItem<CachedClient>('customers', id);
        if (existing) {
            await saveItem('customers', { ...existing, ...data } as CachedClient);
        }
        await addPendingAction({ type: 'update', table: 'customers', data: { ...data, id } });
        incrPending();
    }
}

export async function deleteCustomer(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('customers', id);
    } else {
        await deleteItem('customers', id);
        await addPendingAction({ type: 'delete', table: 'customers', data: { id } });
        incrPending();
    }
}

// ─── Mesas ───────────────────────────────────────────

export async function fetchMesas(userId: string): Promise<CachedTable[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('mesas')
            .select('id,user_id,numero_mesa,capacidade,ativa,created_at')
            .eq('user_id', userId)
            .eq('ativa', true);

        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(
                pending.filter((a: PendingAction) => a.table === 'mesas').map((a: PendingAction) => (a.data as HasId).id)
            );
            
            const toSave = data.filter((item) => !pendingIds.has(item.id));
            if (toSave.length > 0) {
                await saveAll('mesas', toSave);
            }
            return data as CachedTable[];
        }
    }
    return await getAllByUser<CachedTable>('mesas', userId);
}

export async function fetchMesaById(id: string): Promise<CachedTable | undefined> {
    if (getMode() === 'cloud') {
        const { data: mesa, error: mesaError } = await supabase.from('mesas').select('id,user_id,numero_mesa,capacidade,ativa,created_at').eq('id', id).single();
        if (mesaError) throw mesaError;
        await saveItem('mesas', mesa);

        const { data: sessions } = await supabase.from('mesa_sessions').select('id,mesa_id,user_id,garcom,status,opened_at,closed_at,valor_parcial,payment_method,taxa_servico_percent,desconto,total_final').eq('mesa_id', id).is('closed_at', null);
        if (sessions && sessions.length > 0) {
            await saveAll('mesa_sessions', sessions);
            const sessionIds = sessions.map(s => s.id);
            const { data: items } = await supabase.from('mesa_session_items')
                .select('id,session_id,product_id,product_name,quantidade,preco_unitario,preco_total,observacao,created_at,order_id,enviado_cozinha')
                .in('session_id', sessionIds);
            if (items) {
                await saveAll('mesa_session_items', items);
            }
        }
        return mesa as unknown as CachedTable;
    }
    return await getItem<CachedTable>('mesas', id);
}

export async function fetchMesaSessions(userId: string): Promise<CachedMesaSession[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('mesa_sessions')
            .select('id,mesa_id,user_id,garcom,status,opened_at,closed_at,valor_parcial,payment_method,taxa_servico_percent,desconto,total_final')
            .eq('user_id', userId)
            .is('closed_at', null);

        if (!error && data) {
            await saveAll('mesa_sessions', data);
            return data as unknown as CachedMesaSession[];
        }
    }
    return getAllByUser<CachedMesaSession>('mesa_sessions', userId);
}

export async function fetchMesaSessionItems(userId: string): Promise<CachedMesaSessionItem[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('mesa_session_items')
            .select('id,session_id,product_id,product_name,quantidade,preco_unitario,preco_total,observacao,created_at,order_id,enviado_cozinha, mesa_sessions!inner(user_id)')
            .eq('mesa_sessions.user_id', userId);

        if (!error && data) {
            await saveAll('mesa_session_items', data);
            return data as unknown as CachedMesaSessionItem[];
        }
    }
    // mesa_session_items has no user_id — filter via user-owned sessions
    const userSessions = await getAllByUser<CachedMesaSession>('mesa_sessions', userId);
    const sessionIds = new Set(userSessions.map((s) => s.id));
    const allItems = await getAll<CachedMesaSessionItem>('mesa_session_items');
    return allItems.filter((item) => sessionIds.has(item.session_id));
}

export async function createMesa(data: Record<string, unknown>): Promise<void> {
    const userRes = await supabase.auth.getUser();
    if (!userRes.data.user) throw new Error("Usuário não autenticado");
    const userId = userRes.data.user.id;

    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id, user_id: userId };

    if (getMode() === 'cloud') {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch('/api/mesas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(record),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Erro ao criar mesa' }));
            throw new Error(err.error || 'Erro ao criar mesa');
        }
        const { data: created } = await res.json();
        // Non-blocking local cache update
        try {
            await saveItem('mesas', (created || record) as unknown as CachedTable);
        } catch (cacheErr) {
            console.warn('[createMesa] Falha ao salvar no cache local:', cacheErr);
        }
    } else {
        await saveItem('mesas', record as unknown as CachedTable);
        await addPendingAction({ type: 'create', table: 'mesas', data: record });
        incrPending();
    }
}

export async function updateMesa(id: string, data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch('/api/mesas', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ id, ...data }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Erro ao atualizar mesa' }));
            throw new Error(err.error || 'Erro ao atualizar mesa');
        }
        // Non-blocking local cache update
        try {
            const existing = await getItem<CachedTable>('mesas', id);
            if (existing) {
                await saveItem('mesas', { ...existing, ...data } as CachedTable);
            }
        } catch (cacheErr) {
            console.warn('[updateMesa] Falha ao atualizar cache local:', cacheErr);
        }
    } else {
        const existing = await getItem<CachedTable>('mesas', id);
        if (existing) {
            await saveItem('mesas', { ...existing, ...data } as CachedTable);
        }
        await addPendingAction({ type: 'update', table: 'mesas', data: { ...data, id, user_id: existing?.user_id } });
        incrPending();
    }
}

export async function deleteMesa(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch(`/api/mesas?id=${id}`, {
            method: 'DELETE',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Erro ao excluir mesa' }));
            throw new Error(err.error || 'Erro ao excluir mesa');
        }
        // Non-blocking local cache update
        try {
            await deleteItem('mesas', id);
        } catch (cacheErr) {
            console.warn('[deleteMesa] Falha ao excluir do cache local:', cacheErr);
        }
    } else {
        const existing = await getItem<CachedTable>('mesas', id);
        await deleteItem('mesas', id);
        await addPendingAction({ type: 'delete', table: 'mesas', data: { id, user_id: existing?.user_id } });
        incrPending();
    }
}

// ─── Employees ───────────────────────────────────────

export async function fetchEmployeesCached(userId: string): Promise<CachedEmployee[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('employees')
            .select('id,user_id,name,role,phone,email,pin_code,is_active,created_at,is_fixed,permissions,hourly_rate,salario_fixo')
            .eq('user_id', userId)
            .limit(100);

        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(
                pending.filter((a: PendingAction) => a.table === 'employees').map((a: PendingAction) => (a.data as HasId).id)
            );
            
            const toSave = data.filter((item: CachedEmployee) => !pendingIds.has(item.id));
            if (toSave.length > 0) {
                await saveAll('employees', toSave);
            }
            return data as CachedEmployee[];
        }
        console.warn('[dataAccess] Supabase fetch failed, falling back to local:', error?.message);
    }
    return getAllByUser('employees', userId);
}

export async function createEmployee(data: Record<string, unknown>): Promise<void> {
    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('employees').insert(record);
        if (error) throw new Error(error.message);
        await saveItem('employees', record as unknown as CachedEmployee);
    } else {
        await saveItem('employees', record as unknown as CachedEmployee);
        await addPendingAction({ type: 'create', table: 'employees', data: record });
        incrPending();
    }
}

export async function updateEmployee(id: string, data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('employees').update(data).eq('id', id);
        if (error) throw new Error(error.message);
        const existing = await getItem<CachedEmployee>('employees', id);
        if (existing) {
            await saveItem('employees', { ...existing, ...data } as CachedEmployee);
        }
    } else {
        const existing = await getItem<CachedEmployee>('employees', id);
        if (existing) {
            await saveItem('employees', { ...existing, ...data } as CachedEmployee);
        }
        await addPendingAction({ type: 'update', table: 'employees', data: { ...data, id } });
        incrPending();
    }
}

export async function deleteEmployee(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('employees', id);
    } else {
        await deleteItem('employees', id);
        await addPendingAction({ type: 'delete', table: 'employees', data: { id } });
        incrPending();
    }
}

// ─── Loyalty Rewards ─────────────────────────────────

export async function fetchLoyaltyRewards(userId: string): Promise<CachedLoyaltyReward[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase.from('loyalty_rewards').select('id,user_id,name,description,points_cost,reward_type,reward_value,min_order_value,is_active,created_at').eq('user_id', userId);
        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(pending.filter((a: PendingAction) => a.table === 'loyalty_rewards').map((a: PendingAction) => (a.data as HasId).id));
            const toSave = data.filter((item: CachedLoyaltyReward) => !pendingIds.has(item.id));
            if (toSave.length > 0) await saveAll('loyalty_rewards', toSave);
            return data as CachedLoyaltyReward[];
        }
    }
    return getAllByUser('loyalty_rewards', userId);
}

export async function saveLoyaltyReward(data: Record<string, unknown>): Promise<void> {
    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id };
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('loyalty_rewards').upsert(record);
        if (error) throw new Error(error.message);
        await saveItem('loyalty_rewards', record as unknown as CachedLoyaltyReward);
    } else {
        await saveItem('loyalty_rewards', record as unknown as CachedLoyaltyReward);
        await addPendingAction({ type: record.id ? 'update' : 'create', table: 'loyalty_rewards', data: record });
        incrPending();
    }
}

export async function deleteLoyaltyReward(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('loyalty_rewards').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('loyalty_rewards', id);
    } else {
        await deleteItem('loyalty_rewards', id);
        await addPendingAction({ type: 'delete', table: 'loyalty_rewards', data: { id } });
        incrPending();
    }
}

// ─── Loyalty Settings ────────────────────────────────

export async function fetchLoyaltySettings(userId: string): Promise<CachedLoyaltySettings | null> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase.from('loyalty_settings').select('id,user_id,points_per_real,min_points_to_redeem,points_expiry_days,tier_bronze_min,tier_silver_min,tier_gold_min,tier_platinum_min,silver_multiplier,gold_multiplier,platinum_multiplier,is_active,updated_at').eq('user_id', userId).single();
        if (!error && data) {
            await saveItem('loyalty_settings', data as CachedLoyaltySettings);
            return data as CachedLoyaltySettings;
        }
    }
    const local = await getAll<CachedLoyaltySettings>('loyalty_settings');
    return local.find(s => s.user_id === userId) || null;
}

export async function saveLoyaltySettings(data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('loyalty_settings').upsert(data);
        if (error) throw new Error(error.message);
        await saveItem('loyalty_settings', data as unknown as CachedLoyaltySettings);
    } else {
        await saveItem('loyalty_settings', data as unknown as CachedLoyaltySettings);
        await addPendingAction({ type: 'update', table: 'loyalty_settings', data });
        incrPending();
    }
}

// ─── Coupons ─────────────────────────────────────────

export async function fetchCoupons(userId: string): Promise<CachedCoupon[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase.from('coupons').select('id,user_id,code,description,discount_type,discount_value,min_order_value,max_discount,usage_limit,usage_count,valid_from,valid_until,active,first_order_only,created_at').eq('user_id', userId);
        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(pending.filter((a: PendingAction) => a.table === 'coupons').map((a: PendingAction) => (a.data as HasId).id));
            const toSave = data.filter((item: CachedCoupon) => !pendingIds.has(item.id));
            if (toSave.length > 0) await saveAll('coupons', toSave);
            return data as CachedCoupon[];
        }
    }
    return getAllByUser('coupons', userId);
}

export async function saveCoupon(data: Record<string, unknown>): Promise<void> {
    const id = data.id as string || crypto.randomUUID();
    const record = { ...data, id };
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('coupons').upsert(record);
        if (error) throw new Error(error.message);
        await saveItem('coupons', record as unknown as CachedCoupon);
    } else {
        await saveItem('coupons', record as unknown as CachedCoupon);
        await addPendingAction({ type: record.id ? 'update' : 'create', table: 'coupons', data: record });
        incrPending();
    }
}

export async function deleteCoupon(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('coupons').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('coupons', id);
    } else {
        await deleteItem('coupons', id);
        await addPendingAction({ type: 'delete', table: 'coupons', data: { id } });
        incrPending();
    }
}

// ─── App Settings ────────────────────────────────────

export async function fetchAppSettings(userId: string): Promise<CachedAppSetting | null> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase.from('app_settings').select('id,user_id,loyalty_enabled,coupons_enabled,updated_at').eq('user_id', userId).single();
        if (!error && data) {
            await saveItem('app_settings', data as CachedAppSetting);
            return data as CachedAppSetting;
        }
    }
    const local = await getAll<CachedAppSetting>('app_settings');
    return local.find(s => s.user_id === userId) || null;
}

export async function saveAppSettings(data: Record<string, unknown>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('app_settings').upsert(data);
        if (error) throw new Error(error.message);
        await saveItem('app_settings', data as unknown as CachedAppSetting);
    } else {
        await saveItem('app_settings', data as unknown as CachedAppSetting);
        await addPendingAction({ type: 'update', table: 'app_settings', data });
        incrPending();
    }
}

// ─── Product Addons ──────────────────────────────────

export async function fetchProductAddons(userId: string): Promise<CachedProductAddon[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase.from('product_addons').select('id,user_id,name,price,available,created_at').eq('user_id', userId);
        if (!error && data) {
            await saveAll('product_addons', data);
            return data as CachedProductAddon[];
        }
    }
    return getAllByUser('product_addons', userId);
}

export async function fetchAddonGroups(userId: string): Promise<CachedAddonGroup[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase.from('addon_groups').select('id,user_id,name,description,required,max_selection,created_at').eq('user_id', userId);
        if (!error && data) {
            await saveAll('addon_groups', data);
            return data as CachedAddonGroup[];
        }
    }
    return getAllByUser('addon_groups', userId);
}

export async function fetchProductAddonGroups(userId: string): Promise<CachedProductAddonGroup[]> {
    if (getMode() === 'cloud') {
        // Scope by user's products to avoid fetching all rows globally
        const { data: userProducts } = await supabase.from('products').select('id').eq('user_id', userId).limit(200);
        const productIds = userProducts?.map(p => p.id) || [];
        if (productIds.length === 0) return [];
        
        const { data, error } = await supabase.from('product_addon_groups').select('id,product_id,group_id').in('product_id', productIds.slice(0, 100));
        if (!error && data) {
            try { await saveAll('product_addon_groups', data); } catch(e) { console.warn('[dataAccess] cache product_addon_groups failed:', e); }
            return data as CachedProductAddonGroup[];
        }
    }
    // product_addon_groups has no user_id — filter via user-owned products
    const userProducts = await getAllByUser<CachedProduct>('products', userId);
    const productIds = new Set(userProducts.map((p: CachedProduct) => p.id));
    const allPAG = await getAll<CachedProductAddonGroup>('product_addon_groups');
    return allPAG.filter((pag: CachedProductAddonGroup) => productIds.has(pag.product_id));
}

export async function fetchAddonGroupItems(userId: string): Promise<CachedAddonGroupItem[]> {
    if (getMode() === 'cloud') {
        // Scope by user's addon groups to avoid fetching all rows globally
        const { data: userGroups } = await supabase.from('addon_groups').select('id').eq('user_id', userId).limit(100);
        const groupIds = userGroups?.map(g => g.id) || [];
        if (groupIds.length === 0) return [];
        
        const { data, error } = await supabase.from('addon_group_items').select('id,group_id,addon_id').in('group_id', groupIds.slice(0, 100));
        if (!error && data) {
            try { await saveAll('addon_group_items', data); } catch(e) { console.warn('[dataAccess] cache addon_group_items failed:', e); }
            return data as CachedAddonGroupItem[];
        }
    }
    // addon_group_items has no user_id — filter via user-owned addon groups
    const userGroups = await getAllByUser<CachedAddonGroup>('addon_groups', userId);
    const groupIds = new Set(userGroups.map((g: CachedAddonGroup) => g.id));
    const allAGI = await getAll<CachedAddonGroupItem>('addon_group_items');
    return allAGI.filter((agi: CachedAddonGroupItem) => groupIds.has(agi.group_id));
}

// ─── Action Logs ──────────────────────────────────────

export async function fetchActionLogs(userId: string, limit = 50, offset = 0, filters?: { action?: string; entity?: string; from?: string; to?: string }): Promise<{ data: CachedActionLog[], count: number }> {
    if (getMode() === 'cloud') {
        let query = supabase
            .from('action_logs')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (filters?.action) query = query.eq('action_type', filters.action);
        if (filters?.entity) query = query.eq('entity_type', filters.entity);
        if (filters?.from) query = query.gte('created_at', filters.from);
        if (filters?.to) query = query.lte('created_at', filters.to);

        const { data, error, count } = await query;

        if (!error && data) {
            // We don't necessarily want to cache ALL historical logs locally to save space
            // but we can save the most recent chunk
            if (offset === 0) {
                await saveAll('action_logs', data);
            }
            return { data: data as CachedActionLog[], count: count || 0 };
        }
    }

    // Local fallback
    const all = await getAll<CachedActionLog>('action_logs');
    let filtered = all.filter(l => l.user_id === userId);
    if (filters?.action) filtered = filtered.filter(l => l.action_type === filters.action);
    if (filters?.entity) filtered = filtered.filter(l => l.entity_type === filters.entity);
    if (filters?.from) {
        const fromDate = new Date(filters.from);
        filtered = filtered.filter(l => new Date(l.created_at) >= fromDate);
    }
    if (filters?.to) {
        const toDate = new Date(filters.to);
        filtered = filtered.filter(l => new Date(l.created_at) <= toDate);
    }
    
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return {
        data: filtered.slice(offset, offset + limit),
        count: filtered.length
    };
}

export async function addActionLogDAL(record: CachedActionLog): Promise<void> {
    // Optimization: Logs are always saved locally immediately
    // If online AND mode is cloud, we ALSO try Supabase
    // But logs are secondary, so we don't necessarily WAIT if it's slow
    
    await saveItem('action_logs', record);

    // Sanitize: only send valid DB columns to prevent 400 errors
    const sanitized = {
        id: record.id,
        user_id: record.user_id,
        action_type: record.action_type,
        entity_type: record.entity_type,
        entity_id: record.entity_id || null,
        entity_name: record.entity_name || null,
        description: record.description,
        metadata: record.metadata || null,
        ip_address: record.ip_address || null,
        user_agent: record.user_agent || null,
        created_at: record.created_at,
    };

    if (getMode() === 'cloud') {
        supabase.from('action_logs').insert(sanitized).then(({error}) => {
            if (error) console.warn('[dataAccess] Background log sync failed:', error.message);
        });
    } else {
        // Queue for sync later
        await addPendingAction({ type: 'create', table: 'action_logs', data: sanitized });
        incrPending();
    }
}

export async function clearActionLogsDAL(userId: string, olderThan?: string): Promise<void> {
    if (getMode() === 'cloud') {
        let query = supabase.from('action_logs').delete().eq('user_id', userId);
        if (olderThan) query = query.lt('created_at', olderThan);
        const { error } = await query;
        if (error) throw new Error(error.message);
    }

    // Local cleanup
    const localQuery = db.action_logs.where('user_id').equals(userId);
    if (olderThan) {
        await localQuery.and(l => new Date(l.created_at) < new Date(olderThan)).delete();
    } else {
        await localQuery.delete();
    }

    if (getMode() !== 'cloud') {
        await addPendingAction({ 
            type: olderThan ? 'clear_logs' : 'delete_all', 
            table: 'action_logs', 
            data: { userId, olderThan } 
        });
        incrPending();
    }
}

// ─── Cash Flow ────────────────────────────────────────

export async function fetchCashFlow(userId: string, from?: string, to?: string): Promise<CachedCashFlow[]> {
    if (getMode() === 'cloud') {
        let query = supabase
            .from('cash_flow')
            .select('id,user_id,type,category,description,amount,payment_method,transaction_date,created_at')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false });
        
        if (from) query = query.gte('transaction_date', from);
        if (to) query = query.lte('transaction_date', to);

        const { data, error } = await query;

        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(pending.filter((a: PendingAction) => a.table === 'cash_flow').map((a: PendingAction) => (a.data as HasId).id));
            const toSave = data.filter((item: CachedCashFlow) => !pendingIds.has(item.id));
            if (toSave.length > 0) await saveAll('cash_flow', toSave);
            return data as CachedCashFlow[];
        }
    }

    const all = await getAll<CachedCashFlow>('cash_flow');
    let filtered = all.filter(c => c.user_id === userId);
    if (from) filtered = filtered.filter(c => c.transaction_date >= from);
    if (to) filtered = filtered.filter(c => c.transaction_date <= to);
    filtered.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    return filtered;
}

export async function createCashFlowEntry(data: Partial<CachedCashFlow>): Promise<void> {
    const id = data.id || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('cash_flow').insert(record);
        if (error) throw new Error(error.message);
        await saveItem('cash_flow', record);
    } else {
        await saveItem('cash_flow', record);
        await addPendingAction({ type: 'create', table: 'cash_flow', data: record });
        incrPending();
    }
}

export async function deleteCashFlowEntry(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('cash_flow').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('cash_flow', id);
    } else {
        await deleteItem('cash_flow', id);
        await addPendingAction({ type: 'delete', table: 'cash_flow', data: { id } });
        incrPending();
    }
}

export async function updateProductAddonGroups(productId: string, groupIds: string[]) {
    // 1. Local update
    await db.transaction('rw', db.product_addon_groups, async () => {
        await db.product_addon_groups.where('product_id').equals(productId).delete();
        if (groupIds.length > 0) {
            await db.product_addon_groups.bulkAdd(groupIds.map(groupId => ({
                id: crypto.randomUUID(),
                product_id: productId,
                group_id: groupId,
                created_at: new Date().toISOString()
            })));
        }
    });

    // 2. Queue sync actions
    await addPendingAction({
        table: 'product_addon_groups',
        type: 'replace_relationships', // Custom action handled by offlineSync
        data: { productId, groupIds }
    });
}

// ─── Bills ────────────────────────────────────────────

export async function fetchBills(userId: string): Promise<CachedBill[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('bills')
            .select('id,user_id,type,description,category,amount,due_date,payment_date,status,supplier_customer,notes,recurrence,recurrence_end_date,created_at')
            .eq('user_id', userId)
            .order('due_date', { ascending: true })
            .limit(200);

        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(pending.filter((a: PendingAction) => a.table === 'bills').map((a: PendingAction) => (a.data as HasId).id));
            const toSave = data.filter((item: CachedBill) => !pendingIds.has(item.id));
            if (toSave.length > 0) await saveAll('bills', toSave);
            return data as CachedBill[];
        }
    }

    const all = await getAll<CachedBill>('bills');
    return all.filter(b => b.user_id === userId).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
}

export async function createBillDAL(data: Partial<CachedBill>): Promise<void> {
    const id = data.id || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('bills').insert(record);
        if (error) throw new Error(error.message);
        await saveItem('bills', record);
    } else {
        await saveItem('bills', record);
        await addPendingAction({ type: 'create', table: 'bills', data: record });
        incrPending();
    }
}

export async function updateBillDAL(id: string, data: Partial<CachedBill>): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('bills').update(data).eq('id', id);
        if (error) throw new Error(error.message);
        const existing = await getItem<CachedBill>('bills', id);
        if (existing) await saveItem('bills', { ...existing, ...data });
    } else {
        const existing = await getItem<CachedBill>('bills', id);
        if (existing) await saveItem('bills', { ...existing, ...data });
        await addPendingAction({ type: 'update', table: 'bills', data: { id, ...data } });
        incrPending();
    }
}

export async function deleteBillDAL(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('bills').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('bills', id);
    } else {
        await deleteItem('bills', id);
        await addPendingAction({ type: 'delete', table: 'bills', data: { id } });
        incrPending();
    }
}

export async function markBillPaidDAL(
    bill: CachedBill, 
    userId: string, 
    paymentDate: string,
    nextDueDate?: string
): Promise<void> {
    // 1. Update current bill
    const updateData: Partial<CachedBill> = { status: 'paid', payment_date: paymentDate };
    await updateBillDAL(bill.id, updateData);

    // 2. Create cash flow entry
    const cashFlowData: Partial<CachedCashFlow> = {
        user_id: userId,
        type: bill.type === 'payable' ? 'expense' : 'income',
        category: bill.category,
        description: bill.description,
        amount: bill.amount,
        transaction_date: paymentDate,
        reference_type: 'bill',
        reference_id: bill.id
    };
    await createCashFlowEntry(cashFlowData);

    // 3. Handle recurrence
    if (nextDueDate) {
        const recurringData: Partial<CachedBill> = {
            user_id: userId,
            type: bill.type,
            description: bill.description,
            category: bill.category,
            amount: bill.amount,
            due_date: nextDueDate,
            supplier_customer: bill.supplier_customer,
            notes: bill.notes,
            status: 'pending',
            recurrence: bill.recurrence,
            recurrence_end_date: bill.recurrence_end_date
        };
        await createBillDAL(recurringData);
    }
}

// ─── Bill Categories ──────────────────────────────────

export async function fetchBillCategories(userId: string): Promise<CachedBillCategory[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('bill_categories')
            .select('id,user_id,name,type,icon,color,created_at')
            .eq('user_id', userId);

        if (!error && data) {
            const pending = await getPendingActions();
            const pendingIds = new Set(pending.filter((a: PendingAction) => a.table === 'bill_categories').map((a: PendingAction) => (a.data as HasId).id));
            const toSave = data.filter((item: CachedBillCategory) => !pendingIds.has(item.id));
            if (toSave.length > 0) await saveAll('bill_categories', toSave);
            return data as CachedBillCategory[];
        }
    }

    return (await getAll<CachedBillCategory>('bill_categories')).filter(c => c.user_id === userId);
}

export async function createBillCategoryDAL(data: Partial<CachedBillCategory>): Promise<void> {
    // Prevent duplicates based on name/type/user_id constraint
    const existing = await getAll<CachedBillCategory>('bill_categories');
    const duplicate = existing.find(c => 
        c.user_id === data.user_id && 
        data.name && c.name.toLowerCase() === data.name.toLowerCase() && 
        c.type === data.type
    );

    if (duplicate) {
        console.warn(`[DAL] Bill category already exists: ${data.name} (${data.type})`);
        return;
    }

    const id = data.id || crypto.randomUUID();
    const record = { ...data, id };

    if (getMode() === 'cloud') {
        const { error } = await supabase.from('bill_categories').insert(record);
        if (error) throw new Error(error.message);
        await saveItem('bill_categories', record);
    } else {
        await saveItem('bill_categories', record);
        await addPendingAction({ type: 'create', table: 'bill_categories', data: record });
        incrPending();
    }
}

export async function deleteBillCategoryDAL(id: string): Promise<void> {
    if (getMode() === 'cloud') {
        const { error } = await supabase.from('bill_categories').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await deleteItem('bill_categories', id);
    } else {
        await deleteItem('bill_categories', id);
        await addPendingAction({ type: 'delete', table: 'bill_categories', data: { id } });
        incrPending();
    }
}
