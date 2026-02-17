'use client';

import { useEffect } from 'react';

/**
 * PWARegistry — Registra o Service Worker e gerencia atualizações.
 * 
 * Compatível com:
 * - Chrome / Edge / Opera / Brave (Chromium)
 * - Firefox
 * - Safari (iOS 11.3+, macOS)
 * - Samsung Internet
 * - UC Browser
 */
export default function PWARegistry() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service Worker não suportado neste navegador');
            return;
        }

        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    // updateViaCache: 'none' garante que o SW é sempre verificado no servidor
                    updateViaCache: 'none' as ServiceWorkerUpdateViaCache,
                });

                console.log('[PWA] Service Worker registrado:', registration.scope);

                // Verificar atualizações a cada 60 minutos
                const checkInterval = setInterval(() => {
                    registration.update().catch(() => {
                        // silencioso — pode estar offline
                    });
                }, 60 * 60 * 1000);

                // Listener para quando uma nova versão está disponível
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                            console.log('[PWA] Nova versão disponível — recarregando...');
                            // Recarregar automaticamente para aplicar a nova versão
                            window.location.reload();
                        }
                    });
                });

                return () => clearInterval(checkInterval);
            } catch (err) {
                console.warn('[PWA] Erro ao registrar Service Worker:', err);
            }
        };

        registerSW();
    }, []);

    return null;
}
