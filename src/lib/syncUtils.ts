/**
 * Sync Utilities
 * Helper functions for managing local database sync state and recovery.
 */

import { getDb } from './db';
import { syncPendingActions, cacheDataForOffline } from './offlineSync';
import { useStorageStore } from '@/stores/useStorageStore';

/**
 * Validatable Dexie store names for current schema
 */
const VALID_STORES = [
    'products', 'categories', 'orders', 'order_items', 'order_item_addons',
    'customers', 'mesas', 'employees', 'mesa_sessions', 'mesa_session_items',
    'loyalty_rewards', 'loyalty_settings', 'coupons', 'app_settings',
    'userSettings', 'action_logs', 'cash_flow', 'product_addons',
    'addon_groups', 'product_addon_groups', 'addon_group_items',
    'bills', 'bill_categories'
];

/**
 * Manually force a full sync:
 * 1. Pushes pending actions
 * 2. Refreshes local cache from cloud
 */
export async function forceSyncRefresh(userId: string) {
    console.log('[SyncUtil] Starting force sync refresh...');
    
    try {
        // 1. Process pending changes
        const pushResult = await syncPendingActions();
        console.log(`[SyncUtil] Push completed: ${pushResult.synced} synced, ${pushResult.failed} failed`);

        // 2. Refresh local cache
        await cacheDataForOffline(userId);
        console.log('[SyncUtil] Cache refresh completed.');

        return pushResult;
    } catch (err) {
        console.error('[SyncUtil] Force sync failed:', err);
        throw err;
    }
}

/**
 * Cleans the pendingActions queue by removing entries for tables that no longer exist.
 * This is useful for clearing InvalidTableErrors caused by stale database state.
 */
export async function sanitizePendingActions() {
    console.log('[SyncUtil] Sanitizing pending actions...');
    const db = getDb();
    
    try {
        const pending = await db.pendingActions.toArray();
        const invalidIds: string[] = [];

        for (const action of pending) {
            // Check if table name is in our known list (directly or via map in offlineSync)
            if (!VALID_STORES.includes(action.table) && action.table !== 'loyalty_reward_variants') {
                console.warn(`[SyncUtil] Removing pending action for non-existent table: ${action.table}`);
                invalidIds.push(action.id);
            }
        }

        if (invalidIds.length > 0) {
            await db.pendingActions.bulkDelete(invalidIds);
            console.log(`[SyncUtil] Removed ${invalidIds.length} invalid actions.`);
            
            // Re-calculate store count
            const remaining = await db.pendingActions.count();
            useStorageStore.setState({ pendingChangesCount: remaining });
        } else {
            console.log('[SyncUtil] No invalid actions found.');
        }

        return invalidIds.length;
    } catch (err) {
        console.error('[SyncUtil] Sanitization failed:', err);
        throw err;
    }
}

// Expose to window for emergency console use
if (typeof window !== 'undefined') {
    (window as any).forceSyncRefresh = forceSyncRefresh;
    (window as any).sanitizePendingActions = sanitizePendingActions;
    (window as any).runMigrationCleanup = async (userId: string) => {
        await sanitizePendingActions();
        const res = await forceSyncRefresh(userId);
        alert(`Cleanup completed!\nSynced: ${res.synced}\nFailed: ${res.failed}`);
    };
}
