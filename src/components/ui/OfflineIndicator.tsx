'use client';

import React from 'react';
import { FiWifi, FiWifiOff, FiRefreshCw, FiClock } from 'react-icons/fi';
import { useOffline } from '@/contexts/OfflineContext';
import styles from './OfflineIndicator.module.css';

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
        return null; // Don't show when everything is fine
    }

    return (
        <div className={`${styles.indicator} ${online ? styles.online : styles.offline}`}>
            {online ? (
                <>
                    <FiWifi className={styles.icon} />
                    {pendingCount > 0 && (
                        <span className={styles.pending}>
                            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                        </span>
                    )}
                    <button
                        className={styles.syncBtn}
                        onClick={syncNow}
                        disabled={syncing}
                        title="Sincronizar agora"
                    >
                        <FiRefreshCw className={syncing ? styles.spinning : ''} />
                    </button>
                </>
            ) : (
                <>
                    <FiWifiOff className={styles.icon} />
                    <span className={styles.status}>Offline</span>
                    {pendingCount > 0 && (
                        <span className={styles.pending}>
                            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                        </span>
                    )}
                    <span className={styles.lastSync}>
                        <FiClock size={12} />
                        {formatLastSync()}
                    </span>
                </>
            )}
        </div>
    );
}
