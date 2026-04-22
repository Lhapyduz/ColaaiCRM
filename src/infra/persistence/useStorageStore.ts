'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────
export type StorageMode = 'cloud' | 'local';

interface StorageState {
    storageMode: StorageMode;
    pendingChangesCount: number;
    lastSyncedAt: string | null;
    syncing: boolean;
    hardwareOnline: boolean;
    _hasHydrated: boolean;
}

interface StorageActions {
    setStorageMode: (mode: StorageMode) => void;
    incrementPending: (count?: number) => void;
    decrementPending: (count?: number) => void;
    resetPending: () => void;
    setSyncing: (syncing: boolean) => void;
    setLastSyncedAt: (timestamp: string | null) => void;
    setHardwareOnline: (online: boolean) => void;
    setHasHydrated: (state: boolean) => void;
}

type StorageStore = StorageState & StorageActions;

// ─── Default values (SSR-safe) ───────────────────────
const DEFAULT_STATE: StorageState = {
    storageMode: 'cloud',
    pendingChangesCount: 0,
    lastSyncedAt: null,
    syncing: false,
    hardwareOnline: true,
    _hasHydrated: false,
};

// ─── Store ───────────────────────────────────────────
export const useStorageStore = create<StorageStore>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,

            setStorageMode: (mode) => set({ storageMode: mode }),

            incrementPending: (count = 1) =>
                set((s) => ({ pendingChangesCount: s.pendingChangesCount + count })),

            decrementPending: (count = 1) =>
                set((s) => ({ pendingChangesCount: Math.max(0, s.pendingChangesCount - count) })),

            resetPending: () => set({ pendingChangesCount: 0 }),

            setSyncing: (syncing) => set({ syncing }),

            setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),

            setHardwareOnline: (online) => set({ hardwareOnline: online }),

            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'cola-ai-storage',
            storage: createJSONStorage(() => {
                // SSR guard: return a no-op storage during SSR
                if (typeof window === 'undefined') {
                    return {
                        getItem: () => null,
                        setItem: () => {},
                        removeItem: () => {},
                    };
                }
                return localStorage;
            }),
            // Only persist user preference fields, NOT transient state
            partialize: (state) => ({
                storageMode: state.storageMode,
                lastSyncedAt: state.lastSyncedAt,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

// ─── Hydration-safe hook ─────────────────────────────
// Components should use this to avoid SSR flicker
export function useHydratedStorage() {
    const store = useStorageStore();
    const hasHydrated = useStorageStore((s) => s._hasHydrated);

    if (!hasHydrated) {
        // Return defaults during SSR / before hydration
        return { ...DEFAULT_STATE, ...store, _hasHydrated: false };
    }

    return store;
}
