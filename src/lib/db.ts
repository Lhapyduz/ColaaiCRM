import Dexie, { type Table } from 'dexie';
import type { 
    CachedProduct, CachedCategory, CachedOrder, CachedOrderItem, 
    CachedOrderItemAddon, CachedUserSetting, CachedClient, CachedTable, 
    CachedEmployee, CachedActionLog, CachedCashFlow, CachedMesaSession, 
    CachedMesaSessionItem, CachedLoyaltyReward, CachedLoyaltySettings, 
    CachedCoupon, CachedAppSetting, CachedProductAddon, CachedAddonGroup, 
    CachedProductAddonGroup, CachedAddonGroupItem, CachedBill, CachedBillCategory,
    PendingAction, QueryCacheEntry
} from '@/types/db';

declare global {
  interface Window {
    resetDatabase?: typeof resetDatabase;
    getDb?: typeof getDb;
    clearPendingActions?: typeof clearPendingActions;
  }
}

// ────────────────────────────────────────────
// Database Dexie com tipagem forte
// ────────────────────────────────────────────

// Core singleton instance
let _db: LigeirinhoDB | null = null;
let _resetting = false;

/**
 * Check if an error is a database schema/version error that needs a reset.
 */
function _isSchemaError(err: unknown): boolean {
    if (!err) return false;
    const msg = String(err);
    return (
        msg.includes('VersionError') ||
        msg.includes('UpgradeError') ||
        msg.includes('NotFoundError') ||
        msg.includes('No such table') ||
        msg.includes('version change transaction was aborted')
    );
}

/**
 * Internal init — creates/returns the singleton.
 */
function _initDb(): LigeirinhoDB {
    if (typeof window === 'undefined') {
        // Return a mock object for SSR to avoid "db is undefined" errors during compilation
        return {} as unknown as LigeirinhoDB;
    }
    if (!_db) {
        try {
            _db = new LigeirinhoDB();
            
            // Cross-browser resilience: handle version conflicts
            _db.on('blocked', () => {
                console.warn('[db] Database upgrade blocked — another tab may be open. Closing...');
                _db?.close();
            });
            
            _db.on('versionchange', () => {
                console.warn('[db] Database version changed in another tab. Closing for upgrade...');
                _db?.close();
                _db = null;
            });
        } catch (err) {
            console.error('[db] Failed to instantiate Dexie:', err);
            throw err;
        }
    }
    return _db;
}

/**
 * Primary database interface.
 * Uses a Proxy for lazy initialization and cross-browser error recovery.
 */
export const db: LigeirinhoDB = new Proxy({} as LigeirinhoDB, {
    get(_, prop) {
        if (typeof window === 'undefined') return undefined;
        
        try {
            const instance = _initDb();
            const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
            
            // If it's a function (like .table() or .transaction()), bind it to the instance
            if (typeof value === 'function') {
                return value.bind(instance);
            }
            return value;
        } catch (err) {
            if (_isSchemaError(err) && !_resetting) {
                console.error('[db] Schema error detected, auto-resetting:', err);
                _resetting = true;
                resetDatabase();
            }
            console.error(`[db] Proxy access error for property "${String(prop)}":`, err);
            return undefined;
        }
    }
});

/**
 * Public getter (Legacy/Internal) — returns the singleton directly.
 * Prefer using the 'db' export instead.
 */
export function getDb(): LigeirinhoDB {
    return _initDb();
}

export class LigeirinhoDB extends Dexie {
    products!: Table<CachedProduct, string>;
    categories!: Table<CachedCategory, string>;
    orders!: Table<CachedOrder, string>;
    order_items!: Table<CachedOrderItem, string>;
    order_item_addons!: Table<CachedOrderItemAddon, string>;
    customers!: Table<CachedClient, string>;
    mesas!: Table<CachedTable, string>;
    employees!: Table<CachedEmployee, string>;
    mesa_sessions!: Table<CachedMesaSession, string>;
    mesa_session_items!: Table<CachedMesaSessionItem, string>;
    loyalty_rewards!: Table<CachedLoyaltyReward, string>;
    loyalty_settings!: Table<CachedLoyaltySettings, string>;
    coupons!: Table<CachedCoupon, string>;
    app_settings!: Table<CachedAppSetting, string>;
    userSettings!: Table<CachedUserSetting, string>;
    pendingActions!: Table<PendingAction, string>;
    queryCache!: Table<QueryCacheEntry, string>;
    action_logs!: Table<CachedActionLog, string>;
    cash_flow!: Table<CachedCashFlow, string>;
    product_addons!: Table<CachedProductAddon, string>;
    addon_groups!: Table<CachedAddonGroup, string>;
    product_addon_groups!: Table<CachedProductAddonGroup, string>;
    addon_group_items!: Table<CachedAddonGroupItem, string>;
    bills!: Table<CachedBill, string>;
    bill_categories!: Table<CachedBillCategory, string>;

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

        // v4: adiciona index para 'user_id' nos stores principais
        this.version(4).stores({
            products: 'id, user_id',
            categories: 'id, user_id',
            orders: 'id, user_id, status'
        });

        // v5: adiciona stores para customers, mesas e employees
        this.version(5).stores({
            products: 'id, user_id',
            categories: 'id, user_id',
            orders: 'id, user_id, status',
            customers: 'id, user_id',
            mesas: 'id, user_id',
            employees: 'id, user_id'
        });

