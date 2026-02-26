// Cola Aí PWA — Service Worker v2
// Estratégia: Network-First para APIs, Cache-First para assets estáticos
// Compatível com Chrome, Firefox, Safari, Edge, Samsung Internet, Opera

const CACHE_VERSION = 'colaai-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets que serão pré-cacheados na instalação
const PRE_CACHE_URLS = [
    '/offline.html',
    '/icon-192x192.png',
    '/icon-512x512.png',
];

// Extensões de arquivos que devem ser cacheados (Cache-First)
const CACHEABLE_EXTENSIONS = [
    '.js', '.css', '.woff', '.woff2', '.ttf', '.eot',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
    '.json'
];

// Rotas de API que NÃO devem ser cacheadas
const NO_CACHE_PATTERNS = [
    '/api/',
    '/auth/',
    'supabase.co',
    'stripe.com',
];

// ─── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pré-cacheando assets essenciais');
                return cache.addAll(PRE_CACHE_URLS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.warn('[SW] Erro no pré-cache (não-fatal):', err);
                return self.skipWaiting();
            })
    );
});

// ─── ACTIVATE ─────────────────────────────────────────────
// Limpa caches antigos quando nova versão é ativada
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                        .map((name) => {
                            console.log('[SW] Removendo cache antigo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Ativado e controlando clientes');
                return self.clients.claim();
            })
    );
});

// ─── FETCH ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requests não-GET (POST, PUT, DELETE etc.)
    if (request.method !== 'GET') return;

    // Ignorar chrome-extension://, blob:, data: URLs
    if (!url.protocol.startsWith('http')) return;

    // Verificar se é uma rota que NÃO deve ser cacheada
    const shouldSkipCache = NO_CACHE_PATTERNS.some((pattern) =>
        url.href.includes(pattern)
    );

    if (shouldSkipCache) {
        // Network-only para APIs — sem cache
        event.respondWith(
            fetch(request).catch(() => {
                // Se for uma navegação (página), mostra offline
                if (request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
                return new Response('Offline', { status: 503 });
            })
        );
        return;
    }

    // Verificar se é um asset estático (Cache-First)
    const isStaticAsset = CACHEABLE_EXTENSIONS.some((ext) =>
        url.pathname.endsWith(ext)
    );

    if (isStaticAsset && !url.pathname.includes('manifest')) {
        // Estratégia Cache-First para assets estáticos
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;

                return fetch(request)
                    .then((networkResponse) => {
                        // Só cachear respostas OK
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE).then((cache) => {
                                cache.put(request, responseClone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback para imagens
                        if (request.destination === 'image') {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="#1a1a2e" width="64" height="64"/><text fill="#ff6b35" x="32" y="36" text-anchor="middle" font-size="28">🍔</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
        );
        return;
    }

    // Network-First para navegação e demais requests
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // Cachear páginas acessadas para offline
                if (networkResponse && networkResponse.status === 200 && request.mode === 'navigate') {
                    const responseClone = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Tentar cache
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    // Se for navegação, mostra página offline
                    if (request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// ─── PUSH NOTIFICATION (preparação futura) ────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.body || 'Você tem uma nova notificação!',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [100, 50, 100],
            data: { url: data.url || '/' },
        };

        event.waitUntil(
            self.registration.showNotification(
                data.title || 'Cola Aí',
                options
            )
        );
    } catch (e) {
        console.warn('[SW] Erro ao processar push:', e);
    }
});

// ─── NOTIFICATION CLICK ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url);
                }
            })
    );
});
