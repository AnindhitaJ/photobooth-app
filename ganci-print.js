(function () {
  const FALLBACK_BASE = { r: 216, g: 75, b: 126 };
  const LOCAL_GALLERY_KEY = 'ganciLocalGallery';

  function mmToPx(mm, dpi) {
    return Math.max(1, Math.round((mm || 0) * (dpi || 300) / 25.4));
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!String(src || '').startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = src;
    });
  }

  function rgbToCss(rgb) {
    return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
  }

  function mixRgb(a, b, t) {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    };
  }

  function getLuminance(rgb) {
    const conv = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * conv(rgb.r) + 0.7152 * conv(rgb.g) + 0.0722 * conv(rgb.b);
  }

  function rgbToHsl(rgb) {
    let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, l };
  }

  function dominantColorFromImage(img) {
    try {
      const canvas = document.createElement('canvas');
      const max = 48;
      const ratio = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height) / max || 1;
      canvas.width = Math.max(12, Math.round((img.naturalWidth || img.width) / ratio));
      canvas.height = Math.max(12, Math.round((img.naturalHeight || img.height) / ratio));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        const alpha = data[i + 3] / 255;
        if (alpha < 0.2) continue;
        r += data[i] * alpha;
        g += data[i + 1] * alpha;
        b += data[i + 2] * alpha;
        count += alpha;
      }
      if (!count) return null;
      const avg = { r: r / count, g: g / count, b: b / count };
      const hsl = rgbToHsl(avg);
      if (hsl.s < 0.06 && hsl.l > 0.92) return null;
      return avg;
    } catch (e) {
      return null;
    }
  }

  function buildLogoTheme(logoImg) {
    const base = dominantColorFromImage(logoImg) || FALLBACK_BASE;
    const lum = getLuminance(base);
    const hsl = rgbToHsl(base);
    let bgMain, bgAlt, accent;

    if (lum > 0.7 || hsl.s < 0.12) {
      accent = mixRgb(base, { r: 39, g: 57, b: 81 }, 0.48);
      bgMain = mixRgb(accent, { r: 255, g: 255, b: 255 }, 0.16);
      bgAlt = mixRgb(accent, { r: 255, g: 255, b: 255 }, 0.32);
    } else {
      accent = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.18);
      bgMain = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.76);
      bgAlt = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.52);
    }

    const ring = lum > 0.72 ? mixRgb(base, { r: 39, g: 57, b: 81 }, 0.35) : mixRgb(base, { r: 255, g: 255, b: 255 }, 0.4);
    return { base, bgMain, bgAlt, accent, ring };
  }

  function createLogoPanelCanvas(logoImg, width, height, bentuk, theme, cornerStyle) {
    const cvs = document.createElement('canvas');
    cvs.width = Math.max(10, Math.round(width));
    cvs.height = Math.max(10, Math.round(height));
    const ctx = cvs.getContext('2d');
    const pad = Math.max(16, Math.min(cvs.width, cvs.height) * 0.08);

    window.GanciFrames.shapePath(ctx, 0, 0, cvs.width, cvs.height, bentuk, Math.min(cvs.width, cvs.height) * 0.16, cornerStyle);
    ctx.save();
    ctx.clip();
    const grad = ctx.createLinearGradient(0, 0, cvs.width, cvs.height);
    grad.addColorStop(0, rgbToCss(theme.bgMain));
    grad.addColorStop(1, rgbToCss(theme.bgAlt));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.globalAlpha = 1;

    const boxW = cvs.width - pad * 2;
    const boxH = cvs.height - pad * 2;
    const logoMaxW = boxW * 0.66;
    const logoMaxH = boxH * 0.66;
    const scale = Math.min(logoMaxW / (logoImg.naturalWidth || logoImg.width), logoMaxH / (logoImg.naturalHeight || logoImg.height));
    const drawW = (logoImg.naturalWidth || logoImg.width) * scale;
    const drawH = (logoImg.naturalHeight || logoImg.height) * scale;
    const dx = cvs.width / 2 - drawW / 2;
    const dy = cvs.height / 2 - drawH / 2;

    ctx.shadowColor = 'rgba(255,255,255,0.45)';
    ctx.shadowBlur = Math.max(8, Math.min(cvs.width, cvs.height) * 0.04);
    ctx.drawImage(logoImg, dx, dy, drawW, drawH);
    ctx.restore();
    return cvs;
  }

  function getPaperSizeMM(config) {
    const paper = config.ukuranKertas || 'A4';
    const sizes = {
      A4: { w: 210, h: 297 },
      '3R': { w: 89, h: 127 },
      '4R': { w: 102, h: 152 },
      '5R': { w: 127, h: 178 },
      '6R': { w: 152, h: 203 },
      '8R': { w: 203, h: 254 },
    };
    if (paper === 'Custom') return { w: Number(config.customW) || 150, h: Number(config.customH) || 200, label: `Custom ${config.customW}×${config.customH} mm` };
    const found = sizes[paper] || sizes.A4;
    return { ...found, label: paper };
  }

  async function resolveLogoImage(logoUrl) {
    const tries = [logoUrl, '/logo.png'].filter(Boolean);
    for (const src of tries) {
      try { return await loadImage(src); } catch (e) {}
    }
    throw new Error('Logo tidak bisa dimuat');
  }

  async function generateSheets(ganciState, options) {
    if (!ganciState || !ganciState.photo) throw new Error('Foto ganci belum ada');
    const dpi = options?.dpi || 300;
    const paper = getPaperSizeMM(ganciState.config || {});
    const qty = Math.max(1, parseInt(ganciState.config?.jumlah || ganciState.config?.quantity || 1, 10) || 1);
    const panelWmm = Math.max(20, Number(ganciState.config?.ganciW || 55));
    const panelHmm = Math.max(20, Number(ganciState.config?.ganciH || 55));
    // Layout mentok: isi kertas dibuat semaksimal mungkin dan mulai dari atas-kiri.
    // Jadi tidak ada lagi whitespace besar di atas karena vertical-center.
    const betweenPairMM = 3;
    const gapMM = 3;
    const marginMM = 2;
    const pairWmm = panelWmm * 2 + betweenPairMM;

    const cols = Math.max(1, Math.floor((paper.w - marginMM * 2 + gapMM) / (pairWmm + gapMM)));
    const rows = Math.max(1, Math.floor((paper.h - marginMM * 2 + gapMM) / (panelHmm + gapMM)));
    const capacity = Math.max(1, cols * rows);
    const pageCount = Math.ceil(qty / capacity);

    const photoImg = await loadImage(ganciState.photo);
    const logoImg = await resolveLogoImage(options?.logoUrl || '/logo.png');
    const theme = buildLogoTheme(logoImg);

    const pageWpx = mmToPx(paper.w, dpi);
    const pageHpx = mmToPx(paper.h, dpi);
    const marginPx = mmToPx(marginMM, dpi);
    const gapPx = mmToPx(gapMM, dpi);
    const betweenPairPx = mmToPx(betweenPairMM, dpi);

    // Ukuran input ganci adalah ukuran TOTAL final termasuk frame.
    // Jangan scale-up agar "mentok" kertas, karena 30×30 mm harus tetap 30×30 mm saat print.
    const panelWpx = mmToPx(panelWmm, dpi);
    const panelHpx = mmToPx(panelHmm, dpi);
    const scaledBetweenPairPx = betweenPairPx;
    const scaledGapPx = gapPx;
    const pairWpx = panelWpx * 2 + scaledBetweenPairPx;

    const usedW = cols * pairWpx + Math.max(0, cols - 1) * scaledGapPx;
    const usedH = rows * panelHpx + Math.max(0, rows - 1) * scaledGapPx;

    // Tetap mulai dari atas-kiri dengan margin tipis, tapi ukuran item tidak berubah.
    const startX = marginPx;
    const startY = marginPx;

    const cornerStyle = ganciState.cornerStyle || ganciState.config?.cornerStyle || 'rounded';
    const logoPanelCvs = createLogoPanelCanvas(logoImg, panelWpx, panelHpx, ganciState.bentuk || 'persegi', theme, cornerStyle);

    const pages = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const canvas = document.createElement('canvas');
      canvas.width = pageWpx;
      canvas.height = pageHpx;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let drawn = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const globalIdx = pageIndex * capacity + drawn;
          if (globalIdx >= qty) break;
          const x = startX + col * (pairWpx + scaledGapPx);
          const y = startY + row * (panelHpx + scaledGapPx);
          window.GanciFrames.drawFrame(ctx, {
            x, y, w: panelWpx, h: panelHpx,
            bentuk: ganciState.bentuk || 'persegi',
            cornerStyle,
            frame: ganciState.frame || 'polos',
            photo: photoImg,
            hook: false
          });
          window.GanciFrames.drawFrame(ctx, {
            x: x + panelWpx + scaledBetweenPairPx, y, w: panelWpx, h: panelHpx,
            bentuk: ganciState.bentuk || 'persegi',
            cornerStyle,
            frame: ganciState.frame || 'polos',
            photo: logoPanelCvs,
            hook: false
          });
          drawn++;
        }
      }

      pages.push({
        index: pageIndex,
        dataUrl: Auth.exportCanvasDataURL(canvas, 'image/jpeg', 0.98),
        title: `ganci-print-${Date.now()}-${pageIndex + 1}.jpg`
      });
    }

    return {
      pages,
      capacity,
      pageCount,
      paper,
      quantity: qty,
      cols,
      rows,
      panelWmm,
      panelHmm,
      dpi
    };
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function dataUrlToFile(dataUrl, filename) {
    const blob = dataUrlToBlob(dataUrl);
    return new File([blob], filename || `ganci-${Date.now()}.jpg`, { type: blob.type });
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || `ganci-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function saveLocalGallery(entry) {
    const prev = JSON.parse(localStorage.getItem(LOCAL_GALLERY_KEY) || '[]');
    prev.unshift(entry);
    localStorage.setItem(LOCAL_GALLERY_KEY, JSON.stringify(prev.slice(0, 12)));
    return prev.length + 1;
  }

  window.GanciPrint = {
    mmToPx,
    generateSheets,
    dataUrlToFile,
    downloadDataUrl,
    saveLocalGallery,
    getPaperSizeMM,
    LOCAL_GALLERY_KEY
  };
})();
