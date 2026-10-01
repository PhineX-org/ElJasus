// ============================================
// EL JASUS — SERVICE WORKER v3
// Fresh deployments + offline fallback + background sync
//
// FIXES vs v2:
// 1) Same-origin requests use cache: 'no-store' so an old
//    browser HTTP-cache entry cannot be fed back into the SW cache.
// 2) Every SW release gets a new cache name; old site caches are deleted.
// 3) The GitHub Pages project path is derived from the SW location,
//    so /ElJasus/ paths are used instead of domain-root paths.
// 4) The offline queue cache is preserved across SW updates.
// 5) skipWaiting + clients.claim() activate the new SW immediately.
// ============================================

const SW_VERSION = 'v3-2026-10-01';
const CACHE_NAME = `eljasus-${SW_VERSION}`;
const OFFLINE_QUEUE_CACHE = 'eljasus-offline-queue';

// If sw.js is at /ElJasus/sw.js, this becomes /ElJasus/.
const BASE_URL = new URL('./', self.location.href);
const HOME_URL = new URL('home.html', BASE_URL).href;

const STATIC_ASSETS = [
    '',
    'home.html',
    'login.html',
    'signup.html',
    'onlinerooms.html',
    'room.html',
    'leaderboard.html',
    'account.html',
    'shop.html',
    'friends.html',
    'profile.html',
    'analytics.html',
    'animations.css',
    'mobile.css',
    'particles.js',
    'sound-system.js',
    'emoji-reactions.js',
    'qr-notifications.js',
    'voice-chat.js',
    'screenshot.js',
    'ElJasus.jpg',
    'manifest.json'
];

const sameOriginUrl = (path) => new URL(path, BASE_URL).href;

// ── INSTALL ─────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        await Promise.allSettled(
            STATIC_ASSETS.map(async path => {
                const url = sameOriginUrl(path);
                try {
                    // Force a network fetch during precache.
                    const request = new Request(url, { cache: 'reload' });
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.put(url, response.clone());
                    }
                } catch (error) {
                    console.warn('[SW] Precache failed:', url, error);
                }
            })
        );

        // Activate the new worker without waiting for old tabs to close.
        await self.skipWaiting();
    })());
});

// ── ACTIVATE ────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();

        await Promise.all(
            keys
                .filter(key => key !== CACHE_NAME && key !== OFFLINE_QUEUE_CACHE)
                .map(key => caches.delete(key))
        );

        // Take control of already-open pages.
        await self.clients.claim();
    })());
});

// ── FETCH ───────────────────────────────────
self.addEventListener('fetch', event => {
    const request = event.request;

    // Only handle GET requests.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Let Firebase/API requests go directly to the network.
    if (
        url.hostname.includes('firebasedatabase') ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com')
    ) {
        return;
    }

    // Service worker only manages this website's own files.
    if (url.origin !== self.location.origin) return;

    event.respondWith((async () => {
        try {
            // IMPORTANT: bypass the browser HTTP cache.
            // GitHub Pages deployments can change while URLs stay identical.
            const freshRequest = new Request(request, {
                cache: 'no-store'
            });

            const response = await fetch(freshRequest);

            // Save the newest network response for offline use.
            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
            }

            return response;
        } catch (error) {
            console.warn('[SW] Network failed, using offline cache:', request.url);

            const cached = await caches.match(request);
            if (cached) return cached;

            // Offline document fallback.
            if (request.mode === 'navigate' || request.destination === 'document') {
                const home = await caches.match(HOME_URL);
                if (home) return home;
            }

            return Response.error();
        }
    })());
});

// ── PUSH NOTIFICATIONS ─────────────────────
self.addEventListener('push', event => {
    let data = {};

    try {
        data = event.data?.json() || {};
    } catch {
        data = {};
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'El Jasus', {
            body: data.body || 'إشعار جديد',
            icon: new URL('ElJasus.jpg', BASE_URL).href,
            badge: new URL('ElJasus.jpg', BASE_URL).href,
            tag: data.tag || 'eljasus',
            data: { url: data.url || BASE_URL.href },
            actions: data.actions || []
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const target = event.notification.data?.url || BASE_URL.href;
    const url = new URL(target, BASE_URL).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
        })
    );
});

// ── BACKGROUND SYNC ────────────────────────
self.addEventListener('sync', event => {
    if (event.tag === 'sync-stats') {
        event.waitUntil(syncOfflineStats());
    }
});

async function syncOfflineStats() {
    const cache = await caches.open(OFFLINE_QUEUE_CACHE);
    const keys = await cache.keys();

    for (const key of keys) {
        const req = await cache.match(key);
        if (!req) continue;

        try {
            const data = await req.json();
            await fetch(new URL('api/sync', BASE_URL).href, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            await cache.delete(key);
        } catch (error) {
            console.log('[SW] Sync failed, will retry', error);
        }
    }
}
