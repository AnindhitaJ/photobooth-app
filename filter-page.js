(async function initFilterApp() {
  await window.LUX_REQUIRE_AUTH('filter_login_required');

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

  async function idbSet(key, value) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.objectStore(PHOTO_STORE_NAME).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB gagal menyimpan')); };
    });
  }

  async function idbDelete(key) {
    try {
      const db = await idbOpen();
      return new Promise(resolve => {
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

  function getPhotoSessionId() {
    const fromUrl = new URLSearchParams(location.search).get('photoSession') || '';
    if (fromUrl) return fromUrl;
    try {
      return sessionStorage.getItem('luxPhotoSessionId')
        || localStorage.getItem('photosSessionId')
        || '';
    } catch (_) {
      return '';
    }
  }

  async function loadLargePhotoArray(key) {
    const sessionId = key === 'photos' ? getPhotoSessionId() : '';
    const idbKeys = sessionId ? [`${key}:${sessionId}`, key] : [key];

    // Selalu periksa IndexedDB. Jangan bergantung pada key penanda di localStorage.
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const idbKey of idbKeys) {
        try {
          const stored = normalizePhotoArray(await idbGet(idbKey));
          if (stored.length) return stored;
        } catch (e) {
          console.warn('[LUX] IndexedDB read failed:', idbKey, e);
        }
      }

      try {
        const stored = normalizePhotoArray(JSON.parse(localStorage.getItem(key) || '[]'));
        if (stored.length) return stored;
      } catch (e) {
        console.warn('[LUX] localStorage read failed:', e);
      }

      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 180));
    }

    return [];
  }

  async function saveLargePhotoArray(key, value) {
    let idbError = null;
    let localError = null;

    try {
      await idbSet(key, value);
      const verified = normalizePhotoArray(await idbGet(key));
      if (verified.length !== value.filter(Boolean).length) {
        throw new Error('Verifikasi data IndexedDB gagal');
      }
      try {
        localStorage.removeItem(key);
        localStorage.setItem(key + 'Store', 'indexedDB');
      } catch (_) {}
      return 'IndexedDB';
    } catch (e) {
      idbError = e;
      console.warn('[LUX] IndexedDB save failed:', e);
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(key + 'Store', 'localStorage');
      return 'localStorage';
    } catch (e) {
      localError = e;
      try { localStorage.removeItem(key); } catch (_) {}
      console.warn('[LUX] localStorage save failed:', e);
    }

    throw new Error(idbError?.message || localError?.message || 'Penyimpanan browser tidak tersedia');
  }

  const photos = await loadLargePhotoArray('photos');
  const slotCount = photos.length;
  const captureFlow = localStorage.getItem('captureFlow') || '';
  const isGanciMode = captureFlow === 'ganci';
  const isProductMode = captureFlow === 'product';
  const isPhotoboxMode = captureFlow === 'photobox';
  const productLikeExportQuality = (isGanciMode || isProductMode || isPhotoboxMode) ? 0.94 : 0.92;
  const ganciConfig = (() => { try { return JSON.parse(localStorage.getItem('ganciConfig') || '{}'); } catch(e) { return {}; } })();

  if (isPhotoboxMode) {
    document.title = 'Filter Photobox 4R - LUX Photobooth';
    const title = document.getElementById('pageTitle');
    const sub = document.getElementById('pageSub');
    if (title) title.textContent = 'Filter Photobox 4R';
    if (sub) sub.textContent = 'Edit foto untuk layout 4R, lalu lihat hasil cetak.';
  }
  if (isGanciMode) {
    document.body.classList.add('ganci-mode');
    document.title = 'Filter Ganci - LUX Photobooth';
    document.getElementById('pageTitle').textContent = 'Filter Ganci';
    document.getElementById('pageSub').textContent = 'Edit 1 foto ganci, lalu simpan ke state Ganci';
    document.getElementById('applyNote').innerHTML = 'Filter diterapkan ke <span>foto Ganci</span>.';
    document.getElementById('btnLanjutFilter').textContent = 'Simpan Ganci ✓';
  }

  let filterStates   = photos.map(() => ({ tone:'normal', brightness:0, smooth:0, lip:'off', blush:'off', flip:false }));
  let filteredPhotos = [...photos];
  let currentIdx     = 0;

  function normalizeFilterState(s) {
    return {
      tone: s?.tone || 'normal',
      brightness: Number(s?.brightness || 0),
      smooth: Number(s?.smooth || 0),
      lip: s?.lip || 'off',
      blush: s?.blush || 'off',
      flip: !!s?.flip
    };
  }

  function isNeutralFilterState(s) {
    const state = normalizeFilterState(s);
    return state.tone === 'normal'
      && state.brightness === 0
      && state.smooth === 0
      && state.lip === 'off'
      && state.blush === 'off'
      && !state.flip;
  }

  filterStates = filterStates.map(normalizeFilterState);


  const canvas    = document.getElementById('previewCanvas');
  const ctx       = canvas.getContext('2d');
  const statusBar = document.getElementById('statusBar');

  let allLandmarks = [];
  let currentImg   = new Image();
  let photoReady = false;
  let isProcessingResult = false;
  let isApplyingAll = false;
  let activeLoadToken = 0;
  let faceLandmarkerPromise = null;

  function readyButtonLabel() {
    return isGanciMode ? 'Simpan Ganci ✓' : 'Lihat Hasil →';
  }

  function setContinueButtonReady(ready, text) {
    const btn = document.getElementById('btnLanjutFilter');
    if (!btn) return;
    btn.disabled = !ready;
    btn.style.pointerEvents = ready ? '' : 'none';
    btn.textContent = text || (ready ? readyButtonLabel() : 'Memuat Foto...');
  }

  // ── Build tabs ──────────────────────────────────────────────────────────────
  const tabsEl = document.getElementById('photoTabs');
  photos.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'photo-tab' + (i === 0 ? ' active' : '');
    btn.textContent = `Foto ${i + 1}`;
    btn.onclick = () => switchPhoto(i);
    tabsEl.appendChild(btn);
  });

  // ── Switch foto ─────────────────────────────────────────────────────────────
  function switchPhoto(idx) {
    if (isApplyingAll) return;

    const src = photos[idx];
    if (!src) {
      photoReady = false;
      setContinueButtonReady(false, 'Foto Tidak Tersedia');
      statusBar.textContent = 'Data foto tidak ditemukan. Kembali dan ambil ulang foto.';
      return;
    }

    // Jangan pernah menyimpan canvas bawaan 300×150 atau canvas dari foto lain.
    if (photoReady && currentImg.complete && currentImg.naturalWidth > 0) {
      simpanFotoSilent();
    }

    const loadToken = ++activeLoadToken;
    currentIdx = idx;
    photoReady = false;
    setContinueButtonReady(false, 'Memuat Foto...');
    statusBar.textContent = 'Memuat foto...';

    document.querySelectorAll('.photo-tab').forEach((t, i) => t.classList.toggle('active', i === idx));

    const currentPhotoNum = document.getElementById('currentPhotoNum');
    if (currentPhotoNum) currentPhotoNum.textContent = idx + 1;

    loadFilterUI(filterStates[idx]);

    allLandmarks = [];
    const image = new Image();
    image.decoding = 'async';
    currentImg = image;

    image.onload = async () => {
      if (loadToken !== activeLoadToken || currentIdx !== idx) return;

      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        image.onerror();
        return;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      photoReady = true;
      setContinueButtonReady(true);
      statusBar.textContent = 'Foto siap. Mendeteksi wajah...';

      await loadMediaPipe(image);
      if (loadToken !== activeLoadToken || currentIdx !== idx || currentImg !== image) return;
      applyFilter();
    };

    image.onerror = () => {
      if (loadToken !== activeLoadToken) return;
      photoReady = false;
      setContinueButtonReady(false, 'Foto Gagal Dimuat');
      statusBar.textContent = 'Foto gagal dimuat. Kembali dan ambil ulang foto.';
    };

    image.src = src;
  }

  // ── MediaPipe face landmark ──────────────────────────────────────────────────
  async function getFaceLandmarker() {
    if (!faceLandmarkerPromise) {
      faceLandmarkerPromise = (async () => {
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs');
        const { FaceLandmarker, FilesetResolver } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        return FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU'
          },
          runningMode: 'IMAGE', numFaces: 4
        });
      })().catch(error => {
        faceLandmarkerPromise = null;
        throw error;
      });
    }
    return faceLandmarkerPromise;
  }

  async function detectFaceLandmarks(image) {
    const faceLandmarker = await getFaceLandmarker();
    const result = faceLandmarker.detect(image);
    return result.faceLandmarks || [];
  }

  async function loadMediaPipe(image = currentImg) {
    try {
      allLandmarks = await detectFaceLandmarks(image);
      const n = allLandmarks.length;
      statusBar.textContent = n > 0 ? n + ' wajah terdeteksi ✓' : 'Wajah tidak terdeteksi';
    } catch(e) {
      allLandmarks = [];
      statusBar.textContent = 'Filter aktif (tanpa deteksi wajah)';
    }
  }

  // ── Oval mask per landmark set ───────────────────────────────────────────────
  function makeFaceMask(lm, W, H) {
    const xs = lm.map(p => p.x * W);
    const ys = lm.map(p => p.y * H);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2 * 1.1;
    const ry = (maxY - minY) / 2 * 1.1;
    const maxR = Math.max(rx, ry);

    const maskC = document.createElement('canvas');
    maskC.width = W; maskC.height = H;
    const mc = maskC.getContext('2d');
    // destination-in pakai ALPHA channel — harus putih (alpha=1) di dalam, transparan di luar
    const grad = mc.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,1)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    mc.save();
    mc.translate(cx, cy);
    mc.scale(rx / maxR, ry / maxR);
    mc.fillStyle = grad;
    mc.beginPath();
    mc.arc(0, 0, maxR, 0, Math.PI * 2);
    mc.fill();
    mc.restore();
    return maskC;
  }

  // ── Tone pixel manipulation ──────────────────────────────────────────────────
  function applyToneToPixels(d, tone) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (tone === 'bw') {
        const gray = 0.299*r + 0.587*g + 0.114*b;
        d[i] = d[i+1] = d[i+2] = gray;
      } else if (tone === 'sepia') {
        d[i]   = Math.min(255, r*0.393 + g*0.769 + b*0.189);
        d[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
        d[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
      } else if (tone === 'vintage') {
        const gray = 0.299*r + 0.587*g + 0.114*b;
        d[i]   = Math.min(255, gray*0.4 + r*0.6 + 20);
        d[i+1] = Math.min(255, gray*0.4 + g*0.6 + 5);
        d[i+2] = Math.min(255, gray*0.4 + b*0.6 - 10);
      } else if (tone === 'cool') {
        // Biru-cyan: kurangi red, naikkan blue sedikit
        d[i]   = Math.max(0,   r - 20);
        d[i+1] = Math.min(255, g + 5);
        d[i+2] = Math.min(255, b + 30);
      } else if (tone === 'warm') {
        // Golden-orange: naikkan red & green, kurangi blue
        d[i]   = Math.min(255, r + 30);
        d[i+1] = Math.min(255, g + 10);
        d[i+2] = Math.max(0,   b - 20);
      } else if (tone === 'fade') {
        // Film fade: naikkan shadow (lifted blacks), kurangi saturasi sedikit
        const gray = 0.299*r + 0.587*g + 0.114*b;
        const lift = 40; // lifted blacks
        d[i]   = Math.min(255, r * 0.75 + gray * 0.25 + lift);
        d[i+1] = Math.min(255, g * 0.75 + gray * 0.25 + lift);
        d[i+2] = Math.min(255, b * 0.75 + gray * 0.25 + lift);
      } else if (tone === 'drama') {
        // High contrast + slight desaturate + crush shadows
        const gray  = 0.299*r + 0.587*g + 0.114*b;
        const blend = 0.3; // desaturate 30%
        const nr = r * (1 - blend) + gray * blend;
        const ng = g * (1 - blend) + gray * blend;
        const nb = b * (1 - blend) + gray * blend;
        // S-curve: crush shadows, boost highlights
        function scurve(v) {
          const n = v / 255;
          return Math.min(255, Math.round(255 * (n < 0.5
            ? 2 * n * n
            : -1 + (4 - 2*n) * n)));
        }
        d[i]   = scurve(nr);
        d[i+1] = scurve(ng);
        d[i+2] = scurve(nb);
      } else if (tone === 'matte') {
        // Lifted blacks + reduced contrast + slight desaturate
        const gray = 0.299*r + 0.587*g + 0.114*b;
        const lift = 30, compress = 0.82;
        d[i]   = Math.min(255, (r * 0.85 + gray * 0.15) * compress + lift);
        d[i+1] = Math.min(255, (g * 0.85 + gray * 0.15) * compress + lift);
        d[i+2] = Math.min(255, (b * 0.85 + gray * 0.15) * compress + lift + 5);
      } else if (tone === 'moody') {
        // Dark + cool shadows + slight teal midtones
        const gray = 0.299*r + 0.587*g + 0.114*b;
        d[i]   = Math.max(0, Math.min(255, r * 0.78 - 10));
        d[i+1] = Math.max(0, Math.min(255, g * 0.82 + gray * 0.05 - 5));
        d[i+2] = Math.max(0, Math.min(255, b * 0.90 + 15));
      } else if (tone === 'dreamy') {
        // Soft glow: slight overexpose + pastel + low contrast
        const gray = 0.299*r + 0.587*g + 0.114*b;
        const soft = 0.25;
        const nr2 = r * (1-soft) + gray * soft;
        const ng2 = g * (1-soft) + gray * soft;
        const nb2 = b * (1-soft) + gray * soft;
        d[i]   = Math.min(255, nr2 * 1.08 + 18);
        d[i+1] = Math.min(255, ng2 * 1.06 + 14);
        d[i+2] = Math.min(255, nb2 * 1.05 + 20);
      } else if (tone === 'teal') {
        // Teal & Orange: warm skin (push red/yellow), cool everything else (push teal)
        const lum = 0.299*r + 0.587*g + 0.114*b;
        // skin detection: high red, moderate green, low blue
        const isSkin = r > 140 && g > 80 && b < 160 && r > g && r > b;
        if (isSkin) {
          d[i]   = Math.min(255, r + 18);
          d[i+1] = Math.min(255, g + 6);
          d[i+2] = Math.max(0,   b - 15);
        } else {
          d[i]   = Math.max(0,   r - 15);
          d[i+1] = Math.min(255, g + 12);
          d[i+2] = Math.min(255, b + 20);
        }
      } else if (tone === 'kodak') {
        // Kodak Gold: warm shadows, slightly boosted reds & yellows, gentle grain feel
        const lum = 0.299*r + 0.587*g + 0.114*b;
        const warmth = lum < 128 ? 0.12 : 0.06; // warmer in shadows
        d[i]   = Math.min(255, r * (1 + warmth * 0.8) + 12);
        d[i+1] = Math.min(255, g * (1 + warmth * 0.4) + 4);
        d[i+2] = Math.max(0,   b * (1 - warmth * 0.5) - 8);
      } else if (tone === 'fuji') {
        // Fujifilm: teal-green shadows, neutral-cool mids, slight cyan cast
        const lum = 0.299*r + 0.587*g + 0.114*b;
        const isShad = lum < 100;
        d[i]   = Math.max(0,   r - (isShad ? 12 : 4));
        d[i+1] = Math.min(255, g + (isShad ? 10 : 5));
        d[i+2] = Math.min(255, b + (isShad ? 14 : 8));
      } else if (tone === 'lomo') {
        // Lomo: high saturation, boosted contrast, warm cast
        const gray = 0.299*r + 0.587*g + 0.114*b;
        const sat = 1.5; // boost saturation
        const nr2 = gray + (r - gray) * sat;
        const ng2 = gray + (g - gray) * sat;
        const nb2 = gray + (b - gray) * sat;
        // S-curve for contrast
        function lscurve(v) {
          const n = Math.max(0, Math.min(255, v)) / 255;
          return Math.min(255, Math.round(255 * (n < 0.5 ? 1.8*n*n : -1+(3.6-1.8*n)*n)));
        }
        d[i]   = lscurve(nr2 + 10);
        d[i+1] = lscurve(ng2 - 5);
        d[i+2] = lscurve(nb2 - 15);
      } else if (tone === 'milk') {
        // Korea Milk: very pale, airy, lifted whites, low contrast, cool-neutral
        const gray = 0.299*r + 0.587*g + 0.114*b;
        const lift = 50, compress = 0.65;
        const desat = 0.35;
        const nr2 = r * (1-desat) + gray * desat;
        const ng2 = g * (1-desat) + gray * desat;
        const nb2 = b * (1-desat) + gray * desat;
        d[i]   = Math.min(255, nr2 * compress + lift + 2);
        d[i+1] = Math.min(255, ng2 * compress + lift + 4);
        d[i+2] = Math.min(255, nb2 * compress + lift + 10);
      }
    }
  }


  // ── MAIN applyFilter ─────────────────────────────────────────────────────────
  function applyFilter() {
    if (!filterStates[currentIdx]) return;
    if (!currentImg || !currentImg.complete || !currentImg.naturalWidth || !canvas.width || !canvas.height) return;
    const s = filterStates[currentIdx];
    const W = canvas.width, H = canvas.height;
    const faces = allLandmarks.length > 0 ? allLandmarks : [];

    // ── 1. Gambar foto asli (brightness diterapkan per-wajah di step 2b) ──────
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(currentImg, 0, 0, W, H);

    // ── 2. Smooth natural (bilateral-style: multi-pass blur + edge blend) ──────
    if (s.smooth > 0) {
      const leftEyeIdx  = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];
      const rightEyeIdx = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398];
      const lipCutIdx   = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];

      // Bilateral-style approximation: blur kecil (texture) + blur besar (color),
      // lalu blend — hasilnya kulit halus tapi tepi/kontur tetap terjaga
      function makeBilateralCanvas(src, passes, blurPx) {
        // Pass 1: blur kecil — smear warna
        const a = document.createElement('canvas');
        a.width = src.width; a.height = src.height;
        const ac = a.getContext('2d');
        ac.filter = `blur(${blurPx}px)`;
        ac.drawImage(src, 0, 0);
        ac.filter = 'none';

        if (passes < 2) return a;

        // Pass 2: blur lagi dari hasil pass 1 — haluskan lebih
        const b = document.createElement('canvas');
        b.width = src.width; b.height = src.height;
        const bc = b.getContext('2d');
        bc.filter = `blur(${blurPx}px)`;
        bc.drawImage(a, 0, 0);
        bc.filter = 'none';

        // Blend pass1 + pass2: 60/40 — lebih smooth tapi jaga sedikit tekstur
        const out = document.createElement('canvas');
        out.width = src.width; out.height = src.height;
        const oc = out.getContext('2d');
        oc.drawImage(a, 0, 0);
        oc.globalAlpha = 0.4;
        oc.drawImage(b, 0, 0);
        oc.globalAlpha = 1;
        return out;
      }

      // Kekuatan smooth per level
      const cfg = s.smooth === 1
        ? { blurPx: 2, passes: 1, strength: 0.55 }
        : s.smooth === 2
        ? { blurPx: 3, passes: 2, strength: 0.70 }
        : { blurPx: 4, passes: 2, strength: 0.85 };

      const smoothed = makeBilateralCanvas(canvas, cfg.passes, cfg.blurPx);

      faces.forEach(lm => {
        const xs = lm.map(p => p.x * W);
        const ys = lm.map(p => p.y * H);
        const minX = Math.max(0, Math.min(...xs) - W * 0.02);
        const minY = Math.max(0, Math.min(...ys) - H * 0.02);
        const maxX = Math.min(W, Math.max(...xs) + W * 0.02);
        const maxY = Math.min(H, Math.max(...ys) + H * 0.02);
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const rx = (maxX - minX) / 2 * 1.05;
        const ry = (maxY - minY) / 2 * 1.1;

        // Buat alpha mask oval wajah dengan feathered edge (gradient radial)
        const maskC = document.createElement('canvas');
        maskC.width = W; maskC.height = H;
        const mc = maskC.getContext('2d');
        // Isi oval penuh dulu
        mc.beginPath();
        mc.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        mc.fillStyle = `rgba(255,255,255,${cfg.strength})`;
        mc.fill();
        // Blur tepi mask supaya transisi natural
        const featherC = document.createElement('canvas');
        featherC.width = W; featherC.height = H;
        const fc = featherC.getContext('2d');
        fc.filter = 'blur(18px)';
        fc.drawImage(maskC, 0, 0);
        fc.filter = 'none';

        // Gambar smoothed dalam oval (pakai feathered mask via globalAlpha trick)
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        // Clip ke oval yang sedikit lebih besar dari landmark
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.08, ry * 1.08, 0, 0, Math.PI * 2);
        ctx.clip();
        // Blend smoothed di atas asli dengan strength
        ctx.globalAlpha = cfg.strength;
        ctx.drawImage(smoothed, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.restore();

        // Kembalikan foto asli di mata & bibir — dengan feathered edge (tidak harsh)
        const cutoutExpand = [1.20, 1.20, 1.05];
        const featherBlur  = [6, 6, 4]; // px blur untuk tiap region
        [leftEyeIdx, rightEyeIdx, lipCutIdx].forEach((idxList, li) => {
          const pts = idxList.map(i => lm[i]).filter(Boolean);
          if (pts.length < 3) return;
          const expand = cutoutExpand[li];
          const fBlur  = featherBlur[li];
          const ox = pts.reduce((s,p) => s + p.x*W, 0) / pts.length;
          const oy = pts.reduce((s,p) => s + p.y*H, 0) / pts.length;

          // 1. Gambar shape ke mask canvas
          const maskC = document.createElement('canvas');
          maskC.width = W; maskC.height = H;
          const mc = maskC.getContext('2d');
          mc.beginPath();
          pts.forEach((pt, i) => {
            const px = ox + (pt.x*W - ox) * expand;
            const py = oy + (pt.y*H - oy) * expand;
            i === 0 ? mc.moveTo(px, py) : mc.lineTo(px, py);
          });
          mc.closePath();
          mc.fillStyle = 'white';
          mc.fill();

          // 2. Blur mask supaya tepinya soft
          const softC = document.createElement('canvas');
          softC.width = W; softC.height = H;
          const sc = softC.getContext('2d');
          sc.filter = `blur(${fBlur}px)`;
          sc.drawImage(maskC, 0, 0);
          sc.filter = 'none';

          // 3. Pakai mask sebagai alpha: gambar foto asli ke tmp, lalu
          //    composite ke ctx dengan destination-in trick
          const sharpC = document.createElement('canvas');
          sharpC.width = W; sharpC.height = H;
          const hc = sharpC.getContext('2d');
          hc.drawImage(currentImg, 0, 0, W, H);
          hc.globalCompositeOperation = 'destination-in';
          hc.drawImage(softC, 0, 0);

          ctx.drawImage(sharpC, 0, 0);
        });
      });
    }

    // ── 2b. Brightness — hanya di area wajah (oval sama seperti smooth) ────────
    if (s.brightness > 0 && faces.length > 0) {
      faces.forEach(lm => {
        const xs = lm.map(p => p.x * W);
        const ys = lm.map(p => p.y * H);
        const minX = Math.max(0, Math.min(...xs) - W * 0.02);
        const minY = Math.max(0, Math.min(...ys) - H * 0.02);
        const maxX = Math.min(W, Math.max(...xs) + W * 0.02);
        const maxY = Math.min(H, Math.max(...ys) + H * 0.02);
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const rx = (maxX - minX) / 2 * 1.05;
        const ry = (maxY - minY) / 2 * 1.1;

        // Buat canvas dengan brightness diapply
        const brightC = document.createElement('canvas');
        brightC.width = W; brightC.height = H;
        const bc = brightC.getContext('2d');
        bc.filter = `brightness(${100 + s.brightness}%)`;
        bc.drawImage(canvas, 0, 0, W, H);
        bc.filter = 'none';

        // Buat mask oval feathered
        const maskC = document.createElement('canvas');
        maskC.width = W; maskC.height = H;
        const mc = maskC.getContext('2d');
        mc.beginPath();
        mc.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        mc.fillStyle = 'white';
        mc.fill();
        const softC = document.createElement('canvas');
        softC.width = W; softC.height = H;
        const sc = softC.getContext('2d');
        sc.filter = 'blur(18px)';
        sc.drawImage(maskC, 0, 0);
        sc.filter = 'none';

        // Apply brightC ke ctx hanya dalam oval
        bc.globalCompositeOperation = 'destination-in';
        bc.drawImage(softC, 0, 0);
        ctx.drawImage(brightC, 0, 0);
      });
    }

    // ── 3. Tone ───────────────────────────────────────────────────────────────
    if (s.tone !== 'normal') {
      const id = ctx.getImageData(0, 0, W, H);
      applyToneToPixels(id.data, s.tone);
      ctx.putImageData(id, 0, 0);
    }

    // ── 4. Blush ─────────────────────────────────────────────────────────────
    if (s.blush !== 'off') {
      try {
        const parts = s.blush.split(',').map(Number);
        const [br, bg, bb] = parts;
        const blushR = W * 0.10;
        const blushPts = faces.length > 0
          ? faces.flatMap(lm => [
              [(lm[50].x*0.5 + lm[101].x*0.5)*W, (lm[50].y*0.5 + lm[101].y*0.5)*H],
              [(lm[280].x*0.5 + lm[330].x*0.5)*W, (lm[280].y*0.5 + lm[330].y*0.5)*H]
            ])
          : [[W*0.28, H*0.42], [W*0.72, H*0.42]];
        blushPts.forEach(([bx, by]) => {
          const grad = ctx.createRadialGradient(bx, by, 0, bx, by, blushR);
          grad.addColorStop(0,   `rgba(${br},${bg},${bb},0.30)`);
          grad.addColorStop(0.5, `rgba(${br},${bg},${bb},0.12)`);
          grad.addColorStop(1,   `rgba(${br},${bg},${bb},0)`);
          ctx.beginPath();
          ctx.arc(bx, by, blushR, 0, Math.PI*2);
          ctx.fillStyle = grad;
          ctx.fill();
        });
      } catch(e) { console.warn('blush error:', e); }
    }

    // ── 5. Lip color ──────────────────────────────────────────────────────────
    if (s.lip !== 'off') {
      try {
        const parts = s.lip.split(',');
        let [lr, lg, lb] = parts.map(Number);
        const lipAlpha = parseFloat(parts[3]) || 0.30;
        if (s.tone === 'bw') {
          const gray = Math.round(0.299*lr + 0.587*lg + 0.114*lb);
          lr = lg = lb = gray;
        } else if (s.tone === 'sepia') {
          lr = Math.min(255, lr*0.393 + lg*0.769 + lb*0.189);
          lg = Math.min(255, lr*0.349 + lg*0.686 + lb*0.168);
          lb = Math.min(255, lr*0.272 + lg*0.534 + lb*0.131);
        }
        const lipIdx = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
        const lipShape = document.createElement('canvas');
        lipShape.width = W; lipShape.height = H;
        const lctx = lipShape.getContext('2d');
        if (faces.length > 0) {
          faces.forEach(lm => {
            lctx.beginPath();
            lipIdx.forEach((idx, i) => {
              const pt = lm[idx]; if (!pt) return;
              i === 0 ? lctx.moveTo(pt.x*W, pt.y*H) : lctx.lineTo(pt.x*W, pt.y*H);
            });
            lctx.closePath();
            lctx.fillStyle = `rgb(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)})`;
            lctx.fill();
          });
        } else {
          lctx.beginPath();
          lctx.ellipse(W*0.5, H*0.72, W*0.10, H*0.035, 0, 0, Math.PI*2);
          lctx.fillStyle = `rgb(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)})`;
          lctx.fill();
        }
        const lipBlur = document.createElement('canvas');
        lipBlur.width = W; lipBlur.height = H;
        const lblur = lipBlur.getContext('2d');
        lblur.filter = 'blur(3px)';
        lblur.drawImage(lipShape, 0, 0);
        lblur.filter = 'none';
        ctx.save();
        ctx.globalAlpha = lipAlpha;
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(lipBlur, 0, 0);
        ctx.restore();
      } catch(e) { console.warn('lip error:', e); }
    }

    // ── 6. Flip final photo ─────────────────────────────────────────────────────
    // Flip dilakukan di akhir supaya face beauty filter tetap presisi di wajah asli.
    if (s.flip) {
      const flipC = document.createElement('canvas');
      flipC.width = W; flipC.height = H;
      const fctx = flipC.getContext('2d');
      fctx.translate(W, 0);
      fctx.scale(-1, 1);
      fctx.drawImage(canvas, 0, 0, W, H);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(flipC, 0, 0);
    }
  }

  // ── Load UI state dari filterStates ─────────────────────────────────────────
  function loadFilterUI(s) {
    // Reset semua pills ke Off/Normal
    ['grpTone','grpBrightness','grpSmooth','grpFlip'].forEach(id => {
      document.getElementById(id).querySelectorAll('.pill').forEach((p, i) => {
        p.classList.toggle('active', i === 0);
      });
    });
    ['grpLip','grpBlush'].forEach(id => {
      const grp = document.getElementById(id);
      grp.querySelectorAll('.swatch,.swatch-off').forEach(el => el.classList.remove('active'));
      grp.querySelector('.swatch-off').classList.add('active');
    });

    // Tone
    document.querySelectorAll('#grpTone .pill').forEach(p => {
      if (p.dataset.val === s.tone) {
        document.querySelectorAll('#grpTone .pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
      }
    });
    // Brightness
    document.querySelectorAll('#grpBrightness .pill').forEach(p => {
      if (parseFloat(p.dataset.val) === s.brightness) {
        document.querySelectorAll('#grpBrightness .pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
      }
    });
    // Smooth
    document.querySelectorAll('#grpSmooth .pill').forEach(p => {
      if (parseFloat(p.dataset.val) === s.smooth) {
        document.querySelectorAll('#grpSmooth .pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
      }
    });
    // Flip
    document.querySelectorAll('#grpFlip .pill').forEach(p => {
      if ((p.dataset.val === 'true') === !!s.flip) {
        document.querySelectorAll('#grpFlip .pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
      }
    });
    // Lip
    if (s.lip !== 'off') {
      document.querySelectorAll('#grpLip .swatch').forEach(el => {
        if (el.dataset.val === s.lip) {
          document.querySelectorAll('#grpLip .swatch,.swatch-off').forEach(x => x.classList.remove('active'));
          el.classList.add('active');
        }
      });
    }
    // Blush
    if (s.blush !== 'off') {
      document.querySelectorAll('#grpBlush .swatch').forEach(el => {
        if (el.dataset.val === s.blush) {
          document.querySelectorAll('#grpBlush .swatch,.swatch-off').forEach(x => x.classList.remove('active'));
          el.classList.add('active');
        }
      });
    }
  }

  // ── Event handlers ───────────────────────────────────────────────────────────
  window.setPill = function(type, btn) {
    const val = (type === 'tone') ? btn.dataset.val : (type === 'flip' ? btn.dataset.val === 'true' : parseFloat(btn.dataset.val));
    filterStates[currentIdx][type] = val;
    const row = btn.closest('.pill-row');
    row.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    applyFilter();
  };

  window.setSwatch = function(type, el) {
    filterStates[currentIdx][type] = el.dataset.val;
    const grpId = 'grp' + type.charAt(0).toUpperCase() + type.slice(1);
    document.getElementById(grpId).querySelectorAll('.swatch,.swatch-off').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    applyFilter();
  };

  function loadImageForFilter(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (!image.naturalWidth || !image.naturalHeight) {
          reject(new Error('Ukuran foto tidak valid'));
          return;
        }
        resolve(image);
      };
      image.onerror = () => reject(new Error('Foto gagal dimuat'));
      image.src = src;
    });
  }

  function filterNeedsFaceDetection(state) {
    const s = normalizeFilterState(state);
    return s.smooth > 0 || s.brightness > 0 || s.lip !== 'off' || s.blush !== 'off';
  }

  window.terapkanSemua = async function() {
    if (isApplyingAll || !photos.length || !filterStates[currentIdx]) return;

    const btn = document.querySelector('[onclick="terapkanSemua()"]');
    const originalIdx = currentIdx;
    const current = normalizeFilterState(filterStates[currentIdx]);
    const failedSlots = [];

    isApplyingAll = true;
    ++activeLoadToken; // batalkan callback preview yang mungkin masih berjalan
    photoReady = false;
    filterStates = photos.map(() => ({ ...current }));

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menerapkan filter...';
    }
    document.querySelectorAll('.photo-tab').forEach(tab => { tab.disabled = true; });
    setContinueButtonReady(false, 'Menerapkan Filter...');

    try {
      // Harus berurutan karena currentIdx, currentImg, allLandmarks, dan canvas
      // adalah state render bersama. Pemrosesan paralel membuat foto saling menimpa.
      for (let i = 0; i < photos.length; i++) {
        const src = photos[i];
        if (!src) continue;

        statusBar.textContent = `Menerapkan filter ke foto ${i + 1} dari ${photos.length}...`;

        if (isNeutralFilterState(filterStates[i])) {
          filteredPhotos[i] = src;
          continue;
        }

        try {
          const image = await loadImageForFilter(src);
          currentIdx = i;
          currentImg = image;
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          allLandmarks = [];

          if (filterNeedsFaceDetection(filterStates[i])) {
            try {
              allLandmarks = await detectFaceLandmarks(image);
            } catch (error) {
              console.warn(`Deteksi wajah foto ${i + 1} gagal:`, error);
              allLandmarks = [];
            }
          }

          applyFilter();
          filteredPhotos[i] = canvas.toDataURL('image/jpeg', productLikeExportQuality);
        } catch (error) {
          console.error(`Gagal menerapkan filter ke foto ${i + 1}:`, error);
          filteredPhotos[i] = src;
          failedSlots.push(i + 1);
        }
      }

      if (btn) btn.textContent = failedSlots.length ? '⚠ Sebagian gagal' : '✓ Diterapkan ke semua!';
      if (failedSlots.length) {
        statusBar.textContent = `Filter gagal pada foto ${failedSlots.join(', ')}; foto asli dipertahankan.`;
      }
    } finally {
      isApplyingAll = false;
      photoReady = false; // cegah switchPhoto menyimpan canvas slot terakhir ke slot lain
      document.querySelectorAll('.photo-tab').forEach(tab => { tab.disabled = false; });
      switchPhoto(originalIdx);

      setTimeout(() => {
        if (btn) {
          btn.textContent = '✦ Terapkan ke Semua Foto';
          btn.disabled = false;
        }
      }, 1800);
    }
  };

  window.resetFilter = function() {
    filterStates[currentIdx] = { tone:'normal', brightness:0, smooth:0, lip:'off', blush:'off', flip:false };
    loadFilterUI(filterStates[currentIdx]);
    applyFilter();
  };

  function simpanFotoSilent() {
    if (
      !photoReady ||
      !currentImg ||
      !currentImg.complete ||
      !currentImg.naturalWidth ||
      !currentImg.naturalHeight ||
      !canvas.width ||
      !canvas.height
    ) {
      return false;
    }

    filteredPhotos[currentIdx] = isNeutralFilterState(filterStates[currentIdx])
      ? photos[currentIdx]
      : canvas.toDataURL('image/jpeg', productLikeExportQuality);
    return true;
  }

  function downloadCanvasBlob(canvasEl, filename) {
    return new Promise((resolve, reject) => {
      if (!canvasEl || !canvasEl.width || !canvasEl.height) {
        reject(new Error('Canvas belum siap'));
        return;
      }

      canvasEl.toBlob(blob => {
        if (!blob) {
          reject(new Error('Gagal membuat file foto'));
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2500);
        resolve();
      }, 'image/jpeg', productLikeExportQuality);
    });
  }

  window.downloadFotoIni = async function() {
    try {
      if (!simpanFotoSilent()) {
        throw new Error('Foto masih dimuat. Tunggu sampai preview muncul.');
      }
      await downloadCanvasBlob(canvas, `lux-foto-${currentIdx + 1}-${Date.now()}.jpg`);
      statusBar.textContent = `Foto ${currentIdx + 1} mulai didownload ✓`;
      setTimeout(() => { statusBar.textContent = ''; }, 1500);
    } catch(e) {
      console.error('download foto ini error:', e);
      statusBar.textContent = 'Gagal download foto: ' + (e.message || e);
    }
  };

  // Backward compatibility kalau masih ada onclick lama di cache
  window.simpanFoto = window.downloadFotoIni;

  async function goToResultPage() {
    if (isProcessingResult) return;

    try {
      await window.LUX_REQUIRE_AUTH('filter_save_requires_login');
    } catch (error) {
      console.error('[LUX AUTH] Penyimpanan hasil filter diblokir:', error);
      return;
    }

    if (!photoReady) {
      statusBar.textContent = 'Foto masih dimuat. Tunggu sampai preview muncul.';
      setContinueButtonReady(false, 'Memuat Foto...');
      return;
    }

    isProcessingResult = true;
    const btn = document.getElementById('btnLanjutFilter');
    if (btn) {
      btn.disabled = true;
      btn.textContent = isPhotoboxMode ? 'Memproses Photobox...' : 'Memproses...';
      btn.style.pointerEvents = 'none';
    }

    try {
      if (!simpanFotoSilent()) {
        throw new Error('Foto belum siap diproses');
      }
      const storeMode = await saveLargePhotoArray('filteredPhotos', filteredPhotos);
      console.log('[LUX] filteredPhotos saved via', storeMode);

      // Setelah hasil filter terverifikasi, hapus foto mentah sesi ini agar tidak menumpuk.
      const photoSessionId = getPhotoSessionId();
      await idbDelete('photos');
      if (photoSessionId) await idbDelete(`photos:${photoSessionId}`);
      ['photos','photosStore','photosSessionId'].forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      try { sessionStorage.removeItem('luxPhotoSessionId'); } catch (_) {}

      if (isPhotoboxMode) {
        localStorage.setItem('captureFlow', 'photobox');
        localStorage.setItem('templateProduct', 'photobox');
      }

      if (isGanciMode) {
        const frame = ganciConfig.frame || 'polos';
        const frameLabel = (window.GanciFrames?.labels?.[frame]) || ganciConfig.frameLabel || frame;
        const ganciState = {
          mode: 'ganci',
          photo: filteredPhotos[0] || photos[0] || null,
          originalPhoto: photos[0] || null,
          frame,
          frameLabel,
          bentuk: ganciConfig.bentuk || 'persegi',
          filter: filterStates[0] || { tone:'normal', brightness:0, smooth:0, lip:'off', blush:'off', flip:false },
          config: ganciConfig,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('ganciState', JSON.stringify(ganciState));
        window.location.assign('/ganci?done=1');
        return;
      }

      // Product mode: simpan foto ke productPhoto lalu balik ke menu asal
      const returnUrl = localStorage.getItem('captureReturnUrl') || '/result';
      if (captureFlow === 'product') {
        const photo = filteredPhotos[0] || photos[0] || null;
        if (photo) localStorage.setItem('productPhoto', photo);
        localStorage.removeItem('captureFlow');
        localStorage.removeItem('captureReturnUrl');
        window.location.assign(returnUrl);
        return;
      }

      window.location.assign('/result');
    } catch(e) {
      console.error('lanjut filter error:', e);
      isProcessingResult = false;
      alert('Gagal lanjut ke hasil: ' + (e.message || e));
      setContinueButtonReady(photoReady);
    }
  }

  window.lanjut = goToResultPage;

  window.kembali = function() {
    document.getElementById('confirmQuitModal').style.display = 'flex';
  };
  window.konfirmasiKeluar = async function() {
    await idbClearAll();
    ['photos','photosStore','photosSessionId','filteredPhotos','filteredPhotosStore','finalPhoto','finalPhotoThumb','livePhotos','livePhotosStore'].forEach(k => localStorage.removeItem(k));
    try { sessionStorage.removeItem('luxPhotoSessionId'); } catch (_) {}
    const flow = localStorage.getItem('captureFlow') || '';
    const returnUrl = localStorage.getItem('captureReturnUrl') || '/template';
    if (flow === 'ganci') localStorage.removeItem('captureFlow');
    if (flow === 'product') {
      localStorage.removeItem('captureFlow');
      localStorage.removeItem('captureReturnUrl');
      window.location.href = returnUrl;
      return;
    }
    window.location.href = isGanciMode ? '/ganci' : '/template';
  };
  window.batalKeluar = function() {
    document.getElementById('confirmQuitModal').style.display = 'none';
  };

  const btnLanjutFilterEl = document.getElementById('btnLanjutFilter');
  if (btnLanjutFilterEl) {
    btnLanjutFilterEl.addEventListener('click', (e) => {
      e.preventDefault();
      goToResultPage();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  if (photos.length > 0) {
    switchPhoto(0);
  } else {
    photoReady = false;
    setContinueButtonReady(false, 'Foto Tidak Ditemukan');
    statusBar.textContent = 'Foto tidak ditemukan. Pastikan camera.html dan filter.html berasal dari patch yang sama, lalu ambil ulang foto.';
  }
})().catch(error => {
  console.error('filter init error:', error);
  const status = document.getElementById('statusBar');
  if (status) status.textContent = 'Filter gagal dibuka: ' + (error.message || error);
  const btn = document.getElementById('btnLanjutFilter');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Filter Gagal Dimuat';
  }
});
