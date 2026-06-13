(function () {
  const PRESETS = {
    off:     { label: 'Off',     css: 'none', smooth: 0 },
    natural: { label: 'Natural', css: 'brightness(1.07) contrast(.96) saturate(1.06)', smooth: 1.2 },
    medium:  { label: 'Medium',  css: 'brightness(1.12) contrast(.93) saturate(1.10)', smooth: 2.4 },
    smooth:  { label: 'Smooth',  css: 'brightness(1.16) contrast(.90) saturate(1.08)', smooth: 3.6 }
  };

  function get(key) {
    return PRESETS[key] || PRESETS.off;
  }

  function css(key) {
    return get(key).css || 'none';
  }

  function drawCover(ctx, img, x, y, w, h, options = {}) {
    if (!img) return;
    const preset = get(options.beautify || 'off');
    const zoom = options.zoom || 1;
    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;
    const rotate = options.rotate || 0;

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;

    ctx.save();
    ctx.translate(x + w / 2 + offsetX, y + h / 2 + offsetY);
    ctx.rotate(rotate * Math.PI / 180);
    ctx.filter = preset.css;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

    if (preset.smooth > 0) {
      ctx.globalAlpha = Math.min(0.30, 0.10 + preset.smooth * 0.045);
      ctx.filter = `${preset.css} blur(${preset.smooth}px)`;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();
  }

  function renderControls(containerId, active, onSelectName = 'setBeautify') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = Object.entries(PRESETS).map(([key, p]) => `
      <button class="pill ${active === key ? 'active' : ''}" onclick="${onSelectName}('${key}')">${p.label}</button>
    `).join('');
  }

  window.Beautify = { PRESETS, get, css, drawCover, renderControls };
})();