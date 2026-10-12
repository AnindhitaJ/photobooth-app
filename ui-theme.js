/**
 * LUX Photobooth — Tema warna aplikasi (per akun)
 *
 * Tema disimpan di kolom profiles.ui_theme (default 'pink') dan dibaca dari cache
 * profil di localStorage ('sb_profile'), jadi tema mengikuti akun di perangkat mana pun.
 *
 * Cara kerja: warna pink (dan aksen kuning) di CSS halaman digeser hue-nya ke warna tema.
 * Yang diubah HANYA CSS (<style> dan atribut style/fill/stroke/stop-color).
 * JavaScript, frame foto, template, dan hasil strip TIDAK disentuh.
 * Tema 'pink' = tanpa perubahan apa pun (tampilan asli).
 *
 * API (window.LuxTheme):
 *   themes       -> daftar tema [{id, name, c1, c2}] (c1/c2 = warna swatch)
 *   current()    -> id tema aktif
 *   apply(id)    -> terapkan tema langsung (dipakai untuk pratinjau di admin)
 */
(function () {
  'use strict';

  var PROFILE_KEY = 'sb_profile';

  // h = hue utama, s = pengali saturasi, l = geser lightness (untuk warna aksen),
  // h2 = hue aksen kedua (pengganti kuning). Hue hasil sengaja di luar rentang
  // pink (318-346) dan kuning (39-46) supaya transformasi aman diulang.
  var DEFS = [
    { id: 'pink',    name: 'Pink',      cfg: null },
    { id: 'biru',    name: 'Biru',      cfg: { h: 214, s: 1.00, l: -0.04, h2: 190 } },
    { id: 'cokelat', name: 'Cokelat',   cfg: { h: 24,  s: 0.55, l: -0.12, h2: 34 } },
    { id: 'hijau',   name: 'Hijau',     cfg: { h: 152, s: 0.85, l: -0.14, h2: 90 } },
    { id: 'ungu',    name: 'Ungu',      cfg: { h: 268, s: 0.90, l: -0.02, h2: 288 } },
    { id: 'merah',   name: 'Merah',     cfg: { h: 352, s: 1.00, l: -0.06, h2: 20 } },
    { id: 'oranye',  name: 'Oranye',    cfg: { h: 24,  s: 1.00, l: -0.03, h2: 52 } },
    { id: 'teal',    name: 'Teal',      cfg: { h: 176, s: 0.90, l: -0.14, h2: 150 } },
    { id: 'slate',   name: 'Abu Slate', cfg: { h: 215, s: 0.30, l: -0.14, h2: 200 } },
    { id: 'emas',    name: 'Emas',      cfg: { h: 34,  s: 0.85, l: -0.10, h2: 50 } }
  ];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    var d = max - min;
    if (d > 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    function f(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // Kembalikan [r,g,b] baru kalau warna termasuk keluarga pink / aksen kuning, selain itu null.
  function mapRgb(r, g, b, T) {
    var o = rgb2hsl(r, g, b), h = o[0], s = o[1], l = o[2], nh;
    if (s >= 0.2 && h >= 318 && h <= 346) nh = T.h;                                              // pink
    else if (s >= 0.62 && s <= 0.88 && l >= 0.5 && l <= 0.68 && h >= 39 && h <= 46) nh = T.h2;   // aksen kuning
    else return null;
    var ns = clamp(s * T.s, 0, 1), nl = l;
    if (s >= 0.35 && l > 0.3 && l < 0.78) nl = clamp(l + T.l, 0, 1);
    return hsl2rgb(nh, ns, nl);
  }

  function hex2(n) { n = clamp(n, 0, 255); return (n < 16 ? '0' : '') + n.toString(16); }

  // %23rrggbb (data-URI) | #rrggbb / #rgb / #rrggbbaa | rgb()/rgba()
  var RX = /%23([0-9a-fA-F]{6})(?![0-9a-zA-Z])|#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])|(rgba?)\(\s*(\d{1,3})(\s*[, ]\s*)(\d{1,3})(\s*[, ]\s*)(\d{1,3})/g;

  function recolor(text, T) {
    if (!T || !text) return text;
    return text.replace(RX, function (m, enc, hex, fn, r, s1, g, s2, b) {
      var out;
      if (enc) {
        out = mapRgb(parseInt(enc.substr(0, 2), 16), parseInt(enc.substr(2, 2), 16), parseInt(enc.substr(4, 2), 16), T);
        return out ? '%23' + hex2(out[0]) + hex2(out[1]) + hex2(out[2]) : m;
      }
      if (hex) {
        var h = hex;
        if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
        out = mapRgb(parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), T);
        return out ? '#' + hex2(out[0]) + hex2(out[1]) + hex2(out[2]) + h.substr(6) : m;
      }
      out = mapRgb(+r, +g, +b, T);
      return out ? fn + '(' + out[0] + s1 + out[1] + s2 + out[2] : m;
    });
  }

  /* ───────── Tema aktif ───────── */
  function findDef(id) {
    for (var i = 0; i < DEFS.length; i++) if (DEFS[i].id === id) return DEFS[i];
    return DEFS[0];
  }

  function readSavedId() {
    try {
      var p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      return p && p.ui_theme ? String(p.ui_theme) : 'pink';
    } catch (_) { return 'pink'; }
  }

  var activeId = findDef(readSavedId()).id;
  var T = findDef(activeId).cfg;

  /* ───────── Penerapan ke DOM ───────── */
  var ATTRS = ['style', 'fill', 'stroke', 'stop-color', 'flood-color'];
  var ATTR_SEL = '[style],[fill],[stroke],[stop-color],[flood-color]';
  var attrOrig = (typeof WeakMap === 'function') ? new WeakMap() : null;

  // Hindari memproses <style> yang teksnya belum lengkap saat parser masih membacanya.
  function styleReady(el) {
    return !!el.nextSibling || document.readyState !== 'loading';
  }

  function doStyle(el) {
    if (el.__luxOut !== undefined && el.textContent === el.__luxOut) return; // keluaran kita sendiri
    if (!styleReady(el)) return;
    el.__luxOrig = el.textContent;
    var out = recolor(el.__luxOrig, T);
    el.__luxOut = out;
    if (el.textContent !== out) el.textContent = out;
  }

  // Dipakai saat tema berganti: selalu hitung ulang dari teks ASLI.
  function redoStyle(el) {
    if (el.__luxOrig === undefined) { doStyle(el); if (el.__luxOrig === undefined) return; }
    var out = recolor(el.__luxOrig, T);
    el.__luxOut = out;
    if (el.textContent !== out) el.textContent = out;
  }

  // Elemen (atau induknya) bertanda data-lux-keep tidak pernah diwarnai ulang (mis. swatch pemilih tema).
  function isKept(el) {
    return el.hasAttribute('data-lux-keep') || (el.closest && !!el.closest('[data-lux-keep]'));
  }

  function doAttrs(el) {
    if (!attrOrig || !el.getAttribute || isKept(el)) return;
    var rec = attrOrig.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a);
      if (!rec) { rec = {}; attrOrig.set(el, rec); }
      if (rec[a] === undefined || rec[a].out !== cur) rec[a] = { orig: cur, out: cur };
      var out = recolor(rec[a].orig, T);
      rec[a].out = out;
      if (cur !== out) el.setAttribute(a, out);
    }
  }

  function doNode(n) {
    if (n.nodeType === 3) {
      if (n.parentNode && n.parentNode.nodeName === 'STYLE') doStyle(n.parentNode);
      return;
    }
    if (n.nodeType !== 1) return;
    if (n.nodeName === 'STYLE') { doStyle(n); return; }
    doAttrs(n);
    if (n.querySelectorAll) {
      var styles = n.querySelectorAll('style'), i;
      for (i = 0; i < styles.length; i++) doStyle(styles[i]);
      var els = n.querySelectorAll(ATTR_SEL);
      for (i = 0; i < els.length; i++) doAttrs(els[i]);
    }
  }

  function sweep(redo) {
    var i, styles = document.getElementsByTagName('style');
    for (i = 0; i < styles.length; i++) (redo ? redoStyle : doStyle)(styles[i]);
    var els = document.querySelectorAll(ATTR_SEL);
    for (i = 0; i < els.length; i++) doAttrs(els[i]);
  }

  var observing = false;
  function startObserver() {
    if (observing || typeof MutationObserver !== 'function') return;
    observing = true;
    new MutationObserver(function (records) {
      if (!T) return;
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) doNode(added[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function apply(id) {
    activeId = findDef(id).id;
    T = findDef(activeId).cfg;
    document.documentElement.setAttribute('data-lux-theme', activeId);
    startObserver();
    sweep(true);
  }

  function swatch(def) {
    var base = [[216, 75, 126], [229, 184, 66]];
    if (!def.cfg) return ['#d84b7e', '#e5b842'];
    return base.map(function (c) {
      var o = mapRgb(c[0], c[1], c[2], def.cfg) || c;
      return '#' + hex2(o[0]) + hex2(o[1]) + hex2(o[2]);
    });
  }

  window.LuxTheme = {
    themes: DEFS.map(function (d) { var sw = swatch(d); return { id: d.id, name: d.name, c1: sw[0], c2: sw[1] }; }),
    current: function () { return activeId; },
    apply: apply,
    _recolor: function (text, id) { return recolor(text, findDef(id).cfg); } // untuk pengujian
  };

  document.documentElement.setAttribute('data-lux-theme', activeId);
  if (T) {
    startObserver();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { sweep(false); });
    else sweep(false);
  }
})();
