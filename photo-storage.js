(function () {
  'use strict';

  // Nama database dipertahankan agar foto ganci versi sebelumnya tetap terbaca.
  const DB_NAME = 'lux-ganci-storage-db';
  const STORE_NAME = 'items';
  const DB_VERSION = 2;
  const GANCI_PHOTO_KEY = 'ganci:current-photo:v2';
  const PRODUCT_PHOTO_PREFIX = 'product-photo:v1';

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB tidak didukung browser ini.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB gagal dibuka.'));
      request.onblocked = () => reject(new Error('IndexedDB sedang dipakai tab lain. Tutup tab lama lalu coba lagi.'));
    });
  }

  async function withStore(mode, action) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        let result;

        try {
          result = action(store);
        } catch (error) {
          reject(error);
          return;
        }

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error('Transaksi penyimpanan gagal.'));
        tx.onabort = () => reject(tx.error || new Error('Transaksi penyimpanan dibatalkan.'));
      });
    } finally {
      db.close();
    }
  }

  async function setValue(key, value) {
    await withStore('readwrite', store => store.put(value, key));
  }

  async function getValue(key) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error || new Error('Data foto gagal dibaca.'));
        tx.onerror = () => reject(tx.error || new Error('Transaksi baca gagal.'));
        tx.onabort = () => reject(tx.error || new Error('Transaksi baca dibatalkan.'));
      });
    } finally {
      db.close();
    }
  }

  async function deleteValue(key) {
    try {
      await withStore('readwrite', store => store.delete(key));
    } catch (error) {
      console.warn('[LUX] Gagal menghapus data IndexedDB:', error);
    }
  }

  async function requestPersistence() {
    const result = {
      supported: Boolean(navigator.storage),
      persisted: false,
      granted: false,
      usage: null,
      quota: null
    };

    if (!navigator.storage) return result;

    try {
      if (navigator.storage.persisted) {
        result.persisted = await navigator.storage.persisted();
      }
      if (!result.persisted && navigator.storage.persist) {
        result.granted = await navigator.storage.persist();
        result.persisted = result.granted;
      }
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        result.usage = Number.isFinite(estimate.usage) ? estimate.usage : null;
        result.quota = Number.isFinite(estimate.quota) ? estimate.quota : null;
      }
    } catch (error) {
      console.warn('[LUX] Penyimpanan persisten tidak tersedia atau ditolak:', error);
    }

    return result;
  }

  function cleanKeyPart(value, fallback) {
    const cleaned = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || fallback;
  }

  function makeProductPhotoKey(feature, slot = 'main') {
    return `${PRODUCT_PHOTO_PREFIX}:${cleanKeyPart(feature, 'unknown')}:${cleanKeyPart(slot, 'main')}`;
  }

  function dataUrlToBlob(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      throw new Error('Format foto lama tidak valid.');
    }
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) throw new Error('Data foto tidak lengkap.');
    const header = dataUrl.slice(0, commaIndex);
    const payload = dataUrl.slice(commaIndex + 1);
    const mime = (header.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function sourceToBlob(source) {
    if (source instanceof Blob) return source;
    if (typeof source === 'string' && source.startsWith('data:')) return dataUrlToBlob(source);
    throw new Error('Sumber foto tidak valid.');
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Browser gagal membuat file foto.'));
      }, type, quality);
    });
  }

  async function decodeImage(blob) {
    if ('createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw(ctx, width, height) { ctx.drawImage(bitmap, 0, 0, width, height); },
          close() { bitmap.close?.(); }
        };
      } catch (_) {
        // Safari lama dan sebagian WebView masuk ke fallback Image.
      }
    }

    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw(ctx, width, height) { ctx.drawImage(img, 0, 0, width, height); },
        close() { URL.revokeObjectURL(url); }
      });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('File foto tidak dapat dibaca.'));
      };
      img.src = url;
    });
  }

  async function prepareImageBlob(source, options = {}) {
    const inputBlob = await sourceToBlob(source);
    if (!inputBlob.size) throw new Error('File foto kosong.');
    if (inputBlob.type && !inputBlob.type.startsWith('image/')) {
      throw new Error('File yang dipilih bukan gambar.');
    }

    const maxWidth = Math.max(320, Number(options.maxWidth) || 1600);
    const maxHeight = Math.max(320, Number(options.maxHeight) || 2000);
    const maxBytes = Math.max(250000, Number(options.maxBytes) || 2500000);
    const mimeType = options.mimeType || 'image/jpeg';
    let quality = Math.min(0.94, Math.max(0.62, Number(options.quality) || 0.88));

    const decoded = await decodeImage(inputBlob);
    try {
      const scale = Math.min(1, maxWidth / decoded.width, maxHeight / decoded.height);
      let targetWidth = Math.max(1, Math.round(decoded.width * scale));
      let targetHeight = Math.max(1, Math.round(decoded.height * scale));

      // JPEG/WebP kecil tidak perlu di-encode ulang agar detail tetap maksimal.
      const reusableType = /image\/(jpeg|webp)/i.test(inputBlob.type || '');
      if (scale === 1 && reusableType && inputBlob.size <= maxBytes) {
        return inputBlob;
      }

      let output = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Canvas pengolah foto tidak tersedia.');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        decoded.draw(ctx, targetWidth, targetHeight);
        output = await canvasToBlob(canvas, mimeType, quality);

        if (output.size <= maxBytes || attempt === 4) break;
        quality = Math.max(0.66, quality - 0.07);
        if (attempt >= 2) {
          targetWidth = Math.max(1, Math.round(targetWidth * 0.88));
          targetHeight = Math.max(1, Math.round(targetHeight * 0.88));
        }
      }

      if (!output?.size) throw new Error('Hasil optimasi foto kosong.');
      return output;
    } finally {
      decoded.close?.();
    }
  }

  async function saveProductPhoto(feature, blob, options = {}) {
    if (!(blob instanceof Blob) || blob.size < 1) {
      throw new Error('Data foto kosong atau tidak valid.');
    }

    const slot = options.slot || 'main';
    const key = makeProductPhotoKey(feature, slot);
    const record = {
      version: 1,
      feature: cleanKeyPart(feature, 'unknown'),
      slot: cleanKeyPart(slot, 'main'),
      blob,
      mimeType: blob.type || 'image/jpeg',
      size: blob.size,
      width: Number(options.width) || null,
      height: Number(options.height) || null,
      source: options.source || 'camera',
      updatedAt: new Date().toISOString()
    };

    await setValue(key, record);
    const verified = await getValue(key);
    if (!verified || !(verified.blob instanceof Blob) || verified.blob.size !== blob.size) {
      throw new Error('Verifikasi penyimpanan foto gagal.');
    }
    return verified;
  }

  async function loadProductPhoto(feature, slot = 'main') {
    const record = await getValue(makeProductPhotoKey(feature, slot));
    if (!record) return null;
    if (record instanceof Blob) {
      return { version: 0, blob: record, size: record.size, mimeType: record.type || 'image/jpeg' };
    }
    return record.blob instanceof Blob ? record : null;
  }

  async function clearProductPhoto(feature, slot = 'main') {
    await deleteValue(makeProductPhotoKey(feature, slot));
  }

  async function saveGanciPhoto(blob) {
    if (!(blob instanceof Blob) || blob.size < 1) {
      throw new Error('Data foto kosong atau tidak valid.');
    }
    const record = {
      version: 2,
      blob,
      mimeType: blob.type || 'image/jpeg',
      size: blob.size,
      updatedAt: new Date().toISOString()
    };
    await setValue(GANCI_PHOTO_KEY, record);
    const verified = await getValue(GANCI_PHOTO_KEY);
    if (!verified || !(verified.blob instanceof Blob) || verified.blob.size !== blob.size) {
      throw new Error('Verifikasi penyimpanan foto gagal.');
    }
    return verified;
  }

  async function loadGanciPhoto() {
    const record = await getValue(GANCI_PHOTO_KEY);
    if (!record) return null;
    if (record instanceof Blob) {
      return { version: 1, blob: record, size: record.size, mimeType: record.type || 'image/jpeg' };
    }
    return record.blob instanceof Blob ? record : null;
  }

  async function clearGanciPhoto() {
    await deleteValue(GANCI_PHOTO_KEY);
  }

  window.LuxPhotoStorage = Object.freeze({
    requestPersistence,
    prepareImageBlob,
    saveProductPhoto,
    loadProductPhoto,
    clearProductPhoto,
    makeProductPhotoKey,
    saveGanciPhoto,
    loadGanciPhoto,
    clearGanciPhoto,
    dataUrlToBlob,
    GANCI_PHOTO_KEY,
    PRODUCT_PHOTO_PREFIX
  });
})();
