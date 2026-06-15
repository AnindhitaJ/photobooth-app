(function () {
  let stream = null;
  let countdownTimer = null;
  let captureOptions = {};

  function ensureModal() {
    if (document.getElementById('localCameraModal')) return;

    const style = document.createElement('style');
    style.textContent = `
      .local-camera-modal {
        position: fixed; inset: 0; z-index: 99999; display: none;
        align-items: center; justify-content: center; padding: 18px;
        background: rgba(15,23,42,.72); backdrop-filter: blur(8px);
      }
      .local-camera-modal.show { display: flex; }
      .local-camera-box {
        width: min(92vw, 520px); border-radius: 24px; overflow: hidden;
        background: #111827; box-shadow: 0 28px 90px rgba(0,0,0,.42);
        position: relative; border: 3px solid rgba(255,255,255,.18);
      }
      .local-camera-video-wrap {
        position: relative; aspect-ratio: 3/4; background: #020617;
        display: flex; align-items: center; justify-content: center;
      }
      .local-camera-video {
        width: 100%; height: 100%; object-fit: cover; display: block;
        transform: scaleX(-1);
      }
      .local-camera-topbar {
        position:absolute; left:0; right:0; top:0; z-index:3;
        display:flex; justify-content:space-between; align-items:center;
        padding: 12px 14px;
        background: linear-gradient(180deg, rgba(0,0,0,.58), transparent);
        color:#fff; font: 900 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .local-camera-close {
        border: 0; background: rgba(255,255,255,.18); color:#fff;
        width: 34px; height: 34px; border-radius: 999px; cursor: pointer;
        font-size: 18px; font-weight: 900;
      }
      .local-camera-countdown {
        position:absolute; inset:0; z-index:2; display:grid; place-items:center;
        pointer-events:none;
      }
      .local-camera-number {
        min-width: 112px; height: 112px; border-radius: 999px;
        display:grid; place-items:center; background: rgba(255,255,255,.88);
        color:#D84B7E; font: 1000 64px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 18px 60px rgba(0,0,0,.28);
      }
      .local-camera-bottom {
        display:flex; gap:10px; align-items:center; justify-content:center;
        padding: 12px; background:#fff;
      }
      .local-camera-retake, .local-camera-now {
        border:0; border-radius:999px; padding:11px 16px; cursor:pointer;
        font: 900 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .local-camera-retake { background:#f1f5f9; color:#1f2937; }
      .local-camera-now { background:linear-gradient(135deg,#D84B7E,#E5B842); color:white; }
      @media (max-width: 520px) {
        .local-camera-box { width: 94vw; }
        .local-camera-number { min-width: 94px; height:94px; font-size:54px; }
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'localCameraModal';
    modal.className = 'local-camera-modal';
    modal.innerHTML = `
      <div class="local-camera-box">
        <div class="local-camera-video-wrap">
          <video id="localCameraVideo" class="local-camera-video" autoplay playsinline muted></video>
          <div class="local-camera-topbar">
            <span id="localCameraLabel">Kamera siap...</span>
            <button type="button" class="local-camera-close" onclick="LocalCamera.close()">×</button>
          </div>
          <div class="local-camera-countdown">
            <div class="local-camera-number" id="localCameraNumber">5</div>
          </div>
        </div>
        <div class="local-camera-bottom">
          <button type="button" class="local-camera-retake" onclick="LocalCamera.restart()">↺ Ulang timer</button>
          <button type="button" class="local-camera-now" onclick="LocalCamera.captureNow()">📸 Ambil sekarang</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function stopStream() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function setNumber(n) {
    const el = document.getElementById('localCameraNumber');
    const label = document.getElementById('localCameraLabel');
    if (el) el.textContent = String(n);
    if (label) label.textContent = `Foto otomatis dalam ${n} detik`;
  }

  async function open(options = {}) {
    ensureModal();
    captureOptions = options || {};
    const modal = document.getElementById('localCameraModal');
    const video = document.getElementById('localCameraVideo');
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
      startCountdown(captureOptions.seconds || 5);
    } catch (e) {
      console.error('Local camera error:', e);
      alert('Kamera tidak bisa diakses. Coba cek permission browser atau pakai upload foto dulu ya.');
      close();
    }
  }

  function startCountdown(seconds = 5) {
    if (countdownTimer) clearInterval(countdownTimer);
    let left = Number(seconds) || 5;
    setNumber(left);
    countdownTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        captureNow();
      } else {
        setNumber(left);
      }
    }, 1000);
  }

  function restart() {
    startCountdown(captureOptions.seconds || 5);
  }

  function captureNow() {
    const video = document.getElementById('localCameraVideo');
    if (!video || !video.videoWidth) return;

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Mirror output to match front-camera preview.
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', captureOptions.quality || 0.98);
    const callback = captureOptions.onCapture;
    close();
    if (typeof callback === 'function') callback(dataUrl);
  }

  function close() {
    stopStream();
    const modal = document.getElementById('localCameraModal');
    if (modal) modal.classList.remove('show');
    const video = document.getElementById('localCameraVideo');
    if (video) video.srcObject = null;
  }

  window.LocalCamera = { open, close, restart, captureNow };
})();