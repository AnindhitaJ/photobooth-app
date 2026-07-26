/**
 * Cross-origin media helper for gallery/download flows.
 *
 * R2 files are exposed through the same-origin /media/* Vercel rewrite so
 * browser fetch/download/share does not depend on bucket CORS configuration.
 * Supabase public-storage URLs use the existing server-side media proxy.
 */
(() => {
  'use strict';

  const MAX_MEMORY_ENTRIES = 8;
  const DEFAULT_TIMEOUT_MS = 25000;
  const readyBlobs = new Map();
  const pendingBlobs = new Map();

  function parseURL(value) {
    try {
      return new URL(String(value || '').trim(), window.location.href);
    } catch (_) {
      return null;
    }
  }

  function configuredR2Host() {
    return parseURL(window.LUX_CONFIG?.R2_PUBLIC_URL)?.hostname.toLowerCase() || '';
  }

  function configuredSupabaseHost() {
    return parseURL(window.LUX_CONFIG?.SUPABASE_URL)?.hostname.toLowerCase() || '';
  }

  function isSupabasePublicStorageURL(url) {
    return Boolean(
      url &&
      url.hostname.toLowerCase() === configuredSupabaseHost() &&
      url.pathname.includes('/storage/v1/object/public/')
    );
  }

  function toBrowserURL(value) {
    const url = parseURL(value);
    if (!url) return String(value || '');

    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    const host = url.hostname.toLowerCase();
    const r2Host = configuredR2Host();

    // Same-origin external rewrite declared in vercel.json.
    if (r2Host && host === r2Host) {
      const cleanPath = url.pathname.replace(/^\/+/, '');
      return `/media/${cleanPath}${url.search}${url.hash}`;
    }

    // Existing server-side proxy validates the host and image MIME type.
    if (isSupabasePublicStorageURL(url)) {
      return `/api/media-proxy?src=${encodeURIComponent(url.href)}`;
    }

    // Unknown hosts retain their original URL. fetchBlob will still surface a
    // clear CORS/network error instead of silently returning an empty Blob.
    return url.href;
  }

  function inferMimeType(blob, sourceURL) {
    const current = String(blob?.type || '').split(';')[0].trim().toLowerCase();
    if (current.startsWith('image/')) return current;

    const pathname = parseURL(sourceURL)?.pathname.toLowerCase() || '';
    if (pathname.endsWith('.png')) return 'image/png';
    if (pathname.endsWith('.webp')) return 'image/webp';
    if (pathname.endsWith('.gif')) return 'image/gif';
    if (pathname.endsWith('.avif')) return 'image/avif';
    return 'image/jpeg';
  }

  function extensionForMime(mime) {
    switch (String(mime || '').toLowerCase()) {
      case 'image/png': return 'png';
      case 'image/webp': return 'webp';
      case 'image/gif': return 'gif';
      case 'image/avif': return 'avif';
      default: return 'jpg';
    }
  }

  function rememberBlob(key, blob) {
    readyBlobs.delete(key);
    readyBlobs.set(key, blob);
    while (readyBlobs.size > MAX_MEMORY_ENTRIES) {
      const oldestKey = readyBlobs.keys().next().value;
      readyBlobs.delete(oldestKey);
    }
  }

  async function fetchBlob(value, options = {}) {
    const sourceURL = String(value || '').trim();
    if (!sourceURL) throw new Error('URL media kosong');

    const cacheKey = sourceURL;
    const useMemoryCache = options.memoryCache !== false;
    if (useMemoryCache && readyBlobs.has(cacheKey)) {
      const blob = readyBlobs.get(cacheKey);
      readyBlobs.delete(cacheKey);
      readyBlobs.set(cacheKey, blob);
      return blob;
    }
    if (useMemoryCache && pendingBlobs.has(cacheKey)) {
      return pendingBlobs.get(cacheKey);
    }

    const request = (async () => {
      const controller = new AbortController();
      const timeoutMs = Number(options.timeoutMs) > 0
        ? Number(options.timeoutMs)
        : DEFAULT_TIMEOUT_MS;
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(toBrowserURL(sourceURL), {
          method: 'GET',
          signal: controller.signal,
          credentials: 'same-origin',
          cache: options.cache || 'default',
          headers: { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' }
        });

        if (!response.ok) {
          throw new Error(`Media gagal dimuat (HTTP ${response.status})`);
        }

        const blob = await response.blob();
        if (!blob || blob.size <= 0) {
          throw new Error('File media kosong');
        }

        const responseType = String(response.headers.get('content-type') || blob.type || '').toLowerCase();
        if (responseType.includes('application/json') || responseType.includes('text/html')) {
          throw new Error('Server mengembalikan respons non-gambar');
        }

        if (useMemoryCache) rememberBlob(cacheKey, blob);
        return blob;
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new Error('Waktu mengambil foto habis. Periksa koneksi lalu coba lagi.');
        }
        throw error;
      } finally {
        window.clearTimeout(timer);
        pendingBlobs.delete(cacheKey);
      }
    })();

    if (useMemoryCache) pendingBlobs.set(cacheKey, request);
    return request;
  }

  function prefetch(value, options = {}) {
    return fetchBlob(value, options).catch(error => {
      console.warn('[LUX Media] Prefetch gagal:', error);
      throw error;
    });
  }

  function supportsFileShare(mime = 'image/jpeg') {
    if (!navigator.share || !navigator.canShare || typeof File !== 'function') return false;
    try {
      const probe = new File([new Uint8Array([0])], `lux-share.${extensionForMime(mime)}`, { type: mime });
      return navigator.canShare({ files: [probe] });
    } catch (_) {
      return false;
    }
  }

  function makeFile(blob, filename, sourceURL) {
    const type = inferMimeType(blob, sourceURL);
    const safeName = String(filename || `lux-photo.${extensionForMime(type)}`);
    return new File([blob], safeName, { type });
  }

  function downloadBlob(blob, filename) {
    if (!blob || blob.size <= 0) throw new Error('File download kosong');
    const objectURL = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectURL;
    anchor.download = filename || `lux-photo-${Date.now()}.jpg`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectURL), 3000);
  }

  async function download(value, filename, options = {}) {
    const blob = await fetchBlob(value, options);
    downloadBlob(blob, filename);
    return blob;
  }

  window.LuxMedia = Object.freeze({
    toBrowserURL,
    fetchBlob,
    prefetch,
    inferMimeType,
    extensionForMime,
    supportsFileShare,
    makeFile,
    downloadBlob,
    download
  });
})();
