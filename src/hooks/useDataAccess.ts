'use client';

// ─────────────────────────────────────────────────────
// useDataAccess — React hook wrapper for the unified data access layer.
// Provides data functions that automatically route through
// Cloud (Supabase) or Local (Dexie) based on the current storageMode.
// ─────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useStorageStore } from '@/infra/persistence/useStorageStore';
import * as dataAccess from '@/repositories/dataAccess';

export function useDataAccess() {
    // Subscribe to storageMode so components re-render when it changes
    const storageMode = useStorageStore((s) => s.storageMode);

    // Memoize so object reference is stable when storageMode doesn't change
    return useMemo(() => ({
        storageMode,

        // Products
        fetchProducts: dataAccess.fetchProducts,
        createProduct: dataAccess.createProduct,
        updateProduct: dataAccess.updateProduct,
        deleteProduct: dataAccess.deleteProduct,

        // Categories
        fetchCategories: dataAccess.fetchCategories,
        createCategory: dataAccess.createCategory,
        updateCategory: dataAccess.updateCategory,
        deleteCategory: dataAccess.deleteCategory,

        // Orders
        fetchOrders: dataAccess.fetchOrders,
        createOrder: dataAccess.createOrder,
        updateOrder: dataAccess.updateOrder,
    }), [storageMode]);
}
