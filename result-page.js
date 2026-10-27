  // ─── Supabase ───
  const BUCKET        = 'photobooth';
  let resultConsentSettings = null;
  let resultConsentDone = sessionStorage.getItem('lux_result_consent_done') === '1';
  let pendingResultAction = null;

  function eventStorageGet(key) {
    try {
      const v = sessionStorage.getItem(key);
      if (v !== null) return v;
    } catch (e) {}
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function activeEventId() {
    const directId = eventStorageGet('activeEventId');
    if (directId) return directId;
    try { return JSON.parse(eventStorageGet('activeEvent') || '{}').id || ''; }
    catch (e) { return ''; }
  }

  
  // Kompresi khusus upload R2 agar tidak terkena batas payload Vercel.
  // File download/cetak tetap memakai resolusi asli.
  async function optimizeImageForR2(blob, maxWidth = 1200, maxHeight = 1800, quality = 0.88) {
    if (!blob || !(blob.type || '').startsWith('image/')) return blob;

    try {
      const img = await createImageBitmap(blob);
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);

      // Jika file sudah kecil, tetap dipakai
      if (blob.size < 2 * 1024 * 1024 && ratio === 1) {
        img.close();
        return blob;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      img.close();

      return await new Promise(resolve => {
        canvas.toBlob(
          result => resolve(result || blob),
          'image/jpeg',
          quality
        );
      });
    } catch (e) {
      console.warn('Optimasi upload gagal, gunakan file asli:', e);
      return blob;
    }
  }

const trackedGalleryPaths = new Set();

async function saveGallerySessionMetadata(filePath, sessionId) {
    // Pastikan session Supabase masih valid sebelum menulis metadata Galeri.
    if (typeof Auth.ensureValidSession === 'function') {
      const ok = await Auth.ensureValidSession({ forceServerCheck: false });
      if (!ok) throw new Error('Session login tidak valid. Silakan login ulang.');
    }

    const userId = Auth.getUserId();
    const token = Auth.getToken();
    if (!userId || !token) {
      throw new Error('User login tidak ditemukan saat menyimpan Galeri.');
    }

    const payload = {
      user_id: userId,
      file_path: filePath,
      created_at: new Date().toISOString(),
      product_type: isPhotoboxMode ? 'photobox' : 'photostrip',
      session_id: String(sessionId),
      event_id: eventStorageGet('eventMode') === '1' ? (activeEventId() || null) : null,
      template_name: localStorage.getItem('templateName') || '',
      template_category: localStorage.getItem('templateCategory') || '',
      photo_count: Math.max(1, Number(filteredPhotos?.length) || 1)
    };

    async function postMetadata(body) {
      return await fetch(`${SUPABASE_URL}/rest/v1/photo_sessions`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(body)
      });
    }

    let response = await postMetadata(payload);

    // Fallback kompatibilitas jika database produksi belum memiliki kolom analytics baru.
    if (!response.ok && response.status === 400) {
      const fullError = await response.text().catch(() => '');
      const looksLikeMissingColumn = /column|schema cache|PGRST204|does not exist/i.test(fullError);
      if (looksLikeMissingColumn) {
        console.warn('Schema photo_sessions lama terdeteksi, retry payload minimum:', fullError);
        response = await postMetadata({
          user_id: userId,
          file_path: filePath,
          created_at: payload.created_at
        });
      } else {
        throw new Error(`Metadata Galeri gagal (${response.status}): ${fullError || 'Bad Request'}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Metadata Galeri gagal (${response.status})${errorText ? `: ${errorText}` : ''}`);
    }

    // Verifikasi row benar-benar dapat dibaca kembali oleh user yang sama melalui RLS.
    const verifyUrl = `${SUPABASE_URL}/rest/v1/photo_sessions?file_path=eq.${encodeURIComponent(filePath)}&select=file_path,user_id&limit=1`;
    const verify = await fetch(verifyUrl, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${Auth.getToken()}`
      }
    });

    if (!verify.ok) {
      const verifyError = await verify.text().catch(() => '');
      throw new Error(`Verifikasi Galeri gagal (${verify.status})${verifyError ? `: ${verifyError}` : ''}`);
    }

    const rows = await verify.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Metadata sudah dikirim tetapi tidak dapat dibaca kembali dari photo_sessions. Periksa RLS Supabase.');
    }

    trackedGalleryPaths.add(filePath);
    return rows[0];
  }

async function uploadToSupabase(blob, filename, options = {}) {
    // Jangan mengubah file master download/cetak.
    // Hanya mengecilkan copy yang dikirim ke R2.
    blob = await optimizeImageForR2(blob);

    const userId = Auth.getUserId() || 'anon';
    const requestedSessionId = Number(options.sessionId);
    const ts = Number.isFinite(requestedSessionId) && requestedSessionId > 0 ? Math.trunc(requestedSessionId) : Date.now();
    const path = `results/${userId}_${ts}_${filename}`;

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const res = await fetch('/api/upload', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({fileName:path, contentType:blob.type || 'image/jpeg', data:base64})
    });
    if (!res.ok) throw new Error('R2 upload gagal');
    const json = await res.json();

    // Final strip wajib memiliki metadata photo_sessions agar muncul di Galeri.
    // Error tidak lagi ditelan diam-diam. Jika metadata gagal, save dianggap gagal.
    const shouldTrackGallery = options.trackSession === true
      && ((blob.type || '').startsWith('image/') || (blob.type || '').startsWith('video/'));
    if (shouldTrackGallery && !trackedGalleryPaths.has(path)) {
      await saveGallerySessionMetadata(path, ts);
    }

    return json.url;
  }

  async function loadResultConsentSettings() {
    const ownerId = Auth.getUserId();
    if (!ownerId) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/content_sharing_settings?user_id=eq.${ownerId}&select=*`, {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${Auth.getToken()}`
        }
      });
      if (!res.ok) {
        console.warn('Consent setting fetch failed:', await res.text());
        return null;
      }
      const data = await res.json();
      resultConsentSettings = data?.[0] || null;
      if (resultConsentSettings?.enabled) {
        const brand = resultConsentSettings.instagram_brand || resultConsentSettings.tiktok_brand || Auth.getBoothName?.() || 'brand photobooth ini';
        const desc = document.getElementById('resultConsentDesc');
        if (desc) {
          desc.textContent = (resultConsentSettings.consent_message || 'Kami ingin menggunakan beberapa hasil foto terbaik sebagai konten di Instagram atau TikTok.') +
            ` ${brand}. Persetujuan ini sepenuhnya sukarela dan tidak memengaruhi proses download foto.`;
        }
      }
      return resultConsentSettings;
    } catch(e) {
      console.warn('loadResultConsentSettings error:', e);
      return null;
    }
  }

  function cleanConsentUsername(v) {
    v = String(v || '').trim();
    if (!v) return '';
    return v.startsWith('@') ? v : '@' + v;
  }

  function eventIdForConsent() {
    try {
      return eventStorageGet('eventMode') === '1'
        ? activeEventId()
        : '';
    } catch(e) { return ''; }
  }

  async function saveResultConsent(skipped = false) {
    const ownerId = Auth.getUserId();
    if (!ownerId) return;
    const payload = {
      user_id: ownerId,
      session_id: String(cloudSessionId || Date.now()),
      event_id: eventIdForConsent() || null,
      publish_consent: skipped ? false : document.getElementById('resultPublishConsent').checked,
      tag_consent: skipped ? false : document.getElementById('resultTagConsent').checked,
      instagram_username: skipped ? '' : cleanConsentUsername(document.getElementById('resultIgUsername').value),
      tiktok_username: skipped ? '' : cleanConsentUsername(document.getElementById('resultTtUsername').value),
      final_photo_url: finalPublicURL || ''
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/photo_consents`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${Auth.getToken()}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) console.warn('saveResultConsent failed:', await res.text());
    } catch(e) {
      console.warn('saveResultConsent error:', e);
    }
  }

  async function ensureResultConsent(action) {
    pendingResultAction = action;
    if (!resultConsentSettings) await loadResultConsentSettings();
    if (resultConsentSettings?.enabled && !resultConsentDone) {
      document.getElementById('resultConsentOverlay').style.display = 'flex';
      return;
    }
    action();
  }

  async function submitResultConsent() {
    await saveResultConsent(false);
    resultConsentDone = true;
    sessionStorage.setItem('lux_result_consent_done', '1');
    document.getElementById('resultConsentOverlay').style.display = 'none';
    if (pendingResultAction) pendingResultAction();
  }

  async function skipResultConsent() {
    await saveResultConsent(true);
    resultConsentDone = true;
    sessionStorage.setItem('lux_result_consent_done', '1');
    document.getElementById('resultConsentOverlay').style.display = 'none';
    if (pendingResultAction) pendingResultAction();
  }

  function buildDownloadPageURL(extra = {}) {
    const ownerId = Auth.getUserId() || '';
    const downloadBaseURL = 'https://www.lux-photo.web.id/download.html';

    if (extra.manifest || finalManifestURL) {
      return downloadBaseURL + '?' + new URLSearchParams({
        m: extra.manifest || finalManifestURL,
        owner: ownerId
      }).toString();
    }

    // Fallback lama kalau upload manifest gagal.
    const params = new URLSearchParams({ photo: finalPublicURL || '', owner: ownerId });
    const photos = (finalIndividualURLs || []).filter(Boolean);
    photos.forEach(url => params.append('p', url));
    if (finalGifURL) params.set('gif', finalGifURL);
    if (extra.gif) params.set('gif', extra.gif);
    return downloadBaseURL + '?' + params.toString();
  }

  async function uploadDownloadManifest({ photo, photos = [], gif = '' }) {
    const manifest = {
      version: 1,
      type: isPhotoboxMode ? 'photobox' : 'photostrip',
      ownerId: Auth.getUserId() || '',
      eventId: eventStorageGet('eventMode') === '1' ? activeEventId() : '',
      photo,
      photos: photos.filter(Boolean),
      gif: gif || '',
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    return await uploadToSupabase(blob, 'download-manifest.json', { sessionId: cloudSessionId });
  }

  // ─── State ───

  const PHOTO_STORE_DB = 'lux-photo-temp-db';
  const PHOTO_STORE_NAME = 'items';

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(PHOTO_STORE_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(PHOTO_STORE_NAME)) {
          req.result.createObjectStore(PHOTO_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB gagal dibuka'));
    });
  }

  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, 'readonly');
      const req = tx.objectStore(PHOTO_STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('IndexedDB gagal membaca'));
      tx.oncomplete = () => db.close();
    });
  }

  async function idbDelete(key) {
    try {
      const db = await idbOpen();
      return new Promise((resolve) => {
        const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
        tx.objectStore(PHOTO_STORE_NAME).delete(key);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      });
    } catch(e) {}
  }

  async function idbClearAll() {
    try {
      const db = await idbOpen();
      return new Promise(resolve => {
        const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
        tx.objectStore(PHOTO_STORE_NAME).clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      });
    } catch(e) {}
  }

  function normalizePhotoArray(value) {
    const candidate = Array.isArray(value)
      ? value
      : (value && Array.isArray(value.photos) ? value.photos : []);
    return candidate.filter(item => typeof item === 'string' && item.length > 32);
  }

  async function loadLargePhotoArray(key) {
    // IndexedDB diperiksa langsung; marker localStorage tidak lagi menjadi syarat.
    try {
      const fromIdb = normalizePhotoArray(await idbGet(key));
      if (fromIdb.length) return fromIdb;
    } catch (e) {
      console.warn('[LUX] IndexedDB read failed:', key, e);
    }

    try {
      return normalizePhotoArray(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch(e) {
      return [];
    }
  }

  let filteredPhotos = [];
  let filteredPhotosReady = false;
  let livePhotos = [];
  let livePhotosReady = false;
  const captureFlow    = localStorage.getItem('captureFlow') || '';
  const isEventMode = eventStorageGet('eventMode') === '1';
  const isPhotoboxMode = captureFlow === 'photobox';
  // Mode Vintage: frame digambar dari preset (tanpa upload admin) dan foto tidak bisa diedit lagi.
  const isVintageMode  = !!(window.LuxVintage && window.LuxVintage.isActive());
  const vintageThemeId = isVintageMode ? window.LuxVintage.activeThemeId() : '';
  const vintageFilter  = isVintageMode ? window.LuxVintage.filterFor(vintageThemeId) : '';
  const templateSrc    = isVintageMode
    ? window.LuxVintage.makeFrame(vintageThemeId).src
    : localStorage.getItem('templateSrc');
  const slots          = JSON.parse(localStorage.getItem('templateSlots') || '[]').map(s => ({
    ...s,
    r: Math.round((((Number(s?.r ?? s?.rotate ?? s?.rotation ?? 0) || 0) % 360) + 360) % 360)
  }));
  const templateTextElements = JSON.parse(localStorage.getItem('templateTextElements') || '[]')
    .filter(item => item && (item.type === 'text' || item.kind === 'text'))
    .map(item => ({
      type: 'text',
      text: String(item.text || item.value || 'PHOTOBOOTH').slice(0, 80),
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      w: Math.max(40, Number(item.w) || 240),
      h: Math.max(24, Number(item.h) || 60),
      r: Math.round((((Number(item.r ?? item.rotate ?? item.rotation ?? 0) || 0) % 360) + 360) % 360),
      font: String(item.font || 'Segoe UI'),
      color: /^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color.toUpperCase() : '#1D3557',
      font_size: Math.max(10, Number(item.font_size || item.fontSize) || Math.round((Number(item.h) || 60) * 0.58)),
      weight: 900
    }));
  const tmplW          = parseInt(localStorage.getItem('templateW') || '591');
  const tmplH          = parseInt(localStorage.getItem('templateH') || '1772');
  const isBasicTemplate = localStorage.getItem('templateIsBasic') === '1';
  const templatePhotoLayer = localStorage.getItem('templatePhotoLayer') === 'front' ? 'front' : 'behind';

  const canvas = document.getElementById('resultCanvas');
  const ctx    = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // ─── Interactive result editor ───
  const RESULT_TRANSFORMS_KEY = 'luxResultPhotoTransformsV132';
  const photoTransforms = slots.map(() => ({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, flipX: false }));
  let selectedEditSlot = 0;
  let resultEditRevision = 0;
  let resultEditDirty = false;
  let resultEditorReady = false;
  let editorRenderQueued = false;
  let editorRenderBusy = false;
  let editorRenderAgain = false;
  const resultImageCache = new Map();
  const activeEditorPointers = new Map();
  let dragState = null;
  let pinchState = null;

  try {
    const saved = isVintageMode ? [] : JSON.parse(sessionStorage.getItem(RESULT_TRANSFORMS_KEY) || '[]');
    if (Array.isArray(saved)) {
      saved.slice(0, photoTransforms.length).forEach((item, i) => {
        if (!item || typeof item !== 'object') return;
        photoTransforms[i] = {
          zoom: Math.min(3, Math.max(1, Number(item.zoom) || 1)),
          offsetX: Number(item.offsetX) || 0,
          offsetY: Number(item.offsetY) || 0,
          rotation: Number(item.rotation) || 0,
          flipX: item.flipX === true
        };
      });
    }
  } catch (_) {}

  function currentPhotoTransform() {
    if (!photoTransforms.length) return null;
    selectedEditSlot = Math.min(Math.max(0, selectedEditSlot), photoTransforms.length - 1);
    return photoTransforms[selectedEditSlot];
  }

  function persistPhotoTransforms() {
    try { sessionStorage.setItem(RESULT_TRANSFORMS_KEY, JSON.stringify(photoTransforms)); } catch (_) {}
  }

  function buildResultEditor() {
    const editor = document.getElementById('resultEditor');
    const tabs = document.getElementById('editorPhotoTabs');
    if (!editor || !tabs || !slots.length || !filteredPhotos.length) return;
    tabs.innerHTML = slots.map((_, i) => `<button type="button" class="editor-photo-tab ${i === selectedEditSlot ? 'active' : ''}" onclick="selectResultPhoto(${i})">Foto ${i + 1}</button>`).join('');
    editor.classList.add('is-ready');
    canvas.classList.add('result-editable');
    resultEditorReady = true;
    updateResultEditorUI();
  }

  function updateResultEditorUI() {
    const t = currentPhotoTransform();
    if (!t) return;
    document.querySelectorAll('.editor-photo-tab').forEach((button, i) => button.classList.toggle('active', i === selectedEditSlot));
    const zoom = document.getElementById('editorZoom');
    const zoomValue = document.getElementById('editorZoomValue');
    const flipButton = document.getElementById('editorFlipBtn');
    if (zoom) zoom.value = String(t.zoom);
    if (zoomValue) zoomValue.textContent = `${Math.round(t.zoom * 100)}%`;
    if (flipButton) flipButton.classList.toggle('active', t.flipX);
  }

  function selectResultPhoto(index) {
    if (!photoTransforms.length) return;
    selectedEditSlot = Math.min(Math.max(0, Number(index) || 0), photoTransforms.length - 1);
    updateResultEditorUI();
  }

  function markResultEdited() {
    resultEditRevision += 1;
    resultEditDirty = true;
    invalidateLiveStrip(); // live strip harus dirender ulang dengan posisi/zoom terbaru
    persistPhotoTransforms();
    const save = document.getElementById('editorSaveBtn');
    const status = document.getElementById('editorSyncStatus');
    const btnQR = document.getElementById('btnQR');
    if (save) save.disabled = false;
    if (status) status.textContent = 'Ada perubahan. Simpan agar QR memakai hasil terbaru.';
    if (btnQR) btnQR.disabled = true;
  }

  function setResultZoom(value) {
    const t = currentPhotoTransform();
    if (!t) return;
    t.zoom = Math.min(3, Math.max(1, Number(value) || 1));
    updateResultEditorUI();
    markResultEdited();
    scheduleResultEditorRender();
  }

  function adjustResultZoom(delta) {
    const t = currentPhotoTransform();
    if (!t) return;
    setResultZoom(t.zoom + Number(delta || 0));
  }

  function rotateResultPhoto(degrees) {
    const t = currentPhotoTransform();
    if (!t) return;
    t.rotation = ((t.rotation + Number(degrees || 0) + 180) % 360) - 180;
    markResultEdited();
    scheduleResultEditorRender();
  }

  function flipResultPhoto() {
    const t = currentPhotoTransform();
    if (!t) return;
    t.flipX = !t.flipX;
    updateResultEditorUI();
    markResultEdited();
    scheduleResultEditorRender();
  }

  function resetResultPhoto() {
    if (!photoTransforms.length) return;
    photoTransforms[selectedEditSlot] = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, flipX: false };
    updateResultEditorUI();
    markResultEdited();
    scheduleResultEditorRender();
  }

  function canvasPointFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
      y: (clientY - rect.top) * (canvas.height / Math.max(1, rect.height))
    };
  }

  function pointInSlot(point, slot) {
    const cx = Number(slot.x) + Number(slot.w) / 2;
    const cy = Number(slot.y) + Number(slot.h) / 2;
    const angle = -(Number(slot.r ?? slot.rotate ?? slot.rotation ?? 0) || 0) * Math.PI / 180;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
    return Math.abs(lx) <= Number(slot.w) / 2 && Math.abs(ly) <= Number(slot.h) / 2;
  }

  function slotAtPoint(point) {
    for (let i = slots.length - 1; i >= 0; i--) if (pointInSlot(point, slots[i])) return i;
    return -1;
  }

  function globalDeltaToSlotLocal(dx, dy, slot) {
    const angle = -(Number(slot.r ?? slot.rotate ?? slot.rotation ?? 0) || 0) * Math.PI / 180;
    return {
      x: dx * Math.cos(angle) - dy * Math.sin(angle),
      y: dx * Math.sin(angle) + dy * Math.cos(angle)
    };
  }

  async function flushResultEditorRender() {
    if (editorRenderBusy) { editorRenderAgain = true; return; }
    editorRenderBusy = true;
    try { await generateResult(true); }
    finally {
      editorRenderBusy = false;
      if (editorRenderAgain) {
        editorRenderAgain = false;
        scheduleResultEditorRender();
      }
    }
  }

  function scheduleResultEditorRender() {
    if (editorRenderQueued) return;
    editorRenderQueued = true;
    requestAnimationFrame(() => {
      editorRenderQueued = false;
      flushResultEditorRender();
    });
  }

  function pointerDistance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  function pointerMidpoint(a, b) { return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }

  canvas.addEventListener('pointerdown', event => {
    if (!resultEditorReady) return;
    const p = canvasPointFromClient(event.clientX, event.clientY);
    const hit = slotAtPoint(p);
    if (hit >= 0) selectResultPhoto(hit);
    if (hit < 0 && activeEditorPointers.size === 0) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    activeEditorPointers.set(event.pointerId, p);

    if (activeEditorPointers.size === 1) {
      dragState = { pointerId:event.pointerId, last:p };
      canvas.classList.add('is-dragging');
    } else if (activeEditorPointers.size === 2) {
      const pts = [...activeEditorPointers.values()];
      const t = currentPhotoTransform();
      pinchState = {
        distance: Math.max(1, pointerDistance(pts[0], pts[1])),
        midpoint: pointerMidpoint(pts[0], pts[1]),
        zoom: t?.zoom || 1,
        offsetX: t?.offsetX || 0,
        offsetY: t?.offsetY || 0
      };
      dragState = null;
    }
  });

  canvas.addEventListener('pointermove', event => {
    if (!activeEditorPointers.has(event.pointerId)) return;
    event.preventDefault();
    const p = canvasPointFromClient(event.clientX, event.clientY);
    activeEditorPointers.set(event.pointerId, p);
    const t = currentPhotoTransform();
    const slot = slots[selectedEditSlot];
    if (!t || !slot) return;

    if (activeEditorPointers.size >= 2 && pinchState) {
      const pts = [...activeEditorPointers.values()].slice(0,2);
      const distance = Math.max(1, pointerDistance(pts[0], pts[1]));
      const midpoint = pointerMidpoint(pts[0], pts[1]);
      t.zoom = Math.min(3, Math.max(1, pinchState.zoom * distance / pinchState.distance));
      const local = globalDeltaToSlotLocal(midpoint.x - pinchState.midpoint.x, midpoint.y - pinchState.midpoint.y, slot);
      t.offsetX = pinchState.offsetX + local.x;
      t.offsetY = pinchState.offsetY + local.y;
      updateResultEditorUI();
      markResultEdited();
      scheduleResultEditorRender();
      return;
    }

    if (dragState && dragState.pointerId === event.pointerId) {
      const local = globalDeltaToSlotLocal(p.x - dragState.last.x, p.y - dragState.last.y, slot);
      t.offsetX += local.x;
      t.offsetY += local.y;
      dragState.last = p;
      markResultEdited();
      scheduleResultEditorRender();
    }
  });

  function finishEditorPointer(event) {
    activeEditorPointers.delete(event.pointerId);
    if (activeEditorPointers.size < 2) pinchState = null;
    if (activeEditorPointers.size === 1) {
      const [id, point] = activeEditorPointers.entries().next().value;
      dragState = { pointerId:id, last:point };
    } else if (activeEditorPointers.size === 0) {
      dragState = null;
      canvas.classList.remove('is-dragging');
    }
  }
  canvas.addEventListener('pointerup', finishEditorPointer);
  canvas.addEventListener('pointercancel', finishEditorPointer);

  canvas.addEventListener('wheel', event => {
    if (!resultEditorReady) return;
    const point = canvasPointFromClient(event.clientX, event.clientY);
    const hit = slotAtPoint(point);
    if (hit < 0) return;
    event.preventDefault();
    selectResultPhoto(hit);
    const t = currentPhotoTransform();
    const multiplier = Math.exp(-event.deltaY * 0.0015);
    setResultZoom(t.zoom * multiplier);
  }, { passive:false });

  async function loadResultImage(src) {
    const key = String(src || '');
    if (!key) return null;
    if (!resultImageCache.has(key)) resultImageCache.set(key, loadImage(key));
    try { return await resultImageCache.get(key); }
    catch (e) { resultImageCache.delete(key); throw e; }
  }

  async function syncEditedResult() {
    if (!finalDataURL) return;
    const save = document.getElementById('editorSaveBtn');
    const status = document.getElementById('editorSyncStatus');
    if (save) save.disabled = true;
    if (status) status.textContent = 'Menyimpan hasil terbaru...';
    const revisionToSave = resultEditRevision;
    try {
      // Pastikan finalDataURL sudah memakai transform terakhir sebelum upload dimulai.
      await generateResult(true);
      cloudUploadPromise = uploadForQR();
      await cloudUploadPromise;
      const qrButton = document.getElementById('btnQR');
      if (revisionToSave !== resultEditRevision || !finalPublicURL || qrButton?.disabled) {
        throw new Error('Hasil berubah atau upload belum selesai dengan benar.');
      }
      resultEditDirty = false;
      if (status) status.textContent = 'Perubahan tersimpan. QR sudah memakai hasil terbaru.';
      autoGenerateLive(); // render ulang live strip sesuai edit & upload
    } catch (e) {
      console.error('Simpan hasil/Galeri gagal:', e);
      if (save) save.disabled = false;
      if (status) status.textContent = `Gagal menyimpan ke Galeri: ${e?.message || 'Unknown error'}`;
    }
  }

  const displayW = 240;
  const displayH = Math.round(tmplH * displayW / tmplW);
  canvas.style.width  = displayW + 'px';
  canvas.style.height = displayH + 'px';
  canvas.width  = tmplW;
  canvas.height = tmplH;

  let finalDataURL   = null;
  let finalPublicURL = null;
  let finalIndividualURLs = [];
  let cloudUploadPromise = null;
  let cloudSessionId = 0;
  let finalGifURL     = '';
  let finalManifestURL = '';
  let gifDataURL     = null;
  let liveMP4URL     = null; // object URL for live fotostrip video
  let liveStripBlob  = null;  // blob hasil render live strip (mengikuti template)
  let liveStripExt   = 'webm';
  let liveBuildPromise = null;
  let liveBuildGen   = 0;
  let liveGeneration = 0;     // naik setiap foto diedit → live strip lama dibuang
  let liveProgressCb = () => {};

  let selectedPrintMode = 1;
  let selectedShareMode = 1;

  function setStripSelector(prefix, mode) {
    const safeMode = Number(mode) === 2 ? 2 : 1;
    document.getElementById(prefix + 'Mode1')?.classList.toggle('active', safeMode === 1);
    document.getElementById(prefix + 'Mode2')?.classList.toggle('active', safeMode === 2);
    return safeMode;
  }

  function setPrintMode(mode) {
    selectedPrintMode = setStripSelector('print', mode);
  }

  function setShareMode(mode) {
    selectedShareMode = setStripSelector('share', mode);
  }

  async function printSelected() {
    const visibleButton = document.getElementById('btnPrintSelected');
    if (!visibleButton || visibleButton.disabled) return;

    const label = visibleButton.querySelector('.btn-label');
    const oldText = label?.textContent || 'Cetak Sekarang';
    visibleButton.disabled = true;
    if (label) label.textContent = 'Menyiapkan cetak...';

    try {
      if (selectedPrintMode === 2 && !isPhotoboxMode) {
        await cetak2Strip();
      } else {
        await shareNative();
      }
    } finally {
      if (label) label.textContent = oldText;
      visibleButton.disabled = !finalDataURL;
    }
  }

  async function shareSelected() {
    const visibleButton = document.getElementById('btnShareSelected');
    if (!visibleButton || visibleButton.disabled) return;

    const label = visibleButton.querySelector('.btn-label');
    const oldText = label?.textContent || 'Share Sekarang';
    visibleButton.disabled = true;
    if (label) label.textContent = 'Menyiapkan share...';

    try {
      if (selectedShareMode === 2 && !isPhotoboxMode) {
        await share2Strip();
      } else {
        await share1Strip();
      }
    } finally {
      if (label) label.textContent = oldText;
      visibleButton.disabled = !finalDataURL;
    }
  }

  if (isPhotoboxMode) {
    document.title = 'Hasil Photobox 4R - LUX Photobooth';

    const previewMeta = document.getElementById('previewMeta');
    const printMode1 = document.getElementById('printMode1');
    const printMode2 = document.getElementById('printMode2');
    const shareMode1 = document.getElementById('shareMode1');
    const shareMode2 = document.getElementById('shareMode2');
    const printHint = document.getElementById('printActionHint');
    const shareHint = document.getElementById('shareActionHint');

    if (previewMeta) previewMeta.textContent = 'Photobox 4R';
    if (printMode1) printMode1.textContent = '4R';
    if (shareMode1) shareMode1.textContent = '4R';
    if (printMode2) printMode2.style.display = 'none';
    if (shareMode2) shareMode2.style.display = 'none';
    if (printHint) printHint.textContent = 'photobox sudah 10×15 / 4R';
    if (shareHint) shareHint.textContent = 'bagikan file photobox 4R';

    selectedPrintMode = 1;
    selectedShareMode = 1;

    const btnShare = document.getElementById('btnShare');
    const btnShare1 = document.getElementById('btnShare1Strip');
    const btnCetak2 = document.getElementById('btnCetak2Strip');
    const btnShare2 = document.getElementById('btnShare2Strip');

    if (btnShare?.querySelector('.btn-label')) {
      btnShare.querySelector('.btn-label').textContent = 'Cetak 4R';
    }
    if (btnShare1?.querySelector('.btn-label')) {
      btnShare1.querySelector('.btn-label').textContent = 'Share 4R';
    }
    if (btnCetak2) btnCetak2.style.display = 'none';
    if (btnShare2) btnShare2.style.display = 'none';
  }

  function loadImageOnce(src, useCors = false, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        callback(value);
      };

      const timer = setTimeout(() => {
        finish(reject, new Error(`Timeout memuat gambar: ${src}`));
      }, timeoutMs);

      if (useCors) img.crossOrigin = 'anonymous';

      img.onload = () => finish(resolve, img);
      img.onerror = () => finish(reject, new Error(`Gagal memuat gambar: ${src}`));
      img.src = src;
    });
  }

  async function loadImage(src) {
    const normalizedSrc = String(src || '').trim();
    if (!normalizedSrc) throw new Error('Sumber gambar kosong.');

    let parsedUrl = null;
    let isCrossOriginHttp = false;

    try {
      parsedUrl = new URL(normalizedSrc, window.location.href);
      isCrossOriginHttp =
        /^https?:$/i.test(parsedUrl.protocol) &&
        parsedUrl.origin !== window.location.origin;
    } catch (_) {
      parsedUrl = null;
    }

    try {
      // Percobaan pertama tetap memakai URL asli. Untuk URL lintas origin,
      // anonymous CORS wajib agar canvas tidak menjadi tainted.
      return await loadImageOnce(normalizedSrc, isCrossOriginHttp);
    } catch (directError) {
      // data:, blob:, dan URL lokal tidak dapat/tidak perlu melewati proxy.
      if (!isCrossOriginHttp || !parsedUrl || parsedUrl.protocol !== 'https:') {
        throw directError;
      }

      const proxySrc = `/api/media-proxy?src=${encodeURIComponent(parsedUrl.href)}`;
      console.warn('Load media langsung gagal. Mencoba media proxy:', {
        source: parsedUrl.href,
        error: directError.message
      });

      try {
        // Endpoint proxy berada pada origin aplikasi, sehingga aman untuk canvas
        // dan tidak bergantung pada header CORS dari custom domain media.
        return await loadImageOnce(proxySrc, false);
      } catch (proxyError) {
        throw new Error(
          `Gambar gagal dimuat langsung maupun melalui media proxy. ` +
          `Sumber: ${parsedUrl.href}. ` +
          `Direct: ${directError.message}. ` +
          `Proxy: ${proxyError.message}`
        );
      }
    }
  }

  function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  async function resizeDataURLForCloud(dataURL, options = {}) {
    if (!dataURL) return dataURL;
    const maxW = Math.max(1, Number(options.maxW) || 1280);
    const maxH = Math.max(1, Number(options.maxH) || 960);
    const quality = Math.min(0.95, Math.max(0.5, Number(options.quality) || 0.86));
    const img = await loadImage(dataURL);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(1, maxW / iw, maxH / ih);
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cc = c.getContext('2d');
    cc.imageSmoothingEnabled = true;
    cc.imageSmoothingQuality = 'high';
    cc.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', quality);
  }

  async function maybeWatermarkDataURL(dataURL, mime = 'image/jpeg', quality = 0.97) {
    if (!Auth.needsProWatermark() || !dataURL) return dataURL;
    const img = await loadImage(dataURL);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const cc = c.getContext('2d');
    cc.imageSmoothingEnabled = true;
    cc.imageSmoothingQuality = 'high';
    cc.drawImage(img, 0, 0, c.width, c.height);
    Auth.drawProWatermark(cc, c.width, c.height);
    return c.toDataURL(mime, quality);
  }

  function triggerDownload(href, filename) {
    const a = document.createElement('a');
    if (href.startsWith('blob:') || href.startsWith('http')) {
      a.href = href;
    } else {
      a.href = URL.createObjectURL(dataURLtoBlob(href));
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 300);
  }

  function showStatus(msg, color = '#27ae60') {
    const el = document.getElementById('statusMsg');
    el.style.color = color;
    el.textContent = msg;
    setTimeout(() => { el.textContent = ''; }, 4000);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isAutoDownloadEnabled() {
    try {
      const profile = (typeof Auth !== 'undefined' && Auth.getProfile) ? Auth.getProfile() : null;
      return profile?.auto_download_result === true;
    } catch (_) {
      return false;
    }
  }

  function getAutoDownloadSessionKey() {
    const sessionId = sessionStorage.getItem('luxPhotoSessionId')
      || localStorage.getItem('photosSessionId')
      || String(cloudSessionId || 'current');
    return `lux_auto_download_done_${sessionId}`;
  }

  // iPhone/iPad (Safari) tidak mendukung banyak download otomatis berurutan:
  // file (mis. GIF) malah dibuka sebagai halaman preview dan menutupi halaman hasil.
  function isIOSDevice() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  async function autoDownloadAllResultFiles() {
    if (!isAutoDownloadEnabled() || !finalDataURL) return;
    if (isIOSDevice()) {
      console.info('[auto-download] dilewati di iOS/iPadOS, gunakan tombol Download manual');
      return;
    }

    const doneKey = getAutoDownloadSessionKey();
    if (sessionStorage.getItem(doneKey) === '1') return;

    // Tandai sebelum mulai agar refresh/error parsial tidak memicu badai download berulang.
    sessionStorage.setItem(doneKey, '1');
    showStatus('Auto download aktif — menyiapkan semua file...');

    try {
      // Tunggu aset turunan selesai dibuat. Keduanya aman dipanggil ulang karena punya guard internal.
      await Promise.allSettled([autoGenerateGif(), autoGenerateLive()]);

      const stamp = Date.now();
      const queue = [];

      // 1. Hasil utama/composite
      queue.push({ href: finalDataURL, filename: `lux-photobooth-${stamp}.jpg` });

      // 2. Semua foto satuan yang tersedia
      filteredPhotos.forEach((src, i) => {
        if (src) queue.push({ href: src, filename: `lux-foto-${i + 1}-${stamp}.jpg` });
      });

      // 3. GIF animasi
      if (gifBlob) {
        queue.push({ href: URL.createObjectURL(gifBlob), filename: `lux-animated-${stamp}.gif`, revoke: true });
      }

      // 4. Live photo/video bila tersedia
      if (liveMP4URL) {
        queue.push({ href: liveMP4URL, filename: `lux-fotostrip-live-${stamp}.${liveStripExt}` });
      }

      for (const item of queue) {
        triggerDownload(item.href, item.filename);
        if (item.revoke) setTimeout(() => URL.revokeObjectURL(item.href), 5000);
        await sleep(450);
      }

      showStatus(`${queue.length} file auto download diproses ✓`);
    } catch (e) {
      console.warn('[auto-download] gagal:', e);
      // Izinkan percobaan lagi setelah refresh jika benar-benar gagal sebelum antrean selesai.
      sessionStorage.removeItem(doneKey);
      showStatus('Auto download gagal: ' + (e?.message || e), '#e94560');
    }
  }

  function setProgress(id, pct) {
    const wrap = document.getElementById(id + 'Progress');
    const fill = document.getElementById(id + 'ProgressFill');
    if (!wrap || !fill) return;
    if (pct === null) { wrap.classList.remove('show'); fill.style.width = '0%'; return; }
    wrap.classList.add('show');
    fill.style.width = pct + '%';
  }

  function templateTextFontStack(font) {
    const allowed = ['Segoe UI', 'Arial', 'Georgia', 'Trebuchet MS', 'Courier New', 'Impact'];
    const safe = allowed.includes(font) ? font : 'Segoe UI';
    if (safe === 'Segoe UI') return "'Segoe UI', Arial, sans-serif";
    if (safe === 'Trebuchet MS') return "'Trebuchet MS', Arial, sans-serif";
    if (safe === 'Courier New') return "'Courier New', monospace";
    if (safe === 'Georgia') return "Georgia, 'Times New Roman', serif";
    if (safe === 'Impact') return "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
    return "Arial, sans-serif";
  }

  function drawTemplateTextElements(ctx) {
    templateTextElements.forEach(element => {
      const text = String(element.text || '').trim();
      if (!text) return;
      const maxW = Math.max(30, element.w * 0.92);
      const maxH = Math.max(12, element.h * 0.75);
      let fontSize = Math.min(Math.max(10, element.font_size || element.h * 0.58), maxH);
      const family = templateTextFontStack(element.font);

      ctx.save();
      ctx.translate(element.x + element.w / 2, element.y + element.h / 2);
      ctx.rotate((element.r || 0) * Math.PI / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = element.color;
      ctx.font = `900 ${fontSize}px ${family}`;
      while (fontSize > 9 && ctx.measureText(text).width > maxW) {
        fontSize -= 1;
        ctx.font = `900 ${fontSize}px ${family}`;
      }
      ctx.fillText(text, 0, 0, maxW);
      ctx.restore();
    });
  }

  // ─── Layer dasar komposit: background + template + foto/video tiap slot ───
  // `sources[i]` boleh <img>, <canvas>, atau <video>, sehingga hasil foto strip
  // dan live strip memakai satu jalur render yang sama (slot, rotasi, zoom, flip).
  function drawBaseComposite(c, templateImage, sources, opts = {}) {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, tmplW, tmplH);

    if (templateImage && templatePhotoLayer === 'front') {
      c.drawImage(templateImage, 0, 0, tmplW, tmplH);
    }

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const photo = sources[i];
      if (!photo) continue;
      const angle = ((Number(slot.r ?? slot.rotate ?? slot.rotation ?? 0) || 0) * Math.PI) / 180;
      const transform = photoTransforms[i] || { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, flipX: false };
      // Video live direkam dari stream mentah (tidak mirror), sedangkan foto sudah di-mirror saat capture.
      const isVideo = typeof HTMLVideoElement !== 'undefined' && photo instanceof HTMLVideoElement;
      const flipX = isVideo && opts.mirrorVideo !== false ? !transform.flipX : transform.flipX;

      c.save();
      c.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
      c.rotate(angle);
      c.beginPath();
      c.rect(-slot.w / 2, -slot.h / 2, slot.w, slot.h);
      c.clip();
      Beautify.drawCover(c, photo, -slot.w / 2, -slot.h / 2, slot.w, slot.h, {
        zoom: transform.zoom,
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
        rotate: transform.rotation,
        flipX,
        beautify: 'off',
        filter: vintageFilter || undefined
      });
      c.restore();
    }

    if (templateImage && templatePhotoLayer === 'behind') {
      c.drawImage(templateImage, 0, 0, tmplW, tmplH);
    }
  }

  // ─── Layer atas: teks template, watermark nama booth, watermark akun Free ───
  // `sampler(x, y)` (opsional) mengembalikan [r,g,b] untuk menentukan warna teks footer.
  // Pada live strip layer ini digambar sekali ke canvas transparan lalu ditempel tiap frame.
  function drawOverlayLayers(ctx, canvas, sampler) {
    const sample = sampler || ((x, y) => ctx.getImageData(x, y, 1, 1).data);
    // Teks yang ditambahkan dari Template Manager selalu berada di atas komposit final.
    drawTemplateTextElements(ctx);

    // Fallback lama: nama booth otomatis di footer hanya dipakai bila template belum punya teks custom.
    if (templateTextElements.length === 0 && slots.length > 0 && Auth.showWatermark()) {
      try {
        const bottomOfLastSlot = Math.max(...slots.map(s => s.y + s.h));
        const gapH = tmplH - bottomOfLastSlot;

        if (gapH > 16) {
          // Sample warna background di area footer (tengah-bawah template)
          const sampleX = Math.floor(tmplW / 2);
          const sampleY = Math.floor(bottomOfLastSlot + gapH / 2);
          const px = sample(sampleX, sampleY);
          const r = px[0], g = px[1], b = px[2];

          // Hitung luminance
          const lum = 0.299*r + 0.587*g + 0.114*b;

          // Kalau background gelap → teks putih; terang → teks hitam
          // Tapi jangan terlalu terang/gelap → pilih warna mid-contrast
          let textR, textG, textB;
          if (lum < 128) {
            // Background gelap → teks putih agak warm
            textR = 255; textG = 248; textB = 240;
          } else {
            // Background terang → teks navy gelap
            textR = 29; textG = 53; textB = 87;
          }

          // Font size: proporsional dengan gap, min 18px max 52px
          const baseFontSize = Math.max(18, Math.min(52, Math.floor(gapH * 0.38)));
          const centerY  = bottomOfLastSlot + gapH / 2;

          function getWatermarkColumns() {
            const usableSlots = (slots || []).filter(s => Number.isFinite(Number(s.x)) && Number.isFinite(Number(s.w)) && Number(s.w) > 0);
            if (usableSlots.length < 2) return [{ x: tmplW / 2, maxW: tmplW * 0.86 }];

            const centers = usableSlots
              .map(s => Number(s.x) + Number(s.w) / 2)
              .sort((a, b) => a - b);

            const left = centers.filter(x => x < tmplW * 0.46);
            const right = centers.filter(x => x > tmplW * 0.54);

            // Kalau template 10×15 berisi 2 strip/2 kolom, watermark nama harus tampil di masing-masing kolom.
            if (left.length && right.length) {
              const leftMin = Math.min(...usableSlots.filter(s => (Number(s.x) + Number(s.w) / 2) < tmplW * 0.46).map(s => Number(s.x)));
              const leftMax = Math.max(...usableSlots.filter(s => (Number(s.x) + Number(s.w) / 2) < tmplW * 0.46).map(s => Number(s.x) + Number(s.w)));
              const rightMin = Math.min(...usableSlots.filter(s => (Number(s.x) + Number(s.w) / 2) > tmplW * 0.54).map(s => Number(s.x)));
              const rightMax = Math.max(...usableSlots.filter(s => (Number(s.x) + Number(s.w) / 2) > tmplW * 0.54).map(s => Number(s.x) + Number(s.w)));

              return [
                { x: (leftMin + leftMax) / 2, maxW: Math.max(80, (leftMax - leftMin) * 1.05) },
                { x: (rightMin + rightMax) / 2, maxW: Math.max(80, (rightMax - rightMin) * 1.05) }
              ];
            }

            return [{ x: tmplW / 2, maxW: tmplW * 0.86 }];
          }

          ctx.save();
          ctx.globalAlpha = 0.70;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.letterSpacing = '3px';
          ctx.fillStyle = `rgb(${textR},${textG},${textB})`;
          // Pakai nama booth dari profil, kalau watermark enabled
          if (Auth.showWatermark()) {
            const boothName = Auth.getBoothName().toUpperCase();
            const columns = getWatermarkColumns();

            columns.forEach(col => {
              let fontSize = baseFontSize;
              ctx.font = `900 ${fontSize}px 'Segoe UI', Arial, sans-serif`;
              while (ctx.measureText(boothName).width > col.maxW && fontSize > 14) {
                fontSize -= 2;
                ctx.font = `900 ${fontSize}px 'Segoe UI', Arial, sans-serif`;
              }
              ctx.fillText(boothName, col.x, centerY);
            });
          }
          ctx.restore();
        }
      } catch(e) {
        console.warn('Watermark teks gagal:', e);
      }
    }

    // ── Watermark tiled diagonal untuk akun Free ──
    if (Auth.needsProWatermark()) {
      const w = canvas.width, h = canvas.height;
      ctx.save();

      // Tiled diagonal text
      const fontSize = Math.max(22, Math.floor(w * 0.055));
      ctx.font = `800 ${fontSize}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text    = 'PROPERTI OF LUX PHOTOBOOTH';
      const angle   = -Math.PI / 6; // -30 derajat
      const spacing = fontSize * 4;

      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);

      const diagLen = Math.sqrt(w * w + h * h);
      const cols = Math.ceil(diagLen / (ctx.measureText(text).width + spacing)) + 2;
      const rows = Math.ceil(diagLen / spacing) + 2;

      for (let r = -rows; r <= rows; r++) {
        for (let c = -cols; c <= cols; c++) {
          const x = c * (ctx.measureText(text).width + spacing * 1.5);
          const y = r * spacing;
          ctx.fillText(text, x, y);
        }
      }
      ctx.restore();


    }
  }

  // ─── Generate composite image ───
  async function generateResult(previewOnly = false) {
    try {
      if (!filteredPhotosReady) {
        filteredPhotos = await loadLargePhotoArray('filteredPhotos');
        filteredPhotosReady = true;
      }
      if (!filteredPhotos.length) {
        filteredPhotos = await loadLargePhotoArray('photos');
      }
      if (!livePhotosReady) {
        livePhotos = await loadLargePhotoArray('livePhotos');
        livePhotosReady = true;
      }

      const templateImage = templateSrc ? await loadResultImage(templateSrc) : null;
      const photoImages = [];
      for (let i = 0; i < slots.length; i++) {
        const src = filteredPhotos[i] || filteredPhotos[filteredPhotos.length - 1];
        photoImages[i] = src ? await loadResultImage(src) : null;
      }

      drawBaseComposite(ctx, templateImage, photoImages);
      drawOverlayLayers(ctx, canvas);

      finalDataURL = canvas.toDataURL('image/jpeg', 0.97);

      if (!resultEditorReady && !isVintageMode) buildResultEditor();
      if (previewOnly) {
        document.getElementById('loadingOverlay').style.display = 'none';
        return;
      }

      // Bersihkan base64 besar dari localStorage setelah dipakai
      // (URL Supabase tetap aman disimpan)
      try {
        const ts = localStorage.getItem('templateSrc') || '';
        if (ts.startsWith('data:')) localStorage.removeItem('templateSrc');
        const fp = localStorage.getItem('filteredPhotos') || '';
        if (fp.length > 100000) {
          // Hapus filtered photos setelah composite selesai dibuat
          // Tapi kita masih butuh untuk GIF, jadi simpan dulu, hapus setelah GIF selesai
        }
      } catch(e) {}

      document.getElementById('loadingOverlay').style.display = 'none';

      const hasLive = livePhotos.some(Boolean);
      startCountdown();
      [
        'btnJpg',
        'btnShare',
        'btnZip',
        'btnCetak2Strip',
        'btnShare1Strip',
        'btnShare2Strip',
        'btnPrintSelected',
        'btnShareSelected'
      ].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = false;
      });
      document.getElementById('btnLive').disabled = !hasLive;
      if (!hasLive) document.getElementById('liveHint').textContent = 'Live photo tidak tersedia';

      const canGif = filteredPhotos.length >= 2;
      document.getElementById('btnGif').disabled = !canGif;
      if (!canGif) document.getElementById('gifHint').textContent = 'Butuh minimal 2 foto';

      cloudUploadPromise = uploadForQR();
      // Generate GIF & Live Photo otomatis di background
      autoGenerateGif();
      autoGenerateLive();
      // Jika diaktifkan dari Admin > Profil, download semua hasil sebagai file terpisah.
      // Dipanggil setelah hasil utama siap; fungsi akan menunggu GIF/live selesai dibuat.
      setTimeout(() => autoDownloadAllResultFiles(), 250);
      // Tampilkan plan banner
      showPlanBanner();
      loadResultConsentSettings();

    } catch(e) {
      console.error(e);
      document.getElementById('loadingOverlay').innerHTML =
        '<span style="color:#e94560;padding:16px;text-align:center">Gagal generate foto.<br>Coba ulangi dari awal.</span>';
    }
  }

  async function uploadForQR() {
    const uploadRevision = resultEditRevision;
    const qrStatus = document.getElementById('qrStatus');
    const btnQR    = document.getElementById('btnQR');
    const btnLabel = document.getElementById('btnQRLabel');
    qrStatus.textContent = 'Mengupload foto strip...';
    try {
      cloudSessionId = cloudSessionId || Date.now();

      // Upload foto strip utama dengan kualitas penuh untuk download/cetak.
      const photoBlob = dataURLtoBlob(finalDataURL);
      finalPublicURL = await uploadToSupabase(photoBlob, 'strip.jpg', {
        trackSession: true,
        sessionId: cloudSessionId
      });

      // Buat thumbnail kecil khusus galeri. File ini tidak mengubah hasil download utama.
      try {
        const thumbSrc = await resizeDataURLForCloud(finalDataURL, {
          maxW: 360,
          maxH: 1080,
          quality: 0.72
        });
        await uploadToSupabase(dataURLtoBlob(thumbSrc), 'thumb.jpg', { sessionId: cloudSessionId });
      } catch (e) {
        console.warn('Upload thumbnail galeri gagal:', e);
      }

      // Upload foto individual versi cloud yang dibatasi 1280×960.
      // Versi lokal untuk ZIP/download langsung tetap memakai kualitas aslinya.
      // Sebelumnya file satuan sudah masuk storage/db, tapi download page cuma dikasih param photo strip.
      const individualURLs = [];
      if (filteredPhotos.length > 0) {
        qrStatus.textContent = 'Mengupload foto individual...';
        await Promise.allSettled(
          filteredPhotos.map(async (src, i) => {
            if (!src) return;
            try {
              const cloudSrc = await resizeDataURLForCloud(src, {
                maxW: 1280,
                maxH: 960,
                quality: 0.86
              });
              const watermarkedSrc = await maybeWatermarkDataURL(cloudSrc, 'image/jpeg', 0.88);
              const blob = dataURLtoBlob(watermarkedSrc);
              const url  = await uploadToSupabase(blob, `foto-${i+1}.jpg`, { sessionId: cloudSessionId });
              individualURLs[i] = url;
            } catch(e) {
              console.warn(`Upload foto-${i+1} gagal:`, e);
            }
          })
        );
      }
      finalIndividualURLs = individualURLs.filter(Boolean);

      // Upload GIF kalau sudah di-generate
      let gifURL = '';
      if (gifBlob) {
        qrStatus.textContent = 'Mengupload GIF...';
        try {
          gifURL = await uploadToSupabase(gifBlob, 'animated.gif', { sessionId: cloudSessionId });
          finalGifURL = gifURL;
          gifUploaded = true;
        } catch(e) {}
      }

      // Build QR URL pendek: simpan semua URL ke manifest JSON di Supabase.
      // Sebelumnya QR terlalu panjang karena membawa banyak URL foto satuan sebagai query params.
      try {
        finalManifestURL = await uploadDownloadManifest({
          photo: finalPublicURL,
          photos: finalIndividualURLs,
          gif: gifURL
        });
      } catch(e) {
        console.warn('Upload manifest gagal, fallback query panjang:', e);
      }

      const downloadPageURL = buildDownloadPageURL({ gif: gifURL, manifest: finalManifestURL });
      const qrBox = document.getElementById('qrcodeModal');
      qrBox.innerHTML = '';
      new QRCode(qrBox, {
        text: downloadPageURL, width: 260, height: 260,
        colorDark: '#1D3557', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      if (uploadRevision !== resultEditRevision) {
        finalPublicURL = null;
        finalManifestURL = '';
        qrStatus.style.color = 'var(--text2)';
        qrStatus.textContent = 'Foto diubah setelah upload. Simpan perubahan untuk memperbarui QR.';
        btnQR.disabled = true;
        btnLabel.textContent = 'Simpan perubahan dulu';
        const save = document.getElementById('editorSaveBtn');
        if (save) save.disabled = false;
        return;
      }
      qrStatus.style.color = 'var(--text2)';
      const uploaded = individualURLs.filter(Boolean).length;
      qrStatus.textContent = `Strip + ${uploaded} foto individual tersimpan ✓`;
      btnQR.disabled = false;
      btnLabel.textContent = 'Scan QR — Download ke HP';
    } catch(e) {
      console.error('QR upload error:', e);
      qrStatus.style.color = '#e94560';
      qrStatus.textContent = e.message || 'Upload gagal';
      btnQR.disabled = true;
      // Tampilkan error di label biar keliatan di HP
      btnLabel.textContent = 'QR Tidak Tersedia';
    }
  }

  // ─── Auto Generate GIF ───
  async function autoGenerateGif() {
    if (gifBlob) return; // sudah ada
    if (filteredPhotos.length < 2) return; // butuh minimal 2 foto
    try {
      gifBlob = await makeGif();
      console.log('[auto] GIF generated, size:', gifBlob.size);
      // Update tombol GIF
      const btnGif = document.getElementById('btnGif');
      if (btnGif) btnGif.disabled = false;
      // Kalau uploadForQR sudah selesai tapi belum upload GIF, upload sekarang
      if (finalPublicURL && !gifUploaded) {
        try {
          const gifURL = await uploadToSupabase(gifBlob, 'animated.gif', { sessionId: cloudSessionId });
          gifUploaded = true;
          // Update QR URL dengan gif, tetap bawa foto satuan juga
          finalGifURL = gifURL;
          const qrBox = document.getElementById('qrcodeModal');
          if (qrBox && finalPublicURL) {
            try {
              finalManifestURL = await uploadDownloadManifest({
                photo: finalPublicURL,
                photos: finalIndividualURLs,
                gif: gifURL
              });
            } catch(e) {
              console.warn('Update manifest GIF gagal:', e);
            }
            const downloadPageURL = buildDownloadPageURL({ gif: gifURL, manifest: finalManifestURL });
            qrBox.innerHTML = '';
            new QRCode(qrBox, {
              text: downloadPageURL, width: 260, height: 260,
              colorDark: '#1D3557', colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M
            });
          }
        } catch(e) { console.warn('Auto GIF upload gagal:', e); }
      }
    } catch(e) {
      console.warn('[auto] GIF generation gagal:', e);
    }
  }

  // ─── Live Fotostrip (mengikuti template) ───
  // Video live tiap slot ditaruh di slot template yang dipilih (posisi, ukuran, rotasi,
  // zoom/offset/flip hasil editor), lalu frame/template, teks, dan watermark ditumpuk di atas
  // persis seperti foto strip. Semua slot bergerak bersamaan dalam satu video.
  const LIVE_STRIP_MS = 3000;
  const LIVE_STRIP_FPS = 24;
  const LIVE_STRIP_MAX_SIDE = 1920;

  function pickLiveMime() {
    return ['video/webm;codecs=vp8', 'video/webm', 'video/mp4']
      .find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
  }

  function loadLiveVideo(src) {
    return new Promise(resolve => {
      if (!src) { resolve(null); return; }
      const v = document.createElement('video');
      let done = false;
      const finish = ok => { if (done) return; done = true; clearTimeout(t); resolve(ok ? v : null); };
      const t = setTimeout(() => finish(false), 8000);
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.onloadeddata = () => finish(true);
      v.onerror = () => finish(false);
      v.src = src;
      v.load();
    });
  }

  async function buildLiveStripBlob() {
    if (!window.MediaRecorder) throw new Error('Browser tidak mendukung perekaman video.');
    const mime = pickLiveMime();
    if (!mime) throw new Error('Format video tidak didukung browser ini.');
    liveStripExt = mime.includes('mp4') ? 'mp4' : 'webm';
    if (!slots.length) throw new Error('Template tidak punya slot foto.');

    liveProgressCb(5, 'Memuat template & video...');
    const templateImage = templateSrc ? await loadResultImage(templateSrc) : null;

    // Foto diam dipakai sebagai cadangan kalau video slot tertentu tidak ada/rusak.
    const stills = [];
    for (let i = 0; i < slots.length; i++) {
      const src = filteredPhotos[i] || filteredPhotos[filteredPhotos.length - 1];
      try { stills[i] = src ? await loadResultImage(src) : null; } catch (e) { stills[i] = null; }
    }
    const videos = await Promise.all(slots.map((_, i) => loadLiveVideo(livePhotos[i])));
    if (!videos.some(Boolean)) throw new Error('Video live tidak bisa dimuat.');

    // Ukuran output = ukuran template (dibatasi agar encoder tidak berat), harus genap.
    const k = Math.min(1, LIVE_STRIP_MAX_SIDE / Math.max(tmplW, tmplH));
    const W = Math.max(2, Math.round(tmplW * k / 2) * 2);
    const H = Math.max(2, Math.round(tmplH * k / 2) * 2);
    const kx = W / tmplW, ky = H / tmplH;

    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

    // Layer atas (teks/watermark) digambar sekali ke canvas transparan.
    // Warna teks footer disampling dari komposit foto diam supaya sama dengan hasil foto strip.
    const still = mk(), stillCtx = still.getContext('2d', { willReadFrequently: true });
    stillCtx.save(); stillCtx.scale(kx, ky);
    drawBaseComposite(stillCtx, templateImage, stills, { mirrorVideo: false });
    stillCtx.restore();

    const overlay = mk(), overlayCtx = overlay.getContext('2d');
    overlayCtx.save(); overlayCtx.scale(kx, ky);
    drawOverlayLayers(overlayCtx, { width: tmplW, height: tmplH }, (x, y) => {
      try { return stillCtx.getImageData(Math.floor(x * kx), Math.floor(y * ky), 1, 1).data; }
      catch (e) { return [255, 255, 255]; }
    });
    overlayCtx.restore();

    const out = mk(), outCtx = out.getContext('2d');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    function drawFrame() {
      const sources = slots.map((_, i) => {
        const v = videos[i];
        if (v) {
          if (v.paused || v.ended) { try { v.currentTime = 0; } catch (e) {} v.play().catch(() => {}); }
          if (v.readyState >= 2 && v.videoWidth) return v;
        }
        return stills[i];
      });
      outCtx.setTransform(1, 0, 0, 1, 0, 0);
      outCtx.save();
      outCtx.scale(kx, ky);
      drawBaseComposite(outCtx, templateImage, sources);
      outCtx.restore();
      outCtx.drawImage(overlay, 0, 0);
    }

    await Promise.all(videos.map(v => v ? v.play().catch(() => {}) : null));
    drawFrame(); // frame pertama sebelum recorder mulai

    const stream = out.captureStream(LIVE_STRIP_FPS);
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: Math.round(Math.min(6e6, Math.max(3e6, W * H * 4))) // maks ±2,3 MB/3 dtk agar base64-nya < limit body Vercel (4,5 MB)
    });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });

    recorder.start(100);
    liveProgressCb(30, 'Merekam live strip...');
    const startTime = performance.now();
    await new Promise(resolve => {
      // setInterval (bukan rAF) supaya tetap jalan walau tab sempat tidak aktif.
      const timer = setInterval(() => {
        const elapsed = performance.now() - startTime;
        drawFrame();
        liveProgressCb(30 + Math.round(Math.min(1, elapsed / LIVE_STRIP_MS) * 60), 'Merekam live strip...');
        if (elapsed >= LIVE_STRIP_MS) { clearInterval(timer); resolve(); }
      }, 1000 / LIVE_STRIP_FPS);
    });

    recorder.stop();
    await stopped;
    videos.forEach(v => { if (v) { v.pause(); v.removeAttribute('src'); v.load(); } });
    stream.getTracks().forEach(t => t.stop());

    liveProgressCb(95, 'Menyelesaikan...');
    return new Blob(chunks, { type: mime.split(';')[0] });
  }

  function ensureLiveStrip() {
    if (liveStripBlob) return Promise.resolve(liveStripBlob);
    if (liveBuildPromise && liveBuildGen === liveGeneration) return liveBuildPromise;
    const gen = liveGeneration;
    liveBuildGen = gen;
    const p = buildLiveStripBlob().then(blob => {
      if (gen !== liveGeneration) return ensureLiveStrip(); // foto diedit saat render → ulangi
      liveStripBlob = blob;
      liveMP4URL = URL.createObjectURL(blob);
      return blob;
    }).finally(() => { if (liveBuildPromise === p) liveBuildPromise = null; });
    liveBuildPromise = p;
    return p;
  }

  function invalidateLiveStrip() {
    liveGeneration += 1;
    if (liveMP4URL) { try { URL.revokeObjectURL(liveMP4URL); } catch (e) {} }
    liveMP4URL = null;
    liveStripBlob = null;
    liveUploaded = false;
  }

  // ─── Auto Generate Live Strip (background) ───
  async function autoGenerateLive() {
    if (!livePhotos.some(Boolean)) return; // tidak ada live photo
    const btn = document.getElementById('btnLive');
    try {
      if (btn && !liveStripBlob) btn.disabled = true;
      liveProgressCb = () => {};
      await ensureLiveStrip();
      if (btn) btn.disabled = false;
      console.log('[auto] Live strip generated');

      // Upload setelah foto strip utama selesai diupload (butuh cloudSessionId yang sama).
      if (!finalPublicURL && cloudUploadPromise) { try { await cloudUploadPromise; } catch (e) {} }
      // Batas 3 MB: upload lewat /api/upload (base64 di JSON) kena limit body Vercel 4,5 MB.
      if (finalPublicURL && !liveUploaded && liveStripBlob && liveStripBlob.size <= 3 * 1024 * 1024) {
        const gen = liveGeneration;
        const blob = liveStripBlob;
        try {
          await uploadToSupabase(blob, `live.${liveStripExt}`, { sessionId: cloudSessionId });
          if (gen === liveGeneration) liveUploaded = true;
          console.log('[auto] Live strip uploaded');
        } catch (e) { console.warn('Auto live upload gagal:', e); }
      }
    } catch (e) {
      if (btn) btn.disabled = false;
      console.warn('[auto] Live generation gagal:', e);
    }
  }

  // ─── Plan Banner hidden on result page ───
  function showPlanBanner() { return; }

  // ─── Countdown 14 hari ───
  function startCountdown() {
    const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
    function getTs() {
      if (finalPublicURL) {
        // Format baru: results/{userId}_{timestamp}_{filename}
        const m = finalPublicURL.match(/results\/[^_]+_(\d{13})_/);
        if (m) return parseInt(m[1]);
        // Format lama: results/{timestamp}_{filename}
        const m2 = finalPublicURL.match(/results\/(\d{13})_/);
        if (m2) return parseInt(m2[1]);
      }
      return Date.now();
    }
    function fmt(ms) {
      if (ms <= 0) return 'sudah kadaluarsa';
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      if (d > 0) return d + ' hari ' + h + ' jam ' + m + ' menit lagi';
      if (h > 0) return h + ' jam ' + m + ' menit lagi';
      return m + ' menit lagi';
    }
    function tick() {
      const rem = (getTs() + RETENTION_MS) - Date.now();
      document.getElementById('countdownBar').classList.add('visible');
      document.getElementById('countdownText').textContent = fmt(rem);
    }
    tick();
    setInterval(tick, 60000);
  }

  // ─── QR Modal ───
  function bukaQR(skipConsent = false) {
    if (!skipConsent) return ensureResultConsent(() => bukaQR(true));
    const m = document.getElementById('qrModal');
    m.style.display = 'flex';
  }
  function tutupQR() {
    document.getElementById('qrModal').style.display = 'none';
  }
  document.getElementById('qrModal').addEventListener('click', function(e) {
    if (e.target === this) tutupQR();
  });

  // ─── Download JPG ───
  function downloadJpg(skipConsent = false) {
    if (!skipConsent) return ensureResultConsent(() => downloadJpg(true));
    if (!finalDataURL) return;
    if (!resultEditDirty && (finalPublicURL || finalManifestURL)) {
      window.location.href = buildDownloadPageURL();
      return;
    }
    triggerDownload(finalDataURL, `lux-photobooth-${Date.now()}.jpg`);
    showStatus('Download foto dimulai ✓');
  }

  // ─── Download Live Fotostrip ───
  async function downloadLive(skipConsent = false) {
    if (!skipConsent) return ensureResultConsent(() => downloadLive(true));
    const btn = document.getElementById('btnLive');
    const label = btn ? btn.querySelector('.btn-label') : null;
    const hint = document.getElementById('liveHint');

    if (!livePhotos.some(Boolean)) {
      showStatus('Tidak ada live video', '#e94560');
      return;
    }

    if (!liveStripBlob) {
      if (btn) btn.disabled = true;
      if (label) label.textContent = 'Membuat fotostrip video...';
      setProgress('live', 5);
      liveProgressCb = (pct, msg) => { setProgress('live', pct); if (hint && msg) hint.textContent = msg; };
      try {
        await ensureLiveStrip();
      } catch (e) {
        console.error('Live video error:', e);
        setProgress('live', null);
        if (hint) hint.textContent = 'Gagal: ' + e.message;
        if (btn) btn.disabled = false;
        if (label) label.textContent = 'Download Live Fotostrip';
        showStatus('Gagal buat live video: ' + e.message, '#e94560');
        return;
      } finally {
        liveProgressCb = () => {};
      }
      setProgress('live', null);
      if (hint) hint.textContent = '';
      if (btn) btn.disabled = false;
      if (label) label.textContent = 'Download Live Fotostrip';
    }

    triggerDownload(liveMP4URL, `lux-fotostrip-live-${Date.now()}.${liveStripExt}`);
    showStatus('Download live fotostrip ✓');

    // Kalau hasil baru (setelah edit) belum terupload, kirim juga ke cloud.
    autoGenerateLive();
  }

  // ─── GIF (pure canvas, no external encoder) ───
  // Pakai canvas + requestAnimationFrame → capture frames → encode manual
  let gifBlob = null;
  let gifUploaded = false;
  let liveUploaded = false;

  async function downloadGif(skipConsent = false) {
    if (!skipConsent) return ensureResultConsent(() => downloadGif(true));
    if (gifBlob) {
      triggerDownload(URL.createObjectURL(gifBlob), `lux-animated-${Date.now()}.gif`);
      showStatus('Download GIF ✓');
      return;
    }

    const btn = document.getElementById('btnGif');
    btn.disabled = true;
    btn.querySelector('.btn-label').textContent = 'Membuat GIF...';
    setProgress('gif', 5);
    document.getElementById('gifHint').textContent = 'Mengolah foto...';

    try {
      gifBlob = await makeGif();
      setProgress('gif', null);
      document.getElementById('gifHint').textContent = '';
      btn.disabled = false;
      btn.querySelector('.btn-label').textContent = 'Download GIF Animasi';
      triggerDownload(URL.createObjectURL(gifBlob), `lux-animated-${Date.now()}.gif`);
      showStatus('GIF berhasil dibuat ✓');
    } catch(e) {
      console.error('GIF error:', e);
      setProgress('gif', null);
      document.getElementById('gifHint').textContent = 'Gagal: ' + e.message;
      btn.disabled = false;
      btn.querySelector('.btn-label').textContent = 'Download GIF Animasi';
      showStatus('Gagal buat GIF: ' + e.message, '#e94560');
    }
  }

  // Pure JS GIF encoder — tidak butuh library eksternal
  // ─── GIF generation — Median-Cut quantizer + Floyd-Steinberg dithering ───
  async function makeGif() {
    const GIF_W = 480;
    const GIF_H = 360;
    const DELAY = 80; // 800ms per frame

    const images = await Promise.all(filteredPhotos.map(src => loadImage(src).catch(() => null)));
    const validImages = images.filter(Boolean);
    if (validImages.length < 2) throw new Error('Butuh minimal 2 foto');

    setProgress('gif', 15);

    const tmp = document.createElement('canvas');
    tmp.width = GIF_W; tmp.height = GIF_H;
    const tc = tmp.getContext('2d', { willReadFrequently: true });

    // Draw all frames
    const frameDataList = [];
    for (let fi = 0; fi < validImages.length; fi++) {
      const img = validImages[fi];
      tc.fillStyle = '#ffffff';
      tc.fillRect(0, 0, GIF_W, GIF_H);
      const scale = Math.max(GIF_W / img.width, GIF_H / img.height);
      const sw = GIF_W / scale, sh = GIF_H / scale;
      tc.drawImage(img, (img.width-sw)/2, (img.height-sh)/2, sw, sh, 0, 0, GIF_W, GIF_H);
      frameDataList.push(tc.getImageData(0, 0, GIF_W, GIF_H));
      setProgress('gif', 15 + Math.round((fi+1) / validImages.length * 30));
    }

    setProgress('gif', 50);
    document.getElementById('gifHint').textContent = 'Membangun palet warna...';

    // Build global palette using median-cut across all frames
    const palette = medianCut(frameDataList, 255);
    // Reserve index 0 for white background
    palette.unshift([255, 255, 255]);
    while (palette.length < 256) palette.push([0, 0, 0]);

    setProgress('gif', 65);
    document.getElementById('gifHint').textContent = 'Encoding GIF...';

    const gifData = encodeGIF(frameDataList, GIF_W, GIF_H, DELAY, palette);
    setProgress('gif', 95);
    return new Blob([gifData], { type: 'image/gif' });
  }

  // ─── Median-Cut Color Quantizer ───
  function medianCut(frames, maxColors) {
    // Sample pixels from all frames
    const pixels = [];
    const step = Math.max(1, Math.floor(frames[0].data.length / 4 / 3000));
    frames.forEach(f => {
      const d = f.data;
      for (let i = 0; i < d.length; i += 4 * step) {
        pixels.push([d[i], d[i+1], d[i+2]]);
      }
    });

    // Median cut recursion
    function cut(bucket, depth) {
      if (depth === 0 || bucket.length <= 1) {
        // Average the bucket
        const avg = [0, 0, 0];
        bucket.forEach(p => { avg[0] += p[0]; avg[1] += p[1]; avg[2] += p[2]; });
        return [[Math.round(avg[0]/bucket.length), Math.round(avg[1]/bucket.length), Math.round(avg[2]/bucket.length)]];
      }
      // Find channel with largest range
      let minR=255,maxR=0,minG=255,maxG=0,minB=255,maxB=0;
      bucket.forEach(([r,g,b]) => {
        if(r<minR)minR=r; if(r>maxR)maxR=r;
        if(g<minG)minG=g; if(g>maxG)maxG=g;
        if(b<minB)minB=b; if(b>maxB)maxB=b;
      });
      const rRange = maxR-minR, gRange = maxG-minG, bRange = maxB-minB;
      const ch = rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;
      bucket.sort((a, b) => a[ch] - b[ch]);
      const mid = Math.floor(bucket.length / 2);
      return [
        ...cut(bucket.slice(0, mid), depth - 1),
        ...cut(bucket.slice(mid), depth - 1),
      ];
    }

    const depth = Math.ceil(Math.log2(maxColors));
    return cut(pixels, depth).slice(0, maxColors);
  }

  // ─── Floyd-Steinberg dithering + nearest color ───
  function ditherFrame(imgData, w, h, palette) {
    // Build KD-tree-like lookup: precompute nearest for sampled colors
    const pixels = new Uint8Array(w * h);
    const buf = new Float32Array(imgData.data); // copy for error diffusion

    function nearest(r, g, b) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < palette.length; i++) {
        const dr = r - palette[i][0], dg = g - palette[i][1], db = b - palette[i][2];
        const d = dr*dr + dg*dg + db*db;
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    // Work on a copy with error buffer
    const err = new Float32Array(w * h * 3).fill(0);
    const src = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      src[i*3]   = imgData.data[i*4];
      src[i*3+1] = imgData.data[i*4+1];
      src[i*3+2] = imgData.data[i*4+2];
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const r = Math.max(0, Math.min(255, src[i*3]   + err[i*3]));
        const g = Math.max(0, Math.min(255, src[i*3+1] + err[i*3+1]));
        const b = Math.max(0, Math.min(255, src[i*3+2] + err[i*3+2]));

        const idx = nearest(r, g, b);
        pixels[i] = idx;

        const er = r - palette[idx][0];
        const eg = g - palette[idx][1];
        const eb = b - palette[idx][2];

        // Distribute error to neighbors (Floyd-Steinberg)
        function addErr(nx, ny, factor) {
          if (nx < 0 || nx >= w || ny >= h) return;
          const ni = ny * w + nx;
          err[ni*3]   += er * factor;
          err[ni*3+1] += eg * factor;
          err[ni*3+2] += eb * factor;
        }
        addErr(x+1, y,   7/16);
        addErr(x-1, y+1, 3/16);
        addErr(x,   y+1, 5/16);
        addErr(x+1, y+1, 1/16);
      }
    }
    return pixels;
  }

  // ─── GIF89a encoder ───
  function encodeGIF(frames, w, h, delay, palette) {
    const bytes = [];
    function writeStr(s) { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)); }
    function write16(n) { bytes.push(n & 0xFF, (n >> 8) & 0xFF); }

    writeStr('GIF89a');
    write16(w); write16(h);
    bytes.push(0xF7, 0, 0); // GCT: 256 colors, bg=0, aspect=0

    for (let i = 0; i < 256; i++) {
      const c = palette[i] || [0,0,0];
      bytes.push(c[0], c[1], c[2]);
    }

    // Netscape loop extension
    bytes.push(0x21, 0xFF, 0x0B);
    writeStr('NETSCAPE2.0');
    bytes.push(3, 1, 0, 0, 0);

    frames.forEach((frame, fi) => {
      setProgress('gif', 65 + Math.round((fi / frames.length) * 28));

      bytes.push(0x21, 0xF9, 0x04, 0x00);
      write16(delay);
      bytes.push(0, 0);

      bytes.push(0x2C);
      write16(0); write16(0); write16(w); write16(h);
      bytes.push(0x00);

      // Dither this frame
      const pixels = ditherFrame(frame, w, h, palette);

      const lzw = lzwEncode(pixels, 8);
      bytes.push(8);
      for (let i = 0; i < lzw.length; i += 255) {
        const block = lzw.slice(i, i + 255);
        bytes.push(block.length);
        for (const b of block) bytes.push(b);
      }
      bytes.push(0);
    });

    bytes.push(0x3B);
    return new Uint8Array(bytes);
  }

  function lzwEncode(pixels, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoi = clearCode + 1;
    const result = [];
    let codeSize = minCodeSize + 1;
    let nextCode = eoi + 1;
    const table = new Map();

    function resetTable() {
      table.clear();
      for (let i = 0; i < clearCode; i++) table.set(String(i), i);
      codeSize = minCodeSize + 1;
      nextCode = eoi + 1;
    }

    let buf = 0, bufLen = 0;
    function writeBits(code) {
      buf |= code << bufLen;
      bufLen += codeSize;
      while (bufLen >= 8) { result.push(buf & 0xFF); buf >>= 8; bufLen -= 8; }
    }

    resetTable();
    writeBits(clearCode);

    let prefix = String(pixels[0]);
    for (let i = 1; i < pixels.length; i++) {
      const c = String(pixels[i]);
      const key = prefix + ',' + c;
      if (table.has(key)) {
        prefix = key;
      } else {
        writeBits(table.get(prefix));
        if (nextCode < 4096) {
          table.set(key, nextCode++);
          if (nextCode > (1 << codeSize)) codeSize = Math.min(codeSize + 1, 12);
        } else {
          writeBits(clearCode);
          resetTable();
        }
        prefix = c;
      }
    }
    writeBits(table.get(prefix));
    writeBits(eoi);
    if (bufLen > 0) result.push(buf & 0xFF);
    return result;
  }



  function forceDownloadBlob(blob, filename) {
    if (!blob) throw new Error('Blob kosong');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `lux-print-${Date.now()}.jpg`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }


  async function shareOrDownloadBlob(blob, filename, title, options = {}) {
    if (!blob) throw new Error('Blob kosong');
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    const suppressCancel = options.suppressCancel !== false;

    // Web Share API jalan paling aman di HTTPS + mobile browser.
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: title || 'LUX Photobooth',
          text: options.text || 'Hasil foto dari LUX Photobooth ✨'
        });
        return 'shared';
      } catch (e) {
        // Di beberapa browser Android, balik dari share/print sheet bisa dilempar AbortError
        // walaupun user tidak benar-benar membatalkan. Untuk tombol cetak, jangan tampilkan
        // pesan "Share dibatalkan" karena bikin misleading.
        if (e && e.name === 'AbortError') return suppressCancel ? 'handled' : 'cancelled';
        console.warn('Web Share gagal, fallback download:', e);
      }
    }

    forceDownloadBlob(blob, filename);
    return 'downloaded';
  }


  function canvasToBlobSafe(canvas, type = 'image/jpeg', quality = 0.95) {
    return new Promise((resolve, reject) => {
      try {
        if (!canvas || !canvas.width || !canvas.height) {
          reject(new Error('Canvas belum siap'));
          return;
        }
        canvas.toBlob(blob => {
          if (!blob) reject(new Error('Gagal membuat file gambar'));
          else resolve(blob);
        }, type, quality);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function loadImageSafe(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal load foto hasil'));
      img.src = src;
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Gagal membaca file print'));
      reader.readAsDataURL(blob);
    });
  }

  function escapePrintText(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));
  }

  function buildPrintWindowHTML(imageDataURL, filename, title) {
    const safeTitle = escapePrintText(title || 'Cetak 1 Strip');
    const safeFilename = escapePrintText(filename || 'cetak-1-strip.jpg');
    const imgJSON = JSON.stringify(imageDataURL);

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle}</title>
  <style id="dynamicPrintStyle"></style>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #f4f6fb;
      color: #1D3557;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .controls {
      position: sticky;
      top: 0;
      z-index: 5;
      background: rgba(255,255,255,.94);
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 8px 24px rgba(15,23,42,.08);
      padding: 14px;
      backdrop-filter: blur(14px);
    }
    .controls h1 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 900;
      letter-spacing: -.02em;
    }
    .controls p {
      margin: 0 0 12px;
      color: #64748b;
      font-size: 12px;
      line-height: 1.45;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(105px, 1fr));
      gap: 10px;
      align-items: end;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 11px;
      font-weight: 800;
      color: #475569;
    }
    select, input {
      width: 100%;
      border: 1.5px solid #dbe3ef;
      background: #fff;
      border-radius: 12px;
      padding: 10px 11px;
      font: inherit;
      font-size: 13px;
      color: #0f172a;
      outline: none;
    }
    input[type="range"] { padding: 0; }
    .btns { display: flex; gap: 8px; align-items: center; }
    button {
      border: none;
      border-radius: 999px;
      padding: 12px 16px;
      font-weight: 900;
      cursor: pointer;
      color: white;
      background: linear-gradient(135deg,#D84B7E,#E5B842);
      box-shadow: 0 6px 18px rgba(216,75,126,.22);
      white-space: nowrap;
    }
    button.secondary {
      color: #1D3557;
      background: #eef2ff;
      box-shadow: none;
    }
    .note {
      margin-top: 10px;
      font-size: 11px;
      color: #64748b;
    }
    .preview-wrap {
      min-height: calc(100vh - 170px);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 24px 16px;
    }
    .sheet {
      background: white;
      box-shadow: 0 14px 40px rgba(15,23,42,.18);
      overflow: hidden;
    }
    .sheet img { display: block; height: auto; }
    @media (max-width: 780px) {
      .grid { grid-template-columns: 1fr 1fr; }
      .btns { grid-column: 1 / -1; }
      button { flex: 1; }
    }
    @media print {
      .controls { display: none !important; }
      .preview-wrap { padding: 0 !important; min-height: 0 !important; }
      html, body { width: auto; height: auto; background: white !important; }
      .sheet { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="controls">
    <h1>${safeTitle}</h1>
    <p>Gambar yang dicetak tetap sama seperti generate Cetak 1 Strip. Kamu masih bisa atur printer, copies, warna, dan kualitas di dialog print browser.</p>
    <div class="grid">
      <label>Ukuran kertas
        <select id="paper">
          <option value="10x15" selected>10 × 15 cm</option>
          <option value="4r">4R / 10.2 × 15.2 cm</option>
          <option value="a4">A4</option>
        </select>
      </label>
      <label>Posisi gambar
        <select id="position">
          <option value="flex-start" selected>Kiri</option>
          <option value="center">Tengah</option>
          <option value="flex-end">Kanan</option>
        </select>
      </label>
      <label>Scale <span id="scaleText">100%</span>
        <input id="scale" type="range" min="80" max="110" step="1" value="100">
      </label>
      <label>Margin <span id="marginText">0 mm</span>
        <input id="margin" type="range" min="0" max="8" step="1" value="0">
      </label>
      <div class="btns">
        <button type="button" onclick="window.print()">Print</button>
        <button type="button" class="secondary" onclick="downloadImage()">Download</button>
      </div>
    </div>
    <div class="note">Tip: di dialog print, pilih ukuran kertas yang sama, nonaktifkan header/footer, dan pakai scale 100% kalau ingin ukuran presisi.</div>
  </div>
  <div class="preview-wrap">
    <div class="sheet" id="sheet">
      <img id="printImg" alt="${safeFilename}">
    </div>
  </div>
  <script>
    const imageDataURL = ${imgJSON};
    const filename = ${JSON.stringify(filename || 'cetak-1-strip.jpg')};
    const sizes = {
      '10x15': { w: 10, h: 15, label: '10 × 15 cm' },
      '4r':   { w: 10.2, h: 15.2, label: '4R' },
      'a4':   { w: 21, h: 29.7, label: 'A4' }
    };
    const img = document.getElementById('printImg');
    img.src = imageDataURL;

    function updatePrintLayout() {
      const paper = document.getElementById('paper').value;
      const pos = document.getElementById('position').value;
      const scale = Number(document.getElementById('scale').value || 100);
      const margin = Number(document.getElementById('margin').value || 0);
      const size = sizes[paper] || sizes['10x15'];
      const contentW = Math.max(1, size.w - (margin * 2 / 10));
      const contentH = Math.max(1, size.h - (margin * 2 / 10));
      const imgW = Math.max(.5, contentW * scale / 100);

      document.getElementById('scaleText').textContent = scale + '%';
      document.getElementById('marginText').textContent = margin + ' mm';

      const style = document.getElementById('dynamicPrintStyle');
      style.textContent =
        '@page{size:' + size.w + 'cm ' + size.h + 'cm;margin:0;}' +
        '.sheet{width:' + size.w + 'cm;height:' + size.h + 'cm;padding:' + margin + 'mm;display:flex;align-items:flex-start;justify-content:' + pos + ';}' +
        '.sheet img{width:' + imgW + 'cm;max-width:' + contentW + 'cm;max-height:' + contentH + 'cm;object-fit:contain;}' +
        '@media screen{.sheet{transform-origin:top center;}}';
    }

    function downloadImage() {
      const a = document.createElement('a');
      a.href = imageDataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    ['paper','position','scale','margin'].forEach(id => {
      document.getElementById(id).addEventListener('input', updatePrintLayout);
      document.getElementById(id).addEventListener('change', updatePrintLayout);
    });

    updatePrintLayout();
    img.onload = () => setTimeout(() => window.print(), 450);
  <\/script>
</body>
</html>`;
  }

  async function openPrintSetupWindow(blob, filename, title) {
    if (!blob) throw new Error('Blob kosong');

    const imageDataURL = await blobToDataURL(blob);
    const popup = window.open('', '_blank', 'width=980,height=820');

    if (!popup) {
      // Fallback kalau popup diblokir: tetap buka print langsung via iframe.
      const existing = document.getElementById('printFrame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'printFrame';
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head>
        <style>
          @page { size: 10cm 15cm; margin: 0; }
          * { margin:0; padding:0; box-sizing:border-box; }
          body { width:10cm; height:15cm; background:white; }
          img { width:10cm; height:auto; display:block; }
        </style>
      </head><body><img src="${imageDataURL}" onload="setTimeout(function(){window.print()},250)"></body></html>`);
      doc.close();
      return 'iframe';
    }

    popup.document.open();
    popup.document.write(buildPrintWindowHTML(imageDataURL, filename, title));
    popup.document.close();
    popup.focus();
    return 'print';
  }



  // ─── Share Strip helpers ───────────────────────────────────────────────────
  async function buildSingleStripBlobForShare() {
    if (!finalDataURL) throw new Error('Foto belum siap');

    if (isPhotoboxMode) {
      return dataURLtoBlob(finalDataURL);
    }

    // Share 1 strip = layout 4R landscape (kiri strip, kanan putih).
    const STRIP_W = 590;
    const STRIP_H = 1772;
    const canvas  = document.createElement('canvas');
    canvas.width  = STRIP_W * 2;
    canvas.height = STRIP_H;
    const ctx = canvas.getContext('2d');

    const img = await loadImageSafe(finalDataURL);
    const scale = Math.max(STRIP_W / img.width, STRIP_H / img.height);
    const sw = STRIP_W / scale;
    const sh = STRIP_H / scale;
    const sx = (img.width  - sw) / 2;
    const sy = (img.height - sh) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, STRIP_W, STRIP_H);

    return await canvasToBlobSafe(canvas, 'image/jpeg', 0.95);
  }

  async function buildDoubleStripBlobForShare() {
    if (!finalDataURL) throw new Error('Foto belum siap');

    if (isPhotoboxMode) {
      return dataURLtoBlob(finalDataURL);
    }

    // Share 2 strip = file 10×15 dengan 2 strip berdampingan.
    const STRIP_W = 590;
    const STRIP_H = 1772;
    const canvas  = document.createElement('canvas');
    canvas.width  = STRIP_W * 2;
    canvas.height = STRIP_H;
    const ctx = canvas.getContext('2d');

    const img = await loadImageSafe(finalDataURL);
    const scale = Math.max(STRIP_W / img.width, STRIP_H / img.height);
    const sw = STRIP_W / scale;
    const sh = STRIP_H / scale;
    const sx = (img.width  - sw) / 2;
    const sy = (img.height - sh) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0,       0, STRIP_W, STRIP_H);
    ctx.drawImage(img, sx, sy, sw, sh, STRIP_W, 0, STRIP_W, STRIP_H);

    return await canvasToBlobSafe(canvas, 'image/jpeg', 0.95);
  }

  async function shareStripBlob(blob, filename, label) {
    const mode = await shareOrDownloadBlob(blob, filename, `LUX Photobooth - ${label}`, {
      text: `${label} dari LUX Photobooth ✨`,
      suppressCancel: true
    });

    if (mode === 'shared') {
      showStatus(`${label} siap dibagikan ✓`);
    } else if (mode === 'downloaded') {
      showStatus('Device/browser belum support share file, jadi file didownload dulu ya.');
    } else {
      showStatus(`${label} dibuka di share sheet.`);
    }
  }

  async function share1Strip(skipConsent = false) {
    if (!skipConsent) return ensureResultConsent(() => share1Strip(true));

    const btn = document.getElementById('btnShare1Strip');
    if (!finalDataURL) {
      showStatus('Foto belum siap. Tunggu hasil selesai dulu ya.');
      return;
    }

    btn.disabled = true;
    const oldLabel = btn.querySelector('.btn-label').textContent;
    btn.querySelector('.btn-label').textContent = 'Menyiapkan share...';

    try {
      const blob = await buildSingleStripBlobForShare();
      const label = isPhotoboxMode ? 'Share 4R' : 'Share 1 Strip';
      const filename = isPhotoboxMode
        ? `lux-share-photobox-4r-${Date.now()}.jpg`
        : `lux-share-1strip-${Date.now()}.jpg`;
      await shareStripBlob(blob, filename, label);
    } catch(e) {
      console.error('share1Strip error:', e);
      showStatus('Gagal share: ' + (e.message || e), '#e94560');
    } finally {
      btn.querySelector('.btn-label').textContent = oldLabel;
      btn.disabled = false;
    }
  }

  async function share2Strip(skipConsent = false) {
    if (!skipConsent) return ensureResultConsent(() => share2Strip(true));

    const btn = document.getElementById('btnShare2Strip');
    if (!finalDataURL) {
      showStatus('Foto belum siap. Tunggu hasil selesai dulu ya.');
      return;
    }

    btn.disabled = true;
    const oldLabel = btn.querySelector('.btn-label').textContent;
    btn.querySelector('.btn-label').textContent = 'Menyiapkan share...';

    try {
      const blob = await buildDoubleStripBlobForShare();
      await shareStripBlob(blob, `lux-share-2strip-${Date.now()}.jpg`, 'Share 2 Strip');
    } catch(e) {
      console.error('share2Strip error:', e);
      showStatus('Gagal share 2 strip: ' + (e.message || e), '#e94560');
    } finally {
      btn.querySelector('.btn-label').textContent = oldLabel;
      btn.disabled = false;
    }
  }


  // ─── Cetak 2 Strip: langsung buka print, bukan Web Share ───
  async function cetak2Strip() {
    console.log('[LUX] cetak2Strip print clicked', { hasFinalDataURL: !!finalDataURL });
    const btn = document.getElementById('btnCetak2Strip');
    if (!finalDataURL) {
      showStatus('Foto belum siap. Tunggu hasil selesai dulu ya.');
      return;
    }

    btn.disabled = true;
    btn.querySelector('.btn-label').textContent = 'Menyiapkan print...';

    try {
      const STRIP_W = 590;
      const STRIP_H = 1772;
      const canvas  = document.createElement('canvas');
      canvas.width  = STRIP_W * 2;
      canvas.height = STRIP_H;
      const ctx = canvas.getContext('2d');

      const img = await loadImageSafe(finalDataURL);
      const scale = Math.max(STRIP_W / img.width, STRIP_H / img.height);
      const sw = STRIP_W / scale;
      const sh = STRIP_H / scale;
      const sx = (img.width  - sw) / 2;
      const sy = (img.height - sh) / 2;

      // Tetap generate file yang sama: 10×15 berisi 2 strip 5×15 berdampingan tanpa gap.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0,       0, STRIP_W, STRIP_H);
      ctx.drawImage(img, sx, sy, sw, sh, STRIP_W, 0, STRIP_W, STRIP_H);

      const blob = await canvasToBlobSafe(canvas, 'image/jpeg', 0.95);
      const mode = await openPrintSetupWindow(blob, `lux-cetak2strip-${Date.now()}.jpg`, 'Cetak 2 Strip');

      if (mode === 'print') {
        showStatus('Membuka halaman print Cetak 2 Strip. Atur kertas, scale, margin, lalu print.');
      } else {
        showStatus('Popup diblokir, print langsung dibuka. Kalau belum muncul, izinkan popup browser.');
      }
    } catch(e) {
      console.error('cetak2Strip print error:', e);
      showStatus('Gagal membuka print Cetak 2 Strip: ' + (e.message || e));
    } finally {
      btn.querySelector('.btn-label').textContent = 'Cetak 2 Strip';
      btn.disabled = false;
    }
  }

  // ─── Cetak 1 Strip / Cetak 4R: langsung buka print, bukan Web Share ───
  async function shareNative() {
    console.log('[LUX] print clicked', { hasFinalDataURL: !!finalDataURL, isPhotoboxMode });
    const btn = document.getElementById('btnShare');
    if (!finalDataURL) {
      showStatus('Foto belum siap. Tunggu hasil selesai dulu ya.');
      return;
    }

    btn.disabled = true;
    btn.querySelector('.btn-label').textContent = 'Menyiapkan print...';

    try {
      let blob, filename, title;

      if (isPhotoboxMode) {
        // Photobox: hasilnya sudah full 4R/10×15, jadi langsung print hasil final.
        blob = dataURLtoBlob(finalDataURL);
        filename = `lux-photobox-4r-${Date.now()}.jpg`;
        title = 'Cetak Photobox 4R';
      } else {
        const TOTAL_W = 1181;
        const STRIP_W = 590;
        const H = 1772;
        const canvas  = document.createElement('canvas');
        canvas.width  = TOTAL_W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Tetap generate file yang sama: canvas 10×15 dengan 1 strip 5×15 di sisi kiri.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TOTAL_W, H);

        const img = await loadImageSafe(finalDataURL);
        const scale = Math.max(STRIP_W / img.width, H / img.height);
        const sw = STRIP_W / scale;
        const sh = H / scale;
        const sx = (img.width  - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, STRIP_W, H);

        blob = await canvasToBlobSafe(canvas, 'image/jpeg', 0.95);
        filename = `lux-cetak1strip-${Date.now()}.jpg`;
        title = 'Cetak 1 Strip';
      }

      const mode = await openPrintSetupWindow(blob, filename, title);

      if (mode === 'print') {
        showStatus(isPhotoboxMode ? 'Membuka halaman print Photobox 4R. Atur kertas, scale, margin, lalu print.' : 'Membuka halaman print. Atur kertas, scale, margin, lalu print.');
      } else {
        showStatus('Popup diblokir, print langsung dibuka. Kalau belum muncul, izinkan popup browser.');
      }
    } catch(e) {
      console.error('print error:', e);
      showStatus('Gagal membuka print: ' + (e.message || e));
    } finally {
      btn.querySelector('.btn-label').textContent = isPhotoboxMode ? 'Cetak 4R' : 'Cetak 1 Strip';
      btn.disabled = false;
    }
  }

  // ─── Print ───
  function printFoto() {
    if (!finalDataURL) return;
    // Buat hidden iframe untuk print — lebih compatible dari window.open
    const existing = document.getElementById('printFrame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'printFrame';
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <style>
        * { margin:0; padding:0; }
        body { display:flex; justify-content:center; align-items:flex-start; }
        img { max-width:100%; height:auto; display:block; page-break-inside:avoid; }
        @media print { body { margin:0; } img { width:5cm; } }
      </style>
    </head><body>
      <img src="${finalDataURL}" onload="window.print();">
</body></html>`);
    doc.close();

    showStatus('Membuka dialog print...');
  }

  // ─── Download ZIP (works on desktop & mobile) ───
  async function downloadZip(skipConsent = false) {
    if (!skipConsent) return ensureResultConsent(() => downloadZip(true));
    if (!finalDataURL) return;
    const btn = document.getElementById('btnZip');
    btn.disabled = true;
    btn.querySelector('.btn-label').textContent = 'Menyiapkan ZIP...';
    setProgress('zip', 5);

    try {
      const zip = new JSZip();
      const folder = zip.folder('lux-photobooth');

      // 1. Foto utama (composite)
      setProgress('zip', 15);
      const jpgBlob = dataURLtoBlob(finalDataURL);
      folder.file('foto-utama.jpg', jpgBlob);

      // 2. Foto satuan (per slot)
      setProgress('zip', 25);
      for (let i = 0; i < filteredPhotos.length; i++) {
        if (filteredPhotos[i]) {
          const fBlob = dataURLtoBlob(filteredPhotos[i]);
          folder.file(`foto-${i+1}.jpg`, fBlob);
        }
        setProgress('zip', 25 + Math.round((i+1)/filteredPhotos.length * 20));
      }

      // 3. GIF (buat dulu kalau belum ada)
      setProgress('zip', 50);
      btn.querySelector('.btn-label').textContent = 'Membuat GIF...';
      if (!gifBlob && filteredPhotos.length >= 2) {
        try {
          gifBlob = await makeGif();
        } catch(e) { /* skip gif jika gagal */ }
      }
      if (gifBlob) folder.file('animated.gif', gifBlob);

      // 4. Generate ZIP
      setProgress('zip', 80);
      btn.querySelector('.btn-label').textContent = 'Membangun ZIP...';
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (meta) => setProgress('zip', 80 + Math.round(meta.percent * 0.18))
      );

      setProgress('zip', null);
      btn.disabled = false;
      btn.querySelector('.btn-label').textContent = 'Download Semua (ZIP)';

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lux-photobooth-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
      showStatus('ZIP berhasil didownload ✓');

    } catch(e) {
      console.error('ZIP error:', e);
      setProgress('zip', null);
      btn.disabled = false;
      btn.querySelector('.btn-label').textContent = 'Download Semua (ZIP)';
      showStatus('Gagal buat ZIP: ' + e.message, '#e94560');
    }
  }

  async function fotoLagi() {
    if (cloudUploadPromise) {
      try { await cloudUploadPromise; }
      catch (e) { console.warn('Upload galeri belum selesai:', e); }
    }
    ['photos','photosStore','photosSessionId','filteredPhotos','filteredPhotosStore','finalPhoto','finalPhotoThumb','livePhotos','livePhotosStore'].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('lux_result_consent_done');
    try { sessionStorage.removeItem(getAutoDownloadSessionKey()); } catch (_) {}
    sessionStorage.removeItem('luxPhotoSessionId');
    sessionStorage.removeItem(RESULT_TRANSFORMS_KEY);
    await idbClearAll();
    window.location.href = isEventMode ? '/event-run' : '/app';
  }

  generateResult();
