(function () {
  const W = 1200, H = 1800;

  const FILTERS = {
    original: { label: 'Original', css: 'none', grain: false },
    softWarm: { label: 'Soft Warm', css: 'brightness(1.04) contrast(1.02) saturate(1.08) sepia(0.12)', grain: false },
    coolTone: { label: 'Cool Tone', css: 'brightness(1.02) contrast(1.04) saturate(0.98) hue-rotate(188deg)', grain: false },
    bw: { label: 'Black & White', css: 'grayscale(1) contrast(1.12)', grain: false },
    vintage: { label: 'Vintage', css: 'sepia(0.42) contrast(0.96) saturate(0.9) brightness(1.02)', grain: false },
    highContrast: { label: 'High Contrast', css: 'contrast(1.32) saturate(1.05)', grain: false },
    pastel: { label: 'Pastel', css: 'brightness(1.08) contrast(0.9) saturate(1.22)', grain: false },
    cinematic: { label: 'Cinematic', css: 'brightness(0.95) contrast(1.18) saturate(0.92)', grain: false },
    grainyFilm: { label: 'Grainy Film', css: 'sepia(0.22) contrast(1.08) saturate(0.88)', grain: true },
    cleanBright: { label: 'Clean Bright', css: 'brightness(1.16) contrast(1.04) saturate(1.04)', grain: false }
  };

  const MAGAZINE_THEMES = [
    {
      id:'bestie', name:'Bestie Edition', target:'friends', recommendedFilter:'pastel',
      colors:{ bg:'#F8C8DC', text:'#3A1F3D', secondary:'#FFFFFF', accent:'#FF9F6E', accent2:'#C8B6FF' },
      defaultText:{ magazineName:'BESTIE MAG', headline:'the chaotic duo everyone loves', subheadline:'friendship, laughter, and iconic little moments', name:'bestie club', date:'SUMMER ISSUE 2026', teaser1:'best looks of the day', teaser2:'memories worth saving', teaser3:'certified bestie energy' },
      decor:'bestie'
    },
    {
      id:'couple', name:'Couple Spotlight', target:'couple', recommendedFilter:'softWarm',
      colors:{ bg:'#FFF0F2', text:'#4B1626', secondary:'#FFE4E6', accent:'#9F1239', accent2:'#FDA4AF' },
      defaultText:{ magazineName:'LOVE ISSUE', headline:'two hearts, one story', subheadline:'a little love captured forever', name:'sweethearts', date:'ROMANCE EDITION', teaser1:'couple spotlight', teaser2:'sweet moments only', teaser3:'the romance edit' },
      decor:'couple'
    },
    {
      id:'family', name:'Family Portrait', target:'family', recommendedFilter:'softWarm',
      colors:{ bg:'#F8EBDD', text:'#4B2E1F', secondary:'#FFF8ED', accent:'#C26A35', accent2:'#E7B78A' },
      defaultText:{ magazineName:'FAMILY JOURNAL', headline:'home is wherever we are together', subheadline:'today’s warmest memory', name:'family edition', date:'SPECIAL ISSUE', teaser1:'family day', teaser2:'little moments, big love', teaser3:'together is the story' },
      decor:'family'
    },
    {
      id:'main', name:'Main Character', target:'solo', recommendedFilter:'highContrast',
      colors:{ bg:'#FFFFFF', text:'#0A0A0A', secondary:'#F4F4F5', accent:'#DC2626', accent2:'#111827' },
      defaultText:{ magazineName:'ICON', headline:'born to stand out', subheadline:'main character energy, captured', name:'cover star', date:'THE CONFIDENCE ISSUE', teaser1:'the confidence issue', teaser2:'style report', teaser3:'one look, full impact' },
      decor:'main'
    },
    {
      id:'grad', name:'Graduation Issue', target:'graduation', recommendedFilter:'cleanBright',
      colors:{ bg:'#F8FAFC', text:'#0F2747', secondary:'#FFFFFF', accent:'#C9972A', accent2:'#1D3557' },
      defaultText:{ magazineName:'GRAD ISSUE', headline:'the future starts here', subheadline:'a celebration of hard work and new beginnings', name:'achievement unlocked', date:'PROUD MOMENT', teaser1:'achievement unlocked', teaser2:'proud moment', teaser3:'next chapter begins' },
      decor:'grad'
    },
    {
      id:'birthday', name:'Birthday Special', target:'birthday', recommendedFilter:'pastel',
      colors:{ bg:'#F3E8FF', text:'#4C1D95', secondary:'#DBEAFE', accent:'#EC4899', accent2:'#FDE68A' },
      defaultText:{ magazineName:'BIRTHDAY STAR', headline:'today is all about you', subheadline:'another iconic year begins', name:'birthday edition', date:'PARTY ISSUE', teaser1:'birthday mood', teaser2:'wish list inside', teaser3:'party edition' },
      decor:'birthday'
    },
    {
      id:'kpop', name:'K-Pop Idol Cover', target:'fans', recommendedFilter:'coolTone',
      colors:{ bg:'#E0F2FE', text:'#0F172A', secondary:'#F8FAFC', accent:'#EC4899', accent2:'#A5F3FC' },
      defaultText:{ magazineName:'IDOL ZINE', headline:'the new era begins', subheadline:'shining brighter than the spotlight', name:'debut team', date:'DEBUT ISSUE', teaser1:'comeback ready', teaser2:'visual of the day', teaser3:'stage presence: 100%' },
      decor:'kpop'
    },
    {
      id:'luxury', name:'Luxury Fashion', target:'formal', recommendedFilter:'cinematic',
      colors:{ bg:'#0B0B0D', text:'#F9E8C9', secondary:'#1F1F22', accent:'#D6B56D', accent2:'#FFFFFF' },
      defaultText:{ magazineName:'LUXE', headline:'elegance never fades', subheadline:'the art of looking effortlessly iconic', name:'luxury edit', date:'EVENING ISSUE', teaser1:'luxury edit', teaser2:'timeless style', teaser3:'evening issue' },
      decor:'luxury'
    },
    {
      id:'travel', name:'Travel Diary', target:'travel', recommendedFilter:'cinematic',
      colors:{ bg:'#E0F2FE', text:'#164E63', secondary:'#FFF7ED', accent:'#2F855A', accent2:'#F6C177' },
      defaultText:{ magazineName:'TRAVEL NOTE', headline:'memories from the best day', subheadline:'a little adventure worth keeping', name:'postcard moment', date:'TODAY’S DESTINATION', teaser1:'travel diary', teaser2:'today’s destination', teaser3:'postcard moment' },
      decor:'travel'
    },
    {
      id:'softlife', name:'Soft Life', target:'aesthetic', recommendedFilter:'pastel',
      colors:{ bg:'#F5E8FF', text:'#53305D', secondary:'#FCE7F3', accent:'#93C5FD', accent2:'#FBCFE8' },
      defaultText:{ magazineName:'SOFT LIFE', headline:'romanticizing every little moment', subheadline:'a dreamy little memory in 4r', name:'soft mood', date:'DREAMY ISSUE', teaser1:'soft mood', teaser2:'pretty little things', teaser3:'gentle days' },
      decor:'soft'
    }
  ];

  const NEWSPAPER_THEMES = [
    {
      id:'friendship', name:'Friendship News', target:'friends', recommendedFilter:'vintage',
      colors:{ bg:'#F6E8C9', text:'#111111', secondary:'#4A3328', accent:'#B9382F', line:'#111111' },
      defaultText:{ newspaperName:'THE BESTIE TIMES', headline:'local besties caught making memories again', subheadline:'sources say the vibes were immaculate', caption:'exclusive photo from today’s iconic moment', date:'JUNE 2026', reporter:'staff reporter', article:'witnesses reported laughter, chaos, and unforgettable friendship energy.', side1:'exclusive vibes update', side2:'bestie behavior confirmed' },
      decor:'friendship'
    },
    {
      id:'love', name:'Love Announcement', target:'couple', recommendedFilter:'softWarm',
      colors:{ bg:'#FFF7ED', text:'#3F2A1D', secondary:'#7F4F4F', accent:'#B76E79', line:'#6B3F33' },
      defaultText:{ newspaperName:'THE LOVE DAILY', headline:'couple of the year spotted together', subheadline:'a front page story written in sweet little moments', caption:'a lovely scene captured for the record', date:'ROMANCE EDITION', reporter:'love desk', article:'today’s edition celebrates a story filled with warmth, laughter, and affection.', side1:'heartwarming report', side2:'sweet moment archived' },
      decor:'love'
    },
    {
      id:'family', name:'Family Headline', target:'family', recommendedFilter:'softWarm',
      colors:{ bg:'#F8EBDD', text:'#4B2E1F', secondary:'#7A4A2E', accent:'#D97706', line:'#6F4223' },
      defaultText:{ newspaperName:'FAMILY GAZETTE', headline:'today’s top story: togetherness', subheadline:'a family moment worth remembering', caption:'captured with love and warm smiles', date:'SPECIAL FAMILY ISSUE', reporter:'family desk', article:'this special issue highlights the joy of being together and making simple moments feel meaningful.', side1:'home edition', side2:'togetherness wins' },
      decor:'family'
    },
    {
      id:'breaking', name:'Breaking News Funny', target:'fun', recommendedFilter:'highContrast',
      colors:{ bg:'#FFFFFF', text:'#000000', secondary:'#333333', accent:'#DC2626', line:'#111111' },
      defaultText:{ newspaperName:'BREAKING NEWS', headline:'main character energy reported in this area', subheadline:'experts confirm the moment was too iconic to ignore', caption:'rare evidence of peak photobooth behavior', date:'LIVE REPORT', reporter:'chaos correspondent', article:'the public remains amazed after witnessing an unforgettable display of confidence, chaos, and charm.', side1:'exclusive report', side2:'public reacts loudly' },
      decor:'breaking'
    },
    {
      id:'vintage', name:'Vintage Journal', target:'aesthetic', recommendedFilter:'grainyFilm',
      colors:{ bg:'#EBD8B7', text:'#2D2118', secondary:'#5A4635', accent:'#7C4A24', line:'#3C2A1B' },
      defaultText:{ newspaperName:'THE VINTAGE POST', headline:'a timeless moment captured today', subheadline:'preserved beautifully in the archives of memory', caption:'archival photo of a day worth keeping', date:'ARCHIVE EDITION', reporter:'archive notes', article:'this edition records a quiet yet meaningful moment, wrapped in nostalgia and timeless charm.', side1:'from the archives', side2:'old soul special' },
      decor:'vintage'
    },
    {
      id:'campus', name:'School / Campus Edition', target:'school', recommendedFilter:'cleanBright',
      colors:{ bg:'#F8FAFC', text:'#0F172A', secondary:'#334155', accent:'#EAB308', line:'#1D3557' },
      defaultText:{ newspaperName:'CAMPUS CHRONICLE', headline:'unforgettable day with unforgettable people', subheadline:'students spotted making another memory for the books', caption:'campus edition photo of the day', date:'CAMPUS EDITION', reporter:'student desk', article:'today’s story captures friendship, growth, and moments that deserve a permanent spot in the yearbook.', side1:'yearbook worthy', side2:'campus spotlight' },
      decor:'campus'
    },
    {
      id:'wedding', name:'Wedding News', target:'wedding', recommendedFilter:'softWarm',
      colors:{ bg:'#FFFDF5', text:'#161616', secondary:'#525252', accent:'#C9972A', line:'#B8A06A' },
      defaultText:{ newspaperName:'THE WEDDING TIMES', headline:'love story makes the front page', subheadline:'a beautiful chapter begins today', caption:'a cherished moment from the celebration', date:'WEDDING EDITION', reporter:'celebration desk', article:'this special wedding edition celebrates love, family, and the beginning of a meaningful journey together.', side1:'golden chapter', side2:'family celebrates' },
      decor:'wedding'
    },
    {
      id:'birthday', name:'Birthday Headline', target:'birthday', recommendedFilter:'pastel',
      colors:{ bg:'#FFF1F2', text:'#111827', secondary:'#4B5563', accent:'#EC4899', line:'#111827' },
      defaultText:{ newspaperName:'BIRTHDAY DAILY', headline:'star of the day celebrates another iconic year', subheadline:'fans report high levels of joy and cake energy', caption:'official birthday portrait of the day', date:'BIRTHDAY EDITION', reporter:'party reporter', article:'today’s issue is dedicated to celebration, wishes, laughter, and another year of becoming even more iconic.', side1:'cake energy rises', side2:'wishes pour in' },
      decor:'birthday'
    },
    {
      id:'travel', name:'Travel Newspaper', target:'travel', recommendedFilter:'cinematic',
      colors:{ bg:'#FFF7ED', text:'#123B3F', secondary:'#31565A', accent:'#0F766E', line:'#164E63' },
      defaultText:{ newspaperName:'TRAVEL TIMES', headline:'new memories discovered on today’s adventure', subheadline:'a special report from the happiest destination', caption:'travel documentation from the journey', date:'TRAVEL REPORT', reporter:'field notes', article:'today’s adventure brings a collection of small discoveries, good company, and memories worth printing.', side1:'postcard update', side2:'destination joy' },
      decor:'travel'
    },
    {
      id:'classic', name:'Classic Monochrome', target:'general', recommendedFilter:'bw',
      colors:{ bg:'#F3F4F6', text:'#0A0A0A', secondary:'#4B5563', accent:'#111111', line:'#111111' },
      defaultText:{ newspaperName:'DAILY RECORD', headline:'a moment worth remembering', subheadline:'today’s edition captures a simple but meaningful story', caption:'official photo documentation', date:'DAILY EDITION', reporter:'record desk', article:'this record preserves a memory from today, printed as a small keepsake for the future.', side1:'official record', side2:'timeless note' },
      decor:'classic'
    }
  ];

  function byId(list, id) { return list.find(x => x.id === id) || list[0]; }

  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  function drawCoverImage(ctx, img, x, y, w, h, zoom=1, offsetX=0, offsetY=0) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, x + w/2 - dw/2 + offsetX, y + h/2 - dh/2 + offsetY, dw, dh);
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
    const out = lines.slice(0, maxLines);
    if (lines.length > maxLines && out.length) {
      let last = out[out.length - 1];
      while (last.length > 3 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      out[out.length - 1] = last + '…';
    }
    return out;
  }

  function fitFont(ctx, text, maxWidth, start, min, weight='900', family='Segoe UI, system-ui, sans-serif') {
    let size = start;
    while (size > min) {
      ctx.font = `${weight} ${size}px ${family}`;
      const lines = wrapLines(ctx, text, maxWidth, 3);
      if (lines.every(l => ctx.measureText(l).width <= maxWidth)) break;
      size -= 4;
    }
    ctx.font = `${weight} ${size}px ${family}`;
    return size;
  }

  function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines, align='left') {
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    const lines = wrapLines(ctx, text, maxWidth, maxLines);
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
    return y + lines.length * lineHeight;
  }

  function applyPhotoFilter(ctx, img, x, y, w, h, filterKey, zoom=1, offsetX=0, offsetY=0) {
    const f = FILTERS[filterKey] || FILTERS.original;
    ctx.save();
    ctx.filter = f.css;
    drawCoverImage(ctx, img, x, y, w, h, zoom, offsetX, offsetY);
    ctx.filter = 'none';
    if (f.grain) drawGrain(ctx, x, y, w, h, .13);
    ctx.restore();
  }

  function drawGrain(ctx, x, y, w, h, alpha=.1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i=0; i<2200; i++) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x + Math.random()*w, y + Math.random()*h, 1.2, 1.2);
    }
    ctx.restore();
  }

  function drawBarcode(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    let cur = x;
    const pattern = [3,1,1,2,4,1,2,2,1,3,1,1,5,2,1,4,2,1,3];
    pattern.forEach((bw, i) => {
      const ww = bw * w / 44;
      if (i % 2 === 0) ctx.fillRect(cur, y, ww, h);
      cur += ww;
    });
    ctx.restore();
  }

  function drawMagazineDecor(ctx, theme) {
    const c = theme.colors;
    ctx.save();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0,0,W,H);
    const grad = ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0, c.bg);
    grad.addColorStop(.55, c.secondary || c.bg);
    grad.addColorStop(1, c.accent2 || c.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    ctx.globalAlpha = .23;
    ctx.fillStyle = c.accent;
    if (theme.decor === 'bestie' || theme.decor === 'birthday') {
      for (let i=0;i<18;i++) {
        ctx.beginPath();
        ctx.arc(Math.random()*W, Math.random()*H, 30 + Math.random()*80, 0, Math.PI*2);
        ctx.fill();
      }
    } else if (theme.decor === 'luxury') {
      ctx.globalAlpha = .95;
      ctx.fillStyle = c.bg;
      ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 4;
      ctx.strokeRect(58,58,W-116,H-116);
      ctx.globalAlpha = .15;
      ctx.fillStyle = c.accent;
      ctx.fillRect(0,0,W,240);
    } else if (theme.decor === 'travel') {
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 5;
      for(let i=0;i<5;i++){
        ctx.beginPath();
        ctx.moveTo(80, 260+i*260);
        ctx.bezierCurveTo(320,160+i*240,700,380+i*140,1120,220+i*260);
        ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.arc(150,220,220,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(1080,1580,260,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawMagazine(state, photoImg) {
    const ctx = state.ctx, canvas = state.canvas;
    const theme = byId(MAGAZINE_THEMES, state.selectedTheme);
    const c = theme.colors, t = state.text;
    ctx.clearRect(0,0,W,H);
    drawMagazineDecor(ctx, theme);

    // Real magazine-style: full-bleed cover photo, not a framed photo box.
    ctx.save();
    if (photoImg) {
      applyPhotoFilter(ctx, photoImg, 0, 0, W, H, state.filter, state.zoom, state.photoX, state.photoY);
    } else {
      drawPlaceholder(ctx, 0, 0, W, H, c, state.lang === 'id' ? 'ambil foto untuk cover majalah' : 'take a photo to complete your cover');
    }
    ctx.restore();

    // readable editorial overlays
    const topOverlay = ctx.createLinearGradient(0, 0, 0, 360);
    topOverlay.addColorStop(0, theme.decor === 'luxury' ? 'rgba(0,0,0,.82)' : 'rgba(255,255,255,.72)');
    topOverlay.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = topOverlay;
    ctx.fillRect(0, 0, W, 390);

    const overlay = ctx.createLinearGradient(0, 920, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0)');
    overlay.addColorStop(.50, theme.decor === 'luxury' ? 'rgba(0,0,0,.62)' : 'rgba(255,255,255,.64)');
    overlay.addColorStop(1, theme.decor === 'luxury' ? 'rgba(0,0,0,.90)' : 'rgba(255,255,255,.94)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 900, W, H-900);

    // Magazine name
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = c.text;
    const titleFamily = theme.decor === 'luxury' ? 'Georgia, Times New Roman, serif' : 'Segoe UI, system-ui, sans-serif';
    fitFont(ctx, t.magazineName, 1080, theme.decor === 'luxury' ? 150 : 132, 64, '950', titleFamily);
    ctx.fillText((t.magazineName || '').toUpperCase(), W/2, 70);
    ctx.restore();

    // Date + name
    ctx.save();
    ctx.fillStyle = c.text;
    ctx.globalAlpha = .82;
    ctx.font = '900 28px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((t.date || '').toUpperCase(), 68, 245);
    ctx.textAlign = 'right';
    ctx.fillText((t.name || '').toUpperCase(), W-68, 245);
    ctx.restore();

    // Teasers
    ctx.save();
    ctx.fillStyle = c.accent;
    ctx.font = '900 32px Segoe UI, system-ui, sans-serif';
    const teasers = [t.teaser1, t.teaser2, t.teaser3].filter(Boolean);
    teasers.forEach((teaser, i) => {
      const y = 390 + i*158;
      ctx.fillStyle = i % 2 ? c.text : c.accent;
      ctx.globalAlpha = .92;
      drawWrapped(ctx, teaser.toUpperCase(), i%2 ? 755 : 70, y, 360, 36, 2, 'left');
    });
    ctx.restore();

    // Headline
    ctx.save();
    ctx.fillStyle = c.text;
    const hFamily = theme.decor === 'luxury' ? 'Georgia, Times New Roman, serif' : 'Segoe UI, system-ui, sans-serif';
    fitFont(ctx, t.headline, 1040, 96, 44, '950', hFamily);
    const hLines = wrapLines(ctx, (t.headline || '').toUpperCase(), 1040, 3);
    ctx.textAlign = 'left';
    hLines.forEach((line, i) => ctx.fillText(line, 70, 1260 + i*104));
    ctx.fillStyle = c.accent;
    ctx.font = '850 35px Segoe UI, system-ui, sans-serif';
    drawWrapped(ctx, t.subheadline, 74, 1530, 900, 42, 2);
    drawBarcode(ctx, 70, 1682, 185, 58, c.text);
    ctx.textAlign = 'right';
    ctx.font = '900 24px Segoe UI, system-ui, sans-serif';
    ctx.fillText('4R COVER EDITION', W-70, 1700);
    ctx.restore();

    drawForegroundDecor(ctx, theme);
  }

  function drawForegroundDecor(ctx, theme) {
    const c = theme.colors;
    ctx.save();
    ctx.fillStyle = c.accent;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 5;
    ctx.font = '900 48px Segoe UI, sans-serif';
    if (['bestie','birthday','soft','kpop'].includes(theme.decor)) {
      ['✦','♡','★','✧','✿'].forEach((s,i) => {
        ctx.globalAlpha = .75;
        ctx.fillText(s, [82,1040,990,130,920][i], [124,360,880,1490,1180][i]);
      });
    }
    if (theme.decor === 'grad') {
      ctx.strokeRect(62,62,W-124,H-124);
      ctx.fillText('★', 80, 1680);
    }
    if (theme.decor === 'travel') {
      ctx.font = '900 34px Segoe UI, sans-serif';
      ctx.fillText('POSTCARD', 76, 118);
      ctx.strokeRect(890, 105, 210, 130);
    }
    ctx.restore();
  }

  function drawPlaceholder(ctx, x, y, w, h, colors, text) {
    const grad = ctx.createLinearGradient(x,y,x+w,y+h);
    grad.addColorStop(0, colors.secondary || '#f8fafc');
    grad.addColorStop(1, colors.accent2 || '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle = colors.text || '#1D3557';
    ctx.globalAlpha = .72;
    ctx.font = '900 64px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', x+w/2, y+h/2-42);
    ctx.font = '900 31px Segoe UI, sans-serif';
    ctx.fillText(text, x+w/2, y+h/2+44);
    ctx.globalAlpha = 1;
  }


  const SIDE_STORY_POOL = {
    id: {
      friendship: [
        'Warga sekitar melaporkan kadar ketawa meningkat 300% setelah sesi foto dimulai.',
        'Tim anti jaim kembali gagal menjaga image di depan kamera.',
        'Penelitian lokal menyebut candid lebih ampuh daripada pose serius.'
      ],
      love: [
        'Publik meminta pasangan ini berhenti terlalu gemes, namun permintaan ditolak.',
        'Pakar hubungan mendeteksi chemistry kuat sejak hitungan pertama.',
        'Saksi menyebut suasana mendadak manis tanpa aba-aba.'
      ],
      family: [
        'Rumah terasa lebih ramai setelah semua senyum berhasil diamankan.',
        'Sumber keluarga menyebut foto ini akan dikirim ke grup besar.',
        'Momen sederhana kembali terbukti paling berharga.'
      ],
      breaking: [
        'Warga panik melihat aura percaya diri muncul tanpa peringatan.',
        'Tim dokumentasi kewalahan karena pose terlalu iconic.',
        'Sumber terpercaya menyebut ini bukan sekadar foto biasa.'
      ],
      vintage: [
        'Arsip lama menerima tambahan kenangan yang sangat layak disimpan.',
        'Nuansa nostalgia mendadak memenuhi lokasi pemotretan.',
        'Kolektor momen menyebut foto ini punya nilai sentimental tinggi.'
      ],
      campus: [
        'Mahasiswa terpantau bahagia sebelum deadline kembali menyerang.',
        'Saksi menyebut outfit hari ini berada di atas rata-rata kelas.',
        'Yearbook committee dikabarkan langsung mengamankan halaman khusus.'
      ],
      wedding: [
        'Keluarga sepakat momen ini wajib masuk album utama.',
        'Garis emas dan senyum hangat mendominasi laporan hari ini.',
        'Tamu undangan menyebut vibes acara sangat layak dikenang.'
      ],
      birthday: [
        'Stok kue menurun drastis, kebahagiaan meningkat tajam.',
        'Wish list bocor: isinya bahagia terus dan foto bagus.',
        'Lilin ulang tahun dikabarkan sempat kewalahan.'
      ],
      travel: [
        'Peta lokal menandai lokasi ini sebagai titik kenangan baru.',
        'Postcard hari ini resmi naik level jadi front page.',
        'Tim jalan-jalan menyatakan perjalanan ini layak diulang.'
      ],
      classic: [
        'Catatan resmi menyebut momen ini sederhana tapi sulit dilupakan.',
        'Dokumentasi hari ini masuk arsip kenangan penting.',
        'Pembaca setuju: beberapa momen memang pantas dicetak.'
      ]
    },
    en: {
      friendship: [
        'Local sources report laughter levels rose by 300% after the camera started.',
        'The no-shame committee failed to stay serious in front of the lens.',
        'A local study claims candid shots beat serious poses every time.'
      ],
      love: [
        'The public asked this couple to stop being adorable. Request denied.',
        'Relationship experts detected strong chemistry before the countdown ended.',
        'Witnesses say the room suddenly became suspiciously sweet.'
      ],
      family: [
        'The room reportedly felt warmer after every smile was safely captured.',
        'Family sources confirm this photo is heading straight to the group chat.',
        'Simple moments have once again proven to be the most meaningful.'
      ],
      breaking: [
        'Residents were shocked as main character energy appeared without warning.',
        'The documentation team struggled to handle this level of iconic behavior.',
        'Trusted sources confirm this was not just another photo.'
      ],
      vintage: [
        'The archive received a new memory worthy of long-term preservation.',
        'A wave of nostalgia reportedly entered the scene during the session.',
        'Memory collectors described the photo as sentimentally valuable.'
      ],
      campus: [
        'Students were seen happy shortly before deadlines returned to attack.',
        'Witnesses claim today’s outfits were above classroom average.',
        'The yearbook committee reportedly reserved a special page immediately.'
      ],
      wedding: [
        'Families agreed this moment belongs in the main album.',
        'Gold accents and warm smiles dominated today’s report.',
        'Guests described the celebration vibes as highly memorable.'
      ],
      birthday: [
        'Cake supplies dropped sharply while happiness levels continued rising.',
        'A leaked wish list shows the top request: more joy and better photos.',
        'Birthday candles were reportedly overwhelmed by the excitement.'
      ],
      travel: [
        'Local maps marked this spot as a newly discovered memory point.',
        'Today’s postcard officially graduated into front-page material.',
        'The travel team confirms this adventure deserves a repeat.'
      ],
      classic: [
        'Official records describe this moment as simple but hard to forget.',
        'Today’s documentation has entered the archive of important memories.',
        'Readers agree some moments are simply worth printing.'
      ]
    }
  };

  function sideStory(theme, lang, idx) {
    const list = SIDE_STORY_POOL[lang]?.[theme.id] || SIDE_STORY_POOL.en[theme.id] || [];
    return list[idx % Math.max(1, list.length)] || '';
  }


  function footerTagline(theme, lang) {
    const map = {
      id: {
        friendship: 'NO RULES. JUST US. ♡',
        love: 'LOVE IS IN THE AIR ♡',
        family: 'LOVE • LAUGH • MEMORIES',
        breaking: 'CHAOS TERPANTAU, VIBES AMAN.',
        vintage: 'ARCHIVED WITH LOVE',
        campus: 'YEARBOOK ENERGY ONLY',
        wedding: 'A LOVE STORY IN PRINT',
        birthday: 'TODAY WE CELEBRATE YOU! ♡',
        travel: 'POSTCARD ENERGY ACTIVATED',
        classic: 'A MEMORY WORTH KEEPING'
      },
      en: {
        friendship: 'NO RULES. JUST US. ♡',
        love: 'LOVE IS IN THE AIR ♡',
        family: 'LOVE • LAUGH • MEMORIES',
        breaking: 'CHAOS DETECTED. VIBES APPROVED.',
        vintage: 'ARCHIVED WITH LOVE',
        campus: 'YEARBOOK ENERGY ONLY',
        wedding: 'A LOVE STORY IN PRINT',
        birthday: 'TODAY WE CELEBRATE YOU! ♡',
        travel: 'POSTCARD ENERGY ACTIVATED',
        classic: 'A MEMORY WORTH KEEPING'
      }
    };
    return map[lang]?.[theme.id] || map.en[theme.id] || 'A MEMORY WORTH KEEPING';
  }

  function sidebarHeadline(theme, lang) {
    const map = {
      id: {
        friendship: 'VIBES NAIK', love: 'TOO CUTE', family: 'RUMAH', breaking: 'WASPADA', vintage: 'ARSIP', campus: 'SPOTLIGHT', wedding: 'GOLDEN', birthday: 'ANOTHER YEAR', travel: 'POSTCARD', classic: 'OFFICIAL'
      },
      en: {
        friendship: 'VIBES UP', love: 'TOO CUTE', family: 'HOME', breaking: 'ALERT', vintage: 'ARCHIVE', campus: 'SPOTLIGHT', wedding: 'GOLDEN', birthday: 'ANOTHER YEAR', travel: 'POSTCARD', classic: 'OFFICIAL'
      }
    };
    return map[lang]?.[theme.id] || map.en[theme.id] || 'OFFICIAL';
  }
  function drawPhotoCell(ctx, img, x, y, w, h, state, c, label) {
    ctx.save();
    ctx.strokeStyle = c.line || c.text;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.rect(x + 7, y + 7, w - 14, h - 14);
    ctx.clip();
    if (img) applyPhotoFilter(ctx, img, x + 7, y + 7, w - 14, h - 14, state.filter, state.zoom, state.photoX, state.photoY);
    else drawPlaceholder(ctx, x + 7, y + 7, w - 14, h - 14, c, label || 'take photo');
    ctx.restore();
  }

  function drawNewspaper(state, photoImg) {
    const ctx = state.ctx;
    const theme = byId(NEWSPAPER_THEMES, state.selectedTheme);
    const c = theme.colors, t = state.text;
    const lang = state.lang || 'en';
    const paper = c.bg || '#f4ecdb';
    const ink = c.text || '#141414';
    const line = c.line || '#3a3026';

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = paper;
    ctx.fillRect(0,0,W,H);

    // subtle paper texture & stains
    ctx.save();
    ctx.globalAlpha = .05;
    for (let i=0;i<1800;i++) {
      const v = 180 + (Math.random()*60|0);
      ctx.fillStyle = `rgb(${v},${v-8},${v-18})`;
      ctx.fillRect(Math.random()*W, Math.random()*H, 1.2, 1.2);
    }
    ctx.globalAlpha = .06;
    ctx.fillStyle = c.accent || '#b9935a';
    for (const [x,y,r] of [[140,120,76],[1040,118,62],[1080,1640,84],[150,1540,68]]) {
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // borders
    ctx.save();
    ctx.strokeStyle = line;
    ctx.lineWidth = 4;
    ctx.strokeRect(28,28,W-56,H-56);
    ctx.lineWidth = 1.7;
    ctx.strokeRect(46,46,W-92,H-92);
    ctx.restore();

    // masthead
    ctx.save();
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    fitFont(ctx, t.newspaperName, 980, 78, 44, '700', 'UnifrakturCook, Georgia, serif');
    ctx.fillText(t.newspaperName || '', W/2, 56);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(66,138); ctx.lineTo(W-66,138); ctx.stroke();
    ctx.font = '700 13px Libre Baskerville, Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(lang === 'id' ? 'SPECIAL EDITION' : 'SPECIAL EDITION', 70, 147);
    ctx.textAlign = 'right';
    ctx.fillText((t.date || '').toUpperCase(), W-70, 147);
    ctx.restore();

    // headline area
    const kicker = theme.id === 'breaking' ? (lang === 'id' ? 'BERITA HEBOH!' : 'BREAKING NEWS!') : '';
    ctx.save();
    ctx.fillStyle = ink;
    ctx.textBaseline = 'top';
    if (kicker) {
      ctx.font = '900 22px Arial Black, Archivo, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(kicker, 72, 176);
    }
    fitFont(ctx, t.headline, 780, 66, 32, '900', 'Arial Black, Archivo, sans-serif');
    ctx.textAlign = 'left';
    const hLines = wrapLines(ctx, (t.headline || '').toUpperCase(), 780, 4);
    const headlineY = kicker ? 208 : 176;
    const headlineLH = 68;
    hLines.forEach((ln,i)=>ctx.fillText(ln, 72, headlineY + i*headlineLH));
    ctx.font = '700 22px Libre Baskerville, Georgia, serif';
    ctx.fillStyle = '#463833';
    drawWrapped(ctx, t.subheadline, 74, headlineY + hLines.length*headlineLH + 14, 760, 30, 2, 'left');
    ctx.restore();

    // media block
    const photoTop = 440;
    const bottomStart = 1220;
    if (state.photoLayout === 'quad') {
      const px = 70, py = photoTop, pw = 1060, ph = 620;
      const gap = 16;
      const cw = (pw - gap) / 2;
      const ch = (ph - gap) / 2;
      const imgs = state.photoImgs || [];
      const label = lang === 'id' ? 'ambil foto' : 'take photo';
      drawPhotoCell(ctx, imgs[0], px, py, cw, ch, state, c, label + ' 1');
      drawPhotoCell(ctx, imgs[1], px + cw + gap, py, cw, ch, state, c, label + ' 2');
      drawPhotoCell(ctx, imgs[2], px, py + ch + gap, cw, ch, state, c, label + ' 3');
      drawPhotoCell(ctx, imgs[3], px + cw + gap, py + ch + gap, cw, ch, state, c, label + ' 4');
      ctx.save();
      ctx.strokeStyle = line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(70, 1088); ctx.lineTo(1130,1088); ctx.stroke();
      ctx.font = '700 15px Libre Baskerville, Georgia, serif';
      ctx.fillStyle = '#463833';
      ctx.textAlign = 'center';
      ctx.fillText(footerTagline(theme, lang), W/2, 1098);
      ctx.restore();
    } else {
      const px = 70, py = photoTop, pw = 760, ph = 600;
      const sx = 848, sy = photoTop, sw = 282, sh = 600;
      drawPhotoCell(ctx, photoImg, px, py, pw, ph, state, c, lang === 'id' ? 'ambil foto untuk halaman depan' : 'take a photo for the front page');

      // sidebar card like inspo
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.46)';
      ctx.strokeStyle = line; ctx.lineWidth = 2;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.font = '900 20px Arial Black, Archivo, sans-serif';
      ctx.fillStyle = ink;
      drawWrapped(ctx, sidebarHeadline(theme, lang), sx + 18, sy + 26, sw - 36, 28, 3);
      ctx.font = '700 15px Libre Baskerville, Georgia, serif';
      ctx.fillStyle = '#473d38';
      drawWrapped(ctx, sideStory(theme, lang, 0), sx + 18, sy + 108, sw - 36, 23, 9);
      ctx.font = '900 54px Segoe UI Emoji, Apple Color Emoji, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(theme.id === 'birthday' ? '🎂' : theme.id === 'family' ? '⌂' : theme.id === 'love' ? '♡' : theme.id === 'travel' ? '✈' : '☺', sx + sw/2, sy + sh - 120);
      ctx.font = '700 15px Libre Baskerville, Georgia, serif';
      ctx.fillStyle = line;
      ctx.fillText(footerTagline(theme, lang), sx + sw/2, sy + sh - 58);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(70, 1058); ctx.lineTo(1130,1058); ctx.stroke();
      ctx.font = 'italic 15px Libre Baskerville, Georgia, serif';
      ctx.fillStyle = '#463833';
      ctx.textAlign = 'left';
      drawWrapped(ctx, t.caption, 74, 1071, 740, 22, 2, 'left');
      ctx.restore();
    }

    // lower articles
    ctx.save();
    ctx.strokeStyle = line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(48, bottomStart); ctx.lineTo(W-48, bottomStart); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(430,bottomStart+35); ctx.lineTo(430,1662); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(790,bottomStart+35); ctx.lineTo(790,1662); ctx.stroke();

    ctx.fillStyle = ink;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '900 23px Libre Baskerville, Georgia, serif';
    drawWrapped(ctx, `BY ${(t.reporter || 'STAFF').toUpperCase()}`, 66, bottomStart + 28, 320, 29, 2, 'left');
    ctx.font = '400 22px Libre Baskerville, Georgia, serif';
    drawWrapped(ctx, t.article || '', 66, bottomStart + 80, 320, 29, 7, 'left');

    ctx.font = '900 24px Arial Black, Archivo, sans-serif';
    drawWrapped(ctx, (t.side1 || '').toUpperCase(), 460, bottomStart + 28, 288, 28, 3, 'left');
    ctx.font = '400 21px Libre Baskerville, Georgia, serif';
    drawWrapped(ctx, sideStory(theme, lang, 1), 460, bottomStart + 150, 288, 28, 6, 'left');

    ctx.font = '900 24px Arial Black, Archivo, sans-serif';
    drawWrapped(ctx, (t.side2 || '').toUpperCase(), 820, bottomStart + 28, 286, 28, 3, 'left');
    ctx.font = '400 21px Libre Baskerville, Georgia, serif';
    drawWrapped(ctx, sideStory(theme, lang, 2), 820, bottomStart + 150, 286, 28, 6, 'left');
    ctx.restore();
  }

  function drawNewspaperDecor(ctx, theme) {
    // styling largely handled in drawNewspaper for cleaner newspaper look.
  }
function drawNewspaperDecor(ctx, theme) {
    const c = theme.colors;
    ctx.save();
    ctx.fillStyle = c.accent;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 4;
    ctx.globalAlpha = .92;
    if (theme.decor === 'breaking') {
      ctx.fillRect(80, 274, 260, 48);
      ctx.fillStyle = '#fff';
      ctx.font = '950 27px Segoe UI, sans-serif';
      ctx.fillText('BREAKING', 102, 285);
    } else if (theme.decor === 'love' || theme.decor === 'wedding') {
      ctx.font = '900 35px serif';
      ctx.fillText('♡', 96, 235);
      ctx.fillText('♡', 1070, 235);
    } else if (theme.decor === 'travel') {
      ctx.font = '900 30px Segoe UI, sans-serif';
      ctx.strokeRect(850, 282, 220, 72);
      ctx.fillText('TRAVEL STAMP', 872, 304);
    } else if (theme.decor === 'birthday') {
      ctx.font = '900 35px serif';
      ctx.fillText('✦', 96, 235);
      ctx.fillText('★', 1070, 235);
    } else if (theme.decor === 'classic' || theme.decor === 'vintage') {
      ctx.globalAlpha = .55;
      ctx.beginPath(); ctx.moveTo(90, 260); ctx.lineTo(1110, 260); ctx.stroke();
    }
    ctx.restore();
  }

  function makeIssueNo(seed) {
    let n = 0;
    String(seed || 'cover').split('').forEach(ch => n += ch.charCodeAt(0));
    return String((n % 900) + 100);
  }


  const BILINGUAL_DEFAULTS = {
    magazine: {
      id: {
        bestie: { magazineName:'BESTIE MAG', headline:'duo rusuh yang selalu jadi legenda', subheadline:'ketawa, chaos, tapi tetap gemes maksimal', name:'tim anti jaim', date:'EDISI BESTIE 2026', teaser1:'fit check paling niat', teaser2:'memori wajib dicetak', teaser3:'vibes: tidak tertandingi' },
        couple: { magazineName:'LOVE ISSUE', headline:'dua hati, satu cerita lucu', subheadline:'sedikit bucin, banyak gemesnya', name:'couple spotlight', date:'EDISI SAYANG', teaser1:'couple paling niat', teaser2:'momen manis only', teaser3:'romance edit' },
        family: { magazineName:'FAMILY JOURNAL', headline:'rumah itu tempat kita kumpul', subheadline:'momen hangat yang layak dipajang', name:'family edition', date:'EDISI KELUARGA', teaser1:'hari keluarga', teaser2:'kecil momennya besar sayangnya', teaser3:'bareng-bareng lebih seru' },
        main: { magazineName:'ICON', headline:'hari ini auranya mahal', subheadline:'main character energy tercetak jelas', name:'cover star', date:'THE CONFIDENCE ISSUE', teaser1:'percaya diri naik 200%', teaser2:'style report', teaser3:'satu pose langsung iconic' },
        grad: { magazineName:'GRAD ISSUE', headline:'akhirnya sampai juga di sini', subheadline:'kerja keras, drama, dan bangga jadi satu', name:'achievement unlocked', date:'EDISI BANGGA', teaser1:'achievement unlocked', teaser2:'momen paling proud', teaser3:'chapter baru dimulai' },
        birthday: { magazineName:'BIRTHDAY STAR', headline:'hari ini semua tentang kamu', subheadline:'umur nambah, pesona juga ikut naik', name:'birthday edition', date:'PARTY ISSUE', teaser1:'birthday mood', teaser2:'wish list inside', teaser3:'party edition' },
        kpop: { magazineName:'IDOL ZINE', headline:'era baru telah debut', subheadline:'visual hari ini tidak bisa dibantah', name:'debut team', date:'DEBUT ISSUE', teaser1:'comeback ready', teaser2:'visual of the day', teaser3:'stage presence: 100%' },
        luxury: { magazineName:'LUXE', headline:'elegan tanpa banyak usaha', subheadline:'diam-diam mahal, terang-terangan iconic', name:'luxury edit', date:'EVENING ISSUE', teaser1:'luxury edit', teaser2:'timeless style', teaser3:'evening issue' },
        travel: { magazineName:'TRAVEL NOTE', headline:'hari yang pantas jadi kenangan', subheadline:'petualangan kecil, ceritanya panjang', name:'postcard moment', date:'DESTINASI HARI INI', teaser1:'travel diary', teaser2:'today’s destination', teaser3:'postcard moment' },
        softlife: { magazineName:'SOFT LIFE', headline:'romantisasi hal kecil dulu', subheadline:'momen dreamy dalam ukuran 4R', name:'soft mood', date:'DREAMY ISSUE', teaser1:'soft mood', teaser2:'pretty little things', teaser3:'gentle days' }
      },
      en: {}
    },
    newspaper: {
      id: {
        friendship: { newspaperName:'KORAN BESTIE RAYA', headline:'bestie lokal kembali bikin momen ikonik', subheadline:'saksi menyebut vibes hari ini tidak bisa dilawan', caption:'foto eksklusif dari kejadian yang terlalu gemes untuk dilupakan', date:'JUNI 2026', reporter:'reporter anti jaim', article:'warga sekitar melaporkan tawa, chaos kecil, dan energi persahabatan yang sangat layak masuk halaman depan.', side1:'vibes naik drastis', side2:'bestie behavior terkonfirmasi' },
        love: { newspaperName:'HARIAN CINTA', headline:'pasangan paling gemes tertangkap kamera', subheadline:'kisah halaman depan yang ditulis pakai momen manis', caption:'potret resmi dari adegan yang bikin senyum sendiri', date:'EDISI SAYANG', reporter:'desk bucin', article:'edisi hari ini merayakan cerita yang penuh hangat, tawa kecil, dan affection yang tidak bisa disembunyikan.', side1:'laporan hati hangat', side2:'momen manis tercatat' },
        family: { newspaperName:'WARTA KELUARGA', headline:'berita utama hari ini: kumpul bareng', subheadline:'momen keluarga yang pantas disimpan lama', caption:'diabadikan dengan senyum dan rasa hangat', date:'EDISI KELUARGA', reporter:'meja keluarga', article:'edisi spesial ini mencatat kebahagiaan sederhana yang terasa besar karena dilakukan bersama orang tersayang.', side1:'edisi rumah', side2:'kebersamaan menang' },
        breaking: { newspaperName:'BERITA HEBOH', headline:'aura main character terdeteksi di area ini', subheadline:'para ahli memastikan momen ini terlalu iconic untuk diabaikan', caption:'bukti langka perilaku photobooth level maksimal', date:'LAPORAN LANGSUNG', reporter:'koresponden chaos', article:'publik dibuat tercengang setelah menyaksikan kombinasi percaya diri, pesona, dan sedikit drama yang sulit dilupakan.', side1:'laporan eksklusif', side2:'warga ikut teriak' },
        vintage: { newspaperName:'POS NOSTALGIA', headline:'momen klasik berhasil diabadikan hari ini', subheadline:'tersimpan rapi di arsip kenangan yang hangat', caption:'foto arsip dari hari yang patut disimpan', date:'EDISI ARSIP', reporter:'catatan lama', article:'edisi ini mencatat satu momen sederhana tapi berarti, dibungkus nuansa nostalgia dan pesona klasik.', side1:'dari arsip lama', side2:'edisi old soul' },
        campus: { newspaperName:'KAMPUS CHRONICLE', headline:'hari seru bersama orang-orang tak terlupakan', subheadline:'momen ini resmi layak masuk yearbook', caption:'foto hari ini edisi kampus/sekolah', date:'EDISI KAMPUS', reporter:'meja siswa', article:'cerita hari ini merekam pertemanan, pertumbuhan, dan momen yang pantas punya tempat permanen di album kenangan.', side1:'layak yearbook', side2:'campus spotlight' },
        wedding: { newspaperName:'WARTA WEDDING', headline:'kisah cinta resmi masuk halaman depan', subheadline:'bab baru yang indah dimulai hari ini', caption:'momen berharga dari hari perayaan', date:'EDISI WEDDING', reporter:'desk selebrasi', article:'edisi spesial ini merayakan cinta, keluarga, dan awal perjalanan yang penuh makna bersama.', side1:'bab emas dimulai', side2:'keluarga merayakan' },
        birthday: { newspaperName:'HARIAN ULANG TAHUN', headline:'bintang hari ini merayakan tahun paling iconic', subheadline:'laporan menyebut kadar bahagia dan cake energy meningkat', caption:'potret resmi birthday star hari ini', date:'EDISI BIRTHDAY', reporter:'reporter pesta', article:'edisi hari ini dipersembahkan untuk tawa, doa, kue, dan satu tahun baru yang makin bersinar.', side1:'cake energy naik', side2:'doa berdatangan' },
        travel: { newspaperName:'TRAVEL TIMES', headline:'kenangan baru ditemukan dalam perjalanan hari ini', subheadline:'laporan spesial dari destinasi paling bahagia', caption:'dokumentasi perjalanan yang wajib dicetak', date:'LAPORAN TRAVEL', reporter:'catatan lapangan', article:'petualangan hari ini membawa penemuan kecil, teman baik, dan memori yang terlalu sayang kalau cuma disimpan di galeri.', side1:'update postcard', side2:'destinasi bahagia' },
        classic: { newspaperName:'DAILY RECORD', headline:'sebuah momen yang pantas diingat', subheadline:'edisi hari ini mencatat cerita sederhana tapi bermakna', caption:'dokumentasi foto resmi', date:'EDISI HARIAN', reporter:'desk arsip', article:'catatan ini menyimpan satu kenangan dari hari ini, dicetak sebagai pengingat kecil untuk masa depan.', side1:'catatan resmi', side2:'momen timeless' }
      },
      en: {}
    }
  };

  // English defaults mirror the original theme defaults.
  MAGAZINE_THEMES.forEach(t => { BILINGUAL_DEFAULTS.magazine.en[t.id] = { ...t.defaultText }; });
  NEWSPAPER_THEMES.forEach(t => { BILINGUAL_DEFAULTS.newspaper.en[t.id] = { ...t.defaultText }; });

  function getDefaultText(type, themeId, lang) {
    const list = type === 'magazine' ? MAGAZINE_THEMES : NEWSPAPER_THEMES;
    const theme = byId(list, themeId);
    return { ...(BILINGUAL_DEFAULTS[type]?.[lang]?.[themeId] || theme.defaultText || {}) };
  }

  function createState(type, canvas, ctx) {
    const themes = type === 'magazine' ? MAGAZINE_THEMES : NEWSPAPER_THEMES;
    const selectedTheme = themes[0].id;
    const lang = 'id';
    return {
      type, canvas, ctx,
      lang,
      selectedTheme,
      filter: themes[0].recommendedFilter || 'original',
      photo: null,
      photoImg: null,
      photos: [],
      photoImgs: [],
      photoLayout: type === 'newspaper' ? 'hero' : 'hero',
      nextPhotoSlot: 0,
      zoom: 1,
      photoX: 0,
      photoY: 0,
      edited: {},
      text: getDefaultText(type, selectedTheme, lang)
    };
  }

  function render(state) {
    if (state.type === 'magazine') drawMagazine(state, state.photoImg);
    else drawNewspaper(state, state.photoImg);
  }

  window.CoverMaker = {
    W,H,FILTERS,MAGAZINE_THEMES,NEWSPAPER_THEMES,
    createState, render, byId, getDefaultText
  };
})();