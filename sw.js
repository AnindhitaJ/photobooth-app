const CACHE_NAME = 'lux-photobooth-v1.24-pwa-recovery';
const NAVIGATION_TIMEOUT_MS = 8000;

const CORE_ASSETS = [
  '/', '/index.html', '/about.html', '/app.html', '/login.html', '/reset-password.html',
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
  '/': '/login.html',
  '/about': '/about.html',
  '/app': '/app.html',
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

function fetchWithTimeout(request, timeoutMs = NAVIGATION_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { cache: 'no-store', signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Instalasi harus atomik. Jika aset inti gagal, service worker lama tetap aktif
    // daripada mengaktifkan cache baru yang hanya terisi sebagian.
    await Promise.all(CORE_ASSETS.map(async asset => {
      const response = await fetch(asset, { cache: 'reload' });
      if (!response.ok) throw new Error(`Precache gagal: ${asset} (${response.status})`);
      await cache.put(asset, response);
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

async function navigationFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const direct = await cache.match(request, { ignoreSearch: true });
  if (direct) return direct;

  const url = new URL(request.url);
  const mapped = CLEAN_ROUTE_FALLBACKS[url.pathname];
  if (mapped) {
    const mappedResponse = await cache.match(mapped);
    if (mappedResponse) return mappedResponse;
  }

  const login = await cache.match('/login.html');
  return login || new Response('Aplikasi sedang offline dan halaman belum tersimpan.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function navigationNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return navigationFallback(request);
  }
}

async function assetNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: false })
      || await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // Jangan pernah mengembalikan HTML login untuk request JavaScript/CSS/JSON.
    // Browser harus menerima kegagalan jaringan yang benar agar error dapat didiagnosis.
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: false })
    || await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API dan data dinamis tidak boleh diintersepsi/cache oleh service worker.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  const destination = request.destination;
  const dynamicAsset = ['script', 'style', 'document'].includes(destination)
    || /\.(?:js|css|html|json)$/i.test(url.pathname)
    || url.pathname === '/manifest.json';

  if (dynamicAsset) {
    event.respondWith(assetNetworkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
