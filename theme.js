/**
 * LUX Photobooth — Tema warna aplikasi (per akun)
 *
 * Tema disimpan di kolom profiles.ui_theme (Supabase) dan di-cache di localStorage,
 * jadi langsung terpasang sebelum halaman tampil (tanpa kedip).
 * Default: 'pink'. Semua CSS memakai var(--t-*, <warna pink>) sehingga tanpa file
 * ini tampilan tetap pink seperti semula.
 *
 * API (window.LuxTheme): themes, ids, get(id), current(), apply(id), sync()
 */
(function () {
  'use strict';

  var CACHE_KEY = 'lux_ui_theme';
  var PROFILE_KEY = 'sb_profile';

  // main/mainDark = warna utama, accent = warna aksen, ink = teks gelap & tombol gelap,
  // bg = latar halaman, soft = latar lembut, border/border2 = garis, muted/muted2 = teks sekunder
  var THEMES = [
    { id: 'pink', name: 'Pink Blossom', emoji: '🌸',
      main: '#D84B7E', mainDark: '#C83B6F', accent: '#E5B842', accentDark: '#C9972A', ink: '#1D3557',
      bg: '#FFF8FC', soft: '#FFF0F6', border: '#F5C6DA', border2: '#FAD0E4', muted: '#6B7FA3', muted2: '#7A90B8' },
    { id: 'blue', name: 'Ocean Blue', emoji: '🌊',
      main: '#2F80ED', mainDark: '#1F63BF', accent: '#FFC857', accentDark: '#D49A1E', ink: '#14305A',
      bg: '#F5F9FF', soft: '#EAF2FF', border: '#C9DDF7', border2: '#D3E3F8', muted: '#6783A8', muted2: '#7F96B8' },
    { id: 'brown', name: 'Cocoa Brown', emoji: '🍫',
      main: '#8B5A3C', mainDark: '#6F4429', accent: '#D9A441', accentDark: '#B07D1E', ink: '#3E2723',
      bg: '#FBF6F1', soft: '#F5EAE0', border: '#E3CDB8', border2: '#EAD8C6', muted: '#8A6F5E', muted2: '#A08673' },
    { id: 'green', name: 'Fresh Green', emoji: '🌿',
      main: '#2E9E6B', mainDark: '#1F7A50', accent: '#F2C14E', accentDark: '#C99A22', ink: '#17402F',
      bg: '#F4FBF7', soft: '#E6F6EE', border: '#BFE5D2', border2: '#CDEBDD', muted: '#5F8A75', muted2: '#7BA18C' },
    { id: 'purple', name: 'Lavender', emoji: '🔮',
      main: '#8B5CF6', mainDark: '#6D3FD6', accent: '#F5C451', accentDark: '#C99A22', ink: '#2E1F5C',
      bg: '#FAF7FF', soft: '#F1EAFE', border: '#DACBF7', border2: '#E3D7FA', muted: '#7C6BA8', muted2: '#968AB9' },
    { id: 'red', name: 'Cherry Red', emoji: '🍒',
      main: '#D6323F', mainDark: '#A9202C', accent: '#F2B33D', accentDark: '#C98A1A', ink: '#4A1218',
      bg: '#FFF7F7', soft: '#FFECEC', border: '#F5C2C6', border2: '#F8CFD2', muted: '#A06A70', muted2: '#B4868B' },
    { id: 'orange', name: 'Sunset Orange', emoji: '🌅',
      main: '#F26B1D', mainDark: '#C94F0A', accent: '#FFC83D', accentDark: '#D49A00', ink: '#4A2208',
      bg: '#FFF9F3', soft: '#FFEFE0', border: '#F9D2B3', border2: '#FBDDC4', muted: '#A77B5A', muted2: '#BC9578' },
    { id: 'teal', name: 'Teal Lagoon', emoji: '🐚',
      main: '#0E9AA7', mainDark: '#0A7480', accent: '#F4B942', accentDark: '#C98F1A', ink: '#0D3B44',
      bg: '#F2FBFC', soft: '#E0F5F7', border: '#B6E2E7', border2: '#C7EAEE', muted: '#5E8F96', muted2: '#7BA6AC' },
    { id: 'rosegold', name: 'Rose Gold', emoji: '🪞',
      main: '#B76E79', mainDark: '#96525D', accent: '#E0B77E', accentDark: '#B88A4E', ink: '#4A2C33',
      bg: '#FDF7F5', soft: '#F8EBE8', border: '#EBCFCB', border2: '#F0D9D5', muted: '#9A7078', muted2: '#B08A91' },
    { id: 'graphite', name: 'Graphite', emoji: '🪨',
      main: '#475569', mainDark: '#334155', accent: '#F59E0B', accentDark: '#C77D00', ink: '#1E293B',
      bg: '#F8FAFC', soft: '#EEF2F6', border: '#D5DCE5', border2: '#DFE5EC', muted: '#64748B', muted2: '#8392A5' }
  ];

  var IDS = THEMES.map(function (t) { return t.id; });

  function get(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return THEMES[0];
  }

  function rgb(hex) {
    var h = String(hex).replace('#', '');
    var n = parseInt(h, 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  function readProfileTheme() {
    try {
      var p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if (p && typeof p === 'object') return p.ui_theme && IDS.indexOf(p.ui_theme) >= 0 ? p.ui_theme : 'pink';
    } catch (_) {}
    return null; // belum ada profil (mis. halaman login)
  }

  function current() {
    var fromProfile = readProfileTheme();
    if (fromProfile) return fromProfile;
    try {
      var cached = localStorage.getItem(CACHE_KEY);
      if (cached && IDS.indexOf(cached) >= 0) return cached;
    } catch (_) {}
    return 'pink';
  }

  function apply(id) {
    var t = get(id);
    var s = document.documentElement.style;
    var map = {
      '--t-main': t.main, '--t-main-dark': t.mainDark,
      '--t-accent': t.accent, '--t-accent-dark': t.accentDark,
      '--t-ink': t.ink, '--t-bg': t.bg, '--t-soft': t.soft,
      '--t-border': t.border, '--t-border2': t.border2,
      '--t-muted': t.muted, '--t-muted2': t.muted2,
      '--t-main-rgb': rgb(t.main), '--t-accent-rgb': rgb(t.accent),
      '--t-ink-rgb': rgb(t.ink), '--t-bg-rgb': rgb(t.bg)
    };
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) s.setProperty(k, map[k]);
    document.documentElement.setAttribute('data-lux-theme', t.id);
    try { localStorage.setItem(CACHE_KEY, t.id); } catch (_) {}

    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', t.ink);
    return t;
  }

  // Dipanggil ulang setelah profil di-refresh / disimpan (lihat auth.js).
  function sync() { return apply(current()); }

  window.LuxTheme = { themes: THEMES, ids: IDS, get: get, current: current, apply: apply, sync: sync };

  apply(current());

  // Tema ikut berubah jika profil diperbarui dari tab lain.
  window.addEventListener('storage', function (e) {
    if (e.key === PROFILE_KEY) sync();
  });
})();
