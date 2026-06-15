(function () {
  const FRAME_STYLES = {
    polos:   { stroke: '#ffffff', fill: '#ffffff', accent: '#e5e7eb', shadow: 'rgba(255,255,255,0.45)', emoji: '📷' },
    cute:    { stroke: '#f9a8d4', fill: '#fff0f9', accent: '#f472b6', shadow: 'rgba(249,168,212,0.55)', emoji: '🌸' },
    vintage: { stroke: '#a78c6e', fill: '#fdf6ec', accent: '#c4a36c', shadow: 'rgba(196,163,108,0.45)', emoji: '🌿' },
    doodle:  { stroke: '#7dd3fc', fill: '#f0faff', accent: '#38bdf8', shadow: 'rgba(125,211,252,0.50)', emoji: '✏️' },
    floral:  { stroke: '#f7b2c9', fill: '#fff6fa', accent: '#ec4899', shadow: 'rgba(247,178,201,0.45)', emoji: '🌼' },
    ribbon:  { stroke: '#c4b5fd', fill: '#f7f5ff', accent: '#8b5cf6', shadow: 'rgba(196,181,253,0.45)', emoji: '🎀' },
    sparkle: { stroke: '#fcd34d', fill: '#fffdf5', accent: '#f59e0b', shadow: 'rgba(252,211,77,0.45)', emoji: '✨' },
    neon:    { stroke: '#22d3ee', fill: '#06111f', accent: '#a78bfa', shadow: 'rgba(34,211,238,0.60)', emoji: '💿' },
    minimal: { stroke: '#111827', fill: '#f9fafb', accent: '#9ca3af', shadow: 'rgba(17,24,39,0.22)', emoji: '◽' },
    ocean:   { stroke: '#38bdf8', fill: '#ecfeff', accent: '#0ea5e9', shadow: 'rgba(56,189,248,0.45)', emoji: '🌊' },
    purple:  { stroke: '#c084fc', fill: '#faf5ff', accent: '#8b5cf6', shadow: 'rgba(192,132,252,0.48)', emoji: '💜' },
    korean:  { stroke: '#fb7185', fill: '#fff1f2', accent: '#f43f5e', shadow: 'rgba(251,113,133,0.44)', emoji: '🫰' },
    batik:   { stroke: '#b45309', fill: '#fff7ed', accent: '#92400e', shadow: 'rgba(180,83,9,0.35)', emoji: '🟤' },
    pearl:   { stroke: '#d6b56d', fill: '#fffaf0', accent: '#f8e7bd', shadow: 'rgba(214,181,109,0.42)', emoji: '🤍' },
    comic:   { stroke: '#ef4444', fill: '#fff7ed', accent: '#2563eb', shadow: 'rgba(239,68,68,0.40)', emoji: '💥' }
  };

  const FRAME_LABELS = {
    polos: 'Polos',
    cute: 'Cute',
    vintage: 'Vintage',
    doodle: 'Doodle',
    floral: 'Floral',
    ribbon: 'Ribbon',
    sparkle: 'Sparkle',
    neon: 'Neon',
    minimal: 'Minimal',
    ocean: 'Ocean',
    purple: 'Purple Dream',
    korean: 'Korean Sticker',
    batik: 'Batik Modern',
    pearl: 'Luxury Pearl',
    comic: 'Comic Pop'
  };

  function getStyle(frame) {
    return FRAME_STYLES[frame] || FRAME_STYLES.polos;
  }

  function shapePath(ctx, x, y, w, h, bentuk, radius, cornerStyle) {
    ctx.beginPath();
    if (bentuk === 'lingkaran') {
      const r = Math.min(w, h) / 2;
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
      return;
    }

    if (cornerStyle === 'siku') {
      ctx.rect(x, y, w, h);
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

  function drawEmoji(ctx, text, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.font = `${Math.max(14, size)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundedBorderPoints(x, y, w, h, bentuk, pad) {
    if (bentuk === 'lingkaran') {
      return [
        [x + w * 0.50, y + pad], [x + w - pad, y + h * 0.30],
        [x + w - pad, y + h * 0.70], [x + w * 0.50, y + h - pad],
        [x + pad, y + h * 0.70], [x + pad, y + h * 0.30]
      ];
    }
    return [
      [x + pad, y + pad], [x + w - pad, y + pad],
      [x + w - pad, y + h - pad], [x + pad, y + h - pad],
      [x + w * 0.50, y + pad * 0.78], [x + w * 0.50, y + h - pad * 0.78]
    ];
  }

  function drawCute(ctx, x, y, w, h, bentuk, fs) {
    const m = Math.min(w, h);
    const items = ['🌸', '💕', '⭐', '🌷', '♡', '✦'];
    roundedBorderPoints(x, y, w, h, bentuk, Math.max(16, m * 0.11))
      .forEach((p, i) => drawEmoji(ctx, items[i % items.length], p[0], p[1], m * 0.12));
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
        ctx.beginPath();
        ctx.moveTo(cx - m * 0.03, cy + m * 0.02);
        ctx.quadraticCurveTo(cx, cy - m * 0.02, cx + m * 0.03, cy + m * 0.02);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawFloral(ctx, x, y, w, h, bentuk, fs) {
    const m = Math.min(w, h);
    const items = ['🌼', '🌷', '🌸', '🌿', '🌺', '🌱'];
    roundedBorderPoints(x, y, w, h, bentuk, Math.max(18, m * 0.13))
      .forEach((p, i) => drawEmoji(ctx, items[i], p[0], p[1], m * 0.12));
  }

  function drawRibbon(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    ctx.fillStyle = fs.accent;
    ctx.strokeStyle = fs.accent;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
    const m = Math.min(w, h);
    const bowSize = m * 0.13;
    const bowX = x + w * 0.5;
    const bowY = y + h * 0.12;
    ctx.beginPath();
    ctx.ellipse(bowX - bowSize * 0.45, bowY, bowSize * 0.48, bowSize * 0.30, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bowX + bowSize * 0.45, bowY, bowSize * 0.48, bowSize * 0.30, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bowX, bowY, bowSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.16, y + h * 0.20); ctx.lineTo(x + w * 0.84, y + h * 0.20);
    ctx.moveTo(x + w * 0.16, y + h * 0.80); ctx.lineTo(x + w * 0.84, y + h * 0.80);
    ctx.stroke();
    ctx.restore();
  }

  function drawSparkle(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    ctx.strokeStyle = fs.accent;
    ctx.fillStyle = fs.accent;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.01);
    ctx.globalAlpha = 0.9;
    const m = Math.min(w, h);
    const items = [
      [x + w * 0.18, y + h * 0.20, 'spark'], [x + w * 0.82, y + h * 0.20, 'star'],
      [x + w * 0.78, y + h * 0.80, 'spark'], [x + w * 0.20, y + h * 0.78, 'star'],
      [x + w * 0.50, y + h * 0.12, 'dot'], [x + w * 0.50, y + h * 0.88, 'dot']
    ];
    items.forEach(([cx, cy, type]) => {
      if (type === 'spark') {
        ctx.beginPath(); ctx.moveTo(cx - m * 0.038, cy); ctx.lineTo(cx + m * 0.038, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - m * 0.038); ctx.lineTo(cx, cy + m * 0.038); ctx.stroke();
      } else if (type === 'star') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - m * 0.04); ctx.lineTo(cx + m * 0.014, cy - m * 0.012);
        ctx.lineTo(cx + m * 0.04, cy); ctx.lineTo(cx + m * 0.014, cy + m * 0.012);
        ctx.lineTo(cx, cy + m * 0.04); ctx.lineTo(cx - m * 0.014, cy + m * 0.012);
        ctx.lineTo(cx - m * 0.04, cy); ctx.lineTo(cx - m * 0.014, cy - m * 0.012);
        ctx.closePath(); ctx.stroke();
      } else {
        drawEmoji(ctx, '✨', cx, cy, m * 0.09, 0.92);
      }
    });
    ctx.restore();
  }

  function drawNeon(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    const m = Math.min(w, h);
    ctx.shadowColor = fs.stroke;
    ctx.shadowBlur = m * 0.08;
    roundedBorderPoints(x, y, w, h, bentuk, Math.max(18, m * 0.15)).forEach(([cx, cy], i) => {
      drawEmoji(ctx, i % 2 ? '✨' : '⚡', cx, cy, m * 0.11, 0.92);
    });
    ctx.strokeStyle = fs.accent;
    ctx.lineWidth = Math.max(2, m * 0.014);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.84);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.72, x + w * 0.82, y + h * 0.84);
    ctx.stroke();
    ctx.restore();
  }

  function drawMinimal(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    const m = Math.min(w, h);
    ctx.strokeStyle = fs.accent;
    ctx.lineWidth = Math.max(1.5, m * 0.008);
    ctx.globalAlpha = 0.9;
    const len = m * 0.11;
    [[x + w * 0.18, y + h * 0.18, 1, 1], [x + w * 0.82, y + h * 0.18, -1, 1], [x + w * 0.82, y + h * 0.82, -1, -1], [x + w * 0.18, y + h * 0.82, 1, -1]].forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * len, cy);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawOcean(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    const m = Math.min(w, h);
    ctx.strokeStyle = fs.accent;
    ctx.lineWidth = Math.max(2, m * 0.012);
    ctx.globalAlpha = 0.85;
    [0.20, 0.80].forEach(yPct => {
      ctx.beginPath();
      for (let i = 0; i <= 36; i++) {
        const px = x + w * (0.18 + 0.64 * i / 36);
        const py = y + h * yPct + Math.sin(i / 36 * Math.PI * 4) * m * 0.018;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    drawEmoji(ctx, '🐚', x + w * 0.18, y + h * 0.76, m * 0.10, 0.9);
    drawEmoji(ctx, '🌊', x + w * 0.82, y + h * 0.24, m * 0.10, 0.9);
    ctx.restore();
  }

  function drawPurple(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    const m = Math.min(w, h);
    ctx.strokeStyle = fs.accent;
    ctx.fillStyle = fs.accent;
    ctx.lineWidth = Math.max(2, m * 0.012);
    ctx.globalAlpha = 0.85;
    roundedBorderPoints(x, y, w, h, bentuk, Math.max(18, m * 0.13)).forEach(([cx, cy], i) => {
      if (i % 2 === 0) drawEmoji(ctx, '✦', cx, cy, m * 0.12, 0.95);
      else drawEmoji(ctx, '☾', cx, cy, m * 0.12, 0.85);
    });
    ctx.restore();
  }

  function drawKorean(ctx, x, y, w, h, bentuk, fs) {
    const m = Math.min(w, h);
    const items = ['♡', '✧', 'luv', '★', 'ㅎㅎ', '♡'];
    ctx.save();
    ctx.font = `800 ${Math.max(14, m * 0.08)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = fs.accent;
    ctx.strokeStyle = fs.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    roundedBorderPoints(x, y, w, h, bentuk, Math.max(18, m * 0.13)).forEach(([cx, cy], i) => {
      if (items[i] === 'luv' || items[i] === 'ㅎㅎ') ctx.fillText(items[i], cx, cy);
      else drawEmoji(ctx, items[i], cx, cy, m * 0.12, 0.92);
    });
    ctx.restore();
  }

  function drawBatik(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    const m = Math.min(w, h);
    const items = ['✦', '🌺', '✦', '🌺', '✦', '🌺'];
    roundedBorderPoints(x, y, w, h, bentuk, Math.max(18, m * 0.13)).forEach(([cx, cy], i) => {
      drawEmoji(ctx, items[i % items.length], cx, cy, m * 0.11, 0.9);
    });
    ctx.restore();
  }

  function drawPearl(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    const m = Math.min(w, h);
    const items = ['🤍', '✨', '🤍', '✨', '🤍', '✨'];
    roundedBorderPoints(x, y, w, h, bentuk, Math.max(16, m * 0.11)).forEach(([cx, cy], i) => {
      drawEmoji(ctx, items[i % items.length], cx, cy, m * 0.10, 0.9);
    });
    ctx.restore();
  }

  function drawComic(ctx, x, y, w, h, bentuk, fs) {
    ctx.save();
    const m = Math.min(w, h);
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = fs.accent;
    ctx.lineWidth = Math.max(2.5, m * 0.014);
    ctx.globalAlpha = 0.95;
    [[x + w * 0.22, y + h * 0.2], [x + w * 0.78, y + h * 0.2], [x + w * 0.78, y + h * 0.78], [x + w * 0.22, y + h * 0.78]].forEach(([cx, cy], i) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * 0.4);
      ctx.beginPath();
      for (let p = 0; p < 12; p++) {
        const a = (p / 12) * Math.PI * 2;
        const r = p % 2 ? m * 0.04 : m * 0.075;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 0.55;
    ['💥', '⚡', '💬'].forEach((item, idx) => {
      drawEmoji(ctx, item, x + w * (0.28 + idx * 0.22), y + h * 0.5, m * 0.09, 0.85);
    });
    ctx.restore();
  }

  function drawPlaceholder(ctx, x, y, w, h, fs, placeholderEmoji) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    if (fs === FRAME_STYLES.neon) {
      grad.addColorStop(0, '#111827');
      grad.addColorStop(0.55, '#172554');
      grad.addColorStop(1, '#312e81');
    } else if (fs === FRAME_STYLES.ocean) {
      grad.addColorStop(0, '#cffafe');
      grad.addColorStop(0.55, '#e0f2fe');
      grad.addColorStop(1, '#bae6fd');
    } else if (fs === FRAME_STYLES.batik) {
      grad.addColorStop(0, '#ffedd5');
      grad.addColorStop(0.55, '#fff7ed');
      grad.addColorStop(1, '#fde68a');
    } else if (fs === FRAME_STYLES.comic) {
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(0.55, '#fee2e2');
      grad.addColorStop(1, '#dbeafe');
    } else if (fs === FRAME_STYLES.purple) {
      grad.addColorStop(0, '#f3e8ff');
      grad.addColorStop(0.55, '#fae8ff');
      grad.addColorStop(1, '#ddd6fe');
    } else {
      grad.addColorStop(0, '#e9d5ff');
      grad.addColorStop(0.5, '#fbcfe8');
      grad.addColorStop(1, '#fde68a');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fs === FRAME_STYLES.neon ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.78)';
    ctx.font = `${Math.min(w, h) * 0.25}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(placeholderEmoji || '📷', x + w / 2, y + h / 2);
  }

  function drawFrame(ctx, options) {
    const o = options || {};
    const x = o.x || 0;
    const y = o.y || 0;
    const w = o.w || 100;
    const h = o.h || 100;
    const bentuk = o.bentuk || 'persegi';
    const cornerStyle = o.cornerStyle || 'rounded';
    const frame = o.frame || 'polos';
    const fs = getStyle(frame);
    const line = Math.max(o.lineWidth || 0, Math.min(w, h) * (o.overlay ? 0.038 : 0.045));
    const inset = Math.max(8, line * 1.25);

    ctx.save();

    if (o.showPlaceholder || o.photo) {
      shapePath(ctx, x, y, w, h, bentuk, undefined, cornerStyle);
      ctx.fillStyle = fs.fill;
      ctx.fill();
      ctx.save();
      shapePath(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, bentuk, undefined, cornerStyle);
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
        drawPlaceholder(ctx, x, y, w, h, fs, o.placeholderEmoji || '📷');
      }
      ctx.restore();
    }

    ctx.shadowColor = fs.shadow;
    ctx.shadowBlur = o.overlay ? 20 : 0;
    shapePath(ctx, x, y, w, h, bentuk, undefined, cornerStyle);
    ctx.strokeStyle = frame === 'polos' ? 'rgba(255,255,255,0.96)' : fs.stroke;
    ctx.lineWidth = line;
    if (frame === 'doodle') ctx.setLineDash([line * 1.15, line * 0.9]);
    ctx.stroke();
    ctx.setLineDash([]);

    shapePath(ctx, x + line * 1.45, y + line * 1.45, w - line * 2.9, h - line * 2.9, bentuk, undefined, cornerStyle);
    ctx.strokeStyle = frame === 'polos' ? 'rgba(229,231,235,0.95)' : fs.accent;
    ctx.lineWidth = Math.max(2, line * 0.35);
    ctx.stroke();

    if (frame === 'cute') drawCute(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'vintage') drawVintage(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'doodle') drawDoodle(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'floral') drawFloral(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'ribbon') drawRibbon(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'sparkle') drawSparkle(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'neon') drawNeon(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'minimal') drawMinimal(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'ocean') drawOcean(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'purple') drawPurple(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'korean') drawKorean(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'batik') drawBatik(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'pearl') drawPearl(ctx, x, y, w, h, bentuk, fs);
    if (frame === 'comic') drawComic(ctx, x, y, w, h, bentuk, fs);

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