        // v6: adiciona stores para sessões de mesa
        this.version(6).stores({
            products: 'id, user_id',
            categories: 'id, user_id',
            orders: 'id, user_id, status',
            customers: 'id, user_id',
            mesas: 'id, user_id',
            employees: 'id, user_id',
            mesa_sessions: 'id, mesa_id, user_id',
            mesa_session_items: 'id, session_id'
        });

        // v7: adiciona order_items
        this.version(7).stores({
            products: 'id, user_id',
            categories: 'id, user_id',
            orders: 'id, user_id, status',
            order_items: 'id, order_id',
            customers: 'id, user_id',
            mesas: 'id, user_id',
            employees: 'id, user_id',
            mesa_sessions: 'id, mesa_id, user_id',
            mesa_session_items: 'id, session_id'
        });

        // v8: adiciona loyalty e coupons
        this.version(8).stores({
            products: 'id, user_id',
            categories: 'id, user_id',
            orders: 'id, user_id, status',
            order_items: 'id, order_id',
            customers: 'id, user_id',
            mesas: 'id, user_id',
            employees: 'id, user_id',
            mesa_sessions: 'id, mesa_id, user_id',
            mesa_session_items: 'id, session_id',
            loyalty_rewards: 'id, user_id',
            loyalty_settings: 'id, user_id',
            coupons: 'id, user_id, code',
            app_settings: 'id, user_id'
        });

        // v11: adiciona fluxo de caixa
        this.version(11).stores({
            products: 'id, user_id',
            categories: 'id, user_id',
            orders: 'id, user_id, status, created_at',
            order_items: 'id, order_id',
            customers: 'id, user_id',
            mesas: 'id, user_id',
            employees: 'id, user_id',
            mesa_sessions: 'id, mesa_id, user_id',
            mesa_session_items: 'id, session_id',
            loyalty_rewards: 'id, user_id',
            loyalty_settings: 'id, user_id',
            coupons: 'id, user_id, code',
            app_settings: 'id, user_id',
            action_logs: 'id, user_id, action_type, entity_type, created_at',
            cash_flow: 'id, user_id, type, transaction_date, created_at',
            product_addons: 'id, user_id',
            addon_groups: 'id, user_id',
            product_addon_groups: 'id, product_id, group_id',
            addon_group_items: 'id, group_id, addon_id'
        });

        // v13: adiciona order_item_addons
        this.version(13).stores({
            products: 'id, user_id',
            categories: 'id, user_id',
            orders: 'id, user_id, status, created_at',
            order_items: 'id, order_id',
            order_item_addons: 'id, order_item_id',
            customers: 'id, user_id',
            mesas: 'id, user_id',
            employees: 'id, user_id',
            mesa_sessions: 'id, mesa_id, user_id',
            mesa_session_items: 'id, session_id',
            loyalty_rewards: 'id, user_id',
            loyalty_settings: 'id, user_id',
            coupons: 'id, user_id, code',
            app_settings: 'id, user_id',
            action_logs: 'id, user_id, action_type, entity_type, created_at',
            cash_flow: 'id, user_id, type, transaction_date, created_at',
            product_addons: 'id, user_id',
            addon_groups: 'id, user_id',
            product_addon_groups: 'id, product_id, group_id',
            addon_group_items: 'id, group_id, addon_id',
            bills: 'id, user_id, type, status, due_date',
            bill_categories: 'id, user_id, type'
        });
    }
}

/**
 * Utilitário para resetar o banco de dados em caso de erro crítico de esquema.
 * Usa Dexie.delete diretamente para garantir que o banco seja apagado mesmo se houver erro de instância.
 */
export async function resetDatabase() {
    if (typeof window === 'undefined') return;
    try {
        console.log('[db] Solicitando reset do banco de dados...');
        
        // Se houver uma instância aberta, fecha ela
        if (_db) {
            _db.close();
            _db = null;
        }
        
        // Deleta o banco pelo nome (mais robusto)
        await Dexie.delete('ligeirinho-offline-dexie');
        
        console.log('[db] Banco de dados deletado com sucesso. Recarregando página...');
        _resetting = false;
        window.location.reload();
    } catch (err) {
        console.error('[db] Erro ao resetar banco de dados:', err);
        _resetting = false;
        // Fallback: tenta apagar via IndexedDB API pura se o Dexie falhar
        const req = window.indexedDB.deleteDatabase('ligeirinho-offline-dexie');
        req.onsuccess = () => window.location.reload();
        req.onerror = () => alert('Falha crítica ao resetar banco. Por favor, limpe os dados do site manualmente.');
    }
}

/**
 * Limpa todas as ações pendentes (útil quando ficam travadas/stale).
 */
export async function clearPendingActions() {
    if (typeof window === 'undefined') return;
    try {
        const count = await db.pendingActions.count();
        await db.pendingActions.clear();
        console.log(`[db] ${count} pending actions cleared.`);
        return count;
    } catch (err) {
        console.error('[db] Error clearing pending actions:', err);
        return 0;
    }
}

// Exposição global para acesso via console (útil para suporte e debug)
if (typeof window !== 'undefined') {
    window.resetDatabase = resetDatabase;
    window.getDb = getDb;
    window.clearPendingActions = clearPendingActions;
}


