// ─────────────────────────────────────────────────────
// Unified Data Access Layer
// Routes reads/writes through Cloud (Supabase) or Local (Dexie)
// based on the current storageMode from Zustand.
// ─────────────────────────────────────────────────────

import { supabase } from './supabase';
import { addPendingAction, saveAll, saveItem, getAll, getItem, deleteItem } from './offlineStorage';
import { useStorageStore } from '@/stores/useStorageStore';
import type {
    CachedProduct,
    CachedCategory,
    CachedOrder,
} from './db';

// ─── Helpers ─────────────────────────────────────────

function getMode() {
    const state = useStorageStore.getState();
    // Use local storage if explicitly set OR if the device has no internet connection
    if (!state.hardwareOnline) return 'local';
    return state.storageMode;
}

function incrPending(count = 1) {
    useStorageStore.getState().incrementPending(count);
}

// ─── Products ────────────────────────────────────────

export async function fetchProducts(userId: string): Promise<CachedProduct[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            // Cache locally for offline fallback
            await saveAll('products', data);
            return data as CachedProduct[];
        }
        // Fallback to local on error
        console.warn('[dataAccess] Supabase fetch failed, falling back to local:', error?.message);
    }

    return getAll('products');
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
        const existing = await getItem<any>('products', id);
        if (existing) {
            await saveItem('products', { ...existing, ...data } as CachedProduct);
        }
    } else {
        const existing = await getItem<any>('products', id);
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
            const existing = await getItem<any>('products', update.id);
            if (existing) {
                await saveItem('products', { ...existing, ...update } as CachedProduct);
            }
        }
    } else {
        for (const update of updates) {
            const existing = await getItem<any>('products', update.id);
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
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            await saveAll('categories', data);
            return data as CachedCategory[];
        }
        console.warn('[dataAccess] Supabase categories fetch failed, falling back to local:', error?.message);
    }

    return getAll('categories');
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
        const existing = await getItem<any>('categories', id);
        if (existing) {
            await saveItem('categories', { ...existing, ...data } as CachedCategory);
        }
    } else {
        const existing = await getItem<any>('categories', id);
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
            const existing = await getItem<any>('categories', update.id);
            if (existing) {
                await saveItem('categories', { ...existing, ...update } as CachedCategory);
            }
        }
    } else {
        for (const update of updates) {
            const existing = await getItem<any>('categories', update.id);
            if (existing) {
                await saveItem('categories', { ...existing, ...update } as CachedCategory);
            }
            await addPendingAction({ type: 'update', table: 'categories', data: update });
        }
        incrPending(updates.length);
    }
}

// ─── Orders ──────────────────────────────────────────

export async function fetchOrders(userId: string, limit = 50): Promise<CachedOrder[]> {
    if (getMode() === 'cloud') {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (!error && data) {
            await saveAll('orders', data);
            return data as CachedOrder[];
        }
        console.warn('[dataAccess] Supabase orders fetch failed, falling back to local:', error?.message);
    }

    return getAll('orders');
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
        const existing = await getItem<any>('orders', id);
        if (existing) {
            await saveItem('orders', { ...existing, ...data } as CachedOrder);
        }
    } else {
        const existing = await getItem<any>('orders', id);
        if (existing) {
            await saveItem('orders', { ...existing, ...data } as CachedOrder);
        }
        await addPendingAction({ type: 'update', table: 'orders', data: { ...data, id } });
        incrPending();
    }
}

export async function createFullOrder(
    orderData: any,
    orderItems: any[],
    itemAddons: any[],
    loyaltyData?: any,
    couponData?: any
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
                const mappedAddons = [];
                let itemIndex = 0;
                for (const addon of itemAddons) {
                    if (addon.itemIndex !== undefined) {
                        itemIndex = addon.itemIndex;
                    }
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
        await saveItem('orders', record as unknown as CachedOrder);
    } else {
        await saveItem('orders', record as unknown as CachedOrder);
        await addPendingAction({
            type: 'create_full_order',
            table: 'orders',
            data: { orderData: record, orderItems, itemAddons, loyaltyData, couponData }
        });
        incrPending();
    }
}
