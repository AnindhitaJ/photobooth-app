(function () {
  const FRAME_STYLES = {
    polos:   { stroke: '#ffffff', fill: '#ffffff', accent: '#e5e7eb', shadow: 'rgba(255,255,255,0.45)' },
    cute:    { stroke: '#f9a8d4', fill: '#fff0f9', accent: '#f472b6', shadow: 'rgba(249,168,212,0.55)' },
    vintage: { stroke: '#a78c6e', fill: '#fdf6ec', accent: '#c4a36c', shadow: 'rgba(196,163,108,0.45)' },
    doodle:  { stroke: '#7dd3fc', fill: '#f0faff', accent: '#38bdf8', shadow: 'rgba(125,211,252,0.50)' }
  };

  const FRAME_LABELS = {
    polos: 'Polos',
    cute: 'Cute',
    vintage: 'Vintage',
    doodle: 'Doodle'
  };

  function getStyle(frame) {
    return FRAME_STYLES[frame] || FRAME_STYLES.polos;
  }

  function shapePath(ctx, x, y, w, h, bentuk, radius) {
    ctx.beginPath();
    if (bentuk === 'lingkaran') {
      const r = Math.min(w, h) / 2;
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
      return;
    }
    const rr = Math.max(8, Math.min(radius || 26, Math.min(w, h) * 0.16));
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function drawHook(ctx, cx, topY, size, alpha) {
    const r = Math.max(8, size * 0.075);
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = Math.max(3, r * 0.38);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, topY - r * 1.35, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, topY - r * 0.35);
    ctx.lineTo(cx, topY + r * 0.25);
    ctx.stroke();
    ctx.restore();
  }

  function drawCute(ctx, x, y, w, h, bentuk, fs, scale) {
    ctx.save();
    ctx.font = `${Math.max(16, Math.min(w, h) * 0.12)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const items = ['🌸', '💕', '⭐', '🌷', '♡', '✦'];
    const pad = Math.max(16, Math.min(w, h) * 0.11);
    const points = bentuk === 'lingkaran'
      ? [
          [x + w * 0.50, y + pad], [x + w - pad, y + h * 0.30],
          [x + w - pad, y + h * 0.70], [x + w * 0.50, y + h - pad],
          [x + pad, y + h * 0.70], [x + pad, y + h * 0.30]
        ]
      : [
          [x + pad, y + pad], [x + w - pad, y + pad],
          [x + w - pad, y + h - pad], [x + pad, y + h - pad],
          [x + w * 0.50, y + pad * 0.75], [x + w * 0.50, y + h - pad * 0.75]
        ];
    points.forEach((p, i) => ctx.fillText(items[i % items.length], p[0], p[1]));
    ctx.restore();
  }

  function drawVintage(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    ctx.strokeStyle = fs.accent;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
    ctx.globalAlpha = 0.92;
    const s = Math.min(w, h) * 0.14;
    const corners = [[x + s, y + s, 0], [x + w - s, y + s, 1], [x + w - s, y + h - s, 2], [x + s, y + h - s, 3]];
    corners.forEach(([cx, cy, rot]) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, 0, s, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, -s * 0.55);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.95, s * 0.62, -s * 0.45);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawDoodle(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    ctx.strokeStyle = fs.accent;
    ctx.fillStyle = fs.accent;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.011);
    ctx.globalAlpha = 0.9;
    const m = Math.min(w, h);
    const doodles = [
      [x + w * 0.20, y + h * 0.18, 'star'],
      [x + w * 0.80, y + h * 0.20, 'spark'],
      [x + w * 0.78, y + h * 0.78, 'swirl'],
      [x + w * 0.20, y + h * 0.78, 'dot']
    ];
    doodles.forEach(([cx, cy, type]) => {
      if (type === 'star') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - m * 0.045); ctx.lineTo(cx + m * 0.015, cy - m * 0.012);
        ctx.lineTo(cx + m * 0.05, cy); ctx.lineTo(cx + m * 0.015, cy + m * 0.012);
        ctx.lineTo(cx, cy + m * 0.045); ctx.lineTo(cx - m * 0.015, cy + m * 0.012);
        ctx.lineTo(cx - m * 0.05, cy); ctx.lineTo(cx - m * 0.015, cy - m * 0.012);
        ctx.closePath(); ctx.stroke();
      } else if (type === 'spark') {
        ctx.beginPath(); ctx.moveTo(cx - m * 0.045, cy); ctx.lineTo(cx + m * 0.045, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - m * 0.045); ctx.lineTo(cx, cy + m * 0.045); ctx.stroke();
      } else if (type === 'swirl') {
        ctx.beginPath(); ctx.arc(cx, cy, m * 0.035, 0, Math.PI * 1.6); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, m * 0.026, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  }

  function drawFrame(ctx, options) {
    const o = options || {};
    const x = o.x || 0;
    const y = o.y || 0;
    const w = o.w || 100;
    const h = o.h || 100;
    const bentuk = o.bentuk || 'persegi';
    const frame = o.frame || 'polos';
    const fs = getStyle(frame);
    const line = Math.max(o.lineWidth || 0, Math.min(w, h) * (o.overlay ? 0.038 : 0.045));
    const inset = Math.max(8, line * 1.25);

    ctx.save();

    if (o.showPlaceholder || o.photo) {
      shapePath(ctx, x, y, w, h, bentuk);
      ctx.fillStyle = fs.fill;
      ctx.fill();
      ctx.save();
      shapePath(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, bentuk);
      ctx.clip();
      if (o.photo) {
        const img = o.photo;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const scale = Math.max((w - inset * 2) / iw, (h - inset * 2) / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, x + w / 2 - dw / 2, y + h / 2 - dh / 2, dw, dh);
      } else {
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, '#e9d5ff');
        grad.addColorStop(0.5, '#fbcfe8');
        grad.addColorStop(1, '#fde68a');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = `${Math.min(w, h) * 0.25}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📷', x + w / 2, y + h / 2);
      }
      ctx.restore();
    }

    ctx.shadowColor = fs.shadow;
    ctx.shadowBlur = o.overlay ? 20 : 0;
    shapePath(ctx, x, y, w, h, bentuk);
    ctx.strokeStyle = frame === 'polos' ? 'rgba(255,255,255,0.96)' : fs.stroke;
    ctx.lineWidth = line;
    if (frame === 'doodle') ctx.setLineDash([line * 1.15, line * 0.9]);
    ctx.stroke();
    ctx.setLineDash([]);

    shapePath(ctx, x + line * 1.45, y + line * 1.45, w - line * 2.9, h - line * 2.9, bentuk);
    ctx.strokeStyle = frame === 'polos' ? 'rgba(229,231,235,0.95)' : fs.accent;
    ctx.lineWidth = Math.max(2, line * 0.35);
    ctx.stroke();

    if (frame === 'cute') drawCute(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'vintage') drawVintage(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'doodle') drawDoodle(ctx, x, y, w, h, bentuk, fs);

    if (o.hook !== false) drawHook(ctx, x + w / 2, y, Math.min(w, h), o.overlay ? 0.86 : 1);
    ctx.restore();
  }

  window.GanciFrames = {
    styles: FRAME_STYLES,
    labels: FRAME_LABELS,
    drawFrame,
    drawHook,
    shapePath
  };
})();
