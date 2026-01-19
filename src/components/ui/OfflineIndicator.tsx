'use client';

import React from 'react';
import { FiWifi, FiWifiOff, FiRefreshCw, FiClock } from 'react-icons/fi';
import { useOffline } from '@/contexts/OfflineContext';
import { cn } from '@/lib/utils';

export default function OfflineIndicator() {
    const { online, pendingCount, syncing, lastSync, syncNow } = useOffline();

    const formatLastSync = () => {
        if (!lastSync) return 'Nunca';
        const date = new Date(lastSync);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min atrás`;
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    if (online && pendingCount === 0) {
        return null;
    }

    return (
        <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-[0.8125rem] font-medium transition-all duration-fast',
            online
                ? 'bg-[rgba(243,156,18,0.1)] text-[#f39c12] border border-[rgba(243,156,18,0.3)]'
                : 'bg-[rgba(231,76,60,0.1)] text-error border border-[rgba(231,76,60,0.3)]'
        )}>
            {online ? (
                <>
                    <FiWifi className="text-base" />
                    {pendingCount > 0 && (
                        <span className="px-2 py-0.5 bg-black/20 rounded-sm text-xs">
                            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                        </span>
                    )}
                    <button
                        className="flex items-center justify-center p-1.5 bg-transparent border border-current rounded-sm text-inherit cursor-pointer transition-all duration-fast hover:enabled:bg-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={syncNow}
                        disabled={syncing}
                        title="Sincronizar agora"
                    >
                        <FiRefreshCw className={syncing ? 'animate-spin' : ''} />
                    </button>
                </>
            ) : (
                <>
                    <FiWifiOff className="text-base" />
                    <span className="font-semibold">Offline</span>
                    {pendingCount > 0 && (
                        <span className="px-2 py-0.5 bg-black/20 rounded-sm text-xs">
                            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-xs opacity-80">
                        <FiClock size={12} />
                        {formatLastSync()}
                    </span>
                </>
            )}
        </div>
    );
}
