  if (typeof Auth !== 'undefined' && !Auth.getSession()) window.location.href = '/login';

  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const WEEKDAYS = ['Sn','Sl','Rb','Km','Jm','Sb','Mg'];
  const state = {
    mode: 'yearly',
    month: new Date().getMonth(),
    year: 2026,
    orientation: 'portrait',
    theme: 'minimalClean',
    holidays: [],
    holidayMap: {},
    holidayAvailable: false,
    photoImg: null,
    photoSrc: null,
    filter: { tone: 'normal', brightness: 0, smooth: 0 },
    stream: null
  };

  const THEMES = {
    minimalClean: {
      name:'Minimal Clean', emoji:'🤍', desc:'clean white', bg:'#FBFAF7', panel:'#FFFFFF', text:'#2B2B2B', muted:'#6F6F6F',
      accent:'#2B2B2B', secondary:'#E8E5DE', red:'#E53935', leave:'#F4A6A6', photo:'#F7F4EF', deco:'minimal',
      tagline:'Keep life simple.', swatch:'linear-gradient(135deg,#ffffff,#eeeae2)'
    },
    pastelCute: {
      name:'Pastel Soft', emoji:'☁️', desc:'lavender cloud', bg:'#F8F3FF', panel:'#FFF8FF', text:'#7463A8', muted:'#8274A6',
      accent:'#A998E5', secondary:'#E3D8FF', red:'#FF6F9F', leave:'#FFB4CE', photo:'#FFFFFF', deco:'pastelCloud',
      tagline:'Soft days, happy ways ♡', swatch:'linear-gradient(135deg,#fff8ff,#d9ccff,#f9c7df)'
    },
    retroFilm: {
      name:'Retro Film', emoji:'🎞️', desc:'analog frame', bg:'#EBD8B7', panel:'#F6E6C9', text:'#4B3428', muted:'#7A5C45',
      accent:'#4B3428', secondary:'#C99A63', red:'#D12B2B', leave:'#D98B69', photo:'#FFF7ED', deco:'film',
      tagline:'memories like film', swatch:'linear-gradient(135deg,#3b2a20,#c99a63,#f6e6c9)'
    },
    koreanPhoto: {
      name:'Korean Photobooth', emoji:'🩷', desc:'sticker booth', bg:'#FFF9FC', panel:'#FFFFFF', text:'#F37AA1', muted:'#A8778D',
      accent:'#FF8BB0', secondary:'#FDD7E5', red:'#FF5C8A', leave:'#FDA4AF', photo:'#FFFFFF', deco:'koreanSticker',
      tagline:'good things are coming ♡', swatch:'linear-gradient(135deg,#fff9fc,#ff8bb0,#fdd7e5)'
    },
    botanicalSoft: {
      name:'Botanical Soft', emoji:'🌿', desc:'sage floral', bg:'#F4F2E7', panel:'#FFFDF5', text:'#73845F', muted:'#8A957D',
      accent:'#7F9A64', secondary:'#D9E3C9', red:'#B91C1C', leave:'#E6A7A7', photo:'#FFFFF8', deco:'botanical',
      tagline:'Bloom where you are planted.', swatch:'linear-gradient(135deg,#fffdf5,#d9e3c9,#7f9a64)'
    },
    pinkDiary: {
      name:'Pink Diary', emoji:'🎀', desc:'scrapbook diary', bg:'#FFEFF4', panel:'#FFF7FA', text:'#D95170', muted:'#9C6A80',
      accent:'#F28AA7', secondary:'#FFD3DE', red:'#FF4F78', leave:'#FBCFE8', photo:'#FFF7FB', deco:'pinkDiary',
      tagline:'Collect beautiful moments. ♡', swatch:'linear-gradient(135deg,#fff7fa,#ffd3de,#f28aa7)'
    },
    boldPop: {
      name:'Bold Pop', emoji:'⭐', desc:'bright fun', bg:'#FFF6D3', panel:'#FFFFFF', text:'#0D47A1', muted:'#163F7A',
      accent:'#0D47A1', secondary:'#FFC72C', red:'#FF3131', leave:'#FF6B6B', photo:'#FFFFFF', deco:'boldPop',
      tagline:'GOOD VIBES ONLY!', swatch:'linear-gradient(135deg,#ff3131,#ffc72c,#0d47a1)'
    },
    elegantDark: {
      name:'Elegant Dark', emoji:'🖤', desc:'black gold', bg:'#0F0F0F', panel:'#151515', text:'#E6C873', muted:'#D6C7A1',
      accent:'#D4AF37', secondary:'#2B2B2B', red:'#F87171', leave:'#FBBF24', photo:'#1F1F1F', deco:'elegantGold',
      tagline:'Make it count.', swatch:'linear-gradient(135deg,#0f0f0f,#d4af37)'
    },
    nusantaraModern: {
      name:'Nusantara Modern', emoji:'🧡', desc:'batik corner', bg:'#FFF7ED', panel:'#FFF8EF', text:'#7A3E1D', muted:'#8A5A44',
      accent:'#B45309', secondary:'#E8C2A0', red:'#DC2626', leave:'#FDBA74', photo:'#FFFBF4', deco:'nusantara',
      tagline:'Bersama, selalu istimewa. ✧', swatch:'linear-gradient(135deg,#fff7ed,#b45309,#dc2626)'
    },
    seasonalFestive: {
      name:'Seasonal Festive', emoji:'🎉', desc:'party confetti', bg:'#FFFDF7', panel:'#FFFFFF', text:'#4F5FA8', muted:'#6B6FA3',
      accent:'#6F5EC8', secondary:'#F2D36B', red:'#FF5B5B', leave:'#F9A8D4', photo:'#FFFFFF', deco:'festiveParty',
      tagline:'Celebrate every moment!', swatch:'linear-gradient(135deg,#fffdf7,#6f5ec8,#f2d36b)'
    }
  };

  const canvas = document.getElementById('calendarCanvas');
  const ctx = canvas.getContext('2d');

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}`; }
  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function fillRound(ctx, x, y, w, h, r, color) { ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); ctx.restore(); }
  function strokeRound(ctx, x, y, w, h, r, color, lineWidth) { ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.strokeStyle = color; ctx.lineWidth = lineWidth || 2; ctx.stroke(); ctx.restore(); }

  function initControls() {
    const years = [2026, 2027, 2028, 2029, 2030];
    document.getElementById('yearSelect').innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    document.getElementById('yearSelectMonthly').innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    document.getElementById('monthSelect').innerHTML = MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
    document.getElementById('yearSelect').value = state.year;
    document.getElementById('yearSelectMonthly').value = state.year;
    document.getElementById('monthSelect').value = state.month;
    renderThemes();
  }

  function renderThemes() {
    const grid = document.getElementById('themeGrid');
    grid.innerHTML = Object.entries(THEMES).map(([key, t]) => `
      <button class="theme-card ${key === state.theme ? 'active' : ''}" data-theme="${key}" onclick="setTheme('${key}')">
        <span class="theme-emoji">${t.emoji || '📅'}</span>
        <span class="theme-name">${t.name}</span>
      </button>
    `).join('');
  }

  async function loadHolidays(year) {
    const note = document.getElementById('holidayNote');
    note.className = 'data-note';
    note.textContent = `Memuat data libur ${year}...`;
    try {
      const res = await fetch(`/holidays/${year}.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      state.holidays = Array.isArray(data) ? data : [];
      state.holidayMap = {};
      state.holidays.forEach(item => {
        state.holidayMap[item.date] = { name: item.name, type: item.type };
      });
      state.holidayAvailable = true;
      note.className = 'data-note ok';
      note.textContent = `Data libur nasional/cuti bersama ${year} aktif (${state.holidays.length} tanggal).`;
    } catch(e) {
      state.holidays = [];
      state.holidayMap = {};
      state.holidayAvailable = false;
      note.className = 'data-note warn';
      note.textContent = `Data libur nasional untuk ${year} belum tersedia. Hari minggu tetap otomatis merah.`;
    }
    renderCalendar();
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.mode-card').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    document.getElementById('monthRow').style.display = mode === 'monthly' ? 'grid' : 'none';
    document.getElementById('yearRow').style.display = mode === 'yearly' ? 'grid' : 'none';
    renderCalendar();
  }
  function setOrientation(orientation) {
    state.orientation = orientation;
    document.querySelectorAll('.toggle-btn[data-orientation]').forEach(btn => btn.classList.toggle('active', btn.dataset.orientation === orientation));
    renderCalendar();
  }
  function setTheme(theme) { state.theme = theme; renderThemes(); renderCalendar(); }
  function onSettingChange() {
    state.month = parseInt(document.getElementById('monthSelect').value, 10) || 0;
    renderCalendar();
  }
  function onYearChange(value) {
    state.year = parseInt(value, 10) || 2026;
    document.getElementById('yearSelect').value = state.year;
    document.getElementById('yearSelectMonthly').value = state.year;
    loadHolidays(state.year);
  }

  function setPhotoFilter(type, value) {
    if (type === 'brightness' || type === 'smooth') value = parseFloat(value) || 0;
    state.filter[type] = value;
    const group = document.querySelector(`[data-filter-group="${type}"]`);
    if (group) {
      group.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', String(btn.dataset.value) === String(value));
      });
    }
    renderCalendar();
  }

  function getPhotoFilterCSS(extraBlur = 0) {
    const f = state.filter || { tone: 'normal', brightness: 0, smooth: 0 };
    const brightness = 100 + (Number(f.brightness) || 0);
    const blur = extraBlur ? ` blur(${extraBlur}px)` : '';
    const toneMap = {
      normal: `brightness(${brightness}%) contrast(100%) saturate(100%)`,
      bw: `brightness(${brightness}%) grayscale(100%) contrast(108%)`,
      sepia: `brightness(${brightness}%) sepia(82%) contrast(104%) saturate(92%)`,
      vintage: `brightness(${brightness + 4}%) sepia(38%) contrast(94%) saturate(82%)`,
      cool: `brightness(${brightness + 2}%) saturate(108%) contrast(104%) hue-rotate(184deg)`,
      warm: `brightness(${brightness + 3}%) sepia(24%) saturate(118%) contrast(103%)`,
      fade: `brightness(${brightness + 8}%) contrast(86%) saturate(76%)`,
      drama: `brightness(${brightness}%) contrast(124%) saturate(112%)`,
      matte: `brightness(${brightness + 5}%) contrast(92%) saturate(88%)`
    };
    return (toneMap[f.tone] || toneMap.normal) + blur;
  }

  function drawCoverPhotoWithFilter(img, x, y, w, h) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + w / 2 - dw / 2;
    const dy = y + h / 2 - dh / 2;

    ctx.save();
    ctx.filter = getPhotoFilterCSS(0);
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    const smooth = Number(state.filter?.smooth || 0);
    if (smooth > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.34, 0.14 + smooth * 0.045);
      ctx.filter = getPhotoFilterCSS(smooth);
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  function drawCoverImage(img, x, y, w, h, radius) {
    ctx.save();
    roundRect(ctx, x, y, w, h, radius || 32);
    ctx.clip();
    if (img) {
      drawCoverPhotoWithFilter(img, x, y, w, h);
    } else {
      const t = THEMES[state.theme];
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, t.secondary);
      grad.addColorStop(1, t.photo || '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = t.text;
      ctx.globalAlpha = 0.72;
      ctx.font = `800 ${Math.round(Math.min(w, h) * 0.13)}px Segoe UI, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📷', x + w / 2, y + h / 2 - 28);
      ctx.font = `800 ${Math.round(Math.min(w, h) * 0.045)}px Segoe UI, sans-serif`;
      ctx.fillText('ambil / upload foto', x + w / 2, y + h / 2 + 58);
    }
    ctx.restore();
    strokeRound(ctx, x, y, w, h, radius || 32, THEMES[state.theme].accent, Math.max(4, w * 0.006));
  }


  function drawStickerText(txt, x, y, size, color, rot = 0, font = 'Segoe UI Emoji, Apple Color Emoji, Segoe UI, sans-serif') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.font = `900 ${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  function drawLeafStem(x, y, len, color, scale = 1, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3 * scale;
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(18 * scale, -len * 0.32, 0, -len);
    ctx.stroke();
    for (let i = 1; i <= 5; i++) {
      const yy = -len * i / 6;
      const side = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(side * 18 * scale, yy, 16 * scale, 7 * scale, side * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTape(x, y, w, h, color, rot = 0) {
    ctx.save();
    ctx.translate(x + w/2, y + h/2);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.74;
    ctx.fillStyle = color;
    fillRound(ctx, -w/2, -h/2, w, h, 6, color);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBatikCorner(x, y, s, color, mirrorX = false, mirrorY = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(mirrorX ? -1 : 1, mirrorY ? -1 : 1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, s * 0.018);
    ctx.globalAlpha = 0.78;
    for (let i = 0; i < 4; i++) {
      const r = s * (0.14 + i * 0.08);
      ctx.beginPath();
      ctx.arc(s * .1 + i * s * .14, s * .1, r, 0, Math.PI * 1.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * .1, s * .1 + i * s * .14, r, Math.PI * 1.5, Math.PI * 2.85);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(s * (0.14 + i * 0.12), s * (0.12 + (i%3)*0.11), s * 0.018, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDecorations(W, H, t) {
    ctx.save();

    if (t.deco === 'minimal') {
      ctx.globalAlpha = 0.28;
      fillRound(ctx, W*.04, H*.035, W*.92, H*.93, 20, 'rgba(255,255,255,.72)');
      strokeRound(ctx, W*.04, H*.035, W*.92, H*.93, 20, 'rgba(0,0,0,.05)', 2);
    }

    if (t.deco === 'pastelCloud') {
      ctx.globalAlpha = 0.45;
      [['#DFD5FF', -.08, .04, .42], ['#EEDCFF', .80, -.05, .34], ['#E3D8FF', -.10, .70, .34], ['#D7CEFF', .72, .76, .38]].forEach(([color,x,y,s]) => fillRound(ctx, W*x, H*y, W*s, W*s*.65, W*.07, color));
      ctx.globalAlpha = 0.9;
      drawStickerText('✦', W*.08, H*.12, W*.045, '#ffffff');
      drawStickerText('✦', W*.90, H*.20, W*.035, '#ffffff');
      drawStickerText('♡', W*.55, H*.90, W*.032, t.accent);
    }

    if (t.deco === 'film') {
      fillRound(ctx, W*.075, H*.055, W*.85, H*.38, 10, '#3C2A1C');
      ctx.fillStyle = '#F2D7A4';
      for (let i=0;i<11;i++) {
        fillRound(ctx, W*.095 + i*W*.073, H*.072, W*.027, H*.018, 4, '#F2D7A4');
        fillRound(ctx, W*.095 + i*W*.073, H*.360, W*.027, H*.018, 4, '#F2D7A4');
      }
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#5D3B24';
      for (let i=0;i<18;i++) ctx.fillRect(Math.random()*W, Math.random()*H, 2, 2);
    }

    if (t.deco === 'koreanSticker') {
      drawStickerText('♡', W*.08, H*.09, W*.060, t.accent, -.18);
      drawStickerText('☺', W*.90, H*.30, W*.060, t.accent, .15);
      drawStickerText('✿', W*.13, H*.30, W*.030, '#FFB3C7');
      drawStickerText('✧', W*.89, H*.12, W*.032, '#FFB3C7');
      drawStickerText('♡', W*.50, H*.91, W*.030, t.accent);
    }

    if (t.deco === 'botanical') {
      drawLeafStem(W*.10, H*.33, H*.22, t.accent, W/1200, -.15);
      drawLeafStem(W*.90, H*.26, H*.25, t.accent, W/1200, .30);
      drawLeafStem(W*.88, H*.90, H*.13, t.accent, W/1200, .9);
      ctx.globalAlpha = 0.20;
      fillRound(ctx, 0, H*.82, W, H*.18, 0, '#DCE8D0');
    }

    if (t.deco === 'pinkDiary') {
      ctx.globalAlpha = 0.38;
      for (let y=0; y<H; y+=Math.max(42, H*.032)) {
        ctx.strokeStyle = '#F9C9D6'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(W*.06, y); ctx.lineTo(W*.94, y); ctx.stroke();
      }
      drawTape(W*.08, H*.07, W*.22, H*.035, '#FBC3BE', -.22);
      drawTape(W*.66, H*.08, W*.20, H*.035, '#F8D8A8', .20);
      drawTape(W*.14, H*.82, W*.20, H*.035, '#FBC3BE', .14);
      drawStickerText('♡', W*.88, H*.30, W*.05, t.accent);
      drawStickerText('🐻', W*.14, H*.90, W*.055, '#B9796C');
    }

    if (t.deco === 'boldPop') {
      const shapes = [
        ['#FF5630', -.06,.10,.23], ['#FFB703', .80,.07,.23], ['#00A8E8', -.07,.72,.23], ['#7C3AED', .74,.78,.25]
      ];
      ctx.globalAlpha = 0.92;
      shapes.forEach(([color,x,y,s]) => fillRound(ctx, W*x, H*y, W*s, W*s, W*.04, color));
      drawStickerText('★', W*.14, H*.15, W*.05, '#FFD60A', .4);
      drawStickerText('☺', W*.82, H*.86, W*.07, '#FFD60A', -.2);
      drawStickerText('✦', W*.90, H*.15, W*.04, '#FF7A59');
    }

    if (t.deco === 'elegantGold') {
      ctx.strokeStyle = t.accent; ctx.lineWidth = 3; ctx.globalAlpha = 0.75;
      ctx.strokeRect(W*.045, H*.045, W*.91, H*.91);
      ctx.strokeRect(W*.07, H*.07, W*.86, H*.86);
      drawLeafStem(W*.12, H*.88, H*.16, t.accent, W/1200, -2.1);
      drawLeafStem(W*.88, H*.18, H*.12, t.accent, W/1200, .8);
      drawStickerText('✦', W*.86, H*.73, W*.03, t.accent);
    }

    if (t.deco === 'nusantara') {
      drawBatikCorner(W*.04, H*.04, W*.28, t.accent, false, false);
      drawBatikCorner(W*.96, H*.04, W*.24, t.accent, true, false);
      drawBatikCorner(W*.04, H*.96, W*.24, t.accent, false, true);
      drawBatikCorner(W*.96, H*.96, W*.30, t.accent, true, true);
      ctx.globalAlpha = 0.12;
      fillRound(ctx, W*.07, H*.07, W*.86, H*.86, W*.04, '#E6C7AA');
    }

    if (t.deco === 'festiveParty') {
      const colors = ['#F59E0B','#60A5FA','#F472B6','#A78BFA','#34D399'];
      ctx.globalAlpha = 0.9;
      for(let i=0;i<48;i++) {
        ctx.fillStyle = colors[i%colors.length];
        const x = W*(0.05 + Math.random()*0.9), y = H*(0.06 + Math.random()*0.84);
        ctx.save(); ctx.translate(x,y); ctx.rotate(Math.random()*Math.PI);
        ctx.fillRect(-W*.007,-W*.007,W*.014,W*.014);
        ctx.restore();
      }
      ctx.strokeStyle = '#F472B6'; ctx.lineWidth = 5; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(W*.08,H*.12); ctx.quadraticCurveTo(W*.5,H*.20,W*.92,H*.12); ctx.stroke();
      drawStickerText('🎉', W*.22, H*.16, W*.05, '#000');
      drawStickerText('🎈', W*.84, H*.22, W*.045, '#000');
    }

    ctx.restore();
  }


  function drawTitle(text, x, y, w, size, t, align = 'center') {
    ctx.save();
    ctx.fillStyle = t.text;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px Segoe UI, system-ui, sans-serif`;
    ctx.fillText(text, align === 'center' ? x + w / 2 : x, y);
    ctx.restore();
  }


  function drawCalendarTagline(text, x, y, w, t) {
    ctx.save();
    ctx.fillStyle = t.deco === 'elegantGold' ? t.accent : t.muted;
    ctx.font = `700 ${Math.max(20, w * .028)}px Segoe UI, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w/2, y);
    ctx.restore();
  }

  function drawThemePhotoFrame(img, x, y, w, h, radius, t) {
    if (t.deco === 'film') {
      fillRound(ctx, x - w*.045, y - h*.06, w*1.09, h*1.14, 10, '#3C2A1C');
      for(let i=0;i<8;i++) {
        fillRound(ctx, x - w*.02 + i*w*.13, y - h*.04, w*.045, h*.030, 4, '#F2D7A4');
        fillRound(ctx, x - w*.02 + i*w*.13, y + h*1.01, w*.045, h*.030, 4, '#F2D7A4');
      }
      drawCoverImage(img, x, y, w, h, 4);
      return;
    }
    if (t.deco === 'pinkDiary') {
      fillRound(ctx, x - 18, y - 18, w + 36, h + 36, 10, 'rgba(255,255,255,.72)');
      drawTape(x + w*.04, y - 26, w*.22, 30, '#FBC3BE', -.2);
      drawTape(x + w*.74, y - 24, w*.20, 28, '#F8D8A8', .18);
      drawCoverImage(img, x, y, w, h, radius);
      return;
    }
    if (t.deco === 'elegantGold') {
      drawCoverImage(img, x, y, w, h, 0);
      strokeRound(ctx, x - 14, y - 14, w + 28, h + 28, 0, t.accent, 2);
      return;
    }
    drawCoverImage(img, x, y, w, h, radius);
  }

  function drawMonthCalendar(x, y, w, h, year, month, opts = {}) {
    const t = THEMES[state.theme];
    const compact = opts.compact;
    const showTitle = opts.showTitle !== false;
    const titleH = showTitle ? h * (compact ? 0.16 : 0.14) : 0;
    const headH = h * (compact ? 0.11 : 0.10);
    const gridY = y + titleH + headH;
    const gridH = h - titleH - headH;
    const cellW = w / 7;
    const cellH = gridH / 6;
    if (showTitle) drawTitle(compact ? MONTHS_SHORT[month] : `${MONTHS[month]} ${year}`, x, y + titleH * .48, w, compact ? Math.max(18, h * .09) : Math.max(44, h * .08), t);

    ctx.save();
    ctx.font = `800 ${Math.max(compact ? 12 : 22, h * (compact ? .045 : .035))}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = t.muted;
    WEEKDAYS.forEach((d, i) => ctx.fillText(d, x + cellW * (i + .5), y + titleH + headH * .52));
    ctx.restore();

    const dim = daysInMonth(year, month);
    const first = new Date(year, month, 1).getDay();
    const offset = (first + 6) % 7;
    const fontSize = Math.max(compact ? 12 : 26, Math.min(cellW, cellH) * (compact ? .38 : .42));

    for (let day = 1; day <= dim; day++) {
      const idx = offset + day - 1;
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cx = x + col * cellW + cellW / 2;
      const cy = gridY + row * cellH + cellH / 2;
      const key = dateKey(year, month, day);
      const holiday = state.holidayMap[key];
      const isSunday = new Date(year, month, day).getDay() === 0;
      const type = holiday ? holiday.type : (isSunday ? 'sunday' : 'normal');
      let color = t.text;
      if (type === 'holiday' || type === 'sunday') color = t.red;
      if (type === 'leave') color = t.leave;
      if (holiday && !compact) {
        ctx.save();
        ctx.globalAlpha = type === 'leave' ? .22 : .15;
        fillRound(ctx, cx - cellW * .34, cy - cellH * .35, cellW * .68, cellH * .70, Math.min(cellW, cellH) * .22, color);
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `900 ${fontSize}px Segoe UI, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(day), cx, cy);
      if (holiday) {
        ctx.fillStyle = type === 'leave' ? t.leave : t.red;
        ctx.beginPath(); ctx.arc(cx, cy + cellH * .30, Math.max(compact ? 2.5 : 4, cellH * .045), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function monthHolidayList(year, month) {
    return state.holidays.filter(item => item.date.startsWith(`${year}-${pad(month + 1)}-`)).sort((a,b) => a.date.localeCompare(b.date));
  }

  function drawHolidayList(x, y, w, h, year, month) {
    const t = THEMES[state.theme];
    const list = monthHolidayList(year, month);
    fillRound(ctx, x, y, w, h, 24, t.photo || 'rgba(255,255,255,.55)');
    strokeRound(ctx, x, y, w, h, 24, t.secondary, 3);
    ctx.save();
    ctx.fillStyle = t.text;
    ctx.font = `900 ${Math.max(24, h * .12)}px Segoe UI, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Tanggal merah:', x + w * .045, y + h * .08);
    if (!list.length) {
      ctx.fillStyle = t.muted;
      ctx.font = `700 ${Math.max(20, h * .09)}px Segoe UI, sans-serif`;
      ctx.fillText('Tidak ada libur/cuti bersama di data JSON bulan ini.', x + w * .045, y + h * .30);
      ctx.restore(); return;
    }
    const fs = Math.max(16, Math.min(28, (h * .72) / list.length));
    ctx.font = `800 ${fs}px Segoe UI, sans-serif`;
    let yy = y + h * .25;
    list.forEach(item => {
      const day = parseInt(item.date.slice(8,10), 10);
      const shortName = item.name.length > 44 ? item.name.slice(0, 42) + '…' : item.name;
      ctx.fillStyle = item.type === 'leave' ? t.leave : t.red;
      ctx.fillText(`${day} ${MONTHS_SHORT[month]} - ${shortName}`, x + w * .045, yy);
      yy += fs * 1.28;
    });
    ctx.restore();
  }


  function drawMonthlyHolidayNotes(x, y, w, h, year, month) {
    const t = THEMES[state.theme];
    const list = monthHolidayList(year, month);
    if (h < 54) return;

    fillRound(ctx, x, y, w, h, 18, t.photo || 'rgba(255,255,255,.55)');
    strokeRound(ctx, x, y, w, h, 18, t.secondary, 2);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const padX = Math.max(22, w * .04);
    const padY = Math.max(14, h * .12);
    const titleSize = Math.max(15, Math.min(21, h * .16));
    ctx.fillStyle = t.text;
    ctx.font = `900 ${titleSize}px Segoe UI, sans-serif`;
    ctx.fillText('Tanggal merah:', x + padX, y + padY);

    if (!list.length) {
      ctx.fillStyle = t.muted;
      ctx.font = `700 ${Math.max(13, Math.min(18, h * .13))}px Segoe UI, sans-serif`;
      const msg = state.holidayAvailable
        ? 'Tidak ada libur nasional/cuti bersama di bulan ini.'
        : 'Data libur belum tersedia. Minggu tetap merah otomatis.';
      drawWrappedCalendarText(msg, x + padX, y + padY + titleSize + 10, w - padX * 2, Math.max(17, h * .14), 3);
      ctx.restore();
      return;
    }

    const contentTop = y + padY + titleSize + 10;
    const contentBottom = y + h - Math.max(12, h * .10);
    const availableH = Math.max(20, contentBottom - contentTop);
    const useTwoCols = list.length >= 4 && w > 540;
    const cols = useTwoCols ? 2 : 1;
    const rows = Math.ceil(list.length / cols);
    const colGap = Math.max(22, w * .045);
    const colW = (w - padX * 2 - colGap * (cols - 1)) / cols;
    const lineH = Math.max(14, Math.min(22, availableH / Math.max(1, rows)));
    const fs = Math.max(12, Math.min(18, lineH * .78));

    ctx.font = `850 ${fs}px Segoe UI, sans-serif`;

    list.forEach((item, i) => {
      const col = useTwoCols ? Math.floor(i / rows) : 0;
      const row = useTwoCols ? (i % rows) : i;
      const tx = x + padX + col * (colW + colGap);
      const ty = contentTop + row * lineH;
      const day = parseInt(item.date.slice(8,10), 10);
      const rawName = item.name || 'Libur nasional';
      const prefix = `${day} ${MONTHS_SHORT[month]} - `;
      const maxTextW = colW;
      let label = prefix + rawName;

      // Trim until it fits the available column width.
      while (ctx.measureText(label).width > maxTextW && rawName.length > 8) {
        const keep = Math.max(8, rawName.length - 4);
        label = prefix + rawName.slice(0, keep) + '…';
        item = { ...item, name: rawName.slice(0, keep) + '…' };
        break;
      }
      if (ctx.measureText(label).width > maxTextW) {
        const maxChars = Math.max(14, Math.floor(maxTextW / (fs * .48)));
        label = label.slice(0, maxChars - 1) + '…';
      }

      ctx.fillStyle = item.type === 'leave' ? t.leave : t.red;
      ctx.fillText(label, tx, ty);
    });

    ctx.restore();
  }

  function drawWrappedCalendarText(text, x, y, maxW, lineH, maxLines = 2) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let line = '';
    let lines = [];
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    lines = lines.slice(0, maxLines);
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineH));
  }

  function renderCalendar() {
    const t = THEMES[state.theme];
    const portrait = state.orientation === 'portrait';
    const W = portrait ? 1200 : 1800;
    const H = portrait ? 1800 : 1200;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = t.bg; ctx.fillRect(0,0,W,H);
    drawDecorations(W, H, t);

    if (state.mode === 'yearly') renderYearly(W, H, t);
    else renderMonthly(W, H, t);

    updateMeta(W, H);
  }

  function renderYearly(W, H, t) {
    const portrait = W < H;
    const margin = Math.round(Math.min(W, H) * .055);
    if (portrait) {
      drawCoverImage(state.photoImg, margin, margin, W - margin * 2, 560, 34);
      drawTitle(`KALENDER ${state.year}`, margin, 700, W - margin * 2, 68, t);
      const gridX = margin, gridY = 775, gridW = W - margin * 2, gridH = H - gridY - margin - 70;
      const cols = 3, rows = 4, gap = 18;
      const mw = (gridW - gap * (cols - 1)) / cols;
      const mh = (gridH - gap * (rows - 1)) / rows;
      for (let m=0;m<12;m++) drawMonthCalendar(gridX + (m%cols)*(mw+gap), gridY + Math.floor(m/cols)*(mh+gap), mw, mh, state.year, m, { compact:true });
      drawLegend(margin, H - margin - 36, W - margin * 2, t);
    } else {
      drawCoverImage(state.photoImg, margin, margin, 650, H - margin * 2, 34);
      drawTitle(`KALENDER ${state.year}`, 760, 92, W - 810, 60, t, 'left');
      const gridX = 760, gridY = 150, gridW = W - gridX - margin, gridH = H - gridY - margin - 55;
      const cols = 4, rows = 3, gap = 16;
      const mw = (gridW - gap * (cols - 1)) / cols;
      const mh = (gridH - gap * (rows - 1)) / rows;
      for (let m=0;m<12;m++) drawMonthCalendar(gridX + (m%cols)*(mw+gap), gridY + Math.floor(m/cols)*(mh+gap), mw, mh, state.year, m, { compact:true });
      drawLegend(gridX, H - margin - 32, gridW, t);
    }
  }

  function renderMonthly(W, H, t) {
    const portrait = W < H;
    const margin = Math.round(Math.min(W, H) * .055);
    if (portrait) {
      const panelX = Math.round(W * .065);
      const panelY = Math.round(H * .055);
      const panelW = W - panelX * 2;
      const panelH = H - panelY * 2;
      fillRound(ctx, panelX, panelY, panelW, panelH, 26, t.panel || 'rgba(255,255,255,.78)');
      strokeRound(ctx, panelX, panelY, panelW, panelH, 26, t.secondary, t.deco === 'elegantGold' ? 2 : 3);

      const photoX = panelX + Math.round(panelW * .07);
      const photoY = panelY + Math.round(panelH * .045);
      const photoW = panelW - Math.round(panelW * .14);
      const photoH = Math.round(panelH * .36);
      drawThemePhotoFrame(state.photoImg, photoX, photoY, photoW, photoH, t.deco === 'minimal' ? 0 : 10, t);

      const titleY = photoY + photoH + Math.round(panelH * .075);
      drawTitle(`${MONTHS[state.month].toUpperCase()} ${state.year}`, panelX + panelW*.07, titleY, panelW*.86, Math.round(panelW * .072), t);

      const calY = titleY + Math.round(panelH * .065);
      const calH = Math.round(panelH * .31);
      drawMonthCalendar(panelX + panelW*.09, calY, panelW*.82, calH, state.year, state.month, { compact:false, showTitle:false });

      const noteY = calY + calH + Math.round(panelH * .030);
      const tagY = panelY + panelH - Math.round(panelH * .038);
      const noteBottom = tagY - Math.round(panelH * .040);
      const noteH = Math.max(150, noteBottom - noteY);
      drawMonthlyHolidayNotes(panelX + panelW*.09, noteY, panelW*.82, noteH, state.year, state.month);

      if (t.deco === 'boldPop') {
        fillRound(ctx, panelX + panelW*.28, tagY - 22, panelW*.44, 44, 16, '#FFFFFF');
        strokeRound(ctx, panelX + panelW*.28, tagY - 22, panelW*.44, 44, 16, t.accent, 3);
        drawCalendarTagline(t.tagline, panelX + panelW*.28, tagY, panelW*.44, t);
      } else if (t.deco === 'festiveParty') {
        fillRound(ctx, panelX + panelW*.24, tagY - 24, panelW*.52, 48, 4, '#7C64D5');
        ctx.save(); ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(panelW*.034)}px Segoe UI, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(t.tagline, panelX + panelW/2, tagY); ctx.restore();
      } else {
        drawCalendarTagline(t.tagline, panelX, tagY, panelW, t);
      }
    } else {
      // landscape keeps same theme language, but packs photo + calendar side-by-side.
      const panelX = margin, panelY = margin, panelW = W - margin*2, panelH = H - margin*2;
      fillRound(ctx, panelX, panelY, panelW, panelH, 26, t.panel || 'rgba(255,255,255,.78)');
      strokeRound(ctx, panelX, panelY, panelW, panelH, 26, t.secondary, 3);
      drawThemePhotoFrame(state.photoImg, panelX + 44, panelY + 44, panelW*.40, panelH - 88, t.deco === 'minimal' ? 0 : 14, t);
      drawTitle(`${MONTHS[state.month].toUpperCase()} ${state.year}`, panelX + panelW*.49, panelY + 90, panelW*.45, 62, t, 'left');
      const calX = panelX + panelW*.49;
      const calY = panelY + 160;
      const calW = panelW*.44;
      const calH = panelH*.48;
      drawMonthCalendar(calX, calY, calW, calH, state.year, state.month, { compact:false, showTitle:false });
      const tagY = panelY + panelH - 74;
      const noteY = calY + calH + 24;
      drawMonthlyHolidayNotes(calX, noteY, calW, Math.max(140, tagY - noteY - 42), state.year, state.month);
      drawCalendarTagline(t.tagline, calX, tagY, calW, t);
    }
  }


  function drawLegend(x, y, w, t) {
    ctx.save();
    ctx.fillStyle = t.muted;
    ctx.font = `800 ${Math.max(18, w * .018)}px Segoe UI, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('● libur nasional / cuti bersama  ·  merah = minggu / tanggal merah', x, y);
    ctx.fillStyle = t.red; ctx.beginPath(); ctx.arc(x - 16, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function updateMeta(W, H) {
    const meta = document.getElementById('previewMeta');
    meta.innerHTML = `
      <div class="chip">Mode: <span>${state.mode === 'yearly' ? 'Tahunan' : 'Bulanan'}</span></div>
      <div class="chip">Periode: <span>${state.mode === 'yearly' ? state.year : MONTHS[state.month] + ' ' + state.year}</span></div>
      <div class="chip">Orientasi: <span>${state.orientation}</span></div>
      <div class="chip">Tema: <span>${THEMES[state.theme].name}</span></div>
      <div class="chip">Filter: <span>${state.filter.tone}${state.filter.brightness ? ' +' + state.filter.brightness : ''}</span></div>
      <div class="chip">Canvas: <span>${W}×${H}px</span></div>
    `;
  }

  const PHOTO_FEATURE = 'kalender';

  async function handleUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      await LuxProductPhotoFlow.upload({
        feature: PHOTO_FEATURE,
        file,
        maxWidth: 1600,
        maxHeight: 2000,
        quality: 0.88,
        onReady: src => loadPhoto(src)
      });
    } catch (error) {
      console.error('[LUX] Upload foto kalender gagal:', error);
      alert('Foto gagal dimasukkan ke kalender. ' + (error?.message || 'Coba file lain.'));
    } finally {
      input.value = '';
    }
  }

  function loadPhoto(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        state.photoImg = img;
        state.photoSrc = src;
        renderCalendar();
        resolve(img);
      };
      img.onerror = () => reject(new Error('Foto gagal dimuat ke layout kalender.'));
      img.src = src;
    });
  }

  async function clearPhoto() {
    state.photoImg = null;
    state.photoSrc = null;
    renderCalendar();
    try { await LuxProductPhotoFlow.clear({ feature: PHOTO_FEATURE }); } catch (_) {}
  }

  async function openCamera() {
    try {
      await LuxProductPhotoFlow.capture({
        feature: PHOTO_FEATURE,
        seconds: 5,
        maxWidth: 1600,
        maxHeight: 2000,
        quality: 0.88,
        onReady: src => loadPhoto(src),
        onError: error => alert('Foto belum berhasil masuk ke kalender. ' + (error?.message || 'Silakan coba lagi.'))
      });
    } catch (error) {
      console.error('[LUX] Kamera kalender gagal:', error);
      alert(error?.message || 'Kamera gagal dibuka.');
    }
  }

  async function restoreCalendarPhoto() {
    try {
      await LuxProductPhotoFlow.restoreOrMigrateLegacy({
        feature: PHOTO_FEATURE,
        onReady: src => loadPhoto(src)
      });
    } catch (error) {
      console.warn('[LUX] Foto kalender sebelumnya tidak dapat dipulihkan:', error);
    }
  }

  function closeCamera() {
    document.getElementById('cameraModal').classList.remove('show');
    const video = document.getElementById('cameraVideo');
    video.pause(); video.srcObject = null;
    if (state.stream) state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }

  function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const temp = document.createElement('canvas');
    temp.width = video.videoWidth || 1280;
    temp.height = video.videoHeight || 960;
    const c = temp.getContext('2d');
    c.save(); c.translate(temp.width, 0); c.scale(-1, 1); c.drawImage(video, 0, 0, temp.width, temp.height); c.restore();
    const data = temp.toDataURL('image/jpeg', .98);
    closeCamera();
    loadPhoto(data);
  }

  function calendarPeriodSlug() {
    return state.mode === 'yearly' ? state.year : `${MONTHS[state.month].toLowerCase()}-${state.year}`;
  }

  function calendarFilename() {
    return `photobooth-kalender-${calendarPeriodSlug()}.png`;
  }

  function ensurePhotoOrConfirm() {
    if (state.photoImg) return true;
    return confirm('Foto belum ditambahkan. Mau lanjut dengan placeholder?');
  }

  function calendarBlob() {
    renderCalendar();
    return Auth.exportCanvasBlob(canvas, 'image/png');
  }

  async function downloadCalendar() {
    if (!ensurePhotoOrConfirm()) return;
    const blob = await calendarBlob();
    if (!blob) return alert('Gagal membuat file PNG.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = calendarFilename();
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareCalendar() {
    if (!ensurePhotoOrConfirm()) return;
    const blob = await calendarBlob();
    if (!blob) return alert('Gagal membuat file PNG.');
    const file = new File([blob], calendarFilename(), { type: 'image/png' });
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Photobooth Kalender',
          text: 'Kalender photobooth 4R siap cetak',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = calendarFilename();
        a.href = url;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        alert('Browser belum support Share file, jadi PNG langsung didownload.');
      }
    } catch (e) {
      if (e && e.name !== 'AbortError') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = calendarFilename();
        a.href = url;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        alert('Share gagal, jadi PNG langsung didownload.');
      }
    }
  }

  initControls();
  setMode('yearly');
  loadHolidays(state.year);
  restoreCalendarPhoto();
