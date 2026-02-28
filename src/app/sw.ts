/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Push notification listener
self.addEventListener('push', (event: PushEvent) => {
    if (event.data) {
        try {
            const data = event.data.json();

            const options: NotificationOptions = {
                body: data.body || 'Você tem uma nova notificação.',
                icon: data.icon || '/icon-192x192.png',
                badge: data.badge || '/icon-192x192.png',
                // @ts-expect-error - vibrate is supported by browsers but missing in TS standard DOM lib sometimes
                vibrate: [200, 100, 200, 100, 200],
                silent: false, // Garante que toca o som do sistema
                requireInteraction: true, // Não desaparece até o usuário clicar
                data: {
                    url: data.url || '/',
                },
            };

            event.waitUntil(
                self.registration.showNotification(data.title || 'Cola Aí', options)
            );
        } catch (e) {
            console.error('Erro ao processar payload do push como JSON:', e);
            event.waitUntil(
                self.registration.showNotification('Cola Aí', {
                    body: event.data.text() || 'Você tem uma nova notificação.',
                    icon: '/icon-192x192.png',
                })
            );
        }
    }
});

// Notification click listener
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, then open the target URL in a new window/tab
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
