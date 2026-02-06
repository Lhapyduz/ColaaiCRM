'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFingerprint, generateFingerprint, FingerprintData } from '@/lib/fingerprint';

interface UseFingerprint {
    fingerprint: string | null;
    loading: boolean;
    error: string | null;
    fullData: FingerprintData | null;
    refresh: () => Promise<void>;
}

/**
 * Hook para coleta de fingerprint do navegador
 * Usado para prevenção de fraude no sistema de trial
 */
export function useFingerprint(): UseFingerprint {
    const [fingerprint, setFingerprint] = useState<string | null>(null);
    const [fullData, setFullData] = useState<FingerprintData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const collectFingerprint = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Coleta fingerprint completo
            const data = await generateFingerprint();
            setFingerprint(data.hash);
            setFullData(data);
        } catch (err) {
            console.error('[Fingerprint] Error collecting:', err);
            setError('Erro ao coletar informações do dispositivo');
            // Gera fallback básico
            setFingerprint(`fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        collectFingerprint();
    }, [collectFingerprint]);

    const refresh = useCallback(async () => {
        await collectFingerprint();
    }, [collectFingerprint]);

    return {
        fingerprint,
        loading,
        error,
        fullData,
        refresh,
    };
}

export default useFingerprint;
