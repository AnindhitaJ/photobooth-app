const CACHE_NAME = 'lux-photobooth-v1.19-social-caption-centered';

const CORE_ASSETS = [
  '/', '/index.html', '/login.html', '/reset-password.html',
  '/template.html', '/camera.html', '/filter.html', '/preview.html',
  '/result.html', '/download.html', '/gallery.html', '/admin.html',
  '/cms.html', '/tutorial.html', '/analytics.html', '/content-sharing.html',
  '/event.html', '/event-run.html', '/ganci.html', '/kalender.html',
  '/idcard.html', '/icon-portrait.html', '/game-character.html',
  '/certificate.html', '/trading-card.html', '/detective-case.html',
  '/newspaper.html', '/magazine.html', '/config.js', '/auth.js',
  '/local-camera.js', '/beautify.js', '/product-photobooth.js',
  '/cover-maker.js', '/ganci-utils.js', '/ganci-print.js',
  '/manifest.json', '/holidays/2026.json', '/logo.png', '/logo.svg',
  '/icon-192.png', '/icon-512.png'
];

const CLEAN_ROUTE_FALLBACKS = Object.freeze({
  '/': '/index.html',
  '/login': '/login.html',
  '/reset-password': '/reset-password.html',
  '/template': '/template.html',
  '/camera': '/camera.html',
  '/filter': '/filter.html',
  '/preview': '/preview.html',
  '/result': '/result.html',
  '/download': '/download.html',
  '/gallery': '/gallery.html',
  '/admin': '/admin.html',
  '/cms': '/cms.html',
  '/tutorial': '/tutorial.html',
  '/analytics': '/analytics.html',
  '/content-sharing': '/content-sharing.html',
  '/event': '/event.html',
  '/event-run': '/event-run.html',
  '/ganci': '/ganci.html',
  '/kalender': '/kalender.html',
  '/idcard': '/idcard.html',
  '/icon-portrait': '/icon-portrait.html',
  '/game-character': '/game-character.html',
  '/certificate': '/certificate.html',
  '/trading-card': '/trading-card.html',
  '/detective-case': '/detective-case.html',
  '/newspaper': '/newspaper.html',
  '/magazine': '/magazine.html'
});

const NETWORK_FIRST_ASSETS = new Set([
  '/auth.js', '/config.js', '/index.html', '/login.html', '/template.html'
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(async asset => {
      const response = await fetch(asset, { cache: 'reload' });
      if (response.ok) await cache.put(asset, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function routeAwareCacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const direct = await cache.match(request, { ignoreSearch: true });
  if (direct) return direct;

  const url = new URL(request.url);
  const mapped = CLEAN_ROUTE_FALLBACKS[url.pathname];
  if (mapped) {
    const mappedResponse = await cache.match(mapped, { ignoreSearch: true });
    if (mappedResponse) return mappedResponse;
  }

  return cache.match('/index.html');
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && request.method === 'GET') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return routeAwareCacheFallback(request);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && request.method === 'GET' && new URL(request.url).origin === self.location.origin) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && NETWORK_FIRST_ASSETS.has(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});
