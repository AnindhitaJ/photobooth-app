/**
 * LUX Photobooth — Popup halaman depan
 *
 * Isi popup (judul, deskripsi, banner, aktif/nonaktif) diatur di CMS dan disimpan di
 * tabel public.site_popup (baris id='main'). Dibaca oleh semua orang, termasuk yang belum login.
 *
 * - Tampil otomatis di halaman yang memuat file ini (login & dashboard).
 * - Setelah ditutup, tidak muncul lagi di perangkat itu sampai CMS menyimpan versi baru.
 * - Semua teks dirender sebagai teks biasa (aman dari injeksi HTML).
 *
 * API (window.LuxPopup):
 *   init()              -> ambil data lalu tampilkan jika aktif & belum ditutup
 *   show(data, opts)    -> tampilkan popup dari data {title, description, banner_url, version}
 *                          opts.preview = true -> tidak mencatat "sudah ditutup" (dipakai CMS)
 *   close()             -> tutup popup yang sedang tampil
 *
 * Set window.LUX_POPUP_NO_AUTO = true sebelum memuat file ini untuk mematikan tampil otomatis.
 */
(function () {
  'use strict';

  var CFG = window.LUX_CONFIG || {};
  var API_URL = CFG.SUPABASE_URL || '';
  var API_KEY = CFG.SUPABASE_ANON_KEY || '';
  var DISMISS_KEY = 'lux_popup_dismissed';
  var STYLE_ID = 'lux-popup-style';

  var current = null; // { root, data, preview, prevOverflow, onKey }

  function safeImage(u) {
    return (typeof u === 'string' && /^(https:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(u)) ? u : '';
  }

  function stamp(d) { return 'main:' + (d && d.version ? d.version : 1); }

  function wasDismissed(d) {
    try { return localStorage.getItem(DISMISS_KEY) === stamp(d); } catch (_) { return false; }
  }

  function remember(d) {
    try { localStorage.setItem(DISMISS_KEY, stamp(d)); } catch (_) {}
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.lux-pop-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;',
      'padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));',
      'background:rgba(29,53,87,.55);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);',
      'opacity:0;transition:opacity .22s ease;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;}',
      '.lux-pop-backdrop.show{opacity:1;}',
      '.lux-pop{position:relative;width:100%;max-width:440px;max-height:90vh;max-height:90dvh;display:flex;flex-direction:column;',
      'background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(29,53,87,.38);',
      'transform:translateY(14px) scale(.96);transition:transform .25s cubic-bezier(.2,.9,.3,1.2);}',
      '.lux-pop-backdrop.show .lux-pop{transform:none;}',
      '.lux-pop-banner{flex:none;background:#fff0f6;}',
      '.lux-pop-banner img{display:block;width:100%;max-height:min(260px,40vh);object-fit:cover;}',
      '.lux-pop-x{position:absolute;top:10px;right:10px;z-index:2;width:36px;height:36px;border:0;border-radius:50%;',
      'background:rgba(255,255,255,.92);color:#1D3557;font-size:18px;font-weight:900;line-height:1;cursor:pointer;',
      'box-shadow:0 3px 12px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;}',
      '.lux-pop-body{padding:20px 22px 8px;overflow-y:auto;-webkit-overflow-scrolling:touch;}',
      '.lux-pop-title{margin:0 0 8px;font-size:21px;line-height:1.25;font-weight:900;color:#1D3557;letter-spacing:-.3px;word-break:break-word;}',
      '.lux-pop-desc{margin:0;font-size:14.5px;line-height:1.65;color:#4a5d7c;white-space:pre-line;word-break:break-word;}',
      '.lux-pop-actions{flex:none;padding:14px 22px calc(18px + env(safe-area-inset-bottom));}',
      '.lux-pop-btn{display:block;width:100%;border:0;border-radius:999px;padding:14px 18px;font:inherit;font-size:15px;font-weight:900;',
      'color:#fff;cursor:pointer;background:linear-gradient(135deg,#D84B7E,#E5B842);box-shadow:0 8px 22px rgba(216,75,126,.3);}',
      '.lux-pop-preview-tag{position:absolute;top:10px;left:10px;z-index:2;background:#1D3557;color:#fff;font-size:11px;font-weight:800;',
      'letter-spacing:1px;padding:5px 10px;border-radius:999px;}',
      '@media (prefers-reduced-motion:reduce){.lux-pop-backdrop,.lux-pop{transition:none;}}'
    ].join('');
    document.head.appendChild(st);
  }

  function close() {
    if (!current) return;
    var c = current; current = null;
    if (!c.preview) remember(c.data);
    document.removeEventListener('keydown', c.onKey, true);
    c.root.classList.remove('show');
    document.documentElement.style.overflow = c.prevOverflow;
    setTimeout(function () { if (c.root.parentNode) c.root.parentNode.removeChild(c.root); }, 240);
  }

  function show(data, opts) {
    opts = opts || {};
    data = data || {};
    var title = String(data.title || '').trim();
    var desc = String(data.description || '').trim();
    var img = safeImage(data.banner_url);
    if (!title && !desc && !img) return null;

    if (current) close();
    injectStyle();

    var root = document.createElement('div');
    root.className = 'lux-pop-backdrop';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    if (title) root.setAttribute('aria-label', title);

    var box = document.createElement('div');
    box.className = 'lux-pop';

    var x = document.createElement('button');
    x.type = 'button'; x.className = 'lux-pop-x'; x.setAttribute('aria-label', 'Tutup'); x.textContent = '✕';
    x.onclick = close;
    box.appendChild(x);

    if (opts.preview) {
      var tag = document.createElement('div');
      tag.className = 'lux-pop-preview-tag'; tag.textContent = 'PRATINJAU';
      box.appendChild(tag);
    }

    if (img) {
      var wrap = document.createElement('div');
      wrap.className = 'lux-pop-banner';
      var im = document.createElement('img');
      im.alt = '';
      im.onerror = function () { wrap.style.display = 'none'; };
      im.src = img;
      wrap.appendChild(im);
      box.appendChild(wrap);
    }

    if (title || desc) {
      var body = document.createElement('div');
      body.className = 'lux-pop-body';
      if (title) { var h = document.createElement('h2'); h.className = 'lux-pop-title'; h.textContent = title; body.appendChild(h); }
      if (desc) { var p = document.createElement('p'); p.className = 'lux-pop-desc'; p.textContent = desc; body.appendChild(p); }
      box.appendChild(body);
    }

    var actions = document.createElement('div');
    actions.className = 'lux-pop-actions';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'lux-pop-btn'; btn.textContent = 'Mengerti';
    btn.onclick = close;
    actions.appendChild(btn);
    box.appendChild(actions);

    root.appendChild(box);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });

    var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);

    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(root);

    current = { root: root, data: data, preview: !!opts.preview, prevOverflow: prevOverflow, onKey: onKey };
    requestAnimationFrame(function () { root.classList.add('show'); try { btn.focus({ preventScroll: true }); } catch (_) {} });
    return root;
  }

  function fetchConfig() {
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 6000) : null;
    return fetch(API_URL + '/rest/v1/site_popup?id=eq.main&select=*', {
      headers: { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { return (rows && rows[0]) || null; })
      .then(function (row) { if (timer) clearTimeout(timer); return row; },
            function (err) { if (timer) clearTimeout(timer); throw err; });
  }

  function init() {
    if (!API_URL || !API_KEY) return;
    fetchConfig().then(function (d) {
      if (!d || d.enabled !== true) return;
      if (!(d.title || d.description || safeImage(d.banner_url))) return;
      if (wasDismissed(d)) return;
      setTimeout(function () { show(d); }, 350);
    }).catch(function () { /* diam: popup tidak boleh mengganggu halaman */ });
  }

  window.LuxPopup = { init: init, show: show, close: close };

  if (!window.LUX_POPUP_NO_AUTO) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
