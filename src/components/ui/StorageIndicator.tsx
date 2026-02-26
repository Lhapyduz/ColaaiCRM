'use client';

import React, { useState } from 'react';
import { useOffline } from '@/contexts/OfflineContext';
import { FiCloud, FiHardDrive, FiWifiOff, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { cn } from '@/lib/utils';

export function StorageIndicator() {
    const { hardwareOnline, storageMode, setStorageMode, pendingCount, syncing, syncNow, lastSync } = useOffline();
    const [isOpen, setIsOpen] = useState(false);

    const isSyncing = syncing;
    const hasPending = pendingCount > 0;

    let Icon = FiCloud;
    let colorClass = 'text-green-500 bg-green-500/10 border-green-500/20';
    let label = 'Nuvem (Sincronizado)';

    if (!hardwareOnline) {
        Icon = FiWifiOff;
        colorClass = 'text-red-500 bg-red-500/10 border-red-500/20';
        label = 'Sem Internet (Apenas Local)';
    } else if (storageMode === 'local') {
        Icon = FiHardDrive;
        colorClass = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        label = 'Modo Local Ativado';
    } else if (hasPending) {
        Icon = FiAlertCircle;
        colorClass = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        label = 'Sincronização Pendente';
    }

    if (isSyncing) {
        Icon = FiRefreshCw;
        colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        label = 'Sincronizando...';
    }

    return (
        <div className="fixed bottom-4 right-4 z-modal flex flex-col items-end">
            {isOpen && (
                <div className="mb-2 p-4 bg-bg-card border border-border shadow-xl rounded-xl w-72 flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                            <Icon className={cn("text-lg", colorClass.split(' ')[0])} />
                            Armazenamento
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-primary text-xl">&times;</button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-text-secondary">Escolha o modo de funcionamento do sistema:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setStorageMode('cloud')}
                                className={cn('flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm border transition-all', storageMode === 'cloud' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-bg-secondary border-border text-text-secondary hover:bg-bg-tertiary')}
                            >
                                <FiCloud /> Nuvem
                            </button>
                            <button
                                onClick={() => setStorageMode('local')}
                                className={cn('flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm border transition-all', storageMode === 'local' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-bg-secondary border-border text-text-secondary hover:bg-bg-tertiary')}
                            >
                                <FiHardDrive /> Local
                            </button>
                        </div>
                        {!hardwareOnline && (
                            <p className="text-[10px] text-red-500 mt-1">
                                Conexão com a internet perdida. Operando localmente.
                            </p>
                        )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-border flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>Alterações Pendentes:</span>
                            <span className="font-bold">{pendingCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>Último Sincronismo:</span>
                            <span>{lastSync ? new Date(lastSync).toLocaleTimeString() : 'Nunca'}</span>
                        </div>

                        <button
                            onClick={() => syncNow()}
                            disabled={!hardwareOnline || isSyncing || pendingCount === 0}
                            className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:bg-primary/90"
                            title={!hardwareOnline ? "Você está offline" : ""}
                        >
                            <FiRefreshCw className={cn(isSyncing && 'animate-spin')} />
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar para Nuvem'}
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105",
                    colorClass
                )}
                title={label}
            >
                <Icon className={cn("text-xl", isSyncing && 'animate-spin')} />
                {hasPending && !isSyncing && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold border-2 border-bg-card">
                        {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                )}
            </button>
        </div>
    );
}
