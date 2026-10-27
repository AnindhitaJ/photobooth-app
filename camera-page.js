  const captureFlow = localStorage.getItem('captureFlow') || '';
  const isEventMode = localStorage.getItem('eventMode') === '1';
  const isGanciMode  = captureFlow === 'ganci';
  const isProductMode = captureFlow === 'product';
  const isPhotoboxMode = captureFlow === 'photobox';
  // Mode Vintage: tema preset, tanpa halaman filter & tanpa editor foto.
  const isVintageMode = !!(window.LuxVintage && window.LuxVintage.isActive());
  const BACK_URL = isVintageMode ? '/vintage' : '/template';
  const ganciConfig  = (() => { try { return JSON.parse(localStorage.getItem('ganciConfig') || '{}'); } catch(e) { return {}; } })();
  const slotCount    = (isGanciMode || isProductMode) ? 1 : parseInt(localStorage.getItem('slotCount') || '1');
  const templateName = isGanciMode
    ? ('Ganci ' + ((window.GanciFrames?.labels?.[ganciConfig.frame]) || ganciConfig.frame || 'Polos'))
    : (localStorage.getItem('templateName') || 'Template');
  document.getElementById('subText').textContent = (isGanciMode || isProductMode) ? '1 foto · retake bebas' : (isEventMode ? 'Event · ' : '') + (isPhotoboxMode ? 'Photobox 4R · ' : '') + templateName + ' · ' + slotCount + ' foto';
  if (isGanciMode) {
    document.body.classList.add('ganci-mode');
    document.title = 'Kamera Ganci - LUX Photobooth';
  }

  const video        = document.getElementById('video');
  const canvas       = document.getElementById('canvas');
  const countdownEl  = document.getElementById('countdown');
  const flashEl      = document.getElementById('flash');
  const btnAmbil     = document.getElementById('btnAmbil');
  const btnLanjut    = document.getElementById('btnLanjut');
  const statusMsg    = document.getElementById('statusMsg');
  const recIndicator = document.getElementById('recIndicator');
  const ganciFrameCanvas = document.getElementById('ganciFrameCanvas');
  const cameraPanel  = document.getElementById('cameraPanel');
  const cameraSelect = document.getElementById('cameraSelect');

  let selectedCameraId = localStorage.getItem('selectedCameraId') || '';

  let photos         = new Array(slotCount).fill(null);
  let liveVideos     = new Array(slotCount).fill(null);
  let currentSlot    = 0;
  let isCountingDown = false;
  let stream         = null;
  let mediaRecorder  = null;
  let recordedChunks = [];
  let captureMode    = null;
  let countdownSec   = 5;
  let countdownTimer = null;
  let isSavingPhotos = false;
  let tempCleanupReady = Promise.resolve();
  let cameraStartSequence = 0;
  let cameraReady = false;
  let cameraResumeNeeded = false;

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

  async function idbSet(key, value) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.objectStore(PHOTO_STORE_NAME).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB gagal menyimpan')); };
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

  function createPhotoSessionId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  async function saveLargePhotoArray(key, value, sessionId = '') {
    const idbKey = sessionId ? `${key}:${sessionId}` : key;
    let idbError = null;
    let localError = null;

    // Simpan hanya satu salinan besar di IndexedDB. Jangan stringify sebelum diperlukan.
    try {
      await idbSet(idbKey, value);
      const verified = await idbGet(idbKey);
      if (!Array.isArray(verified) || verified.filter(Boolean).length !== value.filter(Boolean).length) {
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

    // Fallback saja untuk browser yang IndexedDB-nya tidak tersedia.
    try {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(key + 'Store', 'localStorage');
      return 'localStorage';
    } catch (e) {
      localError = e;
      try { localStorage.removeItem(key); } catch (_) {}
      console.warn('[LUX] localStorage save failed:', e);
    }

    const reason = idbError?.message || localError?.message || 'penyimpanan browser tidak tersedia';
    throw new Error(`Data gagal disimpan: ${reason}`);
  }

  // Pan/Zoom
  const ALLOWED_ZOOM_FACTORS = [1, 1.2, 1.5, 2];

  function readSavedZoomFactor() {
    const savedFactor = Number(localStorage.getItem('cameraZoomFactor'));
    if (ALLOWED_ZOOM_FACTORS.includes(savedFactor)) return savedFactor;

    // Kompatibilitas dengan versi lama yang hanya menyimpan mode 120%.
    return localStorage.getItem('cameraZoomEnabled') === '1' ? 1.2 : 1;
  }

  let cameraZoomFactor = readSavedZoomFactor();

  function updateVideoTransform() {
    // Live preview menggunakan faktor yang sama dengan hasil capture.
    video.style.transform = `scaleX(-1) scale(${cameraZoomFactor})`;
    video.style.transformOrigin = 'center center';
    updateFrameGuide();
  }

  function updateFrameGuide() {
    const guide = document.getElementById('frameGuide');
    const slots = isGanciMode
      ? [{ x: 0, y: 0, w: ganciConfig.ganciW || 55, h: ganciConfig.ganciH || 55 }]
      : JSON.parse(localStorage.getItem('templateSlots') || '[]');
    if (!slots.length) {
      guide.style.opacity = '0';
      if (ganciFrameCanvas) ganciFrameCanvas.style.display = 'none';
      return;
    }
    const slot = slots[currentSlot] || slots[0];

    const slotAspect = slot.w / slot.h;

    // Dimensi capture canvas (landscape selalu)
    const CAP_W = 1280, CAP_H = 960;

    // Dimensi video asli dari kamera
    const rawW = video.videoWidth  || 1280;
    const rawH = video.videoHeight || 720;

    // Layar user
    const scrW = window.innerWidth;
    const scrH = window.innerHeight;

    // ── Step 1: video (rawW×rawH) → canvas capture (CAP_W×CAP_H) ──
    // ambilFoto() pakai cover-fit: scale = Math.max(CAP_W/rawW, CAP_H/rawH)
    // → area video yang masuk ke capture (center-crop):
    const capScale = Math.max(CAP_W / rawW, CAP_H / rawH);
    const capSrcW  = CAP_W / capScale;   // lebar area video → capture
    const capSrcH  = CAP_H / capScale;   // tinggi area video → capture

    // ── Step 2: video (rawW×rawH) → layar (scrW×scrH) via object-fit:cover ──
    // scale agar video cover layar:
    const dispScale = Math.max(scrW / rawW, scrH / rawH);
    // area video yang visible di layar (center-crop):
    const visSrcW = scrW / dispScale;    // lebar area video yang keliatan
    const visSrcH = scrH / dispScale;    // tinggi area video yang keliatan

    // ── Step 3: irisan capture ∩ visible ──
    // Keduanya center-crop dari video asli
    // Irisan = min dari keduanya di tiap dimensi:
    const interSrcW = Math.min(capSrcW, visSrcW);
    const interSrcH = Math.min(capSrcH, visSrcH);

    // Ukuran irisan di layar (px):
    const interScrW = interSrcW * dispScale;
    const interScrH = interSrcH * dispScale;

    // ── Step 4: dalam irisan (= area capture yang terlihat di layar),
    // composite cover-fit ke slot aspect ratio ──
    // Rasio irisan terhadap capture:
    const interCapW = interSrcW / capSrcW;   // fraksi lebar capture yang visible
    const interCapH = interSrcH / capSrcH;   // fraksi tinggi capture yang visible
    // Ukuran irisan dalam px capture:
    const interCapPxW = interCapW * CAP_W;
    const interCapPxH = interCapH * CAP_H;
    // Cover-fit slot ke irisan capture:
    const slotScale = Math.max(slot.w / interCapPxW, slot.h / interCapPxH);
    const usedCapW  = slot.w / slotScale;
    const usedCapH  = slot.h / slotScale;
    // Rasio area yang dipakai terhadap irisan:
    const useRatioW = usedCapW / interCapPxW;
    const useRatioH = usedCapH / interCapPxH;

    // ── Step 5: guide di layar ──
    const guideW = interScrW * useRatioW;
    const guideH = interScrH * useRatioH;

    guide.style.left   = (scrW / 2 - guideW / 2) + 'px';
    guide.style.top    = (scrH / 2 - guideH / 2) + 'px';
    guide.style.width  = guideW + 'px';
    guide.style.height = guideH + 'px';
    guide.style.opacity = '1';

    if (isGanciMode) {
      drawGanciCameraFrame(guideW, guideH);
    } else if (ganciFrameCanvas) {
      ganciFrameCanvas.style.display = 'none';
    }
  }

  function drawGanciCameraFrame(guideW, guideH) {
    if (!ganciFrameCanvas || !window.GanciFrames) return;
    const pad = Math.max(34, Math.min(guideW, guideH) * 0.16);
    const hookPad = Math.max(32, Math.min(guideW, guideH) * 0.14);
    const dpr = window.devicePixelRatio || 1;
    const cssW = guideW + pad * 2;
    const cssH = guideH + pad * 2 + hookPad;
    ganciFrameCanvas.style.display = 'block';
    ganciFrameCanvas.style.width = cssW + 'px';
    ganciFrameCanvas.style.height = cssH + 'px';
    ganciFrameCanvas.width = Math.round(cssW * dpr);
    ganciFrameCanvas.height = Math.round(cssH * dpr);
    const gctx = ganciFrameCanvas.getContext('2d');
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.clearRect(0, 0, cssW, cssH);
    window.GanciFrames.drawFrame(gctx, {
      x: pad, y: pad + hookPad, w: guideW, h: guideH,
      bentuk: ganciConfig.bentuk || 'persegi',
      frame: ganciConfig.frame || 'polos',
      overlay: true,
      hook: false
    });
  }


  // ── Indicators & Strip ──
  function renderIndicators() {
    const ind = document.getElementById('slotIndicator');
    ind.innerHTML = '';
    for (let i = 0; i < slotCount; i++) {
      const dot = document.createElement('div');
      if (photos[i]) {
        dot.className = 'slot-dot done';
        dot.onclick = () => retakePhoto(i);
        dot.title = 'Foto ' + (i+1) + ' — klik retake';
      } else {
        dot.className = 'slot-dot' + (i === currentSlot ? ' active' : '');
      }
      dot.textContent = i + 1;
      ind.appendChild(dot);
    }
  }

  function renderStrip() {
    const strip = document.getElementById('photosStrip');
    strip.innerHTML = '';
    for (let i = 0; i < slotCount; i++) {
      const item = document.createElement('div');
      item.className = 'photo-item';
      if (photos[i]) {
        const img = document.createElement('img');
        img.className = 'photo-thumb';
        img.src = photos[i];
        item.appendChild(img);
        const btn = document.createElement('button');
        btn.className = 'btn-retake';
        btn.textContent = '↺';
        btn.onclick = () => retakePhoto(i);
        item.appendChild(btn);
      } else {
        const empty = document.createElement('div');
        empty.className = 'photo-thumb-empty';
        empty.textContent = i + 1;
        item.appendChild(empty);
      }
      strip.appendChild(item);
    }
  }

  function updateTitle() {
    const allDone = photos.every(p => p !== null);
    if (!allDone) {
      const next = photos.findIndex(p => p === null);
      document.getElementById('titleText').textContent = isGanciMode ? 'Foto Ganci' : 'Foto ' + (next+1) + '/' + slotCount;
      btnAmbil.textContent = isGanciMode ? '📷 Ambil Foto' : '📷 Ambil';
      btnAmbil.style.display = '';
      btnLanjut.style.display = 'none';
      document.getElementById('btnSkip').style.visibility = 'hidden';
    } else {
      document.getElementById('titleText').textContent = isGanciMode ? 'Foto ganci oke? ✓' : 'Semua selesai ✓';
      btnAmbil.style.display = 'none';
      btnLanjut.textContent = (isGanciMode || isProductMode) ? 'Filter →' : 'Lanjut →';
      btnLanjut.style.display = '';
      document.getElementById('btnSkip').style.visibility = 'hidden';
    }
  }

  function retakePhoto(idx) {
    if (isCountingDown) return;
    photos[idx] = null; liveVideos[idx] = null;
    currentSlot = idx;
    renderStrip(); renderIndicators(); updateTitle();
    statusMsg.textContent = 'Siap ambil ulang foto ' + (idx+1);
    btnAmbil.disabled = false;
    updateFrameGuide();
    if (!stream || !stream.active) startCamera();
  }

  // ── Camera ──
  function toggleCameraPanel() {
    cameraPanel?.classList.toggle('show');
    if (cameraPanel?.classList.contains('show')) refreshCameraDevices();
  }

  function closeCameraPanel() {
    cameraPanel?.classList.remove('show');
  }

  function makeCameraLabel(device, idx) {
    const raw = (device.label || '').trim();
    if (raw) return raw;
    return idx === 0 ? 'Kamera default' : `Kamera ${idx + 1}`;
  }

  async function refreshCameraDevices(requestPermission = false) {
    if (!navigator.mediaDevices?.enumerateDevices) {
      if (statusMsg) statusMsg.textContent = 'Browser belum support pilih kamera.';
      return;
    }
    try {
      // Nama/ID kamera baru terbaca setelah permission diberikan.
      // Hanya dipanggil dari tombol (=== true). Event devicechange mengirim objek Event,
      // jadi tidak boleh dianggap permintaan izin. Jika stream sedang aktif, izin sudah ada.
      if (requestPermission === true && navigator.mediaDevices?.getUserMedia && !(stream && stream.active)) {
        try {
          const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          temp.getTracks().forEach(t => t.stop());
        } catch(e) {
          console.warn('Permission kamera belum diberikan:', e);
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const allCameras = devices.filter(d => d.kind === 'videoinput');
      // Sebelum izin diberikan browser mengirim deviceId kosong.
      const cameras = allCameras.filter(d => d.deviceId);
      const permissionHidden = allCameras.length > 0 && cameras.length === 0;

      cameraSelect.innerHTML = '<option value="">Kamera default</option>' + cameras.map((d, i) => {
        const selected = d.deviceId === selectedCameraId ? 'selected' : '';
        return `<option value="${d.deviceId}" ${selected}>${makeCameraLabel(d, i)}</option>`;
      }).join('');

      // Hapus pilihan tersimpan hanya jika daftar sudah terbaca penuh dan perangkatnya benar-benar tidak ada.
      if (selectedCameraId && cameras.length && !cameras.some(d => d.deviceId === selectedCameraId)) {
        selectedCameraId = '';
        localStorage.removeItem('selectedCameraId');
        cameraSelect.value = '';
      } else if (selectedCameraId && cameras.length) {
        cameraSelect.value = selectedCameraId;
      }

      const help = document.getElementById('cameraHelp');
      if (help && !help.dataset.lock) help.textContent = permissionHidden
        ? 'Nama kamera belum terbaca karena izin belum diberikan. Klik Izinkan / Refresh.'
        : cameras.length
          ? 'Pilih kamera yang mau dipakai. Kamera eksternal / capture card muncul kalau terbaca browser sebagai webcam.'
          : 'Belum ada daftar kamera. Klik Izinkan / Refresh dan pastikan permission kamera di-allow.';
    } catch(e) {
      console.warn('enumerateDevices gagal:', e);
      if (statusMsg) statusMsg.textContent = 'Daftar kamera belum bisa dibaca.';
    }
  }

  async function selectCameraDevice(deviceId) {
    if (isCountingDown) {
      statusMsg.textContent = 'Tunggu countdown selesai dulu ya.';
      return;
    }
    selectedCameraId = deviceId || '';
    if (selectedCameraId) localStorage.setItem('selectedCameraId', selectedCameraId);
    else localStorage.removeItem('selectedCameraId');

    const help = document.getElementById('cameraHelp');
    if (!captureMode) {
      if (!selectedCameraId) {
        if (help) { delete help.dataset.lock; help.textContent = 'Kamera default dipilih. Sekarang pilih timer dan mode foto.'; }
        return;
      }
      // Langsung tes kamera yang dipilih supaya ketahuan sekarang apakah gambar benar-benar masuk.
      if (help) { help.dataset.lock = '1'; help.textContent = 'Mengecek kamera...'; }
      statusMsg.textContent = '';
      const okPreview = await startCamera({ reason: 'camera_select_preview' });
      if (help) {
        help.textContent = okPreview
          ? `Kamera aktif (${video.videoWidth}x${video.videoHeight}). Sekarang pilih timer dan mode foto.`
          : (statusMsg.textContent || 'Kamera belum bisa dibuka.');
      }
      return;
    }

    statusMsg.textContent = selectedCameraId ? 'Mengganti kamera...' : 'Menggunakan kamera default...';
    await startCamera();
    setTimeout(updateFrameGuide, 500);
  }

  function stopCameraStream({ clearVideo = true } = {}) {
    const currentStream = stream;
    stream = null;
    cameraReady = false;

    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        try { track.onended = null; } catch (_) {}
        try { track.stop(); } catch (_) {}
      });
    }

    if (clearVideo && video) {
      try { video.pause(); } catch (_) {}
      video.srcObject = null;
    }
  }

  function getLiveVideoTrack(targetStream = stream) {
    return targetStream?.getVideoTracks?.().find(track => track.readyState === 'live') || null;
  }

  function isCameraOperational() {
    return !!(
      cameraReady
      && stream?.active
      && getLiveVideoTrack()
      && video?.srcObject === stream
      && !video.paused
      && video.videoWidth > 0
      && video.videoHeight > 0
    );
  }

  function makeCameraError(name, message) {
    const err = new Error(message);
    err.name = name;
    return err;
  }

  function waitForVideoReady(timeoutMs = 7000) {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
      let finished = false;
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('error', onError);
      };
      const finish = (callback) => {
        if (finished) return;
        finished = true;
        cleanup();
        callback();
      };
      const onReady = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) finish(() => resolve(true));
      };
      const onError = () => finish(() => reject(makeCameraError('PlayError', 'Video kamera gagal diputar.')));
      const timer = setTimeout(() => finish(() => reject(makeCameraError('NoFrameError', 'Kamera terlalu lama menyiapkan preview.'))), timeoutMs);
      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('error', onError, { once: true });
    });
  }

  function describeCameraError(error) {
    const name = error?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Izin kamera ditolak. Buka pengaturan aplikasi/browser lalu izinkan kamera.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Kamera tidak ditemukan. Pastikan webcam terhubung dan terbaca perangkat.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Kamera sedang dipakai aplikasi lain atau gagal dibuka. Tutup aplikasi kamera lain lalu coba lagi.';
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return 'Kamera pilihan tidak mendukung pengaturan yang diminta. Coba kamera default.';
    }
    if (name === 'AbortError') {
      return 'Pembukaan kamera terhenti. Ketuk Ambil untuk mencoba kembali.';
    }
    if (name === 'NoFrameError') {
      return 'Kamera terbuka tapi belum ada gambar masuk. Cek sinyal HDMI dari kamera (clean output), pastikan capture card tidak dipakai aplikasi lain (OBS dll), lalu coba lagi atau cabut-pasang capture card.';
    }
    if (name === 'PlayError') {
      return 'Preview gagal diputar oleh browser. Ketuk Ambil untuk mencoba lagi.';
    }
    return 'Kamera tidak bisa diakses. Cek permission atau pilih kamera lain.';
  }

  async function requestCameraStream(videoConstraint) {
    return navigator.mediaDevices.getUserMedia({
      video: videoConstraint,
      audio: false
    });
  }

  async function attachCameraStream(candidateStream, sequence, readyTimeoutMs = 7000) {
    if (sequence !== cameraStartSequence) {
      candidateStream.getTracks().forEach(track => track.stop());
      return false;
    }

    stream = candidateStream;
    const track = getLiveVideoTrack(candidateStream);
    if (!track) throw new Error('Track video kamera tidak aktif.');

    track.onended = () => {
      if (stream !== candidateStream) return;
      cameraReady = false;
      btnAmbil.disabled = true;
      statusMsg.textContent = document.visibilityState === 'visible'
        ? 'Kamera terputus. Ketuk Ambil untuk menyambungkan kembali.'
        : 'Kamera dijeda saat aplikasi di-background.';
      cameraResumeNeeded = true;
    };

    video.srcObject = candidateStream;
    try {
      await video.play();
    } catch (playError) {
      if (playError?.name === 'AbortError') throw playError;
      throw makeCameraError('PlayError', 'video.play gagal: ' + (playError?.message || playError));
    }
    await waitForVideoReady(readyTimeoutMs);

    if (sequence !== cameraStartSequence || stream !== candidateStream) {
      candidateStream.getTracks().forEach(trackItem => trackItem.stop());
      return false;
    }

    cameraReady = true;
    cameraResumeNeeded = false;
    btnAmbil.disabled = false;
    statusMsg.textContent = '';
    setTimeout(refreshCameraDevices, 250);
    return true;
  }

  function cameraConstraintAttempts() {
    if (selectedCameraId) {
      // Kamera eksternal / capture card: jangan paksa 4:3. Capture card HDMI umumnya 16:9.
      // Percobaan kedua hanya memakai deviceId supaya browser memilih mode bawaan perangkat.
      return [
        { deviceId: { exact: selectedCameraId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        { deviceId: { exact: selectedCameraId } }
      ];
    }
    return [{
      facingMode: { ideal: 'user' },
      width: { ideal: 1920 },
      height: { ideal: 1440 },
      aspectRatio: { ideal: 4 / 3 }
    }];
  }

  async function startCamera({ reason = 'manual' } = {}) {
    const sequence = ++cameraStartSequence;
    cameraReady = false;
    btnAmbil.disabled = true;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera.');
      }
      if (document.visibilityState === 'hidden') {
        cameraResumeNeeded = true;
        statusMsg.textContent = 'Kamera dijeda saat aplikasi di-background.';
        return false;
      }

      stopCameraStream();

      const external = !!selectedCameraId;
      const attempts = cameraConstraintAttempts();
      let lastError = null;

      for (let i = 0; i < attempts.length; i++) {
        if (sequence !== cameraStartSequence) return false;
        try {
          const candidate = await requestCameraStream(attempts[i]);
          return await attachCameraStream(candidate, sequence, external ? 12000 : 7000);
        } catch (attemptError) {
          lastError = attemptError;
          console.warn('Kamera percobaan', i + 1, 'gagal:', reason, attemptError?.name, attemptError?.message);
          if (sequence !== cameraStartSequence) return false;
          stopCameraStream();
          const n = attemptError?.name || '';
          const retryable = ['NoFrameError', 'OverconstrainedError', 'ConstraintNotSatisfiedError', 'AbortError'].includes(n);
          if (!retryable) break;
        }
      }
      throw lastError || new Error('Kamera gagal dibuka.');
    } catch (error) {
      console.warn('Kamera gagal:', reason, error?.name, error?.message);
      if (sequence !== cameraStartSequence) return false;
      stopCameraStream();

      // Hanya lupakan kamera pilihan kalau perangkatnya memang tidak ada lagi.
      // Error lain (tanpa sinyal, sedang dipakai aplikasi lain, izin) TIDAK menghapus pilihan.
      const name = error?.name || '';
      const deviceGone = ['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(name);
      if (selectedCameraId && deviceGone) {
        selectedCameraId = '';
        localStorage.removeItem('selectedCameraId');
        try { cameraSelect.value = ''; } catch (_) {}
        try {
          const fallback = await requestCameraStream(cameraConstraintAttempts()[0]);
          const ok = await attachCameraStream(fallback, sequence);
          if (ok) {
            statusMsg.textContent = 'Kamera pilihan tidak ditemukan, memakai kamera default.';
            return true;
          }
        } catch (fallbackError) {
          console.warn('Fallback camera gagal:', fallbackError);
          error = fallbackError;
        }
        if (sequence !== cameraStartSequence) return false;
        stopCameraStream();
      }

      cameraResumeNeeded = true;
      statusMsg.textContent = describeCameraError(error);
      btnAmbil.disabled = false; // tombol menjadi tindakan retry berbasis user gesture
      return false;
    }
  }


  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => refreshCameraDevices(false));
  }

  // ── Live recording ──
  function startLiveRecording(idx) {
    if (!stream || !window.MediaRecorder) return;
    recordedChunks = [];
    const mime = ['video/webm;codecs=vp8','video/webm','video/mp4']
      .find(m => { try { return MediaRecorder.isTypeSupported(m); } catch(e) { return false; } }) || '';
    if (!mime) return;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4000000 });
      mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mime });
        const reader = new FileReader();
        reader.onload = ev => { liveVideos[idx] = ev.target.result; };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start(100);
      recIndicator.classList.add('show');
    } catch(e) { console.warn('MediaRecorder:', e); }
  }

  function stopLiveRecording() {
    recIndicator.classList.remove('show');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    mediaRecorder = null;
  }

  // ── Timer & Mode selection ──
  function setZoomMode(factor) {
    const requestedFactor = Number(factor);
    cameraZoomFactor = ALLOWED_ZOOM_FACTORS.includes(requestedFactor)
      ? requestedFactor
      : 1;

    localStorage.setItem('cameraZoomFactor', String(cameraZoomFactor));

    // Dipertahankan untuk kompatibilitas dengan versi lama.
    localStorage.setItem(
      'cameraZoomEnabled',
      cameraZoomFactor > 1 ? '1' : '0'
    );

    const buttonFactors = {
      zoom100: 1,
      zoom120: 1.2,
      zoom150: 1.5,
      zoom200: 2
    };

    Object.entries(buttonFactors).forEach(([id, value]) => {
      document
        .getElementById(id)
        ?.classList.toggle('sel', cameraZoomFactor === value);
    });

    updateVideoTransform();
  }

  function setTimer(sec) {
    countdownSec = sec;
    [3,5,10].forEach(s => document.getElementById('t'+s).classList.toggle('sel', s === sec));
    document.getElementById('timerHint').textContent = '';
    document.getElementById('modeAuto').disabled   = false;
    document.getElementById('modeManual').disabled = false;
  }

  function setMode(mode) {
    captureMode = mode;
    document.getElementById('modeModal').style.display = 'none';

    // Baik mode manual maupun otomatis dimulai dengan klik tombol Ambil.
    // Khusus mode otomatis, foto kedua dan seterusnya tetap berjalan otomatis
    // melalui blok lanjutan di ambilFoto().
    btnAmbil.style.display = '';
    btnAmbil.disabled = true;
    btnAmbil.textContent = mode === 'auto' ? '📷 Mulai Foto' : '📷 Ambil';
    statusMsg.textContent = mode === 'auto'
      ? 'Klik Mulai Foto untuk foto pertama. Foto berikutnya akan otomatis.'
      : 'Klik Ambil saat sudah siap.';

    // Pastikan data sesi lama selesai dibersihkan sebelum sesi kamera baru dimulai.
    tempCleanupReady.finally(async () => {
      const ok = isCameraOperational() ? true : await startCamera({ reason: 'mode_selected' });
      if (ok) { btnAmbil.disabled = false; setTimeout(updateFrameGuide, 600); }
    });
  }

  // ── Countdown & Capture ──
  async function mulaiCountdown() {
    if (isCountingDown) return;
    window.ShutterSound && ShutterSound.unlock(); // izinkan audio dari klik user

    if (!isCameraOperational()) {
      statusMsg.textContent = 'Mengaktifkan kamera...';
      const ok = await startCamera({ reason: 'capture_retry' });
      if (!ok) return;
    }
    isCountingDown = true;
    btnAmbil.disabled = true;
    currentSlot = photos.findIndex(p => p === null);
    if (currentSlot === -1) { isCountingDown = false; return; }
    renderIndicators();

    let angka = countdownSec;
    let liveStarted = false;
    countdownEl.textContent = angka;
    countdownEl.classList.add('show');

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      angka--;
      if (angka === 2 && !liveStarted) { liveStarted = true; startLiveRecording(currentSlot); }
      if (angka > 0) {
        countdownEl.textContent = angka;
      } else {
        clearInterval(countdownTimer);
        countdownTimer = null;
        countdownEl.classList.remove('show');
        ambilFoto();
      }
    }, 1000);
  }

  function ambilFoto() {
    window.ShutterSound && ShutterSound.play(); // suara cekrek
    flashEl.classList.add('show');
    setTimeout(() => flashEl.classList.remove('show'), 180);

    const vW = video.videoWidth;
    const vH = video.videoHeight;
    if (!vW || !vH) {
      statusMsg.textContent = 'Kamera belum siap. Coba ulangi.';
      isCountingDown = false;
      btnAmbil.disabled = false;
      return;
    }

    // Capture mengikuti frame kamera asli.
    // Crop/cover-fit dilakukan saat render template di result.html,
    // sehingga preview kamera, filter, dan result memakai framing yang sama.
    const MAX_W = 1920;
    const MAX_H = 1440;

    const outputScale = Math.min(1, MAX_W / vW, MAX_H / vH);
    const W = Math.max(1, Math.round(vW * outputScale));
    const H = Math.max(1, Math.round(vH * outputScale));

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);

    if (cameraZoomFactor > 1) {
      const cropW = vW / cameraZoomFactor;
      const cropH = vH / cameraZoomFactor;
      const cropX = (vW - cropW) / 2;
      const cropY = (vH - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, W, H);
    } else {
      ctx.drawImage(video, 0, 0, vW, vH, 0, 0, W, H);
    }

    ctx.restore();

    photos[currentSlot] = canvas.toDataURL('image/jpeg', 0.90);
    setTimeout(() => stopLiveRecording(), 800);
    isCountingDown = false;

    renderStrip(); renderIndicators(); updateTitle(); updateFrameGuide();

    const nextEmpty = photos.findIndex(p => p === null);
    if (nextEmpty !== -1) {
      currentSlot = nextEmpty;
      statusMsg.textContent = 'Bagus! Sekarang foto ' + (nextEmpty+1);
      if (captureMode === 'auto') {
        setTimeout(() => { statusMsg.textContent = ''; mulaiCountdown(); }, 1200);
      } else {
        setTimeout(() => { statusMsg.textContent = ''; btnAmbil.disabled = false; }, 1200);
      }
    } else {
      statusMsg.textContent = 'Semua foto selesai! ✓';
      stopCameraStream();
      setTimeout(() => showPreview(), 700);
    }
  }

  // ── Preview Panel ──
  function showPreview() {
    const panel = document.getElementById('previewPanel');
    const backBtn = panel.querySelector('.prev-btn-back');
    const filterBtn = document.getElementById('btnEditFilter');
    const directBtn = document.getElementById('btnDirectResult');

    if (backBtn) backBtn.textContent = isGanciMode ? '↺ Retake' : '↺ Retake Foto';
    if (filterBtn) {
      filterBtn.textContent = isGanciMode ? 'Lanjut ke Filter →' : '✨ Edit Filter';
    }

    // Jalur langsung ke result hanya untuk Photostrip/Photobox.
    // Ganci dan product tetap harus melewati flow khususnya masing-masing.
    if (directBtn) {
      directBtn.style.display = (!isGanciMode && !isProductMode) ? '' : 'none';
    }
    if (isVintageMode) {
      // Vintage: tidak ada Edit Filter, langsung ke hasil.
      if (filterBtn) filterBtn.style.display = 'none';
      if (directBtn) directBtn.textContent = '✅ Lanjut ke Hasil';
    }
    const big   = document.getElementById('previewBig');
    const thumbs = document.getElementById('previewThumbs');
    thumbs.innerHTML = '';
    const valid = photos.filter(Boolean);
    big.src = valid[0] || '';
    valid.forEach((src, i) => {
      const img = document.createElement('img');
      img.className = 'prev-thumb' + (i === 0 ? ' active' : '');
      img.src = src;
      img.onclick = () => {
        document.querySelectorAll('.prev-thumb').forEach(t => t.classList.remove('active'));
        img.classList.add('active');
        big.style.opacity = '0';
        setTimeout(() => { big.src = src; big.style.opacity = '1'; }, 150);
      };
      thumbs.appendChild(img);
    });
    panel.classList.add('show');
  }

  function closePreview() {
    document.getElementById('previewPanel').classList.remove('show');
    if (isGanciMode) {
      retakePhoto(0);
      return;
    }
    btnAmbil.style.display = captureMode === 'manual' ? '' : 'none';
    if (!stream || !stream.active) startCamera();
  }

  async function langsungKeHasil() {
    if (isSavingPhotos) return;

    try {
      await window.LUX_REQUIRE_AUTH('camera_direct_result_requires_login');
    } catch (error) {
      console.error('[LUX AUTH] Jalur langsung ke hasil diblokir:', error);
      return;
    }

    if (isGanciMode || isProductMode) {
      alert('Mode ini tetap harus melewati halaman filter.');
      return;
    }

    const validPhotos = photos.filter(Boolean);
    if (validPhotos.length !== slotCount) {
      alert('Masih ada foto yang belum diambil.');
      return;
    }

    isSavingPhotos = true;

    const actionButtons = document.querySelectorAll(
      '#previewActions button, #btnLanjut'
    );

    actionButtons.forEach(button => {
      button.disabled = true;
      button.style.pointerEvents = 'none';
      button.dataset.originalText = button.textContent;
    });

    const directButton = document.getElementById('btnDirectResult');
    if (directButton) directButton.textContent = 'Menyiapkan hasil...';

    try {
      const oldSessionId = (() => {
        try {
          return sessionStorage.getItem('luxPhotoSessionId')
            || localStorage.getItem('photosSessionId')
            || '';
        } catch (_) {
          return '';
        }
      })();

      // Hapus handoff lama agar result tidak membaca foto dari sesi sebelumnya.
      localStorage.removeItem('filteredPhotos');
      localStorage.removeItem('filteredPhotosStore');
      localStorage.removeItem('photos');
      localStorage.removeItem('photosStore');
      localStorage.removeItem('photosSessionId');
      localStorage.removeItem('livePhotos');
      localStorage.removeItem('livePhotosStore');

      await idbDelete('filteredPhotos');
      await idbDelete('photos');
      await idbDelete('livePhotos');
      if (oldSessionId) await idbDelete(`photos:${oldSessionId}`);

      // Result memprioritaskan key filteredPhotos. Foto mentah diperlakukan
      // sebagai hasil filter "Normal", sehingga filter.html bisa dilewati.
      const photoStoreMode = await saveLargePhotoArray(
        'filteredPhotos',
        validPhotos
      );
      console.log(
        '[LUX] direct result photos saved via',
        photoStoreMode
      );

      const validLive = liveVideos.filter(Boolean);
      if (validLive.length > 0) {
        try {
          const liveStoreMode = await saveLargePhotoArray(
            'livePhotos',
            liveVideos
          );
          console.log(
            '[LUX] direct result livePhotos saved via',
            liveStoreMode
          );
        } catch (liveError) {
          // Live photo opsional; foto JPG tetap boleh lanjut.
          console.warn(
            '[LUX] livePhotos direct result tidak tersimpan:',
            liveError
          );
        }
      }

      try {
        sessionStorage.removeItem('luxPhotoSessionId');
      } catch (_) {}

      if (isPhotoboxMode) {
        localStorage.setItem('captureFlow', 'photobox');
        localStorage.setItem('templateProduct', 'photobox');
      }

      localStorage.setItem('filterSkipped', '1');
      window.location.assign('/result?source=camera&filter=skipped');
    } catch (error) {
      console.error('langsung ke hasil error:', error);
      isSavingPhotos = false;

      actionButtons.forEach(button => {
        button.disabled = false;
        button.style.pointerEvents = '';
        button.textContent =
          button.dataset.originalText || button.textContent;
      });

      alert(
        'Gagal menyiapkan hasil: ' +
        (error?.message || error)
      );
    }
  }

  async function lanjutFilter() {
    if (isSavingPhotos) return;
    if (isVintageMode) return langsungKeHasil();

    try {
      await window.LUX_REQUIRE_AUTH('camera_save_requires_login');
    } catch (error) {
      console.error('[LUX AUTH] Penyimpanan foto diblokir:', error);
      return;
    }

    const validPhotos = photos.filter(Boolean);
    if (validPhotos.length !== slotCount) {
      alert('Masih ada foto yang belum diambil.');
      return;
    }

    isSavingPhotos = true;
    const continueButtons = document.querySelectorAll('#btnLanjut, .prev-btn-go');
    continueButtons.forEach(btn => {
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Menyimpan foto...';
    });

    try {
      localStorage.removeItem('filteredPhotos');
      localStorage.removeItem('filteredPhotosStore');
      localStorage.removeItem('livePhotos');
      localStorage.removeItem('livePhotosStore');
      await idbDelete('filteredPhotos');
      await idbDelete('livePhotos');

      const photoSessionId = createPhotoSessionId();
      const storeMode = await saveLargePhotoArray('photos', photos, photoSessionId);
      console.log('[LUX] photos saved via', storeMode, 'session', photoSessionId);

      // Token kecil ini ikut di URL, sehingga filter tidak bergantung pada marker localStorage.
      try { sessionStorage.setItem('luxPhotoSessionId', photoSessionId); } catch (_) {}
      try { localStorage.setItem('photosSessionId', photoSessionId); } catch (_) {}

      const validLive = liveVideos.filter(Boolean);
      if (validLive.length > 0) {
        try {
          const liveStoreMode = await saveLargePhotoArray('livePhotos', liveVideos);
          console.log('[LUX] livePhotos saved via', liveStoreMode);
        } catch (e) {
          // Live photo bersifat opsional; foto utama tetap boleh lanjut ke filter.
          console.warn('[LUX] livePhotos tidak tersimpan:', e);
        }
      }

      if (isGanciMode) {
        const initialState = {
          mode: 'ganci',
          originalPhoto: photos[0] || null,
          frame: ganciConfig.frame || 'polos',
          frameLabel: (window.GanciFrames?.labels?.[ganciConfig.frame]) || ganciConfig.frame || 'Polos',
          bentuk: ganciConfig.bentuk || 'persegi',
          config: ganciConfig,
          updatedAt: new Date().toISOString()
        };
        try { localStorage.setItem('ganciState', JSON.stringify(initialState)); } catch(e) {}
      }

      window.location.assign(`/filter?photoSession=${encodeURIComponent(photoSessionId)}&handoff=2`);
    } catch(e) {
      console.error('simpan foto sebelum filter error:', e);
      isSavingPhotos = false;
      continueButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.pointerEvents = '';
        btn.textContent = btn.dataset.originalText || 'Lanjut ke Filter →';
      });
      alert('Foto gagal disimpan ke browser: ' + (e.message || e));
    }
  }

  function kembali() {
    // Cek apakah sudah ada foto yang diambil
    const sudahAda = photos.some(Boolean);
    if (sudahAda) {
      document.getElementById('confirmQuitModal').style.display = 'flex';
    } else {
      stopCameraStream();
      window.location.href = isGanciMode ? '/ganci' : BACK_URL;
    }
  }
  async function konfirmasiKeluar() {
    stopCameraStream();
    await idbClearAll();
    ['photos','photosStore','photosSessionId','filteredPhotos','filteredPhotosStore','finalPhoto','finalPhotoThumb','livePhotos','livePhotosStore'].forEach(k => localStorage.removeItem(k));
    try { sessionStorage.removeItem('luxPhotoSessionId'); } catch (_) {}
    if (isGanciMode) localStorage.removeItem('captureFlow');
    const _flow = localStorage.getItem('captureFlow') || '';
    const _ret  = localStorage.getItem('captureReturnUrl') || '/template';
    if (_flow === 'product') {
      localStorage.removeItem('captureFlow');
      localStorage.removeItem('captureReturnUrl');
      window.location.href = _ret;
      return;
    }
    window.location.href = isGanciMode ? '/ganci' : BACK_URL;
  }
  function batalKeluar() {
    document.getElementById('confirmQuitModal').style.display = 'none';
  }

  // ── Pan/Zoom wiring ──


  function cancelCountdownForSuspend() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (isCountingDown) {
      isCountingDown = false;
      countdownEl.classList.remove('show');
      stopLiveRecording();
    }
  }

  function suspendCameraForBackground() {
    const stillNeedsCamera = !!captureMode && photos.some(photo => !photo);
    cameraResumeNeeded = stillNeedsCamera;
    cancelCountdownForSuspend();
    stopCameraStream();
    if (stillNeedsCamera) {
      statusMsg.textContent = 'Kamera dijeda saat aplikasi di-background. Buka kembali lalu ketuk Ambil.';
      btnAmbil.disabled = false;
    }
  }

  async function recoverCameraAfterResume() {
    if (document.visibilityState !== 'visible') return;
    if (!captureMode || !photos.some(photo => !photo)) return;
    if (isCameraOperational()) return;

    // Auto-recovery dicoba lebih dulu. Bila browser mensyaratkan user gesture,
    // tombol Ambil tetap dapat dipakai sebagai retry langsung.
    const ok = await startCamera({ reason: 'pwa_resume' });
    if (!ok) {
      statusMsg.textContent = 'Kamera perlu diaktifkan ulang. Ketuk Ambil untuk mencoba kembali.';
      btnAmbil.disabled = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') suspendCameraForBackground();
    else setTimeout(recoverCameraAfterResume, 150);
  });
  window.addEventListener('pagehide', suspendCameraForBackground);
  window.addEventListener('pageshow', () => setTimeout(recoverCameraAfterResume, 150));
  window.addEventListener('online', () => setTimeout(recoverCameraAfterResume, 150));

  async function prepareNewPhotoSession() {
    await idbClearAll();
    ['photos','photosStore','photosSessionId','filteredPhotos','filteredPhotosStore','finalPhoto','finalPhotoThumb','livePhotos','livePhotosStore'].forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });
    try { sessionStorage.removeItem('luxPhotoSessionId'); } catch (_) {}
  }

  // Init hanya dijalankan setelah session Supabase benar-benar valid.
  async function initCameraPage() {
    const authOk = await window.LUX_PAGE_AUTH_READY;
    if (!authOk || !window.Auth?.requireAuth?.()) {
      throw new Error('Session kamera tidak valid.');
    }

    tempCleanupReady = prepareNewPhotoSession().catch(e => {
      console.warn('[LUX] cleanup sesi lama gagal:', e);
    });
    renderIndicators(); renderStrip(); updateTitle();
    // Sinkronkan tombol, live preview, dan hasil capture
    // dengan pilihan zoom terakhir.
    setZoomMode(cameraZoomFactor);
    refreshCameraDevices();
    window.addEventListener('resize', updateFrameGuide);
    if (isGanciMode) {
      document.getElementById('modeModal').style.display = 'none';
      captureMode = 'manual';
      countdownSec = 3;
      tempCleanupReady.finally(async () => {
        const ok = await startCamera({ reason: 'ganci_init' });
        if (ok) setTimeout(updateFrameGuide, 600);
      });
    }
  }

  initCameraPage().catch(error => {
    console.error('[LUX AUTH] Kamera tidak dijalankan:', error);
  });
