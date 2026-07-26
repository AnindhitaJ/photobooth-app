(function () {
  'use strict';

  const DB_NAME = 'lux-photobooth-ganci';
  const DB_VERSION = 1;
  const STORE_NAME = 'assets';
  const STATE_KEY = 'ganciState';
  const PHOTO_KEY = 'current-photo';
  const GALLERY_INDEX_KEY = 'ganciGalleryIndex';
  const MAX_GALLERY_ITEMS = 12;
  const REQUEST_TIMEOUT_MS = 10000;

  let dbPromise = null;
  let currentPhotoObjectUrl = '';

  function withTimeout(promise, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message || 'Operasi penyimpanan timeout.')), REQUEST_TIMEOUT_MS);
      Promise.resolve(promise).then(
        value => { clearTimeout(timer); resolve(value); },
        error => { clearTimeout(timer); reject(error); }
      );
    });
  }

  function openDb() {
    if (!('indexedDB' in window)) {
      return Promise.reject(new Error('IndexedDB tidak tersedia di browser ini.'));
    }
    if (dbPromise) return dbPromise;

    dbPromise = withTimeout(new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Gagal membuka database foto Ganci.'));
      request.onblocked = () => reject(new Error('Database foto Ganci sedang dipakai tab lain. Tutup tab lama lalu coba lagi.'));
    }), 'Membuka penyimpanan foto terlalu lama.');

    dbPromise.catch(() => { dbPromise = null; });
    return dbPromise;
  }

  async function idbPut(key, value) {
    const db = await openDb();
    return withTimeout(new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Gagal menulis data foto Ganci.'));
      tx.onabort = () => reject(tx.error || new Error('Penyimpanan foto Ganci dibatalkan browser.'));
    }), 'Menyimpan foto Ganci terlalu lama.');
  }

  async function idbGet(key) {
    const db = await openDb();
    return withTimeout(new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error || new Error('Gagal membaca foto Ganci.'));
    }), 'Membaca foto Ganci terlalu lama.');
  }

  async function idbDelete(key) {
    const db = await openDb();
    return withTimeout(new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Gagal menghapus data Ganci lama.'));
    }), 'Menghapus data Ganci terlalu lama.');
  }

  function dataUrlToBlob(dataUrl) {
    const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/);
    if (!match) throw new Error('Format foto tidak valid.');
    const mime = match[1] || 'image/jpeg';
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Gagal mengubah foto untuk fallback.'));
      reader.readAsDataURL(blob);
    });
  }

  async function toBlob(input) {
    if (input instanceof Blob) return input;
    if (typeof input !== 'string' || !input) throw new Error('Foto Ganci kosong.');
    if (input.startsWith('data:')) return dataUrlToBlob(input);
    if (input.startsWith('blob:')) {
      const response = await fetch(input);
      if (!response.ok) throw new Error('Blob foto Ganci sudah tidak tersedia.');
      return response.blob();
    }
    const response = await fetch(input, { cache: 'no-store' });
    if (!response.ok) throw new Error('Foto Ganci tidak bisa dimuat.');
    return response.blob();
  }

  function readStateMeta() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const value = JSON.parse(storage.getItem(STATE_KEY) || 'null');
        if (value) return value;
      } catch (_) {}
    }
    return null;
  }

  function writeStateMeta(meta) {
    const serialized = JSON.stringify(meta);
    try {
      localStorage.removeItem(STATE_KEY);
      localStorage.setItem(STATE_KEY, serialized);
      try { sessionStorage.removeItem(STATE_KEY); } catch (_) {}
      return 'localStorage';
    } catch (localError) {
      try {
        sessionStorage.setItem(STATE_KEY, serialized);
        return 'sessionStorage';
      } catch (sessionError) {
        throw new Error(sessionError?.message || localError?.message || 'Metadata foto Ganci tidak dapat disimpan.');
      }
    }
  }

  function stripRuntimePhoto(state) {
    const meta = { ...(state || {}) };
    delete meta.photo;
    delete meta.originalPhoto;
    delete meta._photoBlob;
    delete meta._photoObjectUrl;
    delete meta._storageMode;
    return meta;
  }

  function revokeCurrentPhotoUrl() {
    if (currentPhotoObjectUrl) {
      try { URL.revokeObjectURL(currentPhotoObjectUrl); } catch (_) {}
      currentPhotoObjectUrl = '';
    }
  }

  function hydrateWithBlob(meta, blob, storageMode) {
    revokeCurrentPhotoUrl();
    currentPhotoObjectUrl = URL.createObjectURL(blob);
    return {
      ...(meta || {}),
      photo: currentPhotoObjectUrl,
      originalPhoto: currentPhotoObjectUrl,
      _photoBlob: blob,
      _photoObjectUrl: currentPhotoObjectUrl,
      _storageMode: storageMode
    };
  }

  function cleanupLegacyLargeKeys() {
    [
      'photos', 'filteredPhotos', 'livePhotos',
      'finalPhoto', 'finalPhotoThumb',
      'photosStore', 'filteredPhotosStore', 'livePhotosStore',
      'ganciLocalGallery'
    ].forEach(key => {
      try { localStorage.removeItem(key); } catch (_) {}
    });
  }

  async function requestPersistentStorage() {
    try {
      if (!navigator.storage) return false;
      if (typeof navigator.storage.persisted === 'function' && await navigator.storage.persisted()) return true;
      if (typeof navigator.storage.persist === 'function') return await navigator.storage.persist();
    } catch (_) {}
    return false;
  }

  async function saveState(state, photoInput) {
    const meta = stripRuntimePhoto(state);
    const input = photoInput || state?._photoBlob || state?.photo || state?.originalPhoto;
    if (!input) throw new Error('Foto Ganci belum tersedia untuk disimpan.');

    const blob = await toBlob(input);
    if (!blob.size) throw new Error('File foto Ganci kosong.');

    await requestPersistentStorage();
    cleanupLegacyLargeKeys();

    try {
      await idbPut(PHOTO_KEY, blob);
      const nextMeta = {
        ...meta,
        hasPhoto: true,
        photoRef: {
          store: 'indexedDB',
          key: PHOTO_KEY,
          type: blob.type || 'image/jpeg',
          size: blob.size,
          updatedAt: Date.now()
        },
        updatedAt: new Date().toISOString()
      };
      delete nextMeta.photoFallback;
      writeStateMeta(nextMeta);
      return hydrateWithBlob(nextMeta, blob, 'indexedDB');
    } catch (idbError) {
      console.warn('[LUX] IndexedDB Ganci gagal, mencoba fallback localStorage:', idbError);
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl.length > 4_200_000) {
        throw new Error('Foto terlalu besar untuk fallback browser. Coba tutup tab lain lalu ambil ulang foto.');
      }
      cleanupLegacyLargeKeys();
      const fallbackMeta = {
        ...meta,
        hasPhoto: true,
        photoFallback: dataUrl,
        photoRef: { store: 'localStorage', type: blob.type || 'image/jpeg', size: blob.size, updatedAt: Date.now() },
        updatedAt: new Date().toISOString()
      };
      writeStateMeta(fallbackMeta);
      return { ...fallbackMeta, photo: dataUrl, originalPhoto: dataUrl, _photoBlob: blob, _storageMode: 'localStorage' };
    }
  }

  async function saveMetadata(state) {
    const previous = readStateMeta() || {};
    const meta = stripRuntimePhoto(state);
    const nextMeta = {
      ...previous,
      ...meta,
      photoRef: meta.photoRef || previous.photoRef,
      photoFallback: meta.photoFallback || previous.photoFallback,
      hasPhoto: Boolean(meta.hasPhoto || previous.hasPhoto || previous.photoRef || previous.photoFallback),
      updatedAt: new Date().toISOString()
    };
    writeStateMeta(nextMeta);
    return nextMeta;
  }

  async function loadState() {
    const meta = readStateMeta();
    if (!meta) return null;

    // Migrasi otomatis dari versi lama yang menyimpan base64 besar di localStorage.
    if (typeof meta.photo === 'string' && meta.photo.startsWith('data:')) {
      return saveState(meta, meta.photo);
    }
    if (typeof meta.originalPhoto === 'string' && meta.originalPhoto.startsWith('data:')) {
      return saveState(meta, meta.originalPhoto);
    }

    if (meta.photoRef?.store === 'indexedDB') {
      try {
        const blob = await idbGet(meta.photoRef.key || PHOTO_KEY);
        if (blob instanceof Blob && blob.size) return hydrateWithBlob(meta, blob, 'indexedDB');
      } catch (error) {
        console.warn('[LUX] Foto Ganci dari IndexedDB gagal dibaca:', error);
      }
    }

    if (typeof meta.photoFallback === 'string' && meta.photoFallback.startsWith('data:')) {
      return { ...meta, photo: meta.photoFallback, originalPhoto: meta.photoFallback, _storageMode: 'localStorage' };
    }

    return meta;
  }

  function readGalleryIndex() {
    try {
      const value = JSON.parse(localStorage.getItem(GALLERY_INDEX_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  async function saveGalleryEntry(entry, previewInput) {
    const blob = await toBlob(previewInput || entry?.preview);
    const id = `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const compactEntry = { ...(entry || {}), id };
    delete compactEntry.preview;

    await requestPersistentStorage();
    await idbPut(`gallery:${id}`, { entry: compactEntry, blob });

    const index = readGalleryIndex();
    index.unshift({ id, createdAt: compactEntry.createdAt || new Date().toISOString(), title: compactEntry.title || 'Ganci' });
    const kept = index.slice(0, MAX_GALLERY_ITEMS);
    localStorage.setItem(GALLERY_INDEX_KEY, JSON.stringify(kept));

    const removed = index.slice(MAX_GALLERY_ITEMS);
    await Promise.all(removed.map(item => idbDelete(`gallery:${item.id}`).catch(() => false)));
    return kept.length;
  }

  async function getStorageInfo() {
    try {
      if (!navigator.storage?.estimate) return null;
      const estimate = await navigator.storage.estimate();
      return {
        usage: Number(estimate.usage || 0),
        quota: Number(estimate.quota || 0),
        persisted: navigator.storage.persisted ? await navigator.storage.persisted() : false
      };
    } catch (_) {
      return null;
    }
  }

  async function clearPhoto() {
    revokeCurrentPhotoUrl();
    try { await idbDelete(PHOTO_KEY); } catch (_) {}
    try { localStorage.removeItem(STATE_KEY); } catch (_) {}
    try { sessionStorage.removeItem(STATE_KEY); } catch (_) {}
  }


  window.GanciStorage = {
    saveState,
    saveMetadata,
    loadState,
    saveGalleryEntry,
    requestPersistentStorage,
    getStorageInfo,
    clearPhoto,
    STATE_KEY,
    PHOTO_KEY
  };
})();
