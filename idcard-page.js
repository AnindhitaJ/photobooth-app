    if (typeof Auth !== 'undefined' && !Auth.getSession()) window.location.href = '/login';
    const RETURN_URL = '/idcard';

    const ID_CARD_DB_TABLE = 'id_cards';
    const LOCAL_KEY = 'idCardHistory';

    const LANG = {
      id: {
        heroTitle: 'Buat ID Card Kamu',
        heroSub: 'Ambil foto langsung dari kamera, isi data lucu, pilih warna, lalu export/print sebagai kartu 10×15 siap share.',
        create: 'Buat ID Card Kamu',
        history: 'Created ID Cards',
        nickname: 'Nama Panggilan',
        idNumber: 'Nomor ID',
        role: 'Peran',
        mood: 'Mood',
        funFact: 'Fakta Unik',
        custom: 'Tulis Sendiri',
        noPhoto: 'Belum ada foto. Foto akan masuk ke area kanan kartu.',
        hasPhoto: 'Foto sudah masuk ke kartu ✓',
        takePicture: '📷 Ambil Foto',
        exportPng: '⬇️ Export PNG',
        save: '💾 Save'
      },
      en: {
        heroTitle: 'Create Your ID Card',
        heroSub: 'Take a picture from camera, fill the playful fields, pick a color, then export/print a 10×15 share-ready card.',
        create: 'Create Your ID Card',
        history: 'Created ID Cards',
        nickname: 'Nickname',
        idNumber: 'ID Number',
        role: 'Role',
        mood: 'Mood',
        funFact: 'Fun Fact',
        custom: 'Write Your Own',
        noPhoto: 'No photo yet. Your picture will appear on the right side of the card.',
        hasPhoto: 'Photo added to the card ✓',
        takePicture: '📷 Take Picture',
        exportPng: '⬇️ Export PNG',
        save: '💾 Save'
      }
    };

    const OPTIONS = {
      id: {
        role: [
          'Si Paling Ceria','Si Paling Kalem','Si Paling Gemes','Si Paling Keren','Si Paling Fotogenik',
          'Si Paling Random','Si Paling Manis','Si Paling Santai','Si Paling Berani','Si Paling Soft',
          'Si Paling Estetik','Si Paling Mood Booster','Si Paling Bintang','Si Paling Misterius'
        ],
        mood: [
          'Happy','Excited','Chill','Percaya Diri','Gemes','Malu-malu','Ceria','Kalem','Dreamy',
          'Kocak','Elegan','Soft','Cool','Mood Booster'
        ],
        funFact: [
          'Suka foto cantik','Selalu siap difoto','Diam-diam fotogenik','Paling suka candid',
          'Suka warna pastel','Tim foto dulu baru makan','Senyumnya mahal','Gemesnya natural',
          'Kalem tapi menarik','Random tapi seru','Suka hal-hal kecil','Pembawa vibes positif',
          'Sekali foto langsung jadi'
        ]
      },
      en: {
        role: [
          'The Cheerful One','The Calm One','The Cutie','The Cool One','The Photogenic One',
          'The Random One','The Sweet One','The Chill One','The Brave One','The Soft One',
          'The Aesthetic One','The Mood Booster','The Star','The Mysterious One'
        ],
        mood: [
          'Happy','Excited','Chill','Confident','Cute','Shy','Cheerful','Calm','Dreamy',
          'Funny','Elegant','Soft','Cool','Mood Booster'
        ],
        funFact: [
          'Loves pretty photos','Always ready for photos','Secretly photogenic','Loves candid shots',
          'Loves pastel colors','Team photos before food','Has a priceless smile','Naturally adorable',
          'Calm but charming','Random but fun','Loves little things','Brings positive vibes',
          'One shot, perfect result'
        ]
      }
    };

    function getOptions(key, lang = state?.lang || 'id') {
      return (OPTIONS[lang] && OPTIONS[lang][key]) || OPTIONS.id[key] || [];
    }

    function translateOptionValue(key, fromLang, toLang, value) {
      const from = getOptions(key, fromLang);
      const to = getOptions(key, toLang);
      const idx = from.indexOf(value);
      return idx >= 0 && to[idx] ? to[idx] : value;
    }

    const THEMES = {
      pink: { name:'Pink', sub:'gemes', bg:'#fff0f6', accent:'#f472b6', accent2:'#fbcfe8', text:'#572033', photo:'#f9a8d4' },
      lavender: { name:'Lavender', sub:'dreamy', bg:'#f5f3ff', accent:'#8b5cf6', accent2:'#ddd6fe', text:'#312e81', photo:'#c4b5fd' },
      mint: { name:'Mint', sub:'fresh', bg:'#ecfdf5', accent:'#10b981', accent2:'#bbf7d0', text:'#064e3b', photo:'#86efac' },
      sky: { name:'Sky Blue', sub:'soft', bg:'#eff6ff', accent:'#3b82f6', accent2:'#bfdbfe', text:'#1e3a8a', photo:'#93c5fd' },
      butter: { name:'Butter Yellow', sub:'sunny', bg:'#fffbeb', accent:'#eab308', accent2:'#fde68a', text:'#713f12', photo:'#facc15' },
      cream: { name:'Cream', sub:'clean', bg:'#fffaf0', accent:'#d6b56d', accent2:'#f8e7bd', text:'#5b4520', photo:'#e9d5a1' },
      mocha: { name:'Mocha', sub:'warm', bg:'#f7efe7', accent:'#9a6b4f', accent2:'#dbc0ad', text:'#4a2d20', photo:'#b08968' },
      gray: { name:'Soft Gray', sub:'neutral', bg:'#f8fafc', accent:'#64748b', accent2:'#e2e8f0', text:'#1e293b', photo:'#cbd5e1' },
      navy: { name:'Navy Cream', sub:'masculine', bg:'#f8f3e8', accent:'#1D3557', accent2:'#e5d4b9', text:'#10233b', photo:'#6b7fa3' },
      sage: { name:'Sage Green', sub:'calm', bg:'#f1f8f1', accent:'#6b8f71', accent2:'#d8ead7', text:'#29462d', photo:'#9ab89e' }
    };

    const IDCARD_FILTERS = [
      { label:'Normal', css:'none' },
      { label:'Warm', css:'sepia(.22) brightness(1.06) contrast(.97) saturate(1.05)' },
      { label:'Cool', css:'hue-rotate(15deg) saturate(1.1) brightness(1.04)' },
      { label:'Soft', css:'brightness(1.12) contrast(.90) saturate(.90)' },
      { label:'Vivid', css:'saturate(1.45) contrast(1.08) brightness(1.03)' },
      { label:'Matte', css:'contrast(.88) brightness(1.06) saturate(.80)' },
      { label:'Sepia', css:'sepia(.60) brightness(1.04)' },
      { label:'B&W', css:'grayscale(1) contrast(1.08)' },
      { label:'Vintage', css:'sepia(.30) contrast(.94) brightness(1.03)' },
      { label:'Dreamy', css:'brightness(1.15) contrast(.88) saturate(1.12) blur(0.3px)' },
    ];

    let state = {
      lang:'id',
      nickname:'',
      idNumber:'',
      role: OPTIONS.id.role[0],
      mood: OPTIONS.id.mood[0],
      funFact: OPTIONS.id.funFact[0],
      theme:'pink',
      filter:'none',
      beautify:'off',
      photo:null,
      savedId:null,
      synced:false
    };
    let latestIdCanvas = null;
    let latestPrintCanvas = null;

    const idCanvas = document.getElementById('idCanvas');
    const ctx = idCanvas.getContext('2d');

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => t.classList.remove('show'), 2200);
    }

    function padTextBase(input) {
      return (input || 'GUEST').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'GUEST';
    }

    function randomCode(len=6) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let out = '';
      crypto.getRandomValues(new Uint32Array(len)).forEach(n => out += chars[n % chars.length]);
      return out;
    }

    function randomizeId() {
      // ID Number cukup 6 karakter random: huruf kapital + angka.
      state.idNumber = randomCode(6);
      document.getElementById('idNumber').value = state.idNumber;
      renderPreview();
    }

    function setLang(lang) {
      const prevLang = state.lang || 'id';
      if (prevLang !== lang) {
        ['role','mood','funFact'].forEach(key => {
          state[key] = translateOptionValue(key, prevLang, lang, state[key]);
        });
      }
      state.lang = lang;
      document.getElementById('langId').classList.toggle('active', lang === 'id');
      document.getElementById('langEn').classList.toggle('active', lang === 'en');
      applyLabels();
      buildSelects();
      renderPreview();
    }

    function applyLabels() {
      const l = LANG[state.lang];
      document.getElementById('heroTitle').textContent = l.heroTitle;
      document.getElementById('heroSub').textContent = l.heroSub;
      document.getElementById('tabCreate').textContent = l.create;
      document.getElementById('tabHistory').textContent = l.history;
      document.getElementById('labelNickname').textContent = l.nickname;
      document.getElementById('labelIdNumber').textContent = l.idNumber;
      document.getElementById('labelRole').textContent = l.role;
      document.getElementById('labelMood').textContent = l.mood;
      document.getElementById('labelFunFact').textContent = l.funFact;
      document.getElementById('btnTakePicture').textContent = l.takePicture;
      document.getElementById('btnExport').textContent = l.exportPng;
      document.querySelectorAll('#roleCustom,#moodCustom,#funFactCustom').forEach(el => el.placeholder = l.custom);
      document.getElementById('photoStatus').textContent = state.photo ? l.hasPhoto : l.noPhoto;
    }

    function buildSelects() {
      ['role','mood','funFact'].forEach(key => {
        const sel = document.getElementById(key + 'Select');
        const current = state[key];
        const l = LANG[state.lang];
        const optionList = getOptions(key);
        sel.innerHTML = optionList.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('') +
          `<option value="__custom__">${escapeHtml(l.custom)}</option>`;
        if (optionList.includes(current)) {
          sel.value = current;
          document.getElementById(key + 'Custom').style.display = 'none';
        } else {
          sel.value = '__custom__';
          const custom = document.getElementById(key + 'Custom');
          custom.style.display = '';
          custom.value = current;
        }
      });
    }


    function handleNicknameInput() {
      state.nickname = document.getElementById('nickname').value.slice(0, 20);
      if (!state.idNumber) randomizeId();
      renderPreview();
    }

    function setSelectOrCustom(key) {
      const sel = document.getElementById(key + 'Select');
      const custom = document.getElementById(key + 'Custom');
      if (sel.value === '__custom__') {
        custom.style.display = '';
        custom.focus();
        state[key] = custom.value || '';
      } else {
        custom.style.display = 'none';
        state[key] = sel.value;
      }
      renderPreview();
    }

    function setCustomValue(key) {
      const custom = document.getElementById(key + 'Custom');
      state[key] = custom.value;
      renderPreview();
    }

    function randomizeField(key) {
      const arr = getOptions(key);
      state[key] = arr[Math.floor(Math.random() * arr.length)];
      buildSelects();
      renderPreview();
    }


    function idThemeEmoji(key, t) {
      const text = String(key + ' ' + (t?.name || '')).toLowerCase();
      if (text.includes('pink')) return '🩷';
      if (text.includes('lavender') || text.includes('purple')) return '💜';
      if (text.includes('mint')) return '🌿';
      if (text.includes('sky') || text.includes('blue')) return '🩵';
      if (text.includes('yellow') || text.includes('butter')) return '🌼';
      if (text.includes('cream')) return '🤍';
      if (text.includes('mocha') || text.includes('brown')) return '☕';
      if (text.includes('gray') || text.includes('grey')) return '🩶';
      if (text.includes('navy')) return '💙';
      if (text.includes('sage')) return '🍃';
      return '💳';
    }

    function buildIdFilters() {
      const grid = document.getElementById('filterGrid');
      if (!grid) return;
      grid.innerHTML = IDCARD_FILTERS.map((f, i) =>
        `<button class="pill${state.filter === f.css ? ' active' : ''}" onclick="selectIdFilter(${i})">${f.label}</button>`
      ).join('');
    }
    function selectIdFilter(idx) {
      state.filter = IDCARD_FILTERS[idx].css;
      buildIdFilters();
      renderPreview();
    }

    function buildBeautifyGrid() {
      const grid = document.getElementById('beautifyGrid');
      if (!grid || typeof Beautify === 'undefined') return;
      grid.innerHTML = Object.entries(Beautify.PRESETS).map(([key, p]) => `
        <button class="theme-btn ${state.beautify === key ? 'active' : ''}" onclick="setBeautify('${key}')">
          <div class="theme-swatch">${key === 'off' ? '🙅' : key === 'natural' ? '✨' : key === 'medium' ? '💄' : '🌸'}</div>
          <div class="theme-name">${p.label}</div>
        </button>
      `).join('');
    }

    function setBeautify(key) {
      state.beautify = key || 'off';
      buildBeautifyGrid();
      renderPreview();
    }

    function buildThemeGrid() {
      const grid = document.getElementById('themeGrid');
      grid.innerHTML = Object.entries(THEMES).map(([key, t]) => `
        <button class="theme-btn ${state.theme === key ? 'active' : ''}" onclick="setTheme('${key}')">
          <div class="theme-swatch">${idThemeEmoji(key, t)}</div>
          <div class="theme-name">${t.name}</div>
        </button>
      `).join('');
    }

    function setTheme(key) {
      state.theme = key;
      buildBeautifyGrid();
      buildThemeGrid();
      renderPreview();
    }

    function setView(view) {
      if (view === 'history') view = 'create';
      document.getElementById('tabCreate').classList.toggle('active', view === 'create');
      document.getElementById('tabHistory').classList.toggle('active', view === 'history');
      document.getElementById('createPanel').style.display = view === 'create' ? '' : 'none';
      document.getElementById('historyPanel').style.display = 'none';
      if (view === 'history') renderHistory();
    }

    function drawRoundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawCoverImage(ctx, img, x, y, w, h) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const scale = Math.max(w / iw, h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(img, x + w / 2 - dw / 2, y + h / 2 - dh / 2, dw, dh);
    }

    function fitFont(ctx, text, maxWidth, startPx, minPx, weight='800') {
      let size = startPx;
      do {
        ctx.font = `${weight} ${size}px Segoe UI, system-ui, sans-serif`;
        if (ctx.measureText(text || '').width <= maxWidth || size <= minPx) break;
        size -= 2;
      } while(size > minPx);
      return size;
    }

    function drawLabelValue(ctx, label, value, x, y, w, theme, compact=false) {
      ctx.fillStyle = theme.accent;
      ctx.font = `900 ${compact ? 18 : 19}px Segoe UI, system-ui, sans-serif`;
      ctx.fillText(label.toUpperCase(), x, y);
      ctx.fillStyle = theme.text;
      const size = fitFont(ctx, value || '-', w, compact ? 27 : 31, 16, '900');
      ctx.font = `900 ${size}px Segoe UI, system-ui, sans-serif`;
      ctx.fillText(value || '-', x, y + (compact ? 28 : 34));
    }


    const PHOTO_FEATURE = 'idcard';

    async function mulaiAmbilFoto() {
      try {
        await LuxProductPhotoFlow.capture({
          feature: PHOTO_FEATURE,
          seconds: 5,
          maxWidth: 1600,
          maxHeight: 2000,
          quality: 0.88,
          onReady: src => loadPhoto(src),
          onError: error => showToast('Foto gagal: ' + (error?.message || 'coba lagi'))
        });
      } catch (error) {
        console.error('[LUX] Kamera ID Card gagal:', error);
        showToast(error?.message || 'Kamera gagal dibuka');
      }
    }

    async function checkAndLoadProductPhoto() {
      try {
        await LuxProductPhotoFlow.restoreOrMigrateLegacy({
          feature: PHOTO_FEATURE,
          onReady: src => loadPhoto(src, true)
        });
      } catch (error) {
        console.warn('[LUX] Foto ID Card sebelumnya tidak dapat dipulihkan:', error);
      }
    }

    function loadPhoto(src, silent = false) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          state.photo = src;
          renderPreview();
          applyLabels();
          if (!silent) showToast('Foto berhasil masuk ✓');
          resolve(img);
        };
        img.onerror = () => {
          if (!silent) showToast('Foto gagal dimuat');
          reject(new Error('Foto gagal dimuat ke layout ID Card.'));
        };
        img.src = src;
      });
    }

    function renderPreview() {
      const theme = THEMES[state.theme];
      const W = idCanvas.width, H = idCanvas.height;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, theme.bg);
      bg.addColorStop(0.55, '#ffffff');
      bg.addColorStop(1, theme.accent2);
      ctx.fillStyle = bg;
      drawRoundRect(ctx, 0, 0, W, H, 44);
      ctx.fill();

      // soft abstract shapes
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = theme.accent2;
      ctx.beginPath(); ctx.arc(W * 0.12, H * 0.18, 130, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.82, H * 0.12, 150, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = theme.accent;
      ctx.beginPath(); ctx.arc(W * 0.92, H * 0.86, 190, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // inner border
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 8;
      drawRoundRect(ctx, 24, 24, W - 48, H - 48, 36);
      ctx.stroke();
      ctx.restore();

      // header pill
      ctx.save();
      ctx.fillStyle = theme.accent;
      drawRoundRect(ctx, 50, 34, 255, 64, 32);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '950 34px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ID CARD', 177, 66);
      ctx.restore();

      // logo/booth small
      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.text;
      ctx.globalAlpha = 0.66;
      ctx.font = '900 18px Segoe UI, system-ui, sans-serif';
      ctx.fillText((Auth?.getBoothName?.() || 'Photobooth').toUpperCase(), W - 50, 62);
      ctx.restore();

      const l = LANG[state.lang];
      const leftX = 58;
      const leftW = 520;
      drawLabelValue(ctx, l.nickname, state.nickname || '—', leftX, 155, leftW, theme);
      drawLabelValue(ctx, l.idNumber, state.idNumber || '—', leftX, 240, leftW, theme);
      drawLabelValue(ctx, l.role, state.role || '—', leftX, 325, leftW, theme, true);
      drawLabelValue(ctx, l.mood, state.mood || '—', leftX, 400, leftW, theme, true);

      ctx.save();
      ctx.fillStyle = theme.accent;
      ctx.font = '900 18px Segoe UI, system-ui, sans-serif';
      ctx.fillText(l.funFact.toUpperCase(), leftX, 480);
      ctx.fillStyle = theme.text;
      ctx.font = '850 22px Segoe UI, system-ui, sans-serif';
      wrapText(ctx, state.funFact || '—', leftX, 512, leftW, 27, 2);
      ctx.restore();

      // right photo
      const px = 640, py = 126, pw = 310, ph = 410;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      drawRoundRect(ctx, px - 14, py - 14, pw + 28, ph + 28, 34);
      ctx.fill();
      ctx.strokeStyle = theme.photo;
      ctx.lineWidth = 10;
      drawRoundRect(ctx, px - 14, py - 14, pw + 28, ph + 28, 34);
      ctx.stroke();
      drawRoundRect(ctx, px, py, pw, ph, 24);
      ctx.clip();
      if (state.photo) {
        const img = new Image();
        img.onload = () => {
          drawStaticIdCard();
        };
        img.src = state.photo;
        // If not loaded yet, draw using cache later through drawStaticIdCard.
        drawPlaceholderPhoto(ctx, px, py, pw, ph, theme);
      } else {
        drawPlaceholderPhoto(ctx, px, py, pw, ph, theme);
      }
      ctx.restore();

      drawStaticIdCard();
    }

    function drawStaticIdCard(targetCtx = ctx, canvas = idCanvas, photoImg = null) {
      const theme = THEMES[state.theme];
      const W = canvas.width, H = canvas.height;
      targetCtx.clearRect(0, 0, W, H);

      const bg = targetCtx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, theme.bg);
      bg.addColorStop(0.55, '#ffffff');
      bg.addColorStop(1, theme.accent2);
      targetCtx.fillStyle = bg;
      drawRoundRect(targetCtx, 0, 0, W, H, 44);
      targetCtx.fill();

      targetCtx.save();
      targetCtx.globalAlpha = 0.34;
      targetCtx.fillStyle = theme.accent2;
      targetCtx.beginPath(); targetCtx.arc(W * 0.12, H * 0.18, 130, 0, Math.PI * 2); targetCtx.fill();
      targetCtx.beginPath(); targetCtx.arc(W * 0.82, H * 0.12, 150, 0, Math.PI * 2); targetCtx.fill();
      targetCtx.globalAlpha = 0.22;
      targetCtx.fillStyle = theme.accent;
      targetCtx.beginPath(); targetCtx.arc(W * 0.92, H * 0.86, 190, 0, Math.PI * 2); targetCtx.fill();
      targetCtx.restore();

      targetCtx.save();
      targetCtx.strokeStyle = theme.accent;
      targetCtx.lineWidth = 8;
      drawRoundRect(targetCtx, 24, 24, W - 48, H - 48, 36);
      targetCtx.stroke();
      targetCtx.restore();

      targetCtx.save();
      targetCtx.fillStyle = theme.accent;
      drawRoundRect(targetCtx, 50, 34, 255, 64, 32);
      targetCtx.fill();
      targetCtx.fillStyle = '#fff';
      targetCtx.font = '950 34px Segoe UI, system-ui, sans-serif';
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillText('ID CARD', 177, 66);
      targetCtx.restore();

      targetCtx.save();
      targetCtx.textAlign = 'right';
      targetCtx.fillStyle = theme.text;
      targetCtx.globalAlpha = 0.66;
      targetCtx.font = '900 18px Segoe UI, system-ui, sans-serif';
      targetCtx.fillText((Auth?.getBoothName?.() || 'Photobooth').toUpperCase(), W - 50, 62);
      targetCtx.restore();

      const l = LANG[state.lang];
      const leftX = 58;
      const leftW = 520;
      drawLabelValue(targetCtx, l.nickname, state.nickname || '—', leftX, 155, leftW, theme);
      drawLabelValue(targetCtx, l.idNumber, state.idNumber || '—', leftX, 240, leftW, theme);
      drawLabelValue(targetCtx, l.role, state.role || '—', leftX, 325, leftW, theme, true);
      drawLabelValue(targetCtx, l.mood, state.mood || '—', leftX, 400, leftW, theme, true);

      targetCtx.save();
      targetCtx.fillStyle = theme.accent;
      targetCtx.font = '900 18px Segoe UI, system-ui, sans-serif';
      targetCtx.fillText(l.funFact.toUpperCase(), leftX, 480);
      targetCtx.fillStyle = theme.text;
      targetCtx.font = '850 22px Segoe UI, system-ui, sans-serif';
      wrapText(targetCtx, state.funFact || '—', leftX, 512, leftW, 27, 2);
      targetCtx.restore();

      const px = 640, py = 126, pw = 310, ph = 410;
      targetCtx.save();
      targetCtx.fillStyle = '#ffffff';
      drawRoundRect(targetCtx, px - 14, py - 14, pw + 28, ph + 28, 34);
      targetCtx.fill();
      targetCtx.strokeStyle = theme.photo;
      targetCtx.lineWidth = 10;
      drawRoundRect(targetCtx, px - 14, py - 14, pw + 28, ph + 28, 34);
      targetCtx.stroke();
      drawRoundRect(targetCtx, px, py, pw, ph, 24);
      targetCtx.clip();
      if (photoImg) {
        const base = state.filter || 'none';
        if (typeof Beautify !== 'undefined' && state.beautify && state.beautify !== 'off') {
          targetCtx.filter = base;
          Beautify.drawCover(targetCtx, photoImg, px, py, pw, ph, { beautify: state.beautify });
          targetCtx.filter = 'none';
        } else {
          targetCtx.filter = base;
          drawCoverImage(targetCtx, photoImg, px, py, pw, ph);
          targetCtx.filter = 'none';
        }
      }
      else if (state.photo) {
        const img = new Image();
        img.onload = () => {
          targetCtx.save();
          drawRoundRect(targetCtx, px, py, pw, ph, 24);
          targetCtx.clip();
          const base = state.filter || 'none';
          if (typeof Beautify !== 'undefined' && state.beautify && state.beautify !== 'off') {
            targetCtx.filter = base;
            Beautify.drawCover(targetCtx, img, px, py, pw, ph, { beautify: state.beautify });
            targetCtx.filter = 'none';
          } else {
            targetCtx.filter = base;
            drawCoverImage(targetCtx, img, px, py, pw, ph);
            targetCtx.filter = 'none';
          }
          targetCtx.restore();
        };
        img.src = state.photo;
        drawPlaceholderPhoto(targetCtx, px, py, pw, ph, theme);
      } else {
        drawPlaceholderPhoto(targetCtx, px, py, pw, ph, theme);
      }
      targetCtx.restore();

      targetCtx.save();
      targetCtx.fillStyle = theme.accent;
      targetCtx.globalAlpha = .9;
      targetCtx.font = '900 24px Segoe UI, sans-serif';
      targetCtx.fillText('✦', 340, 92);
      targetCtx.fillText('♡', 910, 92);
      targetCtx.fillText('✧', 92, 570);
      targetCtx.restore();
    }

    function drawPlaceholderPhoto(c, x, y, w, h, theme) {
      const grad = c.createLinearGradient(x, y, x+w, y+h);
      grad.addColorStop(0, theme.accent2);
      grad.addColorStop(1, '#ffffff');
      c.fillStyle = grad;
      c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,.8)';
      c.font = '80px serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('📷', x + w/2, y + h/2 - 10);
      c.font = '900 18px Segoe UI, sans-serif';
      c.fillStyle = theme.text;
      c.globalAlpha = .65;
      c.fillText(state.lang === 'id' ? 'ambil foto' : 'take picture', x + w/2, y + h/2 + 56);
      c.globalAlpha = 1;
    }

    function wrapText(c, text, x, y, maxWidth, lineHeight, maxLines=2) {
      const words = String(text || '').split(/\s+/);
      let line = '';
      let lines = [];
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (c.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      lines = lines.slice(0, maxLines);
      lines.forEach((ln, i) => {
        if (i === maxLines - 1 && c.measureText(ln).width > maxWidth) {
          while (ln.length > 3 && c.measureText(ln + '…').width > maxWidth) ln = ln.slice(0, -1);
          ln += '…';
        }
        c.fillText(ln, x, y + i * lineHeight);
      });
    }

    const dataUrlToBlob = src => LuxUtils.dataUrlToBlob(src, 'image/png');

    function dataUrlToFile(dataUrl, filename) {
      const blob = dataUrlToBlob(dataUrl);
      return new File([blob], filename, { type: blob.type });
    }

    async function getIdCardDataUrl(type='png') {
      const c = document.createElement('canvas');
      c.width = 1012;
      c.height = 638;
      const cc = c.getContext('2d');
      if (state.photo) {
        const img = await loadImageElement(state.photo);
        drawStaticIdCard(cc, c, img);
      } else {
        drawStaticIdCard(cc, c, null);
      }
      latestIdCanvas = c;
      return Auth.exportCanvasDataURL(c, type === 'jpg' ? 'image/jpeg' : 'image/png', .98);
    }

    async function getPrintDataUrl() {
      const print = document.createElement('canvas');
      print.width = 1200;
      print.height = 1800;
      const pc = print.getContext('2d');
      pc.fillStyle = '#ffffff';
      pc.fillRect(0, 0, print.width, print.height);

      const idUrl = await getIdCardDataUrl('png');
      const idImg = await loadImageElement(idUrl);

      // 4R portrait canvas. ID Card ditaruh di kiri atas dengan ukuran fisik asli KTP.
      // 4R = 10×15 cm. ID Card = 85.6×53.98 mm, jadi skalanya tidak memenuhi 4R.
      const margin = 36;
      const cardW = Math.round(print.width * 0.856); // 85.6mm dari lebar 100mm
      const cardH = Math.round(cardW * 638 / 1012);
      const x = margin;
      const y = margin;

      pc.save();
      pc.shadowColor = 'rgba(29,53,87,.10)';
      pc.shadowBlur = 8;
      pc.shadowOffsetY = 3;
      drawRoundRect(pc, x, y, cardW, cardH, 24);
      pc.fillStyle = '#fff';
      pc.fill();
      pc.clip();
      pc.drawImage(idImg, x, y, cardW, cardH);
      pc.restore();

      latestPrintCanvas = print;
      return Auth.exportCanvasDataURL(print, 'image/png');
    }


    async function exportIdCard(type='png') {
      if (!state.photo && !confirm('Foto belum ditambahkan. Lanjut download dengan placeholder?')) return;
      const url = await getIdCardDataUrl(type);
      const a = document.createElement('a');
      a.href = url;
      a.download = `id-card-${(state.nickname || 'guest').replace(/\s+/g,'-').toLowerCase()}-${Date.now()}.${type === 'jpg' ? 'jpg' : 'png'}`;
      a.click();
      await saveCard(true);
      showToast('ID Card berhasil diexport ✓');
    }

    function printIdCard() {
      if (!state.photo && !confirm('Foto belum ditambahkan. Lanjut print dengan placeholder?')) return;
      document.getElementById('printSizeModal').classList.add('show');
    }

    function closePrintSizeModal() {
      document.getElementById('printSizeModal').classList.remove('show');
    }

    async function confirmPrintSize(size) {
      closePrintSizeModal();
      const is4R = size === '4r';

      try {
        showToast(is4R ? 'Membuat file 4R...' : 'Membuat file ukuran asli...');

        const url = is4R ? await getPrintDataUrl() : await getIdCardDataUrl('png');
        const filename = is4R ? `id-card-print-4r-${Date.now()}.png` : `id-card-original-${Date.now()}.png`;

        // Simpan history pakai preview ID Card normal saja.
        // Jangan simpan file 4R besar ke localStorage karena bisa bikin klik 4R gagal/quota exceeded.
        try {
          await saveCard(true);
        } catch (saveErr) {
          console.warn('Save history skipped:', saveErr);
        }

        const file = dataUrlToFile(url, filename);
        const shareTitle = is4R ? 'ID Card Print 4R' : 'ID Card Photobooth';
        const shareText  = is4R ? 'File ID Card ukuran 4R siap cetak' : 'File ID Card ukuran asli siap cetak';
        try {
          if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
            await navigator.share({ title: shareTitle, text: shareText, files:[file] });
            showToast('File siap cetak dibuka ✓');
          } else {
            downloadDataUrl(url, filename);
            showToast(is4R ? 'File 4R didownload ✓' : 'File ukuran asli didownload ✓');
          }
        } catch(shareErr) {
          console.warn('Native share cancelled/failed, fallback download:', shareErr);
          downloadDataUrl(url, filename);
          showToast('Share dibatalkan, file tetap didownload ✓');
        }
      } catch(e) {
        console.error('Cetak ID Card gagal:', e);
        showToast('Cetak gagal. Coba lagi atau cek console.');
      }
    }

    function downloadDataUrl(url, filename) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function getHistory() {
      try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch(e) { return []; }
    }

    function setHistory(items) {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, 40)));
      } catch (e) {
        // Fallback kalau storage penuh: simpan metadata + thumbnail kecil saja.
        const slim = items.slice(0, 12).map(item => ({
          ...item,
          photo_url: null,
          export_url: item.card_preview || null
        }));
        localStorage.setItem(LOCAL_KEY, JSON.stringify(slim));
      }
    }

    async function saveCard(silent=false, printFileUrl=null) {
      if (!state.idNumber) randomizeId();
      const exportUrl = await getIdCardDataUrl('jpg');
      const record = {
        id: state.savedId || `local-${Date.now()}-${randomCode(4)}`,
        profile_id: Auth?.getUserId?.() || null,
        nickname: state.nickname,
        id_number: state.idNumber,
        role: state.role,
        mood: state.mood,
        fun_fact: state.funFact,
        language: state.lang,
        color_theme: state.theme,
        photo_url: state.photo,
        logo_url: Auth?.getLogoUrl?.() || null,
        export_url: printFileUrl || exportUrl,
        card_preview: exportUrl,
        created_at: new Date().toISOString(),
        synced: false
      };
      state.savedId = record.id;

      const items = getHistory();
      const idx = items.findIndex(x => x.id === record.id);
      if (idx >= 0) items[idx] = { ...items[idx], ...record };
      else items.unshift(record);
      setHistory(items);

      syncToDatabase(record).then(ok => {
        if (ok) {
          const latest = getHistory();
          const found = latest.find(x => x.id === record.id);
          if (found) found.synced = true;
          setHistory(latest);
        }
      });

      if (!silent) showToast('ID Card tersimpan ✓');
      renderHistory();
      return record;
    }

    async function syncToDatabase(record) {
      // Supabase sync best-effort. Kalau tabel belum dibuat, app tetap aman pakai localStorage.
      try {
        const session = Auth?.getSession?.();
        if (!session?.access_token || !window.SUPABASE_URL) return false;
      } catch(e) {}

      try {
        const token = Auth.getToken();
        const row = {
          local_id: record.id,
          profile_id: record.profile_id,
          nickname: record.nickname,
          id_number: record.id_number,
          role: record.role,
          mood: record.mood,
          fun_fact: record.fun_fact,
          language: record.language,
          color_theme: record.color_theme,
          photo_url: record.photo_url,
          logo_url: record.logo_url,
          export_url: record.export_url,
          created_at: record.created_at
        };
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${ID_CARD_DB_TABLE}`, {
          method:'POST',
          headers:{
            apikey: SUPABASE_ANON,
            Authorization:`Bearer ${token}`,
            'Content-Type':'application/json',
            Prefer:'resolution=merge-duplicates'
          },
          body: JSON.stringify(row)
        });
        return res.ok;
      } catch(e) {
        return false;
      }
    }

    function renderHistory() {
      const grid = document.getElementById('historyGrid');
      const empty = document.getElementById('historyEmpty');
      const items = getHistory();
      empty.style.display = items.length ? 'none' : '';
      grid.innerHTML = items.map(item => `
        <div class="history-item">
          <img src="${item.card_preview || item.export_url}" alt="ID card">
          <div class="history-title">${escapeHtml(item.nickname || 'Guest')} · ${escapeHtml(item.id_number || '')}</div>
          <div class="history-date">${new Date(item.created_at).toLocaleString('id-ID')} ${item.synced ? '· DB ✓' : '· Local'}</div>
          <div class="history-actions">
            <button class="print" onclick="printExisting('${item.id}')">Print</button>
            <button class="delete" onclick="deleteCard('${item.id}')">Delete</button>
          </div>
        </div>
      `).join('');
    }

    async function printExisting(id) {
      const item = getHistory().find(x => x.id === id);
      if (!item) return;
      const fileUrl = item.export_url || item.card_preview;
      const file = dataUrlToFile(fileUrl, `id-card-print-${Date.now()}.png`);
      try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
          await navigator.share({ title:'ID Card Photobooth', files:[file] });
        } else {
          const a = document.createElement('a'); a.href = fileUrl; a.download = file.name; a.click();
        }
      } catch(e) {}
    }

    async function deleteCard(id) {
      if (!confirm('Hapus ID card ini?')) return;
      setHistory(getHistory().filter(x => x.id !== id));
      try {
        const token = Auth.getToken();
        await fetch(`${SUPABASE_URL}/rest/v1/${ID_CARD_DB_TABLE}?local_id=eq.${encodeURIComponent(id)}`, {
          method:'DELETE',
          headers:{ apikey:SUPABASE_ANON, Authorization:`Bearer ${token}` }
        });
      } catch(e) {}
      renderHistory();
      showToast('ID Card dihapus');
    }

    // Init
    document.addEventListener('DOMContentLoaded', async () => {
      applyLabels();
      buildSelects();
      buildThemeGrid();
      buildIdFilters();
      randomizeId();
      renderPreview();
      renderHistory();
      await checkAndLoadProductPhoto();
    });
  
