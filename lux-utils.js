/*
 * LUX shared utilities.
 * Dimuat sebelum script lain di setiap halaman yang membutuhkannya.
 * Menggantikan salinan escapeHtml, dataUrlToBlob, blobToDataUrl, dan
 * loadImage sederhana yang sebelumnya diduplikasi di banyak file.
 */
(function (root) {
  'use strict';

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
  }

  function dataUrlToBlob(dataUrl, fallbackMime) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      throw new Error('Format foto tidak valid.');
    }
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) throw new Error('Data foto tidak lengkap.');
    const header = dataUrl.slice(0, commaIndex);
    const payload = dataUrl.slice(commaIndex + 1);
    const mime = (header.match(/^data:([^;,]+)/) || [])[1] || fallbackMime || 'image/jpeg';
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('File foto gagal dibaca.'));
      reader.readAsDataURL(blob);
    });
  }

  // Loader sederhana (tanpa proxy). Halaman yang butuh fallback proxy
  // (result.html, gallery.html) punya loader sendiri yang lebih kompleks.
  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!String(src || '').startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = src;
    });
  }

  root.LuxUtils = Object.freeze({ escapeHtml, dataUrlToBlob, blobToDataUrl, loadImageElement });
  root.escapeHtml = escapeHtml;
})(window);
