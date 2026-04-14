'use client';

import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import React, { useState } from 'react';
import { db } from '@/lib/db';

// ────────────────────────────────────────────
// Async Storage adapter usando Dexie (IndexedDB)
// Persiste o cache do React Query no IndexedDB
// ────────────────────────────────────────────
const dexieAsyncStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            const entry = await db.queryCache.get(key);
            return entry?.value ?? null;
        } catch {
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await db.queryCache.put({ key, value });
        } catch {
            // Silently fail — cache persistence is best-effort
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await db.queryCache.delete(key);
        } catch {
            // Silently fail
        }
    },
};

const persister = createAsyncStoragePersister({
    storage: dexieAsyncStorage,
    key: 'ligeirinho-query-cache',
});

const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minuto de dados "frescos" por padrão
                        gcTime: TWENTY_FOUR_HOURS, // Manter cache por 24h para persistência
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: TWENTY_FOUR_HOURS,
                buster: 'v1', // Incrementar para invalidar cache antigo
            }}
        >
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </PersistQueryClientProvider>
    );
}
