const CACHE_NAME = 'lux-photobooth-v1.10-builtin-template-sharpness-fix';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/reset-password.html',
  '/template.html',
  '/camera.html',
  '/filter.html',
  '/preview.html',
  '/result.html',
  '/download.html',
  '/gallery.html',
  '/admin.html',
  '/cms.html',
  '/tutorial.html',
  '/analytics.html',
  '/content-sharing.html',
  '/event.html',
  '/event-run.html',
  '/ganci.html',
  '/kalender.html',
  '/idcard.html',
  '/icon-portrait.html',
  '/game-character.html',
  '/certificate.html',
  '/trading-card.html',
  '/detective-case.html',
  '/newspaper.html',
  '/magazine.html',
  '/config.js',
  '/auth.js',
  '/local-camera.js',
  '/beautify.js',
  '/product-photobooth.js',
  '/cover-maker.js',
  '/ganci-utils.js',
  '/ganci-print.js',
  '/manifest.json',
  '/holidays/2026.json',
  '/logo.png',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Satu asset yang gagal tidak boleh menggagalkan instalasi service worker baru.
    await Promise.allSettled(CORE_ASSETS.map(async asset => {
      const response = await fetch(asset, { cache: 'reload' });
      if (response.ok) await cache.put(asset, response);
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match('/index.html'));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && request.method === 'GET' && new URL(request.url).origin === self.location.origin) {
    cache.put(request, response.clone());
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

  if (url.origin === self.location.origin && url.pathname === '/config.js') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});
