import Dexie, { type Table } from 'dexie';

// ────────────────────────────────────────────
// Interfaces tipadas para o cache local
// Derivadas de database.types.ts (Supabase)
// ────────────────────────────────────────────

export interface CachedProduct {
    id: string;
    user_id: string;
    name: string;
    price: number;
    description: string | null;
    image_url: string | null;
    category_id: string | null;
    available: boolean | null;
    created_at: string | null;
}

export interface CachedCategory {
    id: string;
    user_id: string;
    name: string;
    icon: string | null;
    color: string | null;
    created_at: string | null;
}

export interface CachedOrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
}

export interface CachedOrder {
    id: string;
    user_id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    status: string | null;
    payment_method: string;
    payment_status: string | null;
    subtotal: number;
    total: number;
    delivery_fee: number | null;
    is_delivery: boolean | null;
    notes: string | null;
    user_slug: string | null;
    created_at: string | null;
    updated_at: string | null;
    order_items?: CachedOrderItem[];
}

export interface CachedUserSetting {
    id: string;
    user_id: string;
    app_name: string;
    slogan: string | null;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    whatsapp_number: string | null;
    public_slug: string | null;
    pix_key: string | null;
    pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null;
    merchant_city: string | null;
    sidebar_order: string[] | null;
    hidden_sidebar_items: string[] | null;
    access_token: string | null;
    delivery_fee_type: 'fixed' | 'neighborhood' | null;
    delivery_fee_value: number | null;
    store_open: boolean | null;
    delivery_time_min: number | null;
    delivery_time_max: number | null;
    sidebar_color: string | null;
}

export interface PendingAction {
    id: string;
    type: 'create' | 'update' | 'delete';
    table: string;
    data: Record<string, unknown>;
    timestamp: number;
}

/** Entrada genérica do cache do React Query */
export interface QueryCacheEntry {
    key: string;
    value: string;
}

// ────────────────────────────────────────────
// Database Dexie com tipagem forte
// ────────────────────────────────────────────

export class LigeirinhoDB extends Dexie {
    products!: Table<CachedProduct, string>;
    categories!: Table<CachedCategory, string>;
    orders!: Table<CachedOrder, string>;
    userSettings!: Table<CachedUserSetting, string>;
    pendingActions!: Table<PendingAction, string>;
    queryCache!: Table<QueryCacheEntry, string>;

    constructor() {
        super('ligeirinho-offline-dexie');

        this.version(1).stores({
            products: 'id',
            categories: 'id',
            orders: 'id, status',
            settings: 'key',
            pendingActions: 'id, timestamp'
        });

        // v2: remove store antiga 'settings' (PK=key) e cria 'userSettings' (PK=user_id)
        this.version(2).stores({
            settings: null, // deleta a store antiga
            userSettings: 'user_id'
        });

        // v3: adiciona store para cache do React Query
        this.version(3).stores({
            queryCache: 'key'
        });
    }
}

export const db = new LigeirinhoDB();
