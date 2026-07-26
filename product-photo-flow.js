(function () {
  'use strict';

  const activeObjectUrls = new Map();

  function requireModules() {
    if (!window.LuxPhotoStorage) {
      throw new Error('Modul penyimpanan foto belum termuat. Muat ulang halaman.');
    }
  }

  function urlKey(feature, slot) {
    return `${String(feature || 'unknown')}:${String(slot || 'main')}`;
  }

  async function applyRecord(feature, slot, record, onReady) {
    if (!record?.blob) return false;
    const key = urlKey(feature, slot);
    const previousUrl = activeObjectUrls.get(key) || null;
    const nextUrl = URL.createObjectURL(record.blob);

    try {
      if (typeof onReady === 'function') {
        await onReady(nextUrl, record);
      }
      activeObjectUrls.set(key, nextUrl);
      if (previousUrl && previousUrl !== nextUrl) {
        try { URL.revokeObjectURL(previousUrl); } catch (_) {}
      }
      return true;
    } catch (error) {
      try { URL.revokeObjectURL(nextUrl); } catch (_) {}
      throw error;
    }
  }

  async function saveAndApply(options) {
    requireModules();
    const feature = options.feature;
    const slot = options.slot || 'main';
    const record = await window.LuxPhotoStorage.saveProductPhoto(feature, options.blob, {
      slot,
      width: options.width,
      height: options.height,
      source: options.source || 'camera'
    });
    await applyRecord(feature, slot, record, options.onReady);
    return record;
  }

  async function capture(options = {}) {
    requireModules();
    if (!window.LocalCamera) {
      throw new Error('Modul kamera belum termuat. Muat ulang halaman.');
    }

    const feature = options.feature;
    const slot = options.slot || 'main';
    window.LuxPhotoStorage.requestPersistence().catch(() => {});

    const opened = await window.LocalCamera.open({
      seconds: Number(options.seconds) || 5,
      output: 'blob',
      maxWidth: Number(options.maxWidth) || 1600,
      maxHeight: Number(options.maxHeight) || 2000,
      quality: Number(options.quality) || 0.88,
      mimeType: options.mimeType || 'image/jpeg',
      onCapture: async (blob, captureInfo) => {
        await saveAndApply({
          feature,
          slot,
          blob,
          width: captureInfo?.width,
          height: captureInfo?.height,
          source: 'camera',
          onReady: options.onReady
        });
        if (typeof options.onSaved === 'function') {
          await options.onSaved(captureInfo);
        }
      },
      onError: error => {
        if (typeof options.onError === 'function') options.onError(error);
      }
    });

    if (!opened && typeof options.onError === 'function') {
      options.onError(new Error('Kamera tidak dapat dibuka. Periksa izin kamera lalu coba lagi.'));
    }
    return opened;
  }

  async function upload(options = {}) {
    requireModules();
    const file = options.file;
    if (!(file instanceof Blob)) throw new Error('File foto belum dipilih.');

    window.LuxPhotoStorage.requestPersistence().catch(() => {});
    const optimized = await window.LuxPhotoStorage.prepareImageBlob(file, {
      maxWidth: Number(options.maxWidth) || 1600,
      maxHeight: Number(options.maxHeight) || 2000,
      maxBytes: Number(options.maxBytes) || 2500000,
      quality: Number(options.quality) || 0.88,
      mimeType: options.mimeType || 'image/jpeg'
    });

    return await saveAndApply({
      feature: options.feature,
      slot: options.slot || 'main',
      blob: optimized,
      source: 'upload',
      onReady: options.onReady
    });
  }

  async function restore(options = {}) {
    requireModules();
    const feature = options.feature;
    const slot = options.slot || 'main';
    const record = await window.LuxPhotoStorage.loadProductPhoto(feature, slot);
    if (!record?.blob) return false;
    return await applyRecord(feature, slot, record, options.onReady);
  }

  async function migrateLegacy(options = {}) {
    requireModules();
    const legacyKey = options.legacyKey || 'productPhoto';
    let legacy = null;
    try { legacy = localStorage.getItem(legacyKey); } catch (_) {}
    if (!legacy) return false;

    // Hapus lebih dulu supaya Base64 besar tidak terus memenuhi localStorage.
    try { localStorage.removeItem(legacyKey); } catch (_) {}

    const optimized = await window.LuxPhotoStorage.prepareImageBlob(legacy, {
      maxWidth: Number(options.maxWidth) || 1600,
      maxHeight: Number(options.maxHeight) || 2000,
      maxBytes: Number(options.maxBytes) || 2500000,
      quality: Number(options.quality) || 0.88
    });

    await saveAndApply({
      feature: options.feature,
      slot: options.slot || 'main',
      blob: optimized,
      source: 'legacy-localStorage',
      onReady: options.onReady
    });
    return true;
  }

  async function restoreOrMigrateLegacy(options = {}) {
    try {
      const migrated = await migrateLegacy(options);
      if (migrated) return true;
    } catch (error) {
      console.warn('[LUX] Migrasi foto lama gagal:', error);
    }
    return await restore(options);
  }

  async function clear(options = {}) {
    requireModules();
    const feature = options.feature;
    const slot = options.slot || 'main';
    await window.LuxPhotoStorage.clearProductPhoto(feature, slot);
    const key = urlKey(feature, slot);
    const url = activeObjectUrls.get(key);
    if (url) {
      try { URL.revokeObjectURL(url); } catch (_) {}
      activeObjectUrls.delete(key);
    }
  }

  function release(feature, slot = 'main') {
    const key = urlKey(feature, slot);
    const url = activeObjectUrls.get(key);
    if (!url) return;
    try { URL.revokeObjectURL(url); } catch (_) {}
    activeObjectUrls.delete(key);
  }

  window.addEventListener('beforeunload', () => {
    activeObjectUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    });
    activeObjectUrls.clear();
  });

  window.LuxProductPhotoFlow = Object.freeze({
    capture,
    upload,
    restore,
    migrateLegacy,
    restoreOrMigrateLegacy,
    clear,
    release
  });
})();
