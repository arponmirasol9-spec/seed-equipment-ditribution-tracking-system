const CACHE_NAME = 'distrotrack-v2.1';
const STATIC_ASSETS = [
    './',
    'index.php',
    'css/styles.css',
    'js/utils_v2.js',
    'js/api_v2.js',
    'js/pages_v2.js',
    'js/import_v3.js',
    'js/app_v2.js',
    'manifest.json',
    'img/icon.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install Event - Pre-cache core app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching offline app shell');
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Some assets failed to pre-cache:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up outdated caches & claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Dynamic caching & Offline fallback
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests for cache matching
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone response to cache successful GET requests
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    // Try to return cached API response if offline
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return new Response(
                        JSON.stringify({
                            error: 'Offline Mode: Unable to connect to server. Using local data.',
                            offline: true
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // Handle Page Navigations (HTML)
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('index.php');
                    });
                })
        );
        return;
    }

    // Static Assets: Stale-While-Revalidate Strategy
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch((err) => {
                    // Network failed, nothing extra to do if cachedResponse exists
                    return cachedResponse;
                });

            return cachedResponse || fetchPromise;
        })
    );
});
