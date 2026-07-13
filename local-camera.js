/**
 * local-camera.js  — v2 (Ganci-aware)
 *
 * Improvement dari v1:
 *  - Frame overlay live di atas video preview (pakai GanciFrames.drawFrame jika tersedia)
 *  - Filter selection sebelum approve (reuse tone-map yang sama dengan filter.html)
 *  - True retake: buang foto, kembali ke mode kamera
 *  - Approve/reject modal sebelum onCapture dipanggil
 *  - Countdown bisa di-cancel dengan klik video
 */
(function () {
  let stream = null;
  let countdownTimer = null;
  let overlayAnimId = null;
  let captureOptions = {};
  let capturedPhoto = null;      // dataURL foto mentah (belum filter)
  let selectedFilter = 'normal';

  // ── Tone filter (sama persis dengan filter.html) ──────────────────────────
  const FILTERS = [
    { key: 'normal',  label: 'Normal' },
    { key: 'bw',      label: 'B&W' },
    { key: 'sepia',   label: 'Sepia' },
    { key: 'vintage', label: 'Vintage' },
    { key: 'cool',    label: 'Cool' },
    { key: 'warm',    label: 'Warm' },
    { key: 'fade',    label: 'Fade' },
    { key: 'drama',   label: 'Drama' },
    { key: 'matte',   label: 'Matte' },
    { key: 'moody',   label: 'Moody' },
    { key: 'dreamy',  label: 'Dreamy' },
    { key: 'teal',    label: 'Teal&Orange' },
    { key: 'kodak',   label: 'Kodak' },
    { key: 'fuji',    label: 'Fuji' },
    { key: 'lomo',    label: 'Lomo' },
    { key: 'milk',    label: 'Milk' },
  ];

  function applyTone(d, tone) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (tone === 'bw') {
        const gr = 0.299*r+0.587*g+0.114*b; d[i]=d[i+1]=d[i+2]=gr;
      } else if (tone === 'sepia') {
        d[i]=Math.min(255,r*.393+g*.769+b*.189); d[i+1]=Math.min(255,r*.349+g*.686+b*.168); d[i+2]=Math.min(255,r*.272+g*.534+b*.131);
      } else if (tone === 'vintage') {
        const gr=0.299*r+0.587*g+0.114*b; d[i]=Math.min(255,gr*.4+r*.6+20); d[i+1]=Math.min(255,gr*.4+g*.6+5); d[i+2]=Math.min(255,gr*.4+b*.6-10);
      } else if (tone === 'cool') {
        d[i]=Math.max(0,r-20); d[i+1]=Math.min(255,g+5); d[i+2]=Math.min(255,b+30);
      } else if (tone === 'warm') {
        d[i]=Math.min(255,r+30); d[i+1]=Math.min(255,g+10); d[i+2]=Math.max(0,b-20);
      } else if (tone === 'fade') {
        const gr=0.299*r+0.587*g+0.114*b,l=40; d[i]=Math.min(255,r*.75+gr*.25+l); d[i+1]=Math.min(255,g*.75+gr*.25+l); d[i+2]=Math.min(255,b*.75+gr*.25+l);
      } else if (tone === 'drama') {
        const gr=0.299*r+0.587*g+0.114*b,bl=.3,nr=r*(1-bl)+gr*bl,ng=g*(1-bl)+gr*bl,nb=b*(1-bl)+gr*bl;
        const sc=v=>{const n=v/255;return Math.min(255,Math.round(255*(n<.5?2*n*n:-1+(4-2*n)*n)));};
        d[i]=sc(nr); d[i+1]=sc(ng); d[i+2]=sc(nb);
      } else if (tone === 'matte') {
        const gr=0.299*r+0.587*g+0.114*b,l=30,c=.82; d[i]=Math.min(255,(r*.85+gr*.15)*c+l); d[i+1]=Math.min(255,(g*.85+gr*.15)*c+l); d[i+2]=Math.min(255,(b*.85+gr*.15)*c+l+5);
      } else if (tone === 'moody') {
        const gr=0.299*r+0.587*g+0.114*b; d[i]=Math.max(0,Math.min(255,r*.78-10)); d[i+1]=Math.max(0,Math.min(255,g*.82+gr*.05-5)); d[i+2]=Math.max(0,Math.min(255,b*.9+15));
      } else if (tone === 'dreamy') {
        const gr=0.299*r+0.587*g+0.114*b,s=.25; d[i]=Math.min(255,(r*(1-s)+gr*s)*1.08+18); d[i+1]=Math.min(255,(g*(1-s)+gr*s)*1.06+14); d[i+2]=Math.min(255,(b*(1-s)+gr*s)*1.05+20);
      } else if (tone === 'teal') {
        const sk=r>140&&g>80&&b<160&&r>g&&r>b;
        if(sk){d[i]=Math.min(255,r+18);d[i+1]=Math.min(255,g+6);d[i+2]=Math.max(0,b-15);}
        else{d[i]=Math.max(0,r-15);d[i+1]=Math.min(255,g+12);d[i+2]=Math.min(255,b+20);}
      } else if (tone === 'kodak') {
        const lum=0.299*r+0.587*g+0.114*b,w=lum<128?.12:.06; d[i]=Math.min(255,r*(1+w*.8)+12); d[i+1]=Math.min(255,g*(1+w*.4)+4); d[i+2]=Math.max(0,b*(1-w*.5)-8);
      } else if (tone === 'fuji') {
        const sh=(0.299*r+0.587*g+0.114*b)<100; d[i]=Math.max(0,r-(sh?12:4)); d[i+1]=Math.min(255,g+(sh?10:5)); d[i+2]=Math.min(255,b+(sh?14:8));
      } else if (tone === 'lomo') {
        const gr=0.299*r+0.587*g+0.114*b,sat=1.5;
        const lsc=v=>{const n=Math.max(0,Math.min(255,v))/255;return Math.min(255,Math.round(255*(n<.5?1.8*n*n:-1+(3.6-1.8*n)*n)));};
        d[i]=lsc(gr+(r-gr)*sat+10); d[i+1]=lsc(gr+(g-gr)*sat-5); d[i+2]=lsc(gr+(b-gr)*sat-15);
      } else if (tone === 'milk') {
        const gr=0.299*r+0.587*g+0.114*b,l=50,c=.65,ds=.35; d[i]=Math.min(255,(r*(1-ds)+gr*ds)*c+l+2); d[i+1]=Math.min(255,(g*(1-ds)+gr*ds)*c+l+4); d[i+2]=Math.min(255,(b*(1-ds)+gr*ds)*c+l+10);
      }
    }
  }

  function buildFiltered(rawDataUrl, tone) {
    if (!rawDataUrl || tone === 'normal') return rawDataUrl;
    const img = new Image();
    img.src = rawDataUrl;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 1280; c.height = img.naturalHeight || 960;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    applyTone(id.data, tone);
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/jpeg', 0.92);
  }

  // ── DOM builder ──────────────────────────────────────────────────────────────
  function ensureModal() {
    if (document.getElementById('localCameraModal')) return;

    const style = document.createElement('style');
    style.textContent = `
      /* ── Modal backdrop ── */
      .lc-modal {
        position:fixed;inset:0;z-index:99999;display:none;
        align-items:center;justify-content:center;padding:18px;
        background:rgba(15,23,42,.78);backdrop-filter:blur(10px);
      }
      .lc-modal.show { display:flex; }

      /* ── Main camera box ── */
      .lc-box {
        width:min(94vw,520px);border-radius:24px;overflow:hidden;
        background:#111827;box-shadow:0 28px 90px rgba(0,0,0,.48);
        position:relative;border:2.5px solid rgba(255,255,255,.16);
        display:flex;flex-direction:column;
      }

      /* ── Video area ── */
      .lc-video-wrap {
        position:relative;aspect-ratio:3/4;background:#020617;
        flex-shrink:0;overflow:hidden;
      }
      .lc-video {
        position:absolute;inset:0;width:100%;height:100%;
        object-fit:cover;display:block;transform:scaleX(-1);
      }
      /* Frame overlay canvas sits on top of video */
      .lc-frame-canvas {
        position:absolute;inset:0;width:100%;height:100%;
        pointer-events:none;z-index:2;
      }
      .lc-topbar {
        position:absolute;left:0;right:0;top:0;z-index:5;
        display:flex;justify-content:space-between;align-items:center;
        padding:12px 14px;
        background:linear-gradient(180deg,rgba(0,0,0,.65),transparent);
        color:#fff;font:900 13px system-ui,sans-serif;
      }
      .lc-close {
        border:0;background:rgba(255,255,255,.18);color:#fff;
        width:34px;height:34px;border-radius:999px;cursor:pointer;
        font-size:18px;font-weight:900;line-height:1;transition:background .15s;
      }
      .lc-close:hover { background:rgba(255,255,255,.3); }
      .lc-countdown {
        position:absolute;inset:0;z-index:4;display:grid;place-items:center;
        pointer-events:none;
      }
      .lc-number {
        min-width:112px;height:112px;border-radius:999px;
        display:grid;place-items:center;
        background:rgba(255,255,255,.9);
        color:#D84B7E;font:1000 64px system-ui,sans-serif;
        box-shadow:0 18px 60px rgba(0,0,0,.3);
        transition:transform .12s;
      }
      .lc-number.pulse { transform:scale(1.12); }

      /* ── Bottom controls (camera mode) ── */
      .lc-bottom {
        display:flex;gap:8px;align-items:center;justify-content:center;
        padding:12px;background:#1f2937;
      }
      .lc-btn {
        border:0;border-radius:999px;padding:11px 16px;cursor:pointer;
        font:800 13px system-ui,sans-serif;transition:all .15s;
      }
      .lc-btn-ghost { background:#374151;color:#d1d5db; }
      .lc-btn-ghost:hover { background:#4b5563; }
      .lc-btn-primary { background:linear-gradient(135deg,#D84B7E,#E5B842);color:#fff; }
      .lc-btn-primary:hover { opacity:.9; }
      .lc-btn-danger { background:#dc2626;color:#fff; }
      .lc-btn-danger:hover { background:#b91c1c; }
      .lc-btn-green { background:#16a34a;color:#fff; }
      .lc-btn-green:hover { background:#15803d; }

      /* ── Review mode ── */
      .lc-review-wrap {
        display:none;flex-direction:column;
      }
      .lc-review-wrap.show { display:flex; }
      .lc-review-img-wrap {
        position:relative;aspect-ratio:3/4;background:#000;overflow:hidden;flex-shrink:0;
      }
      .lc-review-canvas {
        width:100%;height:100%;display:block;object-fit:contain;
      }
      .lc-review-badge {
        position:absolute;top:10px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,.65);backdrop-filter:blur(6px);
        color:#fff;font:800 11px system-ui,sans-serif;
        padding:5px 14px;border-radius:999px;white-space:nowrap;
        letter-spacing:.5px;text-transform:uppercase;
      }

      /* ── Filter bar ── */
      .lc-filter-bar {
        background:#111827;padding:10px 12px;
        display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;
      }
      .lc-filter-bar::-webkit-scrollbar { display:none; }
      .lc-filter-pill {
        flex-shrink:0;padding:7px 14px;border-radius:999px;
        font:700 12px system-ui,sans-serif;cursor:pointer;border:0;
        background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);
        transition:all .15s;white-space:nowrap;
      }
      .lc-filter-pill.active {
        background:linear-gradient(135deg,#D84B7E,#E5B842);
        color:#fff;box-shadow:0 3px 10px rgba(216,75,126,.4);
      }

      /* ── Review bottom ── */
      .lc-review-bottom {
        display:flex;gap:8px;padding:12px;background:#1f2937;
      }

      /* Flash */
      .lc-flash {
        position:absolute;inset:0;background:white;opacity:0;
        pointer-events:none;z-index:10;transition:opacity .07s;
      }
      .lc-flash.show { opacity:1; }

      @media (max-width:520px) {
        .lc-box { width:96vw; }
        .lc-number { min-width:94px;height:94px;font-size:54px; }
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'localCameraModal';
    modal.className = 'lc-modal';
    modal.innerHTML = `
      <div class="lc-box">

        <!-- ── CAMERA mode ── -->
        <div id="lcCameraWrap">
          <div class="lc-video-wrap">
            <video id="lcVideo" class="lc-video" autoplay playsinline muted></video>
            <canvas id="lcFrameCanvas" class="lc-frame-canvas"></canvas>
            <div class="lc-flash" id="lcFlash"></div>
            <div class="lc-topbar">
              <span id="lcLabel" style="font-size:12px;">Kamera siap...</span>
              <button type="button" class="lc-close" onclick="LocalCamera.close()">×</button>
            </div>
            <div class="lc-countdown" id="lcCountdown" style="display:none;">
              <div class="lc-number" id="lcNumber">3</div>
            </div>
          </div>
          <div class="lc-bottom">
            <button type="button" class="lc-btn lc-btn-ghost" onclick="LocalCamera.restart()" title="Restart countdown">↺ Ulang timer</button>
            <button type="button" class="lc-btn lc-btn-primary" onclick="LocalCamera.captureNow()">📸 Ambil sekarang</button>
          </div>
        </div>

        <!-- ── REVIEW mode ── -->
        <div class="lc-review-wrap" id="lcReviewWrap">
          <div class="lc-review-img-wrap">
            <canvas id="lcReviewCanvas" class="lc-review-canvas"></canvas>
            <div class="lc-review-badge" id="lcReviewBadge">Preview foto + frame</div>
          </div>
          <div class="lc-filter-bar" id="lcFilterBar"></div>
          <div class="lc-review-bottom">
            <button type="button" class="lc-btn lc-btn-ghost" style="flex:1" onclick="LocalCamera.retake()">↺ Ulang foto</button>
            <button type="button" class="lc-btn lc-btn-green" style="flex:2" onclick="LocalCamera.confirm()">✓ Pakai foto ini</button>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(modal);

    // Build filter pills
    const bar = document.getElementById('lcFilterBar');
    FILTERS.forEach(f => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lc-filter-pill' + (f.key === 'normal' ? ' active' : '');
      btn.textContent = f.label;
      btn.dataset.key = f.key;
      btn.onclick = () => selectFilter(f.key);
      bar.appendChild(btn);
    });
  }

  // ── Frame overlay ────────────────────────────────────────────────────────────
  function startOverlay() {
    const video = document.getElementById('lcVideo');
    const canvas = document.getElementById('lcFrameCanvas');
    if (!canvas || !video) return;

    const opts = captureOptions.frameOpts || {};
    if (!opts.frame || opts.frame === 'polos') {
      // No decorative frame requested — just draw a dimmed guide rect
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }

    function loop() {
      overlayAnimId = requestAnimationFrame(loop);
      const w = canvas.offsetWidth || canvas.clientWidth || 390;
      const h = canvas.offsetHeight || canvas.clientHeight || 520;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      if (!opts.frame) return;

      // Compute centered guide area based on ganci aspect ratio
      const asp = (opts.ganciW || 55) / (opts.ganciH || 55);
      const maxW = w * 0.72, maxH = h * 0.66;
      let gw, gh;
      if (maxW / asp <= maxH) { gw = maxW; gh = maxW / asp; }
      else { gh = maxH; gw = gh * asp; }
      const gx = (w - gw) / 2;
      const gy = (h - gh) / 2 - h * 0.03;

      // Dim outside
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      _shapePath(ctx, gx, gy, gw, gh, opts.bentuk, opts.cornerStyle);
      ctx.fill();
      ctx.restore();

      // Draw frame decorations
      if (window.GanciFrames) {
        window.GanciFrames.drawFrame(ctx, {
          x: gx, y: gy, w: gw, h: gh,
          bentuk: opts.bentuk || 'persegi',
          cornerStyle: opts.cornerStyle || 'rounded',
          frame: opts.frame,
          showPlaceholder: false,
          hook: false,
          overlay: true,
        });
      } else {
        // Fallback: simple colored border
        ctx.save();
        ctx.beginPath();
        _shapePath(ctx, gx, gy, gw, gh, opts.bentuk, opts.cornerStyle);
        ctx.strokeStyle = 'rgba(216,75,126,0.85)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // Hook ring
      const hookR = gw * 0.06;
      ctx.save();
      ctx.beginPath();
      ctx.arc(gx + gw / 2, gy - hookR * 1.3, hookR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220,220,220,0.85)';
      ctx.lineWidth = Math.max(2, hookR * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    if (overlayAnimId) cancelAnimationFrame(overlayAnimId);
    loop();
  }

  function stopOverlay() {
    if (overlayAnimId) { cancelAnimationFrame(overlayAnimId); overlayAnimId = null; }
    const canvas = document.getElementById('lcFrameCanvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  // Minimal shape path helper (mirrors ganci-utils.js)
  function _shapePath(ctx, x, y, w, h, bentuk, cornerStyle) {
    ctx.beginPath();
    if (bentuk === 'lingkaran') {
      const r = Math.min(w, h) / 2;
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
    } else if (cornerStyle === 'siku') {
      ctx.rect(x, y, w, h);
    } else {
      const rr = Math.max(8, Math.min(w, h) * 0.1);
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    }
  }

  // ── Stream ────────────────────────────────────────────────────────────────────
  function stopStream() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    stopOverlay();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  }

  // ── Camera mode UI ────────────────────────────────────────────────────────────
  function showCameraMode() {
    capturedPhoto = null;
    selectedFilter = 'normal';
    document.getElementById('lcCameraWrap').style.display = '';
    const rv = document.getElementById('lcReviewWrap');
    rv.classList.remove('show');
    document.getElementById('lcCountdown').style.display = 'none';
  }

  function setLabel(text) {
    const el = document.getElementById('lcLabel');
    if (el) el.textContent = text;
  }

  function setNumber(n) {
    const el = document.getElementById('lcNumber');
    if (el) {
      el.textContent = String(n);
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 120);
    }
    setLabel(n > 0 ? `Foto dalam ${n} detik…` : 'Cheese! 📸');
  }

  // ── Review mode ───────────────────────────────────────────────────────────────
  function showReview() {
    document.getElementById('lcCameraWrap').style.display = 'none';
    const rv = document.getElementById('lcReviewWrap');
    rv.classList.add('show');
    selectedFilter = 'normal';
    document.querySelectorAll('.lc-filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.key === 'normal');
    });
    renderReview();
  }

  function selectFilter(key) {
    selectedFilter = key;
    document.querySelectorAll('.lc-filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.key === key);
    });
    renderReview();
  }

  function renderReview() {
    if (!capturedPhoto) return;
    const canvas = document.getElementById('lcReviewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const opts = captureOptions.frameOpts || {};

    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      // Crop to ganci aspect
      const asp = (opts.ganciW || 55) / (opts.ganciH || 55);
      let cropW, cropH;
      if (iw / ih > asp) { cropH = ih; cropW = Math.round(ih * asp); }
      else { cropW = iw; cropH = Math.round(iw / asp); }
      const cropX = Math.round((iw - cropW) / 2);
      const cropY = Math.round((ih - cropH) / 2);

      const outW = 600, outH = Math.round(600 / asp);
      canvas.width = outW; canvas.height = outH;
      ctx.clearRect(0, 0, outW, outH);

      // Draw photo (filtered)
      const tmpC = document.createElement('canvas');
      tmpC.width = cropW; tmpC.height = cropH;
      const tc = tmpC.getContext('2d');
      tc.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      if (selectedFilter !== 'normal') {
        const id = tc.getImageData(0, 0, cropW, cropH);
        applyTone(id.data, selectedFilter);
        tc.putImageData(id, 0, 0);
      }

      // Clip to shape, draw photo
      ctx.save();
      if (window.GanciFrames) {
        window.GanciFrames.shapePath(ctx, 0, 0, outW, outH, opts.bentuk || 'persegi', opts.cornerStyle || 'rounded');
      } else {
        ctx.beginPath(); ctx.rect(0, 0, outW, outH);
      }
      ctx.clip();
      ctx.drawImage(tmpC, 0, 0, outW, outH);
      ctx.restore();

      // Frame overlay
      if (opts.frame && window.GanciFrames) {
        window.GanciFrames.drawFrame(ctx, {
          x: 0, y: 0, w: outW, h: outH,
          bentuk: opts.bentuk || 'persegi',
          cornerStyle: opts.cornerStyle || 'rounded',
          frame: opts.frame,
          showPlaceholder: false,
          hook: false,
        });
      }

      // Badge
      const badge = document.getElementById('lcReviewBadge');
      if (badge) {
        const fLabel = FILTERS.find(f => f.key === selectedFilter)?.label || selectedFilter;
        const frameLabel = (window.GanciFrames?.labels?.[opts.frame]) || opts.frame || 'Polos';
        badge.textContent = `Frame: ${frameLabel} · Filter: ${fLabel}`;
      }
    };
    img.src = capturedPhoto;
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  async function open(options) {
    ensureModal();
    captureOptions = options || {};
    const modal = document.getElementById('localCameraModal');
    const video = document.getElementById('lcVideo');

    showCameraMode();
    modal.classList.add('show');

    try {
      stopStream();
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: captureOptions.facingMode || 'user',
          width: { ideal: 1920 },
          height: { ideal: 2560 }
        },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      video.onloadedmetadata = () => {
        startOverlay();
        startCountdown(captureOptions.seconds || 3);
      };
    } catch (e) {
      console.error('LocalCamera error:', e);
      alert('Kamera tidak bisa diakses. Cek permission browser ya.');
      close();
    }
  }

  function startCountdown(seconds) {
    if (countdownTimer) clearInterval(countdownTimer);
    const cdEl = document.getElementById('lcCountdown');
    if (cdEl) cdEl.style.display = 'grid';
    let left = Number(seconds) || 3;
    setNumber(left);
    countdownTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(countdownTimer); countdownTimer = null;
        captureNow();
      } else {
        setNumber(left);
      }
    }, 1000);
  }

  function restart() {
    startCountdown(captureOptions.seconds || 3);
    setLabel('Siap lagi...');
  }

  function captureNow() {
    const video = document.getElementById('lcVideo');
    if (!video || !video.videoWidth) return;
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }

    // Flash
    const flash = document.getElementById('lcFlash');
    if (flash) { flash.classList.add('show'); setTimeout(() => flash.classList.remove('show'), 180); }

    const cdEl = document.getElementById('lcCountdown');
    if (cdEl) cdEl.style.display = 'none';

    const cv = document.createElement('canvas');
    cv.width = video.videoWidth; cv.height = video.videoHeight;
    const ctx = cv.getContext('2d');
    ctx.save(); ctx.translate(cv.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cv.width, cv.height);
    ctx.restore();

    capturedPhoto = cv.toDataURL("image/jpeg", captureOptions.quality || 0.96);

    // Stop camera stream & overlay now (we have the photo)
    stopStream();
    const vid = document.getElementById('lcVideo');
    if (vid) vid.srcObject = null;

    // Ganci mode (frameOpts di-pass) => tampilkan review + filter
    // Mode lain (certificate, idcard, dll) => langsung panggil onCapture seperti v1
    if (captureOptions.frameOpts) {
      showReview();
    } else {
      const callback = captureOptions.onCapture;
      const photo = capturedPhoto;
      close();
      if (typeof callback === 'function') callback(photo);
    }
  }

  function retake() {
    // Discard photo, go back to live camera
    capturedPhoto = null;
    selectedFilter = 'normal';
    const video = document.getElementById('lcVideo');
    showCameraMode();
    startCamera();
  }

  async function startCamera() {
    const video = document.getElementById('lcVideo');
    if (!video) return;
    try {
      stopStream();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: captureOptions.facingMode || 'user', width: { ideal: 1920 }, height: { ideal: 2560 } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      video.onloadedmetadata = () => {
        startOverlay();
        startCountdown(captureOptions.seconds || 3);
      };
    } catch (e) {
      alert('Kamera tidak bisa diakses.');
      close();
    }
  }

  function confirm() {
    if (!capturedPhoto) return;
    const callback = captureOptions.onCapture;
    const filteredDataUrl = buildFiltered(capturedPhoto, selectedFilter);
    close();
    if (typeof callback === 'function') {
      callback(filteredDataUrl, {
        rawPhoto: capturedPhoto,
        filter: { tone: selectedFilter },
      });
    }
  }

  function close() {
    stopStream();
    capturedPhoto = null;
    selectedFilter = 'normal';
    const modal = document.getElementById('localCameraModal');
    if (modal) modal.classList.remove('show');
    const video = document.getElementById('lcVideo');
    if (video) video.srcObject = null;
    showCameraMode();
  }

  window.LocalCamera = { open, close, restart, captureNow, retake, confirm };
})();
