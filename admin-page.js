  // ─── Supabase config (HARUS di atas semua fungsi yang pakai ini) ───
  const BUCKET = 'photobooth';
  const DEFAULT_UPLOAD_CATEGORIES = ['Photobox 4R'];

  const DISPLAY_MAX_W = 420;
  const DISPLAY_MAX_H = 620;
  let templateImg = null, templateDataURL = null;
  let slots = [], textElements = [], selectedTextIndex = -1, scale = 1;
  const TEXT_COLORS = ['#FFFFFF', '#111111', '#1D3557', '#D84B7E', '#E5B842', '#E63946'];
  const TEXT_FONTS = ['Segoe UI', 'Arial', 'Georgia', 'Trebuchet MS', 'Courier New', 'Impact'];
  let selectedCategory = '';
  let selectedProductType = 'photostrip';
  let selectedPhotoLayer = 'behind';
  let filterProductType = 'all';
  let filterCategory = 'all';

  const canvas = document.getElementById('editorCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('slotOverlay');

  // ─── Categories (derived from Supabase templates) ───
  let _allTemplates = []; // cache

  // Semua key localStorage terkait template di-scope per user_id supaya
  // beberapa akun admin yang login bergantian di device/browser yang sama
  // tidak saling bocor data (kategori kustom, tombstone delete, dll).
  function currentUserScopeKey() {
    const userId = Auth.getUserId ? Auth.getUserId() : null;
    return userId ? String(userId) : 'anon';
  }

  function scopedStorageKey(base) {
    return `${base}_${currentUserScopeKey()}`;
  }

  function getDeletedTemplateIds() {
    try { return JSON.parse(localStorage.getItem(scopedStorageKey('pb_deleted_template_ids')) || '[]').map(String); }
    catch(e) { return []; }
  }

  function rememberDeletedTemplate(id) {
    if (!id) return;
    const ids = getDeletedTemplateIds();
    if (!ids.includes(String(id))) {
      ids.push(String(id));
      localStorage.setItem(scopedStorageKey('pb_deleted_template_ids'), JSON.stringify(ids));
    }
  }

  function isTextElement(item) {
    return !!item && (item.type === 'text' || item.kind === 'text');
  }

  function normalizeTextElement(item) {
    return {
      type: 'text',
      text: String(item?.text || item?.value || 'PHOTOBOOTH').slice(0, 80),
      x: Number(item?.x) || 0,
      y: Number(item?.y) || 0,
      w: Math.max(40, Number(item?.w) || 240),
      h: Math.max(24, Number(item?.h) || 60),
      r: normalizeAngle(item?.r || item?.rotate || item?.rotation || 0),
      font: TEXT_FONTS.includes(item?.font) ? item.font : 'Segoe UI',
      color: /^#[0-9a-f]{6}$/i.test(item?.color || '') ? item.color.toUpperCase() : '#1D3557',
      font_size: Math.max(10, Number(item?.font_size || item?.fontSize) || Math.round((Number(item?.h) || 60) * 0.58)),
      weight: 900
    };
  }

  function normalizeTemplateRecord(t) {
    let parsedSlots = [];
    try { parsedSlots = Array.isArray(t.slots) ? t.slots : JSON.parse(t.slots || '[]'); }
    catch(e) { parsedSlots = []; }
    const photoSlots = parsedSlots.filter(item => !isTextElement(item)).map(s => ({
      ...s,
      r: normalizeAngle(s.r || s.rotate || s.rotation || 0)
    }));
    const templateTexts = parsedSlots.filter(isTextElement).map(normalizeTextElement);
    return {
      ...t,
      product_type: t.product_type || (isPhotoboxCategory(t.category) ? 'photobox' : 'photostrip'),
      photo_layer: t.photo_layer === 'front' ? 'front' : 'behind',
      slots: photoSlots,
      text_elements: templateTexts
    };
  }

  async function fetchAllTemplates() {
    try {
      const token = Auth.getToken();
      const userId = Auth.getUserId ? Auth.getUserId() : null;
      if (!token || !userId) throw new Error('Session user tidak ditemukan. Login ulang.');

      // Filter user_id=eq.<userId> supaya hanya template milik akun yang
      // sedang login yang diambil. Sebelumnya endpoint ini tidak difilter
      // sama sekali sehingga template & kategori semua akun ikut tercampur.
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/templates?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      const deletedIds = getDeletedTemplateIds();
      _allTemplates = (await res.json()).map(normalizeTemplateRecord).filter(t => !deletedIds.includes(String(t.id)));
    } catch(e) {
      console.error('Fetch templates error:', e);
      _allTemplates = [];
    }
    return _allTemplates;
  }

  function isPhotoboxCategory(cat) {
    const c = String(cat || '').toLowerCase();
    return c.includes('photobox') || c === '4r' || c.includes('4r');
  }

  function productTypeOfTemplate(t) {
    return t?.product_type || (isPhotoboxCategory(t?.category) ? 'photobox' : 'photostrip');
  }

  function updateUploadHint() {
    const p = document.querySelector('#uploadArea p');
    if (!p) return;
    p.textContent = selectedProductType === 'photobox'
      ? 'Ukuran ideal: 10×15 / 4R · Area foto: transparan atau hitam'
      : 'Ukuran ideal: 591×1772 px · Area foto: transparan atau hitam';
  }

  function selectProductType(type) {
    selectedProductType = type === 'photobox' ? 'photobox' : 'photostrip';
    document.getElementById('productTypePhotostrip')?.classList.toggle('active', selectedProductType === 'photostrip');
    document.getElementById('productTypePhotobox')?.classList.toggle('active', selectedProductType === 'photobox');
    const note = document.getElementById('productTypeNote');
    if (note) note.textContent = selectedProductType === 'photobox'
      ? 'Photobox 4R = template full 10×15/4R, hasilnya cetak 4R.'
      : 'Photostrip = template strip 5×15 dengan cetak 1/2 strip.';

    if (selectedProductType === 'photobox') {
      selectedCategory = 'Photobox 4R';
      const cats = JSON.parse(localStorage.getItem(scopedStorageKey('pb_categories')) || '[]');
      if (!cats.includes(selectedCategory)) {
        cats.push(selectedCategory);
        localStorage.setItem(scopedStorageKey('pb_categories'), JSON.stringify(cats));
      }
    }
    updateUploadHint();
    renderCategoryTags();
  }

  function selectPhotoLayer(layer) {
    selectedPhotoLayer = layer === 'front' ? 'front' : 'behind';
    document.getElementById('photoLayerBehind')?.classList.toggle('active', selectedPhotoLayer === 'behind');
    document.getElementById('photoLayerFront')?.classList.toggle('active', selectedPhotoLayer === 'front');
    const note = document.getElementById('photoLayerNote');
    if (note) note.textContent = selectedPhotoLayer === 'front'
      ? 'Mode depan: template digambar lebih dulu, lalu foto menutup bagian template yang berada di area slot.'
      : 'Mode belakang: template digambar di atas foto. Ini adalah perilaku default dan cocok untuk frame PNG transparan.';
  }

  function getCategories(scope = 'all') {
    // category = tema/desain, product_type = photostrip/photobox
    const fromDB = [...new Set(
      _allTemplates
        .filter(t => scope === 'all' || productTypeOfTemplate(t) === scope)
        .map(t => t.category)
        .filter(Boolean)
    )];
    const fromLS = JSON.parse(localStorage.getItem(scopedStorageKey('pb_categories')) || '[]');
    return [...new Set([...DEFAULT_UPLOAD_CATEGORIES, ...fromDB, ...fromLS])];
  }

  function tambahKategori() {
    const val = document.getElementById('newCatInput').value.trim();
    if (!val) return;
    const cats = JSON.parse(localStorage.getItem(scopedStorageKey('pb_categories')) || '[]');
    if (cats.includes(val) || getCategories().includes(val)) { showToast('Kategori sudah ada', true); return; }
    cats.push(val);
    localStorage.setItem(scopedStorageKey('pb_categories'), JSON.stringify(cats));
    document.getElementById('newCatInput').value = '';
    renderCategoryTags();
    renderCatTabs();
    renderManageCats();
    showToast(`Kategori "${val}" ditambahkan`);
  }

  function renderCategoryTags() {
    const cats = getCategories();
    const el = document.getElementById('categoryTags');
    if (cats.length === 0) {
      el.innerHTML = '<p style="font-size:12px;color:#555;margin-top:6px">Belum ada kategori. Tambahkan dulu di atas.</p>';
      return;
    }
    el.innerHTML = cats.map(c => `
      <div class="category-tag ${selectedCategory === c ? 'active' : ''}" onclick="selectCategory('${c}')">${c}</div>
    `).join('');
  }

  function selectCategory(cat) {
    selectedCategory = cat;
    document.getElementById('selectedCategory').value = cat;
    renderCategoryTags();
  }

  function renderProductListTabs() {
    const el = document.getElementById('productListTabs');
    if (!el) return;
    el.querySelectorAll('.product-list-tab').forEach(btn => btn.classList.remove('active'));
    const idx = filterProductType === 'photostrip' ? 1 : filterProductType === 'photobox' ? 2 : 0;
    el.querySelectorAll('.product-list-tab')[idx]?.classList.add('active');
  }

  function filterProductList(type) {
    filterProductType = ['photostrip','photobox'].includes(type) ? type : 'all';
    filterCategory = 'all';
    renderProductListTabs();
    renderCatTabs();
    renderTemplateList();
  }

  function renderCatTabs() {
    const cats = getCategories(filterProductType);
    const el = document.getElementById('catTabs');
    let html = `<button class="cat-tab ${filterCategory==='all'?'active':''}" onclick="filterCat('all')">Semua</button>`;
    html += cats.map(c =>
      `<button class="cat-tab ${filterCategory===c?'active':''}" onclick="filterCat('${c}')">${c}</button>`
    ).join('');
    el.innerHTML = html;
    document.getElementById('manageCats').style.display = cats.length ? 'block' : 'none';
  }

  function filterCat(cat) {
    filterCategory = cat;
    renderCatTabs();
    renderTemplateList();
  }

  function renderManageCats() {
    const cats = getCategories();
    document.getElementById('catListManage').innerHTML = cats.length
      ? cats.map((c, i) => `
          <div class="cat-list-item">
            <span>${c}</span>
            <button class="btn-cat-del" onclick="hapusKategori(${i})">×</button>
          </div>`).join('')
      : '<p style="font-size:12px;color:#555">Belum ada kategori</p>';
  }

  function hapusKategori(idx) {
    const cats = JSON.parse(localStorage.getItem(scopedStorageKey('pb_categories')) || '[]');
    cats.splice(idx, 1);
    localStorage.setItem(scopedStorageKey('pb_categories'), JSON.stringify(cats));
    renderCategoryTags();
    renderCatTabs();
    renderManageCats();
    renderTemplateList();
  }

  // ─── Upload ───
  document.getElementById('fileInput').addEventListener('change', e => {
    if (e.target.files[0]) loadTemplate(e.target.files[0]);
  });

  async function makeTemplateThumbnailBlob(dataURL) {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataURL;
    });
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(1, 320 / iw, 960 / ih);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(iw * scale));
    c.height = Math.max(1, Math.round(ih * scale));
    const cc = c.getContext('2d');
    cc.fillStyle = '#ffffff';
    cc.fillRect(0, 0, c.width, c.height);
    cc.imageSmoothingEnabled = true;
    cc.imageSmoothingQuality = 'high';
    cc.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((resolve, reject) => {
      c.toBlob(blob => blob ? resolve(blob) : reject(new Error('Thumbnail gagal dibuat')), 'image/jpeg', 0.72);
    });
  }

  const MAX_TEMPLATE_UPLOAD_BYTES = 20 * 1024 * 1024;

  async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); }
    catch (_) { return { error: text }; }
  }

  async function putBlobToR2(uploadUrl, blob, cacheControl) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Cache-Control': cacheControl,
      },
      body: blob,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Upload langsung ke R2 gagal (HTTP ${response.status})${detail ? `: ${detail}` : ''}`);
    }
  }

  async function uploadTemplateImage(dataURL, name) {
    const token = Auth.getToken();
    const userId = Auth.getUserId();
    if (!token || !userId) throw new Error('Session user tidak ditemukan. Login ulang.');

    const masterBlob = dataURLtoBlob(dataURL);
    if (masterBlob.type !== 'image/png') throw new Error('Template harus berupa file PNG.');
    if (masterBlob.size > MAX_TEMPLATE_UPLOAD_BYTES) {
      throw new Error('Ukuran template maksimal 20 MB. Kecilkan resolusi atau kompres PNG terlebih dahulu.');
    }

    const thumbnailBlob = await makeTemplateThumbnailBlob(dataURL);

    const presignResponse = await fetch('/api/template-upload-url', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        masterSize: masterBlob.size,
        thumbnailSize: thumbnailBlob.size,
      }),
    });
    const upload = await readJsonResponse(presignResponse);

    if (!presignResponse.ok || !upload?.masterUploadUrl || !upload?.thumbnailUploadUrl) {
      throw new Error(upload?.error || 'Gagal menyiapkan upload template ke R2.');
    }

    // Thumbnail diunggah dahulu. Jika gagal, file utama belum terlanjur tersimpan.
    await putBlobToR2(upload.thumbnailUploadUrl, thumbnailBlob, upload.cacheControl);
    await putBlobToR2(upload.masterUploadUrl, masterBlob, upload.cacheControl);

    return upload.masterPublicUrl;
  }

  function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  const uploadArea = document.getElementById('uploadArea');
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) loadTemplate(e.dataTransfer.files[0]);
  });

  // ─── Auto-fill nama template dari nama file ───
  function titleCaseFromFilename(rawBaseName) {
    return String(rawBaseName || '')
      .replace(/\.[a-z0-9]+$/i, '')     // buang ekstensi apapun (jaga-jaga)
      .replace(/[_-]+/g, ' ')            // underscore/dash jadi spasi
      .replace(/\s+/g, ' ')              // rapikan spasi ganda
      .trim()
      .replace(/\w\S*/g, word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
  }

  function autoFillTemplateNameFromFile(file) {
    const nameInput = document.getElementById('templateName');
    if (!nameInput || nameInput.value.trim()) return; // jangan timpa kalau user sudah isi manual
    const rawBase = String(file?.name || '').replace(/\.png$/i, '');
    const formatted = titleCaseFromFilename(rawBase);
    if (formatted) nameInput.value = formatted;
  }

  function loadTemplate(file) {
    if (!file) return;
    if (file.type !== 'image/png' && !String(file.name || '').toLowerCase().endsWith('.png')) {
      showToast('Template harus berupa file PNG.', true);
      return;
    }
    if (file.size > MAX_TEMPLATE_UPLOAD_BYTES) {
      showToast('Ukuran template maksimal 20 MB.', true);
      return;
    }

    autoFillTemplateNameFromFile(file);

    const reader = new FileReader();
    reader.onload = e => {
      templateDataURL = e.target.result;
      templateImg = new Image();
      templateImg.onload = () => {
        // Preview editor dibuat proporsional dengan file asli, tapi dibatasi biar tetap manusiawi.
        // Jadi template 4R besar tidak melebar full panel dan photostrip tinggi tidak terlalu jumbo.
        scale = Math.min(1, DISPLAY_MAX_W / templateImg.width, DISPLAY_MAX_H / templateImg.height);
        const dw = Math.round(templateImg.width * scale);
        const dh = Math.round(templateImg.height * scale);
        canvas.width = dw; canvas.height = dh;
        canvas.style.width = dw + 'px'; canvas.style.height = dh + 'px';
        overlay.style.width = dw + 'px'; overlay.style.height = dh + 'px';
        ctx.drawImage(templateImg, 0, 0, dw, dh);
        document.getElementById('canvasWrapper').style.display = 'block';
        document.getElementById('editorControls').style.display = 'flex';
        document.getElementById('btnSave').style.display = 'block';
        document.getElementById('slotInfo').style.display = 'block';
        slots = [];
        textElements = [];
        selectedTextIndex = -1;
        syncEditorCounts();
        hideTextControls();
        autoDetect();
      };
      templateImg.src = templateDataURL;
    };
    reader.readAsDataURL(file);
  }

  // ─── Auto Detect ───
  function autoDetect() {
    if (!templateImg) return;
    const W = canvas.width, H = canvas.height;
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.drawImage(templateImg, 0, 0, W, H);
    const data = octx.getImageData(0, 0, W, H).data;

    const mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
      if (a < 30 || (r < 40 && g < 40 && b < 40 && a > 100)) mask[i] = 1;
    }

    const rowSums = new Array(H).fill(0);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        rowSums[y] += mask[y * W + x];

    const threshold = W * 0.15;
    let inBlock = false, blockStart = 0;
    const blocks = [];
    for (let y = 0; y < H; y++) {
      if (rowSums[y] > threshold && !inBlock) { inBlock = true; blockStart = y; }
      else if (rowSums[y] <= threshold && inBlock) {
        inBlock = false;
        if (y - blockStart > H * 0.04) blocks.push([blockStart, y - 1]);
      }
    }
    if (inBlock) blocks.push([blockStart, H - 1]);

    slots = [];
    for (const [y1, y2] of blocks) {
      const colSums = new Array(W).fill(0);
      for (let y = y1; y <= y2; y++)
        for (let x = 0; x < W; x++)
          colSums[x] += mask[y * W + x];
      const cThresh = (y2 - y1) * 0.1;
      const xCols = colSums.map((v,i) => v > cThresh ? i : -1).filter(v => v >= 0);
      if (!xCols.length) continue;
      const x1 = xCols[0], x2 = xCols[xCols.length-1];
      if ((x2-x1) < W*0.1 || (y2-y1) < H*0.02) continue;
      slots.push({ x: x1, y: y1, w: x2-x1, h: y2-y1, r: 0 });
    }

    syncEditorCounts();
    renderSlots();
    showToast(`${slots.length} slot foto terdeteksi`);
  }

  function normalizeAngle(deg) {
    const n = Number(deg) || 0;
    return Math.round(((n % 360) + 360) % 360);
  }

  function syncEditorCounts() {
    const photoCount = document.getElementById('slotCount');
    const textCount = document.getElementById('textCount');
    if (photoCount) photoCount.textContent = slots.length;
    if (textCount) textCount.textContent = textElements.length;
  }


  function fontStack(font) {
    const safe = TEXT_FONTS.includes(font) ? font : 'Segoe UI';
    if (safe === 'Segoe UI') return "'Segoe UI', Arial, sans-serif";
    if (safe === 'Trebuchet MS') return "'Trebuchet MS', Arial, sans-serif";
    if (safe === 'Courier New') return "'Courier New', monospace";
    if (safe === 'Georgia') return "Georgia, 'Times New Roman', serif";
    if (safe === 'Impact') return "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
    return "Arial, sans-serif";
  }

  function fittedTextSize(element, multiplier = 1) {
    const text = String(element.text || 'PHOTOBOOTH');
    const maxW = Math.max(30, Number(element.w) * 0.9 * multiplier);
    const maxH = Math.max(12, Number(element.h) * 0.72 * multiplier);
    let size = Math.min(
      Math.max(10, Number(element.font_size) || Number(element.h) * 0.58),
      maxH
    );
    const measure = document.createElement('canvas').getContext('2d');
    while (size > 9) {
      measure.font = `900 ${size}px ${fontStack(element.font)}`;
      if (measure.measureText(text).width <= maxW) break;
      size -= 1;
    }
    return Math.max(9, size);
  }

  function applySlotBoxStyle(box, idx) {
    const slot = slots[idx];
    slot.r = normalizeAngle(slot.r || slot.rotate || slot.rotation || 0);
    box.style.left = slot.x + 'px';
    box.style.top = slot.y + 'px';
    box.style.width = slot.w + 'px';
    box.style.height = slot.h + 'px';
    box.style.transform = `rotate(${slot.r}deg)`;
    box.style.transformOrigin = 'center center';
    const angle = box.querySelector('.slot-angle');
    if (angle) angle.textContent = `${slot.r}°`;
  }

  function applyTextBoxStyle(box, idx) {
    const element = textElements[idx];
    if (!element) return;
    element.r = normalizeAngle(element.r || 0);
    box.style.left = element.x + 'px';
    box.style.top = element.y + 'px';
    box.style.width = element.w + 'px';
    box.style.height = element.h + 'px';
    box.style.transform = `rotate(${element.r}deg)`;
    box.style.transformOrigin = 'center center';
    box.classList.toggle('selected', idx === selectedTextIndex);
    const preview = box.querySelector('.text-preview');
    if (preview) {
      preview.textContent = element.text || 'PHOTOBOOTH';
      preview.style.fontFamily = fontStack(element.font);
      preview.style.fontWeight = '900';
      preview.style.fontSize = fittedTextSize(element) + 'px';
      preview.style.color = element.color;
    }
    const angle = box.querySelector('.slot-angle');
    if (angle) angle.textContent = `${element.r}°`;
  }

  function renderSlots() {
    overlay.innerHTML = '';
    slots.forEach((slot, idx) => {
      slot.r = normalizeAngle(slot.r || slot.rotate || slot.rotation || 0);
      const box = document.createElement('div');
      box.className = 'slot-box';
      box.innerHTML = `
        <div class="slot-label">Foto ${idx+1}</div>
        <button class="slot-duplicate" onclick="duplicateSlot(${idx}); event.stopPropagation();" title="Duplikat slot">⧉</button>
        <button class="slot-delete" onclick="deleteSlot(${idx}); event.stopPropagation();" title="Hapus slot">×</button>
        <div class="rotate-handle" data-idx="${idx}" title="Putar slot">↻</div>
        <div class="slot-angle">${slot.r}°</div>
        <div class="slot-rotate-tools">
          <button class="slot-rotate-btn" onclick="rotateSlot(${idx}, -15); event.stopPropagation();" title="Putar kiri">−</button>
          <button class="slot-rotate-btn" onclick="rotateSlot(${idx}, 15); event.stopPropagation();" title="Putar kanan">+</button>
        </div>
        <div class="resize-handle" data-idx="${idx}"></div>
      `;
      applySlotBoxStyle(box, idx);
      makeDraggable(box, idx);
      makeResizable(box.querySelector('.resize-handle'), box, idx);
      makeRotatable(box.querySelector('.rotate-handle'), box, idx);
      overlay.appendChild(box);
    });

    textElements.forEach((element, idx) => {
      const box = document.createElement('div');
      box.className = 'text-box';
      box.innerHTML = `
        <div class="text-element-label">Teks ${idx + 1}</div>
        <div class="text-preview"></div>
        <button class="slot-duplicate" onclick="duplicateTextElement(${idx}); event.stopPropagation();" title="Duplikat teks">⧉</button>
        <button class="slot-delete" onclick="deleteTextElement(${idx}); event.stopPropagation();" title="Hapus teks">×</button>
        <div class="rotate-handle" title="Putar teks">↻</div>
        <div class="slot-angle">${normalizeAngle(element.r || 0)}°</div>
        <div class="slot-rotate-tools">
          <button class="slot-rotate-btn" onclick="rotateTextElement(${idx}, -15); event.stopPropagation();" title="Putar kiri">−</button>
          <button class="slot-rotate-btn" onclick="rotateTextElement(${idx}, 15); event.stopPropagation();" title="Putar kanan">+</button>
        </div>
        <div class="resize-handle"></div>
      `;
      applyTextBoxStyle(box, idx);
      makeTextDraggable(box, idx);
      makeTextResizable(box.querySelector('.resize-handle'), box, idx);
      makeTextRotatable(box.querySelector('.rotate-handle'), box, idx);
      box.addEventListener('click', e => {
        if (!e.target.closest('button, .resize-handle, .rotate-handle')) selectTextElement(idx);
      });
      overlay.appendChild(box);
    });
    syncEditorCounts();
  }

  function hideTextControls() {
    document.getElementById('textControlsPanel')?.classList.remove('show');
  }

  function renderTextColorOptions() {
    const row = document.getElementById('textColorRow');
    if (!row || selectedTextIndex < 0 || !textElements[selectedTextIndex]) return;
    const current = textElements[selectedTextIndex].color.toUpperCase();
    row.innerHTML = TEXT_COLORS.map(color => `
      <button type="button" class="text-color-swatch ${current === color ? 'active' : ''}"
        style="background:${color}" title="${color}" aria-label="Pilih warna ${color}"
        onclick="setTextColor('${color}')"></button>
    `).join('');
  }

  function selectTextElement(idx, rerender = true) {
    if (!textElements[idx]) return;
    selectedTextIndex = idx;
    const element = textElements[idx];
    document.getElementById('activeTextNumber').textContent = `#${idx + 1}`;
    document.getElementById('textContentInput').value = element.text || '';
    document.getElementById('textFontSelect').value = TEXT_FONTS.includes(element.font) ? element.font : 'Segoe UI';
    document.getElementById('textControlsPanel').classList.add('show');
    renderTextColorOptions();
    if (rerender) {
      renderSlots();
    } else {
      overlay.querySelectorAll('.text-box').forEach((node, nodeIdx) => node.classList.toggle('selected', nodeIdx === idx));
    }
  }

  function setTextColor(color) {
    if (selectedTextIndex < 0 || !textElements[selectedTextIndex] || !TEXT_COLORS.includes(color)) return;
    textElements[selectedTextIndex].color = color;
    renderTextColorOptions();
    renderSlots();
  }

  document.getElementById('textContentInput')?.addEventListener('input', event => {
    if (selectedTextIndex < 0 || !textElements[selectedTextIndex]) return;
    textElements[selectedTextIndex].text = String(event.target.value || '').slice(0, 80);
    renderSlots();
  });

  document.getElementById('textFontSelect')?.addEventListener('change', event => {
    if (selectedTextIndex < 0 || !textElements[selectedTextIndex]) return;
    const font = TEXT_FONTS.includes(event.target.value) ? event.target.value : 'Segoe UI';
    textElements[selectedTextIndex].font = font;
    renderSlots();
  });

  function getPointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function bindDragMove(target, startEvent, onMove, onEnd) {
    const pointerId = startEvent.pointerId;
    if (target.setPointerCapture && pointerId != null) {
      try { target.setPointerCapture(pointerId); } catch(e) {}
    }
    const moveEvent = window.PointerEvent ? 'pointermove' : 'mousemove';
    const upEvent = window.PointerEvent ? 'pointerup' : 'mouseup';
    const cancelEvent = window.PointerEvent ? 'pointercancel' : 'mouseleave';
    const mv = e => {
      if (pointerId != null && e.pointerId != null && e.pointerId !== pointerId) return;
      e.preventDefault();
      onMove(e);
    };
    const up = e => {
      if (pointerId != null && e.pointerId != null && e.pointerId !== pointerId) return;
      if (target.releasePointerCapture && pointerId != null) {
        try { target.releasePointerCapture(pointerId); } catch(err) {}
      }
      document.removeEventListener(moveEvent, mv);
      document.removeEventListener(upEvent, up);
      document.removeEventListener(cancelEvent, up);
      if (typeof onEnd === 'function') onEnd(e);
    };
    document.addEventListener(moveEvent, mv, { passive: false });
    document.addEventListener(upEvent, up, { passive: false });
    document.addEventListener(cancelEvent, up, { passive: false });
  }

  function makeDraggable(box, idx) {
    const start = e => {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest('.resize-handle, .slot-delete, .slot-duplicate, .rotate-handle, .slot-rotate-btn, .slot-rotate-tools')) return;
      e.preventDefault();
      const p = getPointerXY(e);
      const sx = p.x, sy = p.y, sl = slots[idx].x, st = slots[idx].y;
      box.classList.add('dragging');
      bindDragMove(box, e, moveEvent => {
        const q = getPointerXY(moveEvent);
        slots[idx].x = Math.max(0, Math.min(canvas.width - slots[idx].w, sl + q.x - sx));
        slots[idx].y = Math.max(0, Math.min(canvas.height - slots[idx].h, st + q.y - sy));
        applySlotBoxStyle(box, idx);
      }, () => box.classList.remove('dragging'));
    };
    box.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', start, { passive: false });
  }

  function makeResizable(handle, box, idx) {
    const start = e => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const p = getPointerXY(e);
      const sx = p.x, sy = p.y, sw = slots[idx].w, sh = slots[idx].h;
      box.classList.add('dragging');
      bindDragMove(handle, e, moveEvent => {
        const q = getPointerXY(moveEvent);
        slots[idx].w = Math.max(40, Math.min(canvas.width - slots[idx].x, sw + q.x - sx));
        slots[idx].h = Math.max(30, Math.min(canvas.height - slots[idx].y, sh + q.y - sy));
        applySlotBoxStyle(box, idx);
      }, () => box.classList.remove('dragging'));
    };
    handle.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', start, { passive: false });
    handle.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  function makeRotatable(handle, box, idx) {
    if (!handle) return;
    const start = e => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const overlayRect = overlay.getBoundingClientRect();
      const slot = slots[idx];
      const cx = overlayRect.left + slot.x + slot.w / 2;
      const cy = overlayRect.top + slot.y + slot.h / 2;
      const p = getPointerXY(e);
      const startAngle = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      const startRot = normalizeAngle(slot.r || 0);
      box.classList.add('dragging');
      bindDragMove(handle, e, moveEvent => {
        const q = getPointerXY(moveEvent);
        const nowAngle = Math.atan2(q.y - cy, q.x - cx) * 180 / Math.PI;
        slots[idx].r = normalizeAngle(startRot + (nowAngle - startAngle));
        applySlotBoxStyle(box, idx);
      }, () => box.classList.remove('dragging'));
    };
    handle.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', start, { passive: false });
    handle.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  function makeTextDraggable(box, idx) {
    const start = e => {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest('.resize-handle, .slot-delete, .slot-duplicate, .rotate-handle, .slot-rotate-btn, .slot-rotate-tools')) return;
      e.preventDefault();
      selectTextElement(idx, false);
      const p = getPointerXY(e);
      const element = textElements[idx];
      const sx = p.x, sy = p.y, startX = element.x, startY = element.y;
      box.classList.add('dragging');
      bindDragMove(box, e, moveEvent => {
        const q = getPointerXY(moveEvent);
        element.x = Math.max(0, Math.min(canvas.width - element.w, startX + q.x - sx));
        element.y = Math.max(0, Math.min(canvas.height - element.h, startY + q.y - sy));
        applyTextBoxStyle(box, idx);
      }, () => box.classList.remove('dragging'));
    };
    box.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', start, { passive: false });
  }

  function makeTextResizable(handle, box, idx) {
    const start = e => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      selectTextElement(idx, false);
      const p = getPointerXY(e);
      const element = textElements[idx];
      const sx = p.x, sy = p.y, sw = element.w, sh = element.h;
      box.classList.add('dragging');
      bindDragMove(handle, e, moveEvent => {
        const q = getPointerXY(moveEvent);
        element.w = Math.max(70, Math.min(canvas.width - element.x, sw + q.x - sx));
        element.h = Math.max(28, Math.min(canvas.height - element.y, sh + q.y - sy));
        element.font_size = Math.max(10, Math.round(element.h * 0.58));
        applyTextBoxStyle(box, idx);
      }, () => box.classList.remove('dragging'));
    };
    handle.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', start, { passive: false });
    handle.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  function makeTextRotatable(handle, box, idx) {
    if (!handle) return;
    const start = e => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      selectTextElement(idx);
      const overlayRect = overlay.getBoundingClientRect();
      const element = textElements[idx];
      const cx = overlayRect.left + element.x + element.w / 2;
      const cy = overlayRect.top + element.y + element.h / 2;
      const p = getPointerXY(e);
      const startAngle = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      const startRot = normalizeAngle(element.r || 0);
      box.classList.add('dragging');
      bindDragMove(handle, e, moveEvent => {
        const q = getPointerXY(moveEvent);
        const nowAngle = Math.atan2(q.y - cy, q.x - cx) * 180 / Math.PI;
        element.r = normalizeAngle(startRot + (nowAngle - startAngle));
        applyTextBoxStyle(box, idx);
      }, () => box.classList.remove('dragging'));
    };
    handle.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', start, { passive: false });
    handle.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  function rotateSlot(idx, delta) {
    if (!slots[idx]) return;
    slots[idx].r = normalizeAngle((slots[idx].r || 0) + delta);
    renderSlots();
  }

  function rotateTextElement(idx, delta) {
    if (!textElements[idx]) return;
    textElements[idx].r = normalizeAngle((textElements[idx].r || 0) + delta);
    selectTextElement(idx);
  }

  function sampleContrastingColor(x, y, w, h) {
    try {
      const points = [
        [x + w / 2, y + h / 2],
        [x + w * .25, y + h / 2],
        [x + w * .75, y + h / 2],
        [x + w / 2, y + h * .25],
        [x + w / 2, y + h * .75]
      ];
      let lumTotal = 0;
      points.forEach(([px, py]) => {
        const data = ctx.getImageData(
          Math.max(0, Math.min(canvas.width - 1, Math.round(px))),
          Math.max(0, Math.min(canvas.height - 1, Math.round(py))), 1, 1
        ).data;
        const alpha = data[3] / 255;
        const r = data[0] * alpha + 255 * (1 - alpha);
        const g = data[1] * alpha + 255 * (1 - alpha);
        const b = data[2] * alpha + 255 * (1 - alpha);
        lumTotal += 0.299 * r + 0.587 * g + 0.114 * b;
      });
      return lumTotal / points.length < 145 ? '#FFFFFF' : '#1D3557';
    } catch(e) {
      return '#1D3557';
    }
  }

  function addSlotManual() {
    const W = canvas.width, H = canvas.height;
    slots.push({ x: Math.round(W*0.1), y: Math.round(H*0.05), w: Math.round(W*0.8), h: Math.round(H*0.18), r: 0 });
    renderSlots();
  }

  function addTextElement() {
    if (!templateImg) { showToast('Upload PNG dulu!', true); return; }
    const W = canvas.width, H = canvas.height;
    const w = Math.max(120, Math.round(W * 0.72));
    const h = Math.max(34, Math.round(Math.min(H * 0.075, 72)));
    const cascade = textElements.length * Math.max(8, Math.round(h * 0.18));
    const x = Math.max(0, Math.round((W - w) / 2));
    const y = Math.max(0, Math.min(H - h, Math.round(H * 0.86) - cascade));
    const boothName = String(Auth.getBoothName?.() || 'NAMA PHOTOBOOTH').trim() || 'NAMA PHOTOBOOTH';
    textElements.push({
      type: 'text',
      text: boothName.toUpperCase().slice(0, 80),
      x, y, w, h, r: 0,
      font: 'Segoe UI',
      color: sampleContrastingColor(x, y, w, h),
      font_size: Math.max(10, Math.round(h * 0.58)),
      weight: 900
    });
    selectTextElement(textElements.length - 1);
    showToast('Teks ditambahkan. Geser dan resize pada template.');
  }

  function duplicateSlot(idx) {
    const source = slots[idx];
    if (!source) return;

    const offset = Math.max(14, Math.round(Math.min(source.w || 80, source.h || 80) * 0.08));
    const clone = {
      x: Math.min(Math.max(0, canvas.width - source.w), Math.max(0, (source.x || 0) + offset)),
      y: Math.min(Math.max(0, canvas.height - source.h), Math.max(0, (source.y || 0) + offset)),
      w: source.w,
      h: source.h,
      r: normalizeAngle(source.r || source.rotate || source.rotation || 0)
    };

    slots.splice(idx + 1, 0, clone);
    renderSlots();
    showToast(`Slot Foto ${idx + 1} diduplicate`);
  }

  function deleteSlot(idx) {
    slots.splice(idx, 1);
    renderSlots();
  }

  function clearSlots() {
    slots = [];
    renderSlots();
  }

  function duplicateTextElement(idx) {
    const source = textElements[idx];
    if (!source) return;
    const offset = Math.max(10, Math.round(Math.min(source.w, source.h) * 0.16));
    const clone = {
      ...source,
      x: Math.min(Math.max(0, canvas.width - source.w), Math.max(0, source.x + offset)),
      y: Math.min(Math.max(0, canvas.height - source.h), Math.max(0, source.y + offset))
    };
    textElements.splice(idx + 1, 0, clone);
    selectTextElement(idx + 1);
    showToast(`Teks ${idx + 1} diduplikat`);
  }

  function deleteTextElement(idx) {
    textElements.splice(idx, 1);
    if (!textElements.length) {
      selectedTextIndex = -1;
      hideTextControls();
    } else {
      selectedTextIndex = Math.min(idx, textElements.length - 1);
    }
    renderSlots();
    if (selectedTextIndex >= 0) selectTextElement(selectedTextIndex);
  }

  function clearTextElements() {
    textElements = [];
    selectedTextIndex = -1;
    hideTextControls();
    renderSlots();
  }

  // ─── Save ───
  async function saveTemplate() {
    const name = document.getElementById('templateName').value.trim();
    if (!name) { showToast('Isi nama template dulu!', true); return; }
    if (!selectedCategory) { showToast('Pilih atau tambah kategori dulu!', true); return; }
    if (!templateDataURL) { showToast('Upload PNG dulu!', true); return; }
    if (!slots.length) { showToast('Tambahkan minimal 1 slot!', true); return; }

    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    btn.textContent = '⏫ Mengupload ke R2...';

    try {
      // Upload langsung dari browser ke R2, lalu simpan URL publiknya
      const imageURL = await uploadTemplateImage(templateDataURL, name);

      const realSlots = slots.map(s => ({
        x: Math.round(s.x / scale), y: Math.round(s.y / scale),
        w: Math.round(s.w / scale), h: Math.round(s.h / scale),
        r: normalizeAngle(s.r || 0),
      }));
      const realTextElements = textElements.map(element => ({
        type: 'text',
        text: String(element.text || 'PHOTOBOOTH').slice(0, 80),
        x: Math.round(element.x / scale), y: Math.round(element.y / scale),
        w: Math.round(element.w / scale), h: Math.round(element.h / scale),
        r: normalizeAngle(element.r || 0),
        font: TEXT_FONTS.includes(element.font) ? element.font : 'Segoe UI',
        color: TEXT_COLORS.includes(String(element.color || '').toUpperCase()) ? String(element.color).toUpperCase() : '#1D3557',
        font_size: Math.max(10, Math.round((element.font_size || element.h * 0.58) / scale)),
        weight: 900
      }));

      const tmpl = {
        name,
        category: selectedCategory,
        product_type: selectedProductType,
        photo_layer: selectedPhotoLayer,
        src: imageURL,
        // Text elements disimpan di kolom JSON slots dengan type='text'.
        // Strategi ini kompatibel dengan schema Supabase lama dan tidak memerlukan migration.
        slots: [...realSlots, ...realTextElements],
        w: templateImg.width, h: templateImg.height,
      };

      // Insert ke Supabase database
      const session = Auth.getSession();
      const token   = Auth.getToken();
      tmpl.user_id  = session?.user?.id;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(tmpl),
      });
      if (!res.ok) throw new Error('DB insert gagal: ' + await res.text());
      const [inserted] = await res.json();
      _allTemplates.unshift(normalizeTemplateRecord(inserted));
      showToast('Template tersimpan di cloud! ✓');
      renderTemplateList();
      renderProductListTabs();
      renderCatTabs();
      renderCategoryTags();

      // Reset form (hanya saat sukses)
      document.getElementById('templateName').value = '';
      document.getElementById('canvasWrapper').style.display = 'none';
      document.getElementById('editorControls').style.display = 'none';
      document.getElementById('slotInfo').style.display = 'none';
      btn.style.display = 'none';
      templateDataURL = null; templateImg = null; slots = []; textElements = []; selectedTextIndex = -1;
      hideTextControls();
      syncEditorCounts();
      selectedPhotoLayer = 'behind';
      selectPhotoLayer('behind');
      document.getElementById('fileInput').value = '';

    } catch(e) {
      showToast('Gagal upload: ' + e.message, true);
      console.error(e);
      // Kalau error, tombol tetap tampil supaya user bisa retry
      btn.disabled = false;
      btn.textContent = '💾 Simpan Template';
      return;
    }
    btn.disabled = false;
    btn.textContent = '💾 Simpan Template';
  }

  function customTemplateThumbURL(src) {
    const value = String(src || '');
    return /\.png(?:\?.*)?$/i.test(value)
      ? value.replace(/\.png(?=\?|$)/i, '_thumb.jpg')
      : value;
  }

  function useOriginalTemplateImage(img) {
    if (!img || img.dataset.fallbackUsed === '1') return;
    img.dataset.fallbackUsed = '1';
    const original = decodeURIComponent(img.dataset.original || '');
    if (original) img.src = original;
  }

  // ─── Template List ───
  function renderTemplateList() {
    const list = document.getElementById('templateList');
    const countEl = document.getElementById('templateListCount');

    const filtered = _allTemplates.filter(t => {
      const productOk = filterProductType === 'all' || productTypeOfTemplate(t) === filterProductType;
      const categoryOk = filterCategory === 'all' || t.category === filterCategory;
      return productOk && categoryOk;
    });

    if (countEl) {
      const label = filterProductType === 'photobox' ? 'Photobox' : filterProductType === 'photostrip' ? 'Photostrip' : 'template';
      countEl.textContent = `${filtered.length} ${label}`;
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state">Belum ada template di filter ini</div>';
      return;
    }

    list.innerHTML = filtered.map(t => `
      <div class="template-item">
        <img class="template-thumb" src="${customTemplateThumbURL(t.src)}"
             data-original="${encodeURIComponent(t.src)}"
             onerror="useOriginalTemplateImage(this)"
             loading="lazy" decoding="async" fetchpriority="low"
             alt="${t.name}" crossorigin="anonymous">
        <div class="template-info">
          <h4>${t.name}</h4>
          <p>${(t.slots||[]).length} slot foto · ${(t.text_elements||[]).length} teks · ${t.w||591}×${t.h||1772}px</p>
          <span class="cat-badge">${productTypeOfTemplate(t) === 'photobox' ? 'Photobox 4R' : 'Photostrip'} · ${t.category}</span>
          <span class="cat-badge">Foto ${t.photo_layer === 'front' ? 'di depan' : 'di belakang'}</span>
          <select class="template-layer-select" aria-label="Posisi foto ${t.name}" onchange="ubahPhotoLayer('${t.id}', this.value, this)">
            <option value="behind" ${t.photo_layer !== 'front' ? 'selected' : ''}>Foto di belakang template</option>
            <option value="front" ${t.photo_layer === 'front' ? 'selected' : ''}>Foto di depan template</option>
          </select>
        </div>
        <button class="btn btn-danger" onclick="hapusTemplate('${t.id}')">Hapus</button>
      </div>
    `).join('');
  }

  async function ubahPhotoLayer(id, layer, selectEl) {
    const normalizedLayer = layer === 'front' ? 'front' : 'behind';
    const target = _allTemplates.find(t => String(t.id) === String(id));
    const previousLayer = target?.photo_layer === 'front' ? 'front' : 'behind';
    if (!target || normalizedLayer === previousLayer) return;

    if (selectEl) selectEl.disabled = true;
    try {
      const session = Auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session admin sudah habis. Logout lalu login ulang.');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/templates?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ photo_layer: normalizedLayer })
      });
      if (!res.ok) throw new Error(await res.text());
      const [updated] = await res.json();
      Object.assign(target, normalizeTemplateRecord(updated || { ...target, photo_layer: normalizedLayer }));
      renderTemplateList();
      showToast(`Posisi foto diubah ke ${normalizedLayer === 'front' ? 'depan' : 'belakang'}`);
    } catch(e) {
      if (selectEl) selectEl.value = previousLayer;
      showToast('Gagal mengubah posisi foto: ' + e.message, true);
    } finally {
      if (selectEl) selectEl.disabled = false;
    }
  }

  async function hapusTemplate(id) {
    if (!confirm('Hapus template ini beserta file R2-nya?')) return;
    try {
      const token = Auth.getToken();
      if (!token) throw new Error('Session admin tidak ditemukan. Login ulang dulu.');

      const response = await fetch('/api/delete-template', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId: id }),
      });
      const result = await readJsonResponse(response);
      if (!response.ok) throw new Error(result?.error || 'Gagal menghapus template.');

      // Simpan tombstone lokal supaya cache / response lama tidak memunculkan template kembali.
      rememberDeletedTemplate(id);
      _allTemplates = _allTemplates.filter(t => String(t.id) !== String(id));

      renderTemplateList();
      renderCatTabs();
      renderCategoryTags();
      showToast('Template dan file R2 dihapus');
    } catch(e) {
      showToast('Gagal hapus: ' + e.message, true);
    }
  }

  function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = isError ? '#e94560' : '#27ae60';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // Init
  renderCategoryTags();
  selectPhotoLayer('behind');
  renderProductListTabs();
  renderCatTabs();
  renderManageCats();
  // Init: load dari Supabase dulu
  (async () => {
    document.getElementById('templateList').innerHTML = '<div class="empty-state">Memuat template...</div>';
    await fetchAllTemplates();
    renderProductListTabs();
    renderCatTabs();
    renderCategoryTags();
    renderManageCats();
    renderTemplateList();
  })();
