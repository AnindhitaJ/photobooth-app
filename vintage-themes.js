/**
 * LUX Photobooth — Vintage Photostrip
 *
 * 10 tema vintage PRESET (digambar lewat canvas, bukan upload dari admin).
 * Format sama seperti photostrip: 591 x 1772 px (5x15 cm @300dpi), 4 slot foto.
 *
 * API (window.LuxVintage):
 *   themes                       -> daftar 10 tema
 *   getTheme(id)                 -> objek tema (fallback ke tema pertama)
 *   getSlots()                   -> slot foto (sama untuk semua tema)
 *   render(id, opts)             -> <canvas> frame (opts.scale, opts.placeholder, opts.date)
 *   makeFrame(id)                -> { src, slots, w, h } siap dipakai result.html
 *   filterFor(id)                -> string CSS filter untuk foto (sepia/noir/dll)
 *   apply(id)                    -> tulis localStorage supaya camera.html/result.html memakai tema ini
 *   clear()                      -> hapus flag vintage dari localStorage
 *   isActive() / activeThemeId() -> status mode vintage
 */
(function () {
  'use strict';

  var W = 591, H = 1772, COUNT = 4;
  var PAD_X = 60, TOP = 120, BOTTOM = 250, GAP = 30;
  var SLOT_H = Math.floor((H - TOP - BOTTOM - GAP * (COUNT - 1)) / COUNT);
  var SLOT_W = W - PAD_X * 2;

  var KEY_MODE = 'vintageMode';
  var KEY_THEME = 'vintageTheme';

  var SERIF = 'Georgia, "Times New Roman", serif';
  var MONO = '"Courier New", Courier, monospace';
  var SCRIPT = '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive';
  var IMPACT = 'Impact, "Arial Narrow", "Arial Black", sans-serif';

  /* ───────────────────────── Tema ───────────────────────── */
  var THEMES = [
    {
      id: 'sepia', name: 'Sepia Classic', emoji: '📜',
      desc: 'Cokelat hangat ala studio foto 1920-an',
      bg: ['#EBDDBD', '#D8C197'], ink: '#4A3622', text: '#4A3622', accent: '#8A5A2B',
      tint: 'rgba(112,66,20,0.20)', vig: 0.34, grain: 0.5,
      filter: 'sepia(0.85) contrast(1.05) brightness(0.98)',
      title: 'PHOTO STUDIO', titleFont: SERIF, sub: 'EST. 1920', subFont: 'italic 26px ' + SERIF
    },
    {
      id: 'noir', name: 'Noir Silver', emoji: '🎞️',
      desc: 'Hitam putih dramatis, butiran film perak',
      bg: ['#232323', '#0E0E0E'], ink: '#D9D9D9', text: '#E6E6E6', accent: '#9A9A9A',
      tint: 'rgba(30,30,30,0.28)', vig: 0.50, grain: 1.2,
      filter: 'grayscale(1) contrast(1.15) brightness(0.98)',
      title: 'NOIR', titleFont: SERIF, sub: 'SILVER GELATIN', subFont: '24px ' + SERIF
    },
    {
      id: 'polaroid', name: 'Polaroid 70s', emoji: '📸',
      desc: 'Pigura putih, warna pudar oranye-teal',
      bg: ['#F7F1E5', '#EDE3CF'], ink: '#5B4636', text: '#5B4636', accent: '#D9622B',
      tint: 'rgba(255,160,80,0.14)', vig: 0.20, grain: 0.6,
      filter: 'saturate(0.85) contrast(0.95) sepia(0.25) brightness(1.04)',
      title: 'INSTANT MEMORIES', titleFont: SERIF, sub: 'good times, 1976', subFont: '34px ' + SCRIPT
    },
    {
      id: 'film', name: 'Film Reel 35mm', emoji: '🎬',
      desc: 'Lubang sprocket & nomor frame seperti rol film',
      bg: ['#1A1612', '#0F0C0A'], ink: '#E9DDC3', text: '#E9DDC3', accent: '#E58A2A',
      tint: 'rgba(255,140,40,0.10)', vig: 0.30, grain: 0.9,
      filter: 'saturate(1.1) contrast(1.08) sepia(0.2)',
      title: '35 MM', titleFont: MONO, sub: 'SAFETY FILM 400', subFont: 'bold 24px ' + MONO
    },
    {
      id: 'victorian', name: 'Victorian Parlor', emoji: '🕰️',
      desc: 'Merah marun & emas, nuansa ruang tamu era Victoria',
      bg: ['#611B27', '#3B0D16'], ink: '#D9B866', text: '#E2C277', accent: '#D9B866',
      tint: 'rgba(90,40,20,0.20)', vig: 0.40, grain: 0.6,
      filter: 'sepia(0.7) contrast(1.05) brightness(0.95)',
      title: 'PORTRAIT STUDIO', titleFont: SERIF, sub: 'Fine Portraiture', subFont: 'italic 28px ' + SERIF
    },
    {
      id: 'deco', name: 'Art Deco 20s', emoji: '✨',
      desc: 'Navy & emas, pola sunburst geometris',
      bg: ['#102232', '#08121B'], ink: '#C9A24B', text: '#D8B45E', accent: '#C9A24B',
      tint: 'rgba(20,30,40,0.18)', vig: 0.38, grain: 0.6,
      filter: 'sepia(0.35) contrast(1.1) saturate(0.8)',
      title: 'THE GOLDEN AGE', titleFont: SERIF, sub: 'PHOTO BOOTH · 1925', subFont: '24px ' + SERIF
    },
    {
      id: 'diner', name: 'Retro Diner 50s', emoji: '🥤',
      desc: 'Mint, merah & motif kotak-kotak khas diner',
      bg: ['#D2EDE3', '#BFE3D5'], ink: '#B2262F', text: '#B2262F', accent: '#C8323C',
      tint: 'rgba(255,200,180,0.10)', vig: 0.20, grain: 0.5,
      filter: 'saturate(0.9) contrast(0.95) sepia(0.2) hue-rotate(-8deg)',
      title: "DINER'S CHOICE", titleFont: IMPACT, sub: 'Malts & Memories', subFont: '36px ' + SCRIPT
    },
    {
      id: 'sunny80s', name: 'Sunny 80s', emoji: '🌞',
      desc: 'Kuning cerah dengan garis warna ala foto 1980-an',
      bg: ['#F7CE4B', '#EEBB2C'], ink: '#7A1410', text: '#7A1410', accent: '#D7261E',
      tint: 'rgba(255,120,40,0.12)', vig: 0.22, grain: 0.7,
      filter: 'saturate(1.2) contrast(1.05) sepia(0.15)',
      title: 'SUNNY SNAPS', titleFont: IMPACT, sub: 'SUMMER 1984', subFont: 'bold 24px ' + SERIF
    },
    {
      id: 'postcard', name: 'Old Postcard', emoji: '💌',
      desc: 'Kartu pos antik dengan border airmail & prangko',
      bg: ['#F1E7CF', '#E6D8B8'], ink: '#3C4A5C', text: '#3C4A5C', accent: '#C8323C',
      tint: 'rgba(180,150,100,0.16)', vig: 0.25, grain: 0.6,
      filter: 'sepia(0.5) contrast(0.98) saturate(0.9)',
      title: 'GREETINGS FROM', titleFont: SERIF, sub: 'The Photo Booth', subFont: 'italic 30px ' + SERIF,
      footAlign: 'left'
    },
    {
      id: 'western', name: 'Old West Tintype', emoji: '🤠',
      desc: 'Perkamen tua, tali rope & bintang sheriff',
      bg: ['#DDBC8A', '#C29A63'], ink: '#3B2412', text: '#3B2412', accent: '#7A5326',
      tint: 'rgba(120,70,20,0.26)', vig: 0.45, grain: 0.8,
      filter: 'sepia(0.9) contrast(1.1) brightness(0.95)',
      title: 'TINTYPE STUDIO', titleFont: SERIF, sub: 'OLD WEST PHOTO CO. · 1881', subFont: 'bold 20px ' + SERIF
    }
  ];

  function getTheme(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return THEMES[0];
  }

  function getSlots() {
    var slots = [];
    for (var i = 0; i < COUNT; i++) {
      slots.push({ x: PAD_X, y: TOP + i * (SLOT_H + GAP), w: SLOT_W, h: SLOT_H });
    }
    return slots;
  }

  /* ───────────────────────── Helper gambar ───────────────────────── */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function strokeBox(ctx, x, y, w, h, lw, color) {
    ctx.save();
    ctx.lineWidth = lw; ctx.strokeStyle = color;
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
    ctx.restore();
  }

  function spaced(ctx, text, x, y, spacing, align) {
    var chars = String(text).split('');
    var widths = chars.map(function (c) { return ctx.measureText(c).width; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + spacing * Math.max(0, chars.length - 1);
    var cx = align === 'left' ? x : (align === 'right' ? x - total : x - total / 2);
    ctx.save();
    ctx.textAlign = 'left';
    chars.forEach(function (c, i) { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
    ctx.restore();
  }

  function diamond(ctx, x, y, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function star(ctx, cx, cy, outer, inner, points, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = -Math.PI / 2 + (i * Math.PI) / points;
      var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  }

  function paper(ctx, t, r) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // noda lembut
    for (var s = 0; s < 5; s++) {
      var sx = r() * W, sy = r() * H, sr = 90 + r() * 180;
      var rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      rg.addColorStop(0, hexA(t.ink, 0.05)); rg.addColorStop(1, hexA(t.ink, 0));
      ctx.fillStyle = rg; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
    // bintik kertas
    var n = 1500;
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = hexA(t.ink, 0.02 + r() * 0.05);
      var d = r() < 0.9 ? 1 : 2;
      ctx.fillRect(r() * W, r() * H, d, d);
    }
  }

  function hexA(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ───────────────────────── Dekorasi per gaya ───────────────────────── */
  var DECO = {
    sepia: function (ctx, t, slots, r) {
      strokeBox(ctx, 14, 14, W - 28, H - 28, 3, t.ink);
      strokeBox(ctx, 24, 24, W - 48, H - 48, 1.5, t.ink);
      [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]].forEach(function (p) { diamond(ctx, p[0], p[1], 9, t.ink); });
      ctx.fillStyle = t.ink; ctx.fillRect(PAD_X, 104, SLOT_W, 1.5);
      ctx.fillRect(PAD_X, 1536, SLOT_W, 1.5);
    },

    noir: function (ctx, t, slots, r) {
      strokeBox(ctx, 16, 16, W - 32, H - 32, 2, '#B5B5B5');
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(PAD_X, 104, SLOT_W, 1); ctx.fillRect(PAD_X, 1536, SLOT_W, 1);
      // goresan film
      for (var i = 0; i < 16; i++) {
        var x = r() * W, y0 = r() * H, len = 80 + r() * 380;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + r() * 0.08) + ')';
        ctx.fillRect(x, y0, 1, len);
      }
    },

    polaroid: function (ctx, t, slots) {
      slots.forEach(function (s) {
        ctx.save();
        ctx.shadowColor = 'rgba(60,40,20,0.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#FFFDF8';
        ctx.fillRect(s.x - 12, s.y - 12, s.w + 24, s.h + 24);
        ctx.restore();
      });
      var cols = ['#D9622B', '#F0A530', '#3A9A94', '#6B4A3A'];
      cols.forEach(function (c, i) { ctx.fillStyle = c; ctx.fillRect(PAD_X, 1706 + i * 10, SLOT_W, 10); });
    },

    film: function (ctx, t, slots) {
      for (var y = 20; y < H - 30; y += 44) {
        [[17], [W - 37]].forEach(function (p) {
          ctx.fillStyle = 'rgba(233,221,195,0.92)';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(p[0], y, 20, 26, 5); else ctx.rect(p[0], y, 20, 26);
          ctx.fill();
        });
      }
      ctx.fillStyle = t.accent;
      ctx.font = 'bold 15px ' + MONO; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i], cy = s.y + s.h + GAP / 2 + 1;
        ctx.beginPath();
        ctx.moveTo(PAD_X, cy - 6); ctx.lineTo(PAD_X + 10, cy); ctx.lineTo(PAD_X, cy + 6); ctx.closePath(); ctx.fill();
        ctx.fillText(String(i + 9), PAD_X + 18, cy);
        ctx.textAlign = 'right'; ctx.fillText(String(i + 9) + 'A', W - PAD_X, cy); ctx.textAlign = 'left';
      }
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(233,221,195,0.25)'; ctx.fillRect(PAD_X, 104, SLOT_W, 1);
    },

    victorian: function (ctx, t, slots) {
      // damask
      ctx.strokeStyle = hexA(t.ink, 0.10); ctx.lineWidth = 1;
      for (var gy = 0; gy < H + 60; gy += 60) {
        for (var gx = 0; gx < W + 52; gx += 52) {
          var ox = (Math.round(gy / 60) % 2) * 26;
          var x = gx + ox, y = gy;
          ctx.beginPath();
          ctx.moveTo(x, y - 20); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 20); ctx.lineTo(x - 14, y); ctx.closePath();
          ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
        }
      }
      strokeBox(ctx, 14, 14, W - 28, H - 28, 4, t.ink);
      strokeBox(ctx, 26, 26, W - 52, H - 52, 1.5, t.ink);
      [[26, 26, 0], [W - 26, 26, 1], [26, H - 26, 3], [W - 26, H - 26, 2]].forEach(function (c) {
        ctx.save(); ctx.strokeStyle = t.ink; ctx.lineWidth = 2;
        for (var k = 1; k <= 3; k++) {
          ctx.beginPath();
          ctx.arc(c[0], c[1], 8 + k * 7, c[2] * Math.PI / 2, c[2] * Math.PI / 2 + Math.PI / 2);
          ctx.stroke();
        }
        ctx.restore();
      });
      ctx.fillStyle = t.ink;
      ctx.fillRect(PAD_X, 104, SLOT_W, 2); ctx.fillRect(PAD_X, 1536, SLOT_W, 2);
      diamond(ctx, W / 2, 105, 6, t.ink); diamond(ctx, W / 2, 1537, 6, t.ink);
    },

    deco: function (ctx, t, slots) {
      // sunburst di atas
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, 112); ctx.clip();
      ctx.strokeStyle = hexA(t.ink, 0.55); ctx.lineWidth = 1.2;
      for (var i = -14; i <= 14; i++) {
        ctx.beginPath(); ctx.moveTo(W / 2, -30); ctx.lineTo(W / 2 + i * 34, 130); ctx.stroke();
      }
      ctx.restore();
      // siku bertingkat
      [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(function (c) {
        ctx.save(); ctx.strokeStyle = t.ink; ctx.lineWidth = 3;
        [28, 44, 60].forEach(function (d) {
          ctx.beginPath();
          ctx.moveTo(c[0] + c[2] * d, c[1] + c[3] * 12);
          ctx.lineTo(c[0] + c[2] * d, c[1] + c[3] * d);
          ctx.lineTo(c[0] + c[2] * 12, c[1] + c[3] * d);
          ctx.stroke();
        });
        ctx.restore();
      });
      // blok bertingkat di bawah
      ctx.fillStyle = t.ink;
      [[200, 6], [160, 6], [120, 6]].forEach(function (b, i) { ctx.fillRect((W - b[0]) / 2, 1722 + i * 10, b[0], b[1]); });
    },

    diner: function (ctx, t, slots) {
      var sq = 30, cols = Math.ceil(W / sq);
      [14, H - 44].forEach(function (y) {
        for (var i = 0; i < cols; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#C8323C' : '#FFFFFF';
          ctx.fillRect(i * sq, y, sq, sq);
        }
        ctx.strokeStyle = '#8B1E26'; ctx.lineWidth = 2; ctx.strokeRect(0, y, W, sq);
      });
      slots.forEach(function (s) {
        ctx.fillStyle = '#C8323C'; ctx.fillRect(s.x - 10, s.y - 10, s.w + 20, s.h + 20);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(s.x - 5, s.y - 5, s.w + 10, s.h + 10);
      });
    },

    sunny80s: function (ctx, t, slots) {
      var bands = [['#D7261E', 14], ['#F27A1A', 12], ['#FFFFFF', 10]];
      var x = 0;
      bands.forEach(function (b) {
        ctx.fillStyle = b[0]; ctx.fillRect(x, 0, b[1], H); ctx.fillRect(W - x - b[1], 0, b[1], H); x += b[1];
      });
      slots.forEach(function (s) {
        ctx.fillStyle = '#D7261E'; ctx.fillRect(s.x - 10, s.y - 10, s.w + 20, s.h + 20);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(s.x - 5, s.y - 5, s.w + 10, s.h + 10);
      });
      var y = 1706;
      [['#D7261E', 10], ['#F27A1A', 10], ['#FFFFFF', 10]].forEach(function (b) {
        ctx.fillStyle = b[0]; ctx.fillRect(PAD_X, y, SLOT_W, b[1]); y += b[1];
      });
    },

    postcard: function (ctx, t, slots) {
      // border airmail
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(22, 22, W - 44, H - 44);
      ctx.clip('evenodd');
      ctx.fillStyle = '#F8F1DF'; ctx.fillRect(0, 0, W, H);
      var colors = ['#C8323C', '#2D4A8A'];
      var k = 0;
      for (var d = -H; d < W + H; d += 36) {
        ctx.fillStyle = colors[k % 2]; k++;
        ctx.beginPath();
        ctx.moveTo(d, 0); ctx.lineTo(d + 20, 0); ctx.lineTo(d + 20 - H, H); ctx.lineTo(d - H, H);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      strokeBox(ctx, 22, 22, W - 44, H - 44, 1.5, t.ink);
      // prangko
      var sx = W - PAD_X - 78, sy = 1556, sw = 78, sh = 96;
      ctx.fillStyle = '#F8F1DF'; ctx.fillRect(sx, sy, sw, sh);
      ctx.save(); ctx.strokeStyle = t.ink; ctx.lineWidth = 5; ctx.setLineDash([3, 5]);
      ctx.strokeRect(sx, sy, sw, sh); ctx.restore();
      strokeBox(ctx, sx + 9, sy + 9, sw - 18, sh - 18, 1.5, t.accent);
      star(ctx, sx + sw / 2, sy + sh / 2 - 4, 16, 7, 8, t.accent);
      ctx.fillStyle = t.ink; ctx.font = 'bold 11px ' + SERIF; ctx.textAlign = 'center';
      ctx.fillText('POST', sx + sw / 2, sy + sh - 14);
      // cap pos
      var px = sx - 46, py = sy + 46;
      ctx.save(); ctx.strokeStyle = hexA(t.ink, 0.65); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 27, 0, Math.PI * 2); ctx.stroke();
      for (var w = -1; w <= 1; w++) {
        ctx.beginPath(); ctx.moveTo(px + 38, py + w * 9);
        for (var q = 1; q <= 5; q++) ctx.lineTo(px + 38 + q * 8, py + w * 9 + (q % 2 ? -4 : 4));
        ctx.stroke();
      }
      ctx.restore();
    },

    western: function (ctx, t, slots, r) {
      // burn tepi
      var bg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
      bg.addColorStop(0, 'rgba(60,30,10,0)'); bg.addColorStop(1, 'rgba(60,30,10,0.42)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // rope
      var x0 = 24, y0 = 24, rw = W - 48, rh = H - 48, step = 15;
      function knot(px, py, ang) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#8A6030'; ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = '#4A2E12'; ctx.stroke();
        ctx.restore();
      }
      var p;
      for (p = x0; p <= x0 + rw; p += step) { knot(p, y0, Math.PI / 4); knot(p, y0 + rh, Math.PI / 4); }
      for (p = y0; p <= y0 + rh; p += step) { knot(x0, p, Math.PI / 4); knot(x0 + rw, p, Math.PI / 4); }
      // bintang sheriff
      star(ctx, 66, 74, 17, 7, 5, '#7A5326', '#3B2412');
      star(ctx, W - 66, 74, 17, 7, 5, '#7A5326', '#3B2412');
      ctx.fillStyle = t.ink; ctx.fillRect(PAD_X, 104, SLOT_W, 2); ctx.fillRect(PAD_X, 1536, SLOT_W, 2);
    }
  };

  /* ───────────────────────── Bingkai tipis di sekeliling slot ───────────────────────── */
  var FRAME = {
    sepia: function (ctx, t, s) {
      strokeBox(ctx, s.x - 8, s.y - 8, s.w + 16, s.h + 16, 4, t.ink);
      strokeBox(ctx, s.x - 14, s.y - 14, s.w + 28, s.h + 28, 1.2, t.ink);
    },
    noir: function (ctx, t, s) {
      strokeBox(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 3, '#EDEDED');
    },
    polaroid: function (ctx, t, s) {
      strokeBox(ctx, s.x, s.y, s.w, s.h, 1, 'rgba(90,70,54,0.35)');
    },
    film: function (ctx, t, s) {
      strokeBox(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 2, t.accent);
    },
    victorian: function (ctx, t, s) {
      strokeBox(ctx, s.x - 8, s.y - 8, s.w + 16, s.h + 16, 5, t.ink);
      strokeBox(ctx, s.x - 13, s.y - 13, s.w + 26, s.h + 26, 1.2, t.ink);
      [[s.x - 8, s.y - 8], [s.x + s.w + 8, s.y - 8], [s.x - 8, s.y + s.h + 8], [s.x + s.w + 8, s.y + s.h + 8]]
        .forEach(function (c) { ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(c[0], c[1], 5, 0, Math.PI * 2); ctx.fill(); });
    },
    deco: function (ctx, t, s) {
      var o = 9, c = 14, x = s.x - o, y = s.y - o, w = s.w + o * 2, h = s.h + o * 2;
      ctx.save(); ctx.strokeStyle = t.ink; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c);
      ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h);
      ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath(); ctx.stroke();
      ctx.restore();
    },
    diner: function (ctx, t, s) { strokeBox(ctx, s.x, s.y, s.w, s.h, 1.5, 'rgba(120,20,26,0.55)'); },
    sunny80s: function (ctx, t, s) { strokeBox(ctx, s.x, s.y, s.w, s.h, 1.5, 'rgba(122,20,16,0.5)'); },
    postcard: function (ctx, t, s) {
      strokeBox(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 3, t.ink);
      strokeBox(ctx, s.x - 11, s.y - 11, s.w + 22, s.h + 22, 1, t.ink);
    },
    western: function (ctx, t, s) {
      strokeBox(ctx, s.x - 7, s.y - 7, s.w + 14, s.h + 14, 5, '#3B2412');
      strokeBox(ctx, s.x - 12, s.y - 12, s.w + 24, s.h + 24, 1.2, '#3B2412');
    }
  };

  /* ───────────────────────── Tint, vignette & grain di atas foto ───────────────────────── */
  function overlay(ctx, t, s, r) {
    ctx.save();
    ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
    ctx.fillStyle = t.tint; ctx.fillRect(s.x, s.y, s.w, s.h);

    var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    var g = ctx.createRadialGradient(cx, cy, Math.min(s.w, s.h) * 0.25, cx, cy, Math.max(s.w, s.h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + t.vig + ')');
    ctx.fillStyle = g; ctx.fillRect(s.x, s.y, s.w, s.h);

    var n = Math.round(900 * t.grain);
    for (var i = 0; i < n; i++) {
      var v = r() < 0.5 ? 0 : 255;
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.05 + r() * 0.09) + ')';
      ctx.fillRect(s.x + r() * s.w, s.y + r() * s.h, 1.6, 1.6);
    }
    ctx.restore();
  }

  /* ───────────────────────── Placeholder (hanya untuk pratinjau) ───────────────────────── */
  function placeholder(ctx, t, s, idx) {
    ctx.save();
    ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
    if ('filter' in ctx) ctx.filter = t.filter;
    var palettes = [['#8FB5D6', '#D9E4C8'], ['#F2B6A0', '#F5E1B8'], ['#A3C9A8', '#E8E2B8'], ['#B7A6D6', '#F0D6D6']];
    var p = palettes[idx % palettes.length];
    var g = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
    g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
    ctx.fillStyle = g; ctx.fillRect(s.x, s.y, s.w, s.h);
    var cx = s.x + s.w / 2 + (idx % 2 ? 40 : -40), base = s.y + s.h;
    ctx.fillStyle = '#4C4C58';
    ctx.beginPath(); ctx.ellipse(cx, base + 20, s.w * 0.22, s.h * 0.48, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#E9C3A6';
    ctx.beginPath(); ctx.arc(cx, s.y + s.h * 0.42, s.h * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3A2A22';
    ctx.beginPath(); ctx.arc(cx, s.y + s.h * 0.36, s.h * 0.2, Math.PI, 0); ctx.fill();
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.restore();
  }

  /* ───────────────────────── Teks (judul, subjudul, tanggal) ───────────────────────── */
  function dateText(d) {
    var m = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
    d = d || new Date();
    return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
  }

  function drawTexts(ctx, t, date) {
    ctx.save();
    ctx.fillStyle = t.text; ctx.textBaseline = 'alphabetic';
    // judul atas
    var tf = t.titleFont;
    var size = tf === IMPACT ? 40 : (tf === MONO ? 36 : 30);
    var weight = tf === IMPACT ? '' : 'bold ';
    ctx.font = weight + size + 'px ' + tf;
    var spacing = tf === IMPACT ? 5 : 7;
    // kecilkan otomatis jika terlalu lebar
    var guard = 0;
    while (guard++ < 12) {
      var wTotal = 0, chars = t.title.split('');
      chars.forEach(function (c) { wTotal += ctx.measureText(c).width + spacing; });
      if (wTotal <= W - PAD_X * 2 - 20) break;
      size -= 2; ctx.font = weight + size + 'px ' + tf;
    }
    var titleY = t.id === 'diner' || t.id === 'sunny80s' ? 92 : 80;
    spaced(ctx, t.title, W / 2, titleY, spacing, 'center');

    // subjudul + tanggal
    var left = t.footAlign === 'left';
    var fx = left ? PAD_X + 6 : W / 2;
    var al = left ? 'left' : 'center';
    ctx.font = t.subFont;
    if (left || t.subFont.indexOf(SCRIPT) !== -1) {
      ctx.textAlign = al; ctx.fillText(t.sub, fx, 1614);
    } else {
      spaced(ctx, t.sub, fx, 1614, 4, al);
    }
    ctx.font = 'bold 24px ' + MONO;
    ctx.globalAlpha = 0.9;
    spaced(ctx, date, fx, 1668, 5, al);
    ctx.restore();
  }

  /* ───────────────────────── Render utama ───────────────────────── */
  function render(id, opts) {
    opts = opts || {};
    var t = getTheme(id);
    var scale = opts.scale || 1;
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);

    var seed = hash('lux-vintage-' + t.id);
    var r = rng(seed);
    var slots = getSlots();

    paper(ctx, t, r);
    DECO[t.id](ctx, t, slots, r);

    slots.forEach(function (s, i) {
      if (opts.placeholder) placeholder(ctx, t, s, i);
      else ctx.clearRect(s.x, s.y, s.w, s.h);
      overlay(ctx, t, s, r);
    });
    slots.forEach(function (s) { FRAME[t.id](ctx, t, s); });

    drawTexts(ctx, t, opts.date || dateText());
    return canvas;
  }

  function makeFrame(id) {
    var c = render(id, { scale: 1 });
    return { src: c.toDataURL('image/png'), slots: getSlots(), w: W, h: H };
  }

  function filterFor(id) { return getTheme(id).filter; }

  /* ───────────────────────── Integrasi alur foto ───────────────────────── */
  function apply(id) {
    var t = getTheme(id);
    var set = function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} };
    var del = function (k) { try { localStorage.removeItem(k); } catch (_) {} };

    ['eventMode', 'activeEvent', 'activeEventTemplateIds', 'activeEventName',
      'activeEventWelcomeURL', 'activeEventWelcomeOverlay', 'activeEventProductType',
      'captureFlow', 'captureReturnUrl', 'ganciConfig', 'photos', 'filteredPhotos',
      'livePhotos', 'finalPhoto', 'templateSrc', 'basicFrameColor'].forEach(del);

    set(KEY_MODE, '1');
    set(KEY_THEME, t.id);
    set('templateSlots', JSON.stringify(getSlots()));
    set('templateTextElements', '[]');
    set('templateName', 'Vintage · ' + t.name);
    set('templateId', '__vintage_' + t.id + '__');
    set('templateCategory', 'Vintage');
    set('slotCount', String(COUNT));
    set('templateW', String(W));
    set('templateH', String(H));
    set('templateIsBasic', '0');
    set('templatePhotoLayer', 'behind');
    set('templateProduct', 'photostrip');
  }

  function clear() {
    try { localStorage.removeItem(KEY_MODE); localStorage.removeItem(KEY_THEME); } catch (_) {}
  }

  // Aktif hanya jika flag vintage menyala DAN template yang terpilih memang tema vintage,
  // DAN bukan alur lain (photobox/ganci/product/event). Flag basi tidak akan bocor.
  function isActive() {
    try {
      if (localStorage.getItem(KEY_MODE) !== '1') return false;
      if (String(localStorage.getItem('templateId') || '').indexOf('__vintage_') !== 0) return false;
      if (localStorage.getItem('captureFlow')) return false;
      return true;
    } catch (_) { return false; }
  }

  function activeThemeId() {
    try { return getTheme(localStorage.getItem(KEY_THEME)).id; } catch (_) { return THEMES[0].id; }
  }

  window.LuxVintage = {
    W: W, H: H, SLOT_COUNT: COUNT,
    themes: THEMES,
    getTheme: getTheme, getSlots: getSlots,
    render: render, makeFrame: makeFrame, filterFor: filterFor,
    dateText: dateText,
    apply: apply, clear: clear, isActive: isActive, activeThemeId: activeThemeId
  };
})();
