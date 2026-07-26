(function () {
  'use strict';

  let stream = null;
  let countdownTimer = null;
  let captureOptions = {};
  let openingSequence = 0;
  let suspendedByBackground = false;
  let isCapturing = false;

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
        font:900 13px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .local-camera-retake { background:#f1f5f9; color:#1f2937; }
      .local-camera-now { background:linear-gradient(135deg,#D84B7E,#E5B842); color:white; }
      .local-camera-retake:disabled, .local-camera-now:disabled, .local-camera-close:disabled {
        opacity:.55; cursor:not-allowed;
      }
      @media (max-width: 520px) {
        .local-camera-box { width: 94vw; }
        .local-camera-number { min-width:94px; height:94px; font-size:54px; }
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

  function setControlsDisabled(disabled) {
    document.querySelectorAll('.local-camera-retake, .local-camera-now, .local-camera-close').forEach(button => {
      button.disabled = Boolean(disabled);
    });
  }

  function setLabel(message) {
    const label = document.getElementById('localCameraLabel');
    if (label) label.textContent = message;
  }

  function stopStream() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  function setNumber(value) {
    const number = document.getElementById('localCameraNumber');
    if (number) number.textContent = String(value);
    setLabel(`Foto otomatis dalam ${value} detik`);
  }

  function isStreamReady() {
    const video = document.getElementById('localCameraVideo');
    const track = stream?.getVideoTracks?.().find(item => item.readyState === 'live');
    return Boolean(track && video?.srcObject === stream && !video.paused && video.videoWidth > 0 && video.videoHeight > 0);
  }

  function getOutputSize(width, height) {
    const maxWidth = Math.max(1, Number(captureOptions.maxWidth) || width);
    const maxHeight = Math.max(1, Number(captureOptions.maxHeight) || height);
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Browser gagal membuat file foto.'));
      }, type, quality);
    });
  }

  async function open(options = {}) {
    ensureModal();
    captureOptions = options || captureOptions || {};
    const modal = document.getElementById('localCameraModal');
    const video = document.getElementById('localCameraVideo');
    const sequence = ++openingSequence;
    isCapturing = false;
    setControlsDisabled(false);
    modal.classList.add('show');

    try {
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia tidak didukung.');

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: captureOptions.facingMode || 'user',
          width: { ideal: Number(captureOptions.cameraWidth) || 1920 },
          height: { ideal: Number(captureOptions.cameraHeight) || 2560 }
        },
        audio: false
      });

      if (sequence !== openingSequence) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          suspendedByBackground = true;
          setLabel('Kamera berhenti. Tekan Ulang timer untuk mengaktifkan lagi.');
        };
      }

      video.srcObject = stream;
      await video.play();
      if (!video.videoWidth) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Preview kamera timeout.')), 7000);
          video.addEventListener('loadedmetadata', () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
      }

      suspendedByBackground = false;
      startCountdown(captureOptions.seconds || 5);
      return true;
    } catch (error) {
      console.error('Local camera error:', error);
      stopStream();
      setLabel('Kamera belum aktif. Tekan Ulang timer untuk mencoba lagi.');
      return false;
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
        void captureNow();
      } else {
        setNumber(left);
      }
    }, 1000);
  }

  async function restart() {
    if (isCapturing) return;
    if (!isStreamReady()) {
      await open(captureOptions);
      return;
    }
    startCountdown(captureOptions.seconds || 5);
  }

  async function captureNow() {
    if (isCapturing) return false;

    const video = document.getElementById('localCameraVideo');
    if (!video || !isStreamReady()) {
      setLabel('Kamera belum aktif. Tekan Ulang timer untuk mencoba lagi.');
      return false;
    }

    isCapturing = true;
    setControlsDisabled(true);
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    try {
      setLabel('Memproses dan menyimpan foto...');
      const output = getOutputSize(video.videoWidth, video.videoHeight);
      const canvas = document.createElement('canvas');
      canvas.width = output.width;
      canvas.height = output.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas kamera tidak tersedia.');

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.save();
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.restore();

      const type = captureOptions.type || 'image/jpeg';
      const quality = Math.min(1, Math.max(0.5, Number(captureOptions.quality) || 0.92));
      const outputMode = captureOptions.output === 'blob' ? 'blob' : 'dataUrl';
      const payload = outputMode === 'blob'
        ? await canvasToBlob(canvas, type, quality)
        : canvas.toDataURL(type, quality);

      const callback = captureOptions.onCapture;
      if (typeof callback === 'function') {
        await Promise.resolve(callback(payload, {
          width: canvas.width,
          height: canvas.height,
          type,
          quality,
          output: outputMode
        }));
      }

      close();
      return true;
    } catch (error) {
      console.error('Local camera capture error:', error);
      setLabel(`Foto gagal disimpan: ${error?.message || error}. Tekan Ulang timer untuk mencoba lagi.`);
      setControlsDisabled(false);
      return false;
    } finally {
      isCapturing = false;
    }
  }

  function close() {
    openingSequence += 1;
    suspendedByBackground = false;
    stopStream();
    setControlsDisabled(false);
    const modal = document.getElementById('localCameraModal');
    if (modal) modal.classList.remove('show');
    const video = document.getElementById('localCameraVideo');
    if (video) video.srcObject = null;
  }

  document.addEventListener('visibilitychange', () => {
    const modal = document.getElementById('localCameraModal');
    if (!modal?.classList.contains('show')) return;
    if (document.visibilityState === 'hidden') {
      suspendedByBackground = true;
      stopStream();
    } else if (suspendedByBackground) {
      setLabel('Kamera dijeda. Tekan Ulang timer untuk mengaktifkan lagi.');
    }
  });

  window.LocalCamera = { open, close, restart, captureNow };
})();
