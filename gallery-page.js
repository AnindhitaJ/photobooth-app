  const BUCKET   = 'photobooth';
  const PASSWORD = '123456';

  // Domain publik R2 wajib diambil dari config.js agar tidak kembali ke r2.dev.
  const R2_PUBLIC_URL = String(
    window.LUX_CONFIG?.R2_PUBLIC_URL || 'https://media.lux-photo.web.id'
  ).replace(/\/+$/, '');

  const SUPABASE_STORAGE_PUBLIC_URL =
    `${String(SUPABASE_URL).replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}`;

  // Tepat 17 Juli 2026 pukul 00:00:00 WIB = 16 Juli 2026 pukul 17:00:00 UTC.
  const R2_MIGRATION_DATE_MS = Date.parse('2026-07-16T17:00:00.000Z');

  function normalizeObjectPath(path) {
    return String(path || '').trim().replace(/^\/+/, '');
  }

  // Mendukung tiga format nama file:
  // 1. UUID_timestamp_nama-file
  // 2. anon_timestamp_nama-file
  // 3. timestamp_nama-file (format lama)
  function parsePhotoFilePath(path) {
    const cleanPath = normalizeObjectPath(path);
    const fname = cleanPath.split('/').pop() || '';

    const accountFmt = fname.match(
      /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|anon)_(\d{13})_(.+)$/i
    );
    const oldFmt = fname.match(/^(\d{13})_(.+)$/);
    const match = accountFmt || oldFmt;

    if (!match) return null;

    const ts = Number(match[1]);
    if (!Number.isFinite(ts)) return null;

    return {
      cleanPath,
      ts,
      rest: match[2]
    };
  }

  function getStorageTimestamp(path, createdAt) {
    // Timestamp pada nama file menjadi sumber utama agar batas migrasi konsisten
    // dengan waktu sesi foto. created_at hanya dipakai sebagai fallback.
    const parsedPath = parsePhotoFilePath(path);
    if (parsedPath) return parsedPath.ts;

    const createdMs = Date.parse(createdAt || '');
    return Number.isFinite(createdMs) ? createdMs : 0;
  }

  function getStorageUrlByDate(path, createdAt) {
    const rawPath = String(path || '').trim();
    if (/^https?:\/\//i.test(rawPath)) return rawPath;

    const cleanPath = normalizeObjectPath(rawPath);
    const storageTimestamp = getStorageTimestamp(cleanPath, createdAt);
    const baseUrl = storageTimestamp >= R2_MIGRATION_DATE_MS
      ? R2_PUBLIC_URL
      : SUPABASE_STORAGE_PUBLIC_URL;

    return `${baseUrl}/${cleanPath}`;
  }

  // sessions = [ { ts, date, dateStr, strip:{url,path}, individuals:[{url,path}], gif:{url,path}|null } ]
  let allSessions = [];
  let filtered    = [];
  let selected    = []; // ts yang dipilih untuk hapus
  let mode        = 'view';
  let activeSess  = null; // session yang sedang dibuka di modal
  let activeStripBlob = null;
  let activeStripBlobURL = '';
  let activeStripPrefetchToken = 0;
  let currentProductFilter = 'all';
  const SESSION_RENDER_BATCH = 24;
  let visibleSessionCount = SESSION_RENDER_BATCH;

  // ── PASSWORD ────────────────────────────────────────────────────────
  function checkPass() {
    // Verifikasi dengan password login
    reAuthGallery(document.getElementById('pwInput').value);
  }

  let currentUserId = null; // simpan user_id aktif setelah reAuth

  async function reAuthGallery(password) {
    const currentSession = Auth.getSession();
    if (!currentSession?.user?.id) {
      window.location.replace('/login');
      return;
    }

    const err = document.getElementById('pwError');
    const input = document.getElementById('pwInput');
    const currentUserIdBeforeVerify = currentSession.user.id;
    const email =
      currentSession.user.email ||
      localStorage.getItem('sb_user_email') ||
      '';

    err.style.display = 'none';

    if (!email) {
      err.textContent = '❌ Email akun tidak ditemukan. Silakan login ulang.';
      err.style.display = 'block';
      return;
    }

    if (!password) {
      err.textContent = '❌ Masukkan password login.';
      err.style.display = 'block';
      input.focus();
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.access_token || !data?.user?.id) {
        throw new Error(
          data?.error_description ||
          data?.msg ||
          data?.error ||
          'Password salah atau akun tidak dapat diverifikasi.'
        );
      }

      // Password boleh membuka galeri hanya untuk akun yang sedang aktif.
      if (data.user.id !== currentUserIdBeforeVerify) {
        throw new Error('Akun hasil verifikasi berbeda dari akun yang sedang aktif.');
      }

      // Normalisasi lock yang tertinggal, tetapi hanya setelah UUID akun
      // hasil verifikasi dipastikan sama dengan UUID session sebelumnya.
      localStorage.setItem('sb_account_lock', currentUserIdBeforeVerify);
      sessionStorage.setItem('lux_flow_owner_id', currentUserIdBeforeVerify);

      if (typeof Auth.setSession === 'function') {
        Auth.setSession(data, { requireSameUser: true });
      } else {
        // Kompatibilitas jika browser masih sempat memuat auth.js versi lama.
        localStorage.setItem('sb_session', JSON.stringify(data));
        localStorage.setItem('sb_user_id', data.user.id);
        localStorage.setItem('sb_user_email', data.user.email || email);
      }

      currentUserId = data.user.id;

      if (typeof Auth.refreshProfile === 'function') {
        await Auth.refreshProfile();
      }

      document.getElementById('lockScreen').style.display = 'none';
      document.getElementById('galleryScreen').style.display = 'block';
      await loadPhotos();

    } catch (e) {
      console.error('Gallery re-auth failed:', e);
      err.textContent = `❌ ${e?.message || 'Gagal verifikasi'}`;
      err.style.display = 'block';
      input.value = '';
      input.focus();
    }
  }

  // ── LOAD & GROUP ─────────────────────────────────────────────────────
  async function loadPhotos() {
    try {
      // Pastikan token yang dipakai Galeri masih valid dan berasal dari akun aktif.
      // Ini penting karena Result baru saja menulis photo_sessions memakai token aktif.
      if (typeof Auth.ensureValidSession === 'function') {
        await Auth.ensureValidSession({ forceServerCheck: true });
      }

      const token = Auth.getToken();
      currentUserId = Auth.getUserId();

      if (!token || !currentUserId) {
        throw new Error('Session login tidak tersedia. Silakan login ulang.');
      }

      // Query dibuat eksplisit per user selain tetap dilindungi RLS.
      // cache:no-store mencegah browser menampilkan daftar photo_sessions lama
      // sesaat setelah foto baru disimpan dari halaman Result.
      const galleryQuery = new URLSearchParams({
        select: 'file_path,product_type,template_name,template_category,created_at,session_id',
        user_id: `eq.${currentUserId}`,
        order: 'created_at.desc'
      });

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/photo_sessions?${galleryQuery.toString()}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Photo sessions gagal (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`);
      }

      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error('Respons photo_sessions tidak valid');
      console.log('[Gallery] photo_sessions terbaru:', {
        userId: currentUserId,
        count: rows.length,
        newest: rows[0] || null
      });

      // Group by sesi — pakai timestamp dari nama file sebagai session key
      const sessMap = {};
      rows.forEach(row => {
        const path = row.file_path; // contoh: results/1780108564751_strip.jpg
        if (!path) return;

        const parsedFile = parsePhotoFilePath(path);
        if (!parsedFile) return; // skip file tidak dikenal

        const { ts, rest } = parsedFile;

        const key = ts;
        if (!sessMap[key]) sessMap[key] = {
          ts,
          strip: null,
          individuals: [],
          gif: null,
          productType: row.product_type || '',
          templateName: row.template_name || '',
          templateCategory: row.template_category || ''
        };
        if (row.product_type) sessMap[key].productType = row.product_type;
        if (row.template_name) sessMap[key].templateName = row.template_name;
        if (row.template_category) sessMap[key].templateCategory = row.template_category;

        const url = getStorageUrlByDate(path, row.created_at);

        if (rest.startsWith('strip') || rest.startsWith('foto.')) {
          if (!sessMap[key].strip) sessMap[key].strip = { url, path };
        } else if (rest.startsWith('foto-')) {
          sessMap[key].individuals.push({ url, path, name: rest });
        } else if (rest.startsWith('animated')) {
          sessMap[key].gif = { url, path };
        }
      });

      // Sort individuals
      Object.values(sessMap).forEach(s => {
        s.individuals.sort((a, b) => a.name.localeCompare(b.name));
      });

      allSessions = Object.values(sessMap)
        .filter(s => s.strip)
        .sort((a, b) => b.ts - a.ts)
        .map(s => {
          const d = new Date(s.ts);
          return { ...s, date: d, dateStr: d.toISOString().slice(0, 10) };
        });

      // Metadata versi lama tidak menyimpan product_type. Pulihkan jenis produk
      // dari rasio hasil final: Photobox 4R sekitar 2:3, Photostrip sekitar 1:3.
      await hydrateLegacyProductTypes(allSessions);

      document.getElementById('loadingState').style.display = 'none';
      applyFilter();

    } catch(e) {
      document.getElementById('loadingState').innerHTML = `
        <div style="font-size:44px">⚠️</div>
        <div style="font-weight:700;color:var(--text)">Gagal memuat foto</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">${e.message}</div>
        <button onclick="loadPhotos()" style="margin-top:16px;padding:10px 24px;border-radius:50px;background:var(--orange);color:white;border:none;font-weight:700;cursor:pointer;">🔄 Coba Lagi</button>
      `;
    }
  }


  function normalizeProductType(s) {
    const raw = String(s?.productType || '').trim().toLowerCase();
    const cat = String(s?.templateCategory || '').trim().toLowerCase();
    const name = String(s?.templateName || '').trim().toLowerCase();
    const hasTemplateMetadata = Boolean(cat || name);

    if (raw === 'photobox') return 'photobox';
    if (cat.includes('photobox') || cat.includes('4r') || name.includes('photobox') || name.includes('4r')) return 'photobox';
    if (raw === 'photostrip' && hasTemplateMetadata) return 'photostrip';
    if (s?.inferredProductType === 'photobox' || s?.inferredProductType === 'photostrip') {
      return s.inferredProductType;
    }
    if (raw === 'photostrip') return 'photostrip';
    return 'photostrip';
  }

  function readImageDimensions(src) {
    return new Promise(resolve => {
      const img = new Image();
      let settled = false;
      let timeoutId = null;
      const done = value => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
        resolve(value);
      };
      timeoutId = setTimeout(() => done(null), 3000);
      img.onload = () => done({
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0
      });
      img.onerror = () => done(null);
      // Tidak memakai crossOrigin karena hanya membaca dimensi natural, bukan canvas.
      img.src = src;
    });
  }

  async function hydrateLegacyProductTypes(sessions) {
    const pending = sessions.filter(s => {
      const raw = String(s?.productType || '').trim().toLowerCase();
      const cat = String(s?.templateCategory || '').trim().toLowerCase();
      const name = String(s?.templateName || '').trim().toLowerCase();
      const hasTemplateMetadata = Boolean(cat || name);
      return raw !== 'photobox' && !hasTemplateMetadata;
    });

    const concurrency = 12;
    for (let i = 0; i < pending.length; i += concurrency) {
      await Promise.all(pending.slice(i, i + concurrency).map(async session => {
        const dimensions = await readImageDimensions(session?.strip?.url || '');
        if (!dimensions?.width || !dimensions?.height) return;
        const ratio = dimensions.width / dimensions.height;
        // Photobox portrait 4R ≈ 0,667; photostrip ≈ 0,333.
        session.inferredProductType = ratio >= 0.52 ? 'photobox' : 'photostrip';
      }));
    }
  }

  function productLabel(s) {
    return normalizeProductType(s) === 'photobox' ? '🖼️ Photobox 4R' : '🎞️ Photostrip';
  }

  function setProductFilter(type) {
    currentProductFilter = type || 'all';
    document.getElementById('prodAll').classList.toggle('active', currentProductFilter === 'all');
    document.getElementById('prodPhotostrip').classList.toggle('active', currentProductFilter === 'photostrip');
    document.getElementById('prodPhotobox').classList.toggle('active', currentProductFilter === 'photobox');
    applyFilter();
  }


  // ── FILTER ───────────────────────────────────────────────────────────
  function applyFilter() {
    const dv = document.getElementById('filterDate').value;
    document.getElementById('btnClearFilter').style.display = dv ? 'block' : 'none';
    filtered = allSessions.filter(s => {
      const dateOk = dv ? s.dateStr === dv : true;
      const productOk = currentProductFilter === 'all' ? true : normalizeProductType(s) === currentProductFilter;
      return dateOk && productOk;
    });
    selected = [];
    visibleSessionCount = SESSION_RENDER_BATCH;
    updateActionBar();
    renderGrid();
  }
  function clearFilter() {
    document.getElementById('filterDate').value = '';
    applyFilter();
  }

  // ── MODE ─────────────────────────────────────────────────────────────
  function setMode(m) {
    mode = m;
    selected = [];
    document.getElementById('tabView').classList.toggle('active', m === 'view');
    document.getElementById('tabPrint').classList.toggle('active', m === 'print');
    document.getElementById('tabDelete').classList.toggle('active', m === 'delete');
    updateActionBar();
    renderGrid();
  }

  function getGalleryThumbnailURL(session) {
    // R2 tidak memiliki file _thumb.jpg.
    // Gunakan strip original dari Cloudflare R2.
    return session?.strip?.url || '';
  }

  function useOriginalGalleryImage(img) {
    if (!img || img.dataset.fallbackUsed === '1') return;
    img.dataset.fallbackUsed = '1';
    const fallback = decodeURIComponent(img.dataset.fallback || '');
    if (fallback) img.src = fallback;
  }

  function loadMoreSessions() {
    visibleSessionCount += SESSION_RENDER_BATCH;
    renderGrid();
  }

  // ── RENDER ───────────────────────────────────────────────────────────
  function renderGrid() {
    const grid  = document.getElementById('sessionsGrid');
    const empty = document.getElementById('emptyState');
    document.getElementById('countBadge').textContent = filtered.length + ' sesi';

    if (!filtered.length) {
      grid.innerHTML = '';
      document.getElementById('loadMoreWrap').style.display = 'none';
      empty.style.display = 'block';
      const emptySub = document.getElementById('emptySub');
      if (emptySub) emptySub.textContent = allSessions.length
        ? 'Tidak ada sesi untuk filter yang dipilih.'
        : 'Belum ada sesi foto tersimpan. Kalau foto lama hilang setelah cleanup metadata, jalankan SQL restore v61.';
      return;
    }
    empty.style.display = 'none';

    const visibleSessions = filtered.slice(0, visibleSessionCount);
    document.getElementById('loadMoreWrap').style.display =
      visibleSessionCount < filtered.length ? 'flex' : 'none';

    grid.innerHTML = visibleSessions.map(s => {
      const isMarked = selected.includes(s.ts);
      const dateLabel = s.date.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
      const timeLabel = s.date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
      const indCount  = s.individuals.length;
      let cls = 'session-card';
      if (isMarked) cls += ' marked-delete';
      if (mode === 'print' && selected.includes(s.ts)) cls += ' print-selected';

      return `
        <div class="${cls}" onclick="cardClick(${s.ts})" data-ts="${s.ts}">
          <img class="strip-thumb" src="${getGalleryThumbnailURL(s)}"
               data-fallback="${encodeURIComponent(s.strip.url)}"
               onerror="useOriginalGalleryImage(this)"
               alt="strip" loading="lazy" decoding="async" fetchpriority="low">
          <div class="del-badge">🗑</div>
          <div class="print-num-badge" id="pnb-${s.ts}">${selected.includes(s.ts) && mode==='print' ? selected.indexOf(s.ts)+1 : ''}</div>
          <div class="session-footer">
            <div>
              <div class="session-date">${dateLabel}</div>
              <div class="session-date" style="opacity:0.7">${timeLabel}</div>
              <div class="product-badge">${productLabel(s)}</div>
            </div>
            ${indCount ? `<div class="session-count">${indCount} foto</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // ── CARD CLICK ───────────────────────────────────────────────────────
  function cardClick(ts) {
    if (mode === 'delete') {
      toggleDelete(ts);
    } else if (mode === 'print') {
      togglePrintSelect(ts);
    } else {
      const sess = allSessions.find(s => s.ts === ts);
      if (sess) openSessionModal(sess);
    }
  }

  // ── DELETE SELECTION ─────────────────────────────────────────────────
  function toggleDelete(ts) {
    const i = selected.indexOf(ts);
    if (i > -1) selected.splice(i, 1); else selected.push(ts);
    updateActionBar();
    renderGrid();
  }
  function clearSelection() { selected = []; updateActionBar(); renderGrid(); }
  function updateActionBar() {
    const bar = document.getElementById('actionBar');
    document.getElementById('actionCount').textContent = selected.length;
    const delBtn   = document.getElementById('btnBarDel');
    const printBtn = document.getElementById('btnBarPrint');
    const label    = document.getElementById('actionLabel');
    if (mode === 'delete') {
      delBtn.style.display = 'block'; printBtn.style.display = 'none';
      label.textContent = 'sesi dipilih';
    } else if (mode === 'print') {
      delBtn.style.display = 'none'; printBtn.style.display = 'block';
      const first = selected.length ? allSessions.find(s => s.ts === selected[0]) : null;
      label.textContent = first && normalizeProductType(first) === 'photobox'
        ? '/ 1 photobox dipilih'
        : `/ ${selected.length} dari maksimal 2 strip dipilih`;
    }
    bar.classList.toggle('visible', selected.length > 0 && mode !== 'view');
  }

  // ── SESSION MODAL ────────────────────────────────────────────────────
  function setShareStripButton(text, disabled = false) {
    const button = document.getElementById('btnShareStrip');
    if (!button) return;
    button.textContent = text;
    button.disabled = disabled;
  }

  function restoreShareStripButton() {
    if (!activeSess) return;
    const button = document.getElementById('btnShareStrip');
    if (!button) return;

    // Tombol harus selalu bisa ditekan. Prefetch hanya peningkatan kualitas agar
    // browser yang mendukung file sharing dapat membagikan file asli. Jika file
    // belum siap, shareStrip() langsung membagikan URL tanpa menunggu jaringan.
    if (activeStripBlob && LuxMedia.supportsFileShare(LuxMedia.inferMimeType(activeStripBlob, activeStripBlobURL))) {
      setShareStripButton('📤 Share Strip', false);
      button.title = 'Bagikan file foto strip';
      button.removeAttribute('aria-busy');
    } else if (navigator.share) {
      setShareStripButton('📤 Share Strip', false);
      button.title = 'Bagikan tautan sekarang; file asli disiapkan di latar belakang';
      if (activeStripBlobURL && !activeStripBlob) button.setAttribute('aria-busy', 'true');
      else button.removeAttribute('aria-busy');
    } else {
      setShareStripButton('📤 Share Strip', false);
      button.title = 'Buka pilihan berbagi';
      button.removeAttribute('aria-busy');
    }

    const status = document.getElementById('shareModalStatus');
    if (status && document.getElementById('shareModal')?.classList.contains('open')) {
      status.textContent = activeStripBlob
        ? 'File foto asli siap dibagikan.'
        : 'Link foto siap dibagikan. File asli masih disiapkan di latar belakang.';
    }
  }

  function prepareActiveStrip(url) {
    const token = ++activeStripPrefetchToken;
    activeStripBlob = null;
    activeStripBlobURL = String(url || '');

    // Jangan pernah menonaktifkan tombol ketika menunggu file. Pada koneksi
    // lambat atau rewrite media bermasalah, pengguna tetap dapat share URL.
    restoreShareStripButton();

    // Browser tanpa file sharing tidak perlu menarik file besar saat modal dibuka.
    if (!LuxMedia.supportsFileShare()) return;

    LuxMedia.prefetch(activeStripBlobURL)
      .then(blob => {
        if (token !== activeStripPrefetchToken || !activeSess) return;
        activeStripBlob = blob;
        restoreShareStripButton();
      })
      .catch(error => {
        if (token !== activeStripPrefetchToken || !activeSess) return;
        console.warn('[gallery] Gagal menyiapkan file share:', error);
        activeStripBlob = null;
        restoreShareStripButton();
      });
  }

  function openSessionModal(sess) {
    activeSess = sess;
    const dateLabel = sess.date.toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    const timeLabel = sess.date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

    document.getElementById('smTitle').textContent = 'Sesi ' + timeLabel;
    document.getElementById('smDate').textContent  = dateLabel;
    document.getElementById('smStripImg').src      = LuxMedia.toBrowserURL(sess.strip.url);

    // Individual photos
    const grid = document.getElementById('smIndGrid');
    const label = document.getElementById('smIndLabel');
    if (sess.individuals.length) {
      label.textContent = `📸 Foto Individual (${sess.individuals.length})`;
      grid.innerHTML = sess.individuals.map((p, i) => {
        const previewURL = LuxMedia.toBrowserURL(p.url);
        return `
          <div class="sm-photo-item" onclick="downloadIndividual('${p.url}', ${i+1})">
            <img src="${previewURL}" alt="foto ${i+1}" loading="lazy">
            <div class="sm-photo-dl">⬇️</div>
          </div>
        `;
      }).join('');
    } else {
      label.textContent = '📸 Foto Individual';
      grid.innerHTML = `<div class="sm-no-individual" style="grid-column:1/-1">Foto individual tidak tersedia untuk sesi ini</div>`;
    }

    document.getElementById('sessionModal').classList.add('open');
    prepareActiveStrip(sess.strip.url);
  }

  function closeSessionModal() {
    closeShareModal();
    document.getElementById('sessionModal').classList.remove('open');
    activeStripPrefetchToken += 1;
    activeStripBlob = null;
    activeStripBlobURL = '';
    activeSess = null;
  }

  // Tutup modal kalau klik backdrop
  document.getElementById('sessionModal').addEventListener('click', function(e) {
    if (e.target === this) closeSessionModal();
  });

  // ── DOWNLOAD / SHARE ─────────────────────────────────────────────────
  async function downloadStrip() {
    if (!activeSess) return;
    const session = activeSess;
    const button = document.getElementById('btnDownloadStrip');
    if (button) button.disabled = true;
    try {
      await triggerDownload(session.strip.url, `lux-strip-${session.ts}.jpg`);
      showToast('✅ Strip didownload!', 'success');
    } catch (error) {
      showToast('Gagal download: ' + (error.message || error));
    } finally {
      if (button) button.disabled = false;
    }
  }

  function shareStrip() {
    // Tombol utama hanya membuka modal internal. Ini tidak bergantung pada
    // navigator.share, dukungan OS, mode incognito, atau kesiapan Blob.
    if (!activeSess) return;
    openShareModal();
  }

  function openShareModal() {
    if (!activeSess) return;
    const modal = document.getElementById('shareModal');
    const preview = document.getElementById('shareModalPreview');
    const filename = document.getElementById('shareModalFilename');
    const status = document.getElementById('shareModalStatus');
    const nativeBtn = document.getElementById('btnNativeShare');

    preview.src = LuxMedia.toBrowserURL(activeSess.strip.url);
    filename.textContent = `lux-strip-${activeSess.ts}.jpg`;
    status.textContent = activeStripBlob
      ? 'File foto asli siap dibagikan.'
      : 'Link foto siap dibagikan. File asli disiapkan di latar belakang.';

    nativeBtn.textContent = navigator.share
      ? '📱 Bagikan lewat aplikasi'
      : '📱 Menu share tidak didukung browser';
    nativeBtn.title = navigator.share
      ? 'Buka menu share bawaan perangkat'
      : 'Gunakan WhatsApp, Salin Link, Download, atau Buka Foto';

    modal.classList.add('open');
  }

  function closeShareModal() {
    document.getElementById('shareModal')?.classList.remove('open');
  }

  async function shareNativeStrip() {
    if (!activeSess) return;
    const session = activeSess;
    const button = document.getElementById('btnNativeShare');
    const filename = `lux-strip-${session.ts}.jpg`;

    // navigator.share harus dipanggil langsung dari event klik tombol ini.
    if (!navigator.share) {
      showToast('Browser ini tidak mendukung menu share bawaan. Gunakan WhatsApp atau Salin Link.');
      return;
    }

    button.disabled = true;
    button.textContent = '⏳ Membuka menu share...';

    try {
      if (activeStripBlob && LuxMedia.supportsFileShare(LuxMedia.inferMimeType(activeStripBlob, session.strip.url))) {
        const file = LuxMedia.makeFile(activeStripBlob, filename, session.strip.url);
        await navigator.share({
          files: [file],
          title: 'Foto Strip LUX Photobooth',
          text: 'Hasil foto dari LUX Photobooth ✨'
        });
      } else {
        await navigator.share({
          title: 'Foto Strip LUX Photobooth',
          text: 'Hasil foto dari LUX Photobooth ✨',
          url: session.strip.url
        });
      }
      closeShareModal();
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('[gallery] Native share gagal:', error);
        showToast('Menu share perangkat gagal dibuka. Gunakan WhatsApp atau Salin Link.');
      }
    } finally {
      button.disabled = false;
      button.textContent = navigator.share
        ? '📱 Bagikan lewat aplikasi'
        : '📱 Menu share tidak didukung browser';
    }
  }

  function shareStripWhatsApp() {
    if (!activeSess) return;
    const message = `Hasil foto dari LUX Photobooth ✨\n${activeSess.strip.url}`;
    const shareURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const opened = window.open(shareURL, '_blank', 'noopener,noreferrer');
    if (!opened) {
      showToast('Popup diblokir browser. Izinkan popup atau gunakan Salin Link.');
    }
  }

  async function copyStripLink() {
    if (!activeSess) return;
    const value = activeSess.strip.url;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        if (!document.execCommand('copy')) throw new Error('Perintah copy ditolak browser');
        input.remove();
      }
      showToast('✅ Link foto disalin', 'success');
    } catch (error) {
      console.warn('[gallery] Copy link gagal:', error);
      showToast('Gagal menyalin link. Gunakan tombol Buka Foto lalu salin alamatnya.');
    }
  }

  async function downloadStripFromShare() {
    if (!activeSess) return;
    const session = activeSess;
    try {
      await triggerDownload(session.strip.url, `lux-strip-${session.ts}.jpg`);
      showToast('✅ Strip didownload!', 'success');
    } catch (error) {
      showToast('Gagal download: ' + (error.message || error));
    }
  }

  function openStripInNewTab() {
    if (!activeSess) return;
    const opened = window.open(LuxMedia.toBrowserURL(activeSess.strip.url), '_blank', 'noopener,noreferrer');
    if (!opened) showToast('Popup diblokir browser. Izinkan popup lalu coba lagi.');
  }

  document.getElementById('shareModal').addEventListener('click', function(event) {
    if (event.target === this) closeShareModal();
  });

  async function downloadIndividual(url, idx) {
    try {
      await triggerDownload(url, `lux-foto-${idx}-${activeSess?.ts || Date.now()}.jpg`);
      showToast(`✅ Foto ${idx} didownload!`, 'success');
    } catch (error) {
      showToast(`Gagal download foto ${idx}: ${error.message || error}`);
    }
  }

  async function triggerDownload(url, filename) {
    try {
      await LuxMedia.download(url, filename);
    } catch (error) {
      const opened = window.open(LuxMedia.toBrowserURL(url), '_blank');
      if (!opened) throw error;
    }
  }

  // ── QR SESSION ────────────────────────────────────────────────────────
  function getSessionOwnerId(sess) {
    const fileName = String(sess?.strip?.path || '').split('/').pop() || '';
    const match = fileName.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|anon)_\d{13}_/i);
    return match?.[1] || currentUserId || Auth.getUserId() || '';
  }

  function getSessionManifestURL(sess) {
    const ownerId = getSessionOwnerId(sess);
    if (!ownerId) throw new Error('Pemilik sesi tidak ditemukan');

    // result.html menyimpan manifest dengan pola yang sama:
    // results/{ownerId}_{sessionTimestamp}_download-manifest.json
    const manifestPath = `results/${ownerId}_${sess.ts}_download-manifest.json`;
    return getStorageUrlByDate(manifestPath, new Date(sess.ts).toISOString());
  }

  function buildSessionFallbackDownloadURL(sess) {
    const ownerId = getSessionOwnerId(sess);
    const params = new URLSearchParams({
      photo: sess?.strip?.url || '',
      owner: ownerId
    });
    (sess?.individuals || []).forEach(photo => {
      if (photo?.url) params.append('p', photo.url);
    });
    if (sess?.gif?.url) params.set('gif', sess.gif.url);
    return `https://www.lux-photo.web.id/download.html?${params.toString()}`;
  }

  async function buildSessionQRURL(sess) {
    const ownerId = getSessionOwnerId(sess);
    const manifestURL = getSessionManifestURL(sess);

    // Cek manifest yang dibuat result.html. Jika tersedia, URL QR ini sama persis
    // dengan QR asli: download.html?m={manifest}&owner={uuid}.
    try {
      const response = await fetch(LuxMedia.toBrowserURL(manifestURL), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store'
      });
      if (response.ok) {
        return `https://www.lux-photo.web.id/download.html?${new URLSearchParams({
          m: manifestURL,
          owner: ownerId
        }).toString()}`;
      }
    } catch (error) {
      console.warn('Manifest QR sesi tidak dapat dicek, memakai fallback:', error);
    }

    // Kompatibilitas sesi lama atau manifest yang gagal di-upload.
    return buildSessionFallbackDownloadURL(sess);
  }

  async function openSessionQR() {
    if (!activeSess) return;
    if (typeof QRCode !== 'function') {
      showToast('❌ Library QR belum termuat');
      return;
    }

    const modal = document.getElementById('galleryQrModal');
    const qrBox = document.getElementById('galleryQrCode');
    const status = document.getElementById('galleryQrStatus');

    modal.classList.add('open');
    qrBox.innerHTML = '<div class="spinner" style="width:36px;height:36px"></div>';
    status.style.color = 'var(--text2)';
    status.textContent = 'Menyiapkan QR sesi...';

    try {
      const qrURL = await buildSessionQRURL(activeSess);
      qrBox.innerHTML = '';
      new QRCode(qrBox, {
        text: qrURL,
        width: 260,
        height: 260,
        colorDark: '#1D3557',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      status.textContent = `Sesi ${new Date(activeSess.ts).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })} siap discan ✓`;
    } catch (error) {
      console.error('Gagal membuat QR galeri:', error);
      qrBox.innerHTML = '<div style="font-size:42px">⚠️</div>';
      status.style.color = 'var(--red)';
      status.textContent = error?.message || 'QR tidak tersedia';
    }
  }

  function closeSessionQR() {
    document.getElementById('galleryQrModal').classList.remove('open');
    document.getElementById('galleryQrCode').innerHTML = '';
  }

  document.getElementById('galleryQrModal').addEventListener('click', function(event) {
    if (event.target === this) closeSessionQR();
  });

  // ── PRINT ────────────────────────────────────────────────────────────
  function togglePrintSelect(ts) {
    const sess = allSessions.find(s => s.ts === ts);
    if (!sess) return;
    const product = normalizeProductType(sess);
    const i = selected.indexOf(ts);

    if (i > -1) {
      selected.splice(i, 1);
    } else if (product === 'photobox') {
      // Photobox 4R sudah format 10×15, jadi cukup pilih 1 dan langsung print file itu.
      selected = [ts];
    } else {
      const hasPhotobox = selected.some(x => normalizeProductType(allSessions.find(s => s.ts === x)) === 'photobox');
      if (hasPhotobox) selected = [];
      if (selected.length >= 2) { showToast('⚠️ Maksimal 2 strip untuk print'); return; }
      selected.push(ts);
    }

    updateActionBar();
    renderGrid();
  }

  function openPrintModal() {
    if (!selected.length) { showToast('❌ Pilih foto dulu untuk print'); return; }
    const sessions = selected.map(ts => allSessions.find(s => s.ts === ts)).filter(Boolean);
    const firstProduct = normalizeProductType(sessions[0]);

    if (firstProduct === 'photobox') {
      if (selected.length !== 1) { showToast('❌ Photobox 4R cukup pilih 1 file saja'); return; }
      document.getElementById('printModalTitle').textContent = '🖨️ Print Photobox 4R';
      document.getElementById('printModalSub').textContent = 'Photobox sudah ukuran 10×15 / 4R, jadi langsung print 1 file tanpa gabung 2 strip.';
      document.getElementById('printPreview').innerHTML =
        `<img src="${sessions[0].strip.url}" alt="photobox" style="width:52%;max-height:360px;border-radius:12px;border:2px solid var(--border);object-fit:contain;">`;
    } else {
      if (selected.length < 1 || selected.length > 2) { showToast('❌ Pilih 1 atau 2 strip untuk digenerate'); return; }
      const isSingleStrip = selected.length === 1;
      document.getElementById('printModalTitle').textContent = isSingleStrip ? '✨ Generate 1 Strip' : '✨ Generate 2 Strip';
      document.getElementById('printModalSub').textContent = isSingleStrip
        ? '1 strip akan ditempatkan di sisi kiri kertas 10×15 cm, dengan sisi kanan tetap kosong.'
        : '2 strip akan digabung berdampingan dalam ukuran 10×15 cm siap simpan atau cetak.';
      document.getElementById('printPreview').innerHTML = sessions.map(s =>
        `<img src="${s.strip.url}" alt="strip" style="width:${isSingleStrip ? '46%' : 'calc(50% - 6px)'};max-height:360px;border-radius:12px;border:2px solid var(--border);object-fit:contain;">`
      ).join('');
    }

    document.getElementById('printModal').style.display = 'flex';
    document.getElementById('printProgress').style.display = 'none';
    setPrintActionButtonsDisabled(false);
    document.getElementById('printProgBar').style.width = '0%';
    document.getElementById('printProgressText').textContent = 'Membuat file...';
  }

  function closePrintModal() { document.getElementById('printModal').style.display = 'none'; }

  function setPrintActionButtonsDisabled(disabled) {
    const saveBtn = document.getElementById('btnGenSave');
    const printBtn = document.getElementById('btnGenPrint');
    if (saveBtn) saveBtn.disabled = disabled;
    if (printBtn) printBtn.disabled = disabled;
  }

  function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.95) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Browser gagal membuat file hasil generate'));
        }, type, quality);
      } catch (error) {
        reject(error);
      }
    });
  }

  function saveGeneratedBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Gagal membaca hasil generate untuk print'));
      reader.readAsDataURL(blob);
    });
  }

  function escapePrintText(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function reservePrintWindow() {
    const popup = window.open('', '_blank', 'width=980,height=820');
    if (!popup) return null;

    popup.document.open();
    popup.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Menyiapkan print...</title>
      <style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6fb;color:#1D3557;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.box{text-align:center;padding:32px}.spinner{width:46px;height:46px;margin:0 auto 18px;border:5px solid #e5e7eb;border-top-color:#D84B7E;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}h1{font-size:20px;margin:0 0 8px}p{font-size:13px;color:#64748b;margin:0}</style>
      </head><body><div class="box"><div class="spinner"></div><h1>Menyiapkan file 10 × 15 cm</h1><p>Jendela print akan terbuka otomatis setelah generate selesai.</p></div></body></html>`);
    popup.document.close();
    return popup;
  }

  function buildGalleryPrintHTML(imageDataURL, filename, title) {
    const safeTitle = escapePrintText(title || 'Print Galeri LUX');
    const safeFilename = escapePrintText(filename || 'lux-print-10x15.jpg');
    const imageJSON = JSON.stringify(imageDataURL);
    const filenameJSON = JSON.stringify(filename || 'lux-print-10x15.jpg');

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #eef2f7; color: #1D3557; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 18px; background: rgba(255,255,255,.96); border-bottom: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(15,23,42,.08); }
    .toolbar h1 { margin: 0 0 3px; font-size: 18px; font-weight: 900; }
    .toolbar p { margin: 0; font-size: 12px; color: #64748b; }
    .buttons { display: flex; gap: 8px; }
    button { border: 0; border-radius: 999px; padding: 11px 17px; font-weight: 900; cursor: pointer; }
    .print { color: #fff; background: linear-gradient(135deg,#D84B7E,#E5B842); }
    .save { color: #1D3557; background: #eef2ff; }
    .preview { display: grid; place-items: start center; padding: 24px; }
    .sheet { width: 10cm; height: 15cm; background: #fff; box-shadow: 0 16px 46px rgba(15,23,42,.2); overflow: hidden; }
    .sheet img { width: 10cm; height: 15cm; display: block; object-fit: contain; background: #fff; }
    @page { size: 10cm 15cm; margin: 0; }
    @media print {
      html, body { width: 10cm; height: 15cm; background: #fff; }
      .toolbar { display: none !important; }
      .preview { padding: 0; display: block; }
      .sheet { width: 10cm; height: 15cm; box-shadow: none; }
    }
    @media (max-width: 680px) { .toolbar { align-items: flex-start; flex-direction: column; } .buttons { width: 100%; } button { flex: 1; } .preview { overflow: auto; justify-content: start; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <div><h1>${safeTitle}</h1><p>Ukuran dokumen 10 × 15 cm. Pada dialog printer gunakan margin none, scale 100%, dan matikan header/footer.</p></div>
    <div class="buttons"><button class="save" type="button" onclick="saveImage()">💾 Save</button><button class="print" type="button" onclick="window.print()">🖨️ Print</button></div>
  </div>
  <div class="preview"><div class="sheet"><img id="printImage" alt="${safeFilename}"></div></div>
  <script>
    const imageDataURL = ${imageJSON};
    const filename = ${filenameJSON};
    const image = document.getElementById('printImage');
    image.src = imageDataURL;
    function saveImage() {
      const a = document.createElement('a');
      a.href = imageDataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    image.onload = () => setTimeout(() => window.print(), 350);
  <\/script>
</body>
</html>`;
  }

  async function openGeneratedPrint(blob, filename, title, reservedPopup = null) {
    if (!blob) throw new Error('File hasil generate kosong');
    const imageDataURL = await blobToDataURL(blob);
    const popup = reservedPopup && !reservedPopup.closed
      ? reservedPopup
      : window.open('', '_blank', 'width=980,height=820');

    if (popup) {
      popup.document.open();
      popup.document.write(buildGalleryPrintHTML(imageDataURL, filename, title));
      popup.document.close();
      popup.focus();
      return 'popup';
    }

    const oldFrame = document.getElementById('galleryPrintFrame');
    if (oldFrame) oldFrame.remove();
    const iframe = document.createElement('iframe');
    iframe.id = 'galleryPrintFrame';
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>@page{size:10cm 15cm;margin:0}*{margin:0;padding:0;box-sizing:border-box}body,img{width:10cm;height:15cm}img{display:block;object-fit:contain}</style></head><body><img src="${imageDataURL}" onload="setTimeout(function(){window.print()},250)"></body></html>`);
    doc.close();
    return 'iframe';
  }

  async function buildSelectedPrintAsset(progress = {}) {
    const sessions = selected.map(ts => allSessions.find(s => s.ts === ts)).filter(Boolean);
    if (!sessions.length) throw new Error('Sesi yang dipilih tidak ditemukan');

    const firstProduct = normalizeProductType(sessions[0]);
    const PW = 1181;
    const PH = 1772;
    const canvas = document.createElement('canvas');
    canvas.width = PW;
    canvas.height = PH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser tidak mendukung Canvas 2D');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PW, PH);

    if (firstProduct === 'photobox') {
      if (sessions.length !== 1) throw new Error('Photobox 4R harus dipilih satu file');
      progress.update?.(30, 'Memuat Photobox 4R...');
      const image = await loadImage(sessions[0].strip.url);
      progress.update?.(72, 'Menyesuaikan ukuran 10 × 15 cm...');
      drawContain(ctx, image, 0, 0, PW, PH);
      progress.update?.(90, 'Membuat file JPG...');
      return {
        blob: await canvasToBlob(canvas, 'image/jpeg', 0.96),
        filename: `lux-photobox-4r-${Date.now()}.jpg`,
        title: 'Print Photobox 4R'
      };
    }

    if (sessions.length < 1 || sessions.length > 2) throw new Error('Pilih 1 atau 2 Photostrip');
    const slotW = Math.floor(PW / 2);
    progress.update?.(25, 'Memuat strip 1...');
    const image1 = await loadImage(sessions[0].strip.url);
    drawCover(ctx, image1, 0, 0, slotW, PH);

    if (sessions.length === 1) {
      progress.update?.(76, 'Menyusun 1 strip pada kertas 10 × 15 cm...');
      progress.update?.(90, 'Membuat file JPG...');
      return {
        blob: await canvasToBlob(canvas, 'image/jpeg', 0.96),
        filename: `lux-1-strip-10x15-${Date.now()}.jpg`,
        title: 'Print 1 Photostrip — 10 × 15 cm'
      };
    }

    progress.update?.(48, 'Memuat strip 2...');
    const image2 = await loadImage(sessions[1].strip.url);
    progress.update?.(72, 'Menggabungkan 2 strip...');
    drawCover(ctx, image2, slotW, 0, PW - slotW, PH);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(slotW, 0);
    ctx.lineTo(slotW, PH);
    ctx.stroke();
    progress.update?.(90, 'Membuat file JPG...');
    return {
      blob: await canvasToBlob(canvas, 'image/jpeg', 0.96),
      filename: `lux-2-strip-10x15-${Date.now()}.jpg`,
      title: 'Print 2 Photostrip — 10 × 15 cm'
    };
  }

  async function generatePrint(action = 'save') {
    if (!selected.length) return;
    const isPrint = action === 'print';
    const reservedPopup = isPrint ? reservePrintWindow() : null;
    const prog = document.getElementById('printProgress');
    const bar = document.getElementById('printProgBar');
    const txt = document.getElementById('printProgressText');
    const updateProgress = (percent, message) => {
      bar.style.width = `${percent}%`;
      txt.textContent = message;
    };

    setPrintActionButtonsDisabled(true);
    prog.style.display = 'block';
    updateProgress(8, 'Memulai generate...');

    try {
      const asset = await buildSelectedPrintAsset({ update: updateProgress });
      updateProgress(100, isPrint ? 'Membuka dialog print...' : 'Menyimpan file...');

      if (isPrint) {
        await openGeneratedPrint(asset.blob, asset.filename, asset.title, reservedPopup);
        closePrintModal();
        showToast('✅ Hasil generate siap diprint!', 'success');
      } else {
        saveGeneratedBlob(asset.blob, asset.filename);
        closePrintModal();
        showToast('✅ Hasil generate berhasil disimpan!', 'success');
      }
      clearSelection();
    } catch (error) {
      if (reservedPopup && !reservedPopup.closed) reservedPopup.close();
      updateProgress(0, '⚠️ Gagal: ' + (error?.message || error));
      setPrintActionButtonsDisabled(false);
      console.error('Generate galeri gagal:', error);
    }
  }

  function drawContain(ctx, img, x, y, w, h) {
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function drawCover(ctx, img, x, y, w, h) {
    const scale = Math.max(w/img.width, h/img.height);
    const sw = w/scale, sh = h/scale;
    ctx.drawImage(img, (img.width-sw)/2, (img.height-sh)/2, sw, sh, x, y, w, h);
  }
  function loadImageDirect(src, options = {}) {
    const useCors = options.useCors !== false;
    const timeoutMs = Number(options.timeoutMs) || 15000;
    const browserSrc = LuxMedia.toBrowserURL(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Timeout memuat gambar (${timeoutMs / 1000} detik)`));
      }, timeoutMs);

      try {
        const parsed = new URL(browserSrc, window.location.href);
        if (useCors && parsed.origin !== window.location.origin) {
          img.crossOrigin = 'anonymous';
        }
      } catch (_) {
        if (useCors) img.crossOrigin = 'anonymous';
      }
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';

      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(img);
      };

      img.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(new Error('Media tidak dapat dimuat untuk canvas'));
      };

      img.src = browserSrc;
    });
  }

  async function readProxyError(response) {
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    try {
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return data?.error || JSON.stringify(data);
      }
      const text = await response.text();
      return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
    } catch (_) {
      return '';
    }
  }

  async function loadImageViaProxy(src) {
    const blob = await LuxMedia.fetchBlob(src, {
      memoryCache: false,
      cache: 'no-store'
    });

    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImageDirect(objectUrl, { useCors: false });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function loadImage(src) {
    if (!src) throw new Error('URL foto kosong');

    try {
      return await loadImageDirect(src, { useCors: true });
    } catch (directError) {
      try {
        return await loadImageViaProxy(src);
      } catch (proxyError) {
        console.error('Gagal memuat foto untuk merge', {
          src,
          directError,
          proxyError
        });
        throw new Error(
          `Gagal load foto. ${proxyError?.message || 'Endpoint media-proxy tidak dapat digunakan.'}`
        );
      }
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────
  function openDeleteModal() {
    if (!selected.length) return;
    const sessions = allSessions.filter(s => selected.includes(s.ts));
    const totalFiles = sessions.reduce((acc, s) => {
      return acc + 1 + s.individuals.length + (s.gif ? 1 : 0);
    }, 0);
    document.getElementById('deleteModalSub').textContent =
      `${sessions.length} sesi (${totalFiles} file) akan dihapus permanen dari server.`;

    document.getElementById('deleteThumbs').innerHTML = sessions.map(s =>
      `<img class="del-thumb" src="${s.strip.url}">`
    ).join('');

    document.getElementById('btnConfirmDelete').textContent = `🗑️ Ya, Hapus ${sessions.length} Sesi`;
    document.getElementById('btnConfirmDelete').disabled = false;
    document.getElementById('deleteModal').classList.add('open');
  }
  function closeDeleteModal() { document.getElementById('deleteModal').classList.remove('open'); }

  async function doDelete() {
    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true; btn.textContent = '⏳ Menghapus...';

    const sessions = allSessions.filter(s => selected.includes(s.ts));
    const paths = [];
    sessions.forEach(s => {
      paths.push(s.strip.path);
      s.individuals.forEach(p => paths.push(p.path));
      if (s.gif) paths.push(s.gif.path);
    });

    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${Auth.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefixes: paths })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const tsSet = new Set(selected);
      allSessions = allSessions.filter(s => !tsSet.has(s.ts));
      selected = [];
      closeDeleteModal();
      applyFilter();
      showToast(`✅ ${sessions.length} sesi berhasil dihapus`, 'success');
    } catch(e) {
      btn.disabled = false; btn.textContent = '🗑️ Ya, Hapus';
      closeDeleteModal();
      showToast('❌ Gagal hapus: ' + e.message);
    }
  }

  // ── TOAST ────────────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg, type = 'error') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (type === 'success' ? ' success' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3500);
  }

  // ── INIT ─────────────────────────────────────────────────────────────
  // Cek session
  window.addEventListener('DOMContentLoaded', () => {
    if (!Auth.getSession()) { window.location.href = '/login'; return; }
    document.getElementById('pwInput').focus();
    // Update sub text
    document.querySelector('.lock-sub').textContent = 'Masukkan password login untuk melihat galeri';
  });
