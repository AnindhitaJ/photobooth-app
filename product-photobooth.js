(function () {
  const W = 1181;
  const H = 1772;
  const SAFE = 60;

  const ICON_FRAME_CONFIGS = [
    { id:'angel-core', name:'Angel Core', file:'/icon-frame/Angel Core.png', textPosition:'bottom-center' },
    { id:'birthday-girl', name:'Birthday Girl', file:'/icon-frame/Birthday Girl.png', textPosition:'bottom-center' },
    { id:'celestial-muse', name:'Celestial Muse', file:'/icon-frame/Celestial Muse.png', textPosition:'bottom-center' },
    { id:'dark-royalty', name:'Dark Royalty', file:'/icon-frame/Dark Royalty.png', textPosition:'bottom-center' },
    { id:'fantasy-warrior', name:'Fantasy Warrior', file:'/icon-frame/Fantasy Warrior.png', textPosition:'bottom-center' },
    { id:'gold-crown', name:'Gold Crown', file:'/icon-frame/Gold Crown.png', textPosition:'bottom-center' },
    { id:'muse', name:'Muse', file:'/icon-frame/Muse.png', textPosition:'bottom-center' },
    { id:'pink-princess', name:'Pink Princess', file:'/icon-frame/Pink Princess.png', textPosition:'bottom-center' },
    { id:'pop-art-icon', name:'Pop Art Icon', file:'/icon-frame/Pop Art Icon.png', textPosition:'bottom-center' },
    { id:'soft-potrait', name:'Soft Potrait', file:'/icon-frame/Soft Potrait.png', textPosition:'bottom-center' },
    { id:'traditional-batik', name:'Traditional Batik', file:'/icon-frame/Traditional Batik.png', textPosition:'bottom-center' },
    { id:'vintage-frame', name:'Vintage Frame', file:'/icon-frame/Vintage Frame.png', textPosition:'bottom-center' },
    { id:'y2k-diva', name:'Y2K Diva', file:'/icon-frame/Y2K Diva.png', textPosition:'bottom-center' }
  ];

  function getIconFrames() {
    return ICON_FRAME_CONFIGS;
  }

  function getIconFrameById(id) {
    return ICON_FRAME_CONFIGS.find(f => f.id === id) || ICON_FRAME_CONFIGS[0];
  }

  const CERTIFICATE_FRAME_CONFIGS = [
    { id:'certificate-of-love', name:'Certificate Of Love', file:'/certificate-frame/Certificate Of Love.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#8C3F55', nameStroke:'rgba(255,255,255,.72)' },
    { id:'certificate-of-besties', name:'Certificate Of Besties', file:'/certificate-frame/Certificate Of Besties.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#6A4D8A', nameStroke:'rgba(255,255,255,.72)' },
    { id:'certificate-of-self-love', name:'Certificate Of Self-Love', file:'/certificate-frame/Certificate Of Self-Love.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#4F6B57', nameStroke:'rgba(255,255,255,.72)' },
    { id:'certificate-of-family', name:'Certificate Of Family', file:'/certificate-frame/Certificate Of Family.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#365B83', nameStroke:'rgba(255,255,255,.72)' },
    { id:'birthday-certificate', name:'Birthday Certificate', file:'/certificate-frame/Birthday Certificate.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#8A4A8E', nameStroke:'rgba(255,255,255,.72)' },
    { id:'certificate-of-achievement', name:'Certificate Of Achievement', file:'/certificate-frame/Certificate Of Achievement.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#7A5A39', nameStroke:'rgba(255,255,255,.72)' },
    { id:'certified-icon-award', name:'Certified Icon Award', file:'/certificate-frame/Certified Icon Award.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#503A88', nameStroke:'rgba(255,255,255,.72)' },
    { id:'couple-contract', name:'Couple Contract', file:'/certificate-frame/Couple Contract.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#8C3F55', nameStroke:'rgba(255,255,255,.72)' },
    { id:'bestie-agreement', name:'Bestie Agreement', file:'/certificate-frame/Bestie Agreement.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#6A4D8A', nameStroke:'rgba(255,255,255,.72)' },
    { id:'royal-decree', name:'Royal Decree', file:'/certificate-frame/Royal Decree.png', photoRect:{x:150,y:195,w:610,h:800,r:42}, nameRect:{x:785,y:450,w:840,h:150}, nameColor:'#6A4A1E', nameStroke:'rgba(255,255,255,.72)' }
  ];

  function getCertificateFrames() {
    return CERTIFICATE_FRAME_CONFIGS;
  }

  function getCertificateFrameById(id) {
    return CERTIFICATE_FRAME_CONFIGS.find(f => f.id === id) || CERTIFICATE_FRAME_CONFIGS[0];
  }

  const CONFIGS = {"trading-card": {"title": "Trading Card Photobooth", "emoji": "🃏", "shortTitle": "Trading Card", "path": "/trading-card", "subtitle": "Collectible card 4R dengan rarity, stats, skill, barcode, dan badge.", "filePrefix": "trading-card", "fields": [{"key": "name", "label": "Nama Kartu", "max": 42}, {"key": "role", "label": "Subtitle / Role", "max": 42}, {"key": "rarity", "label": "Rarity", "max": 38}, {"key": "skill", "label": "Skill Utama", "max": 58}, {"key": "quote", "label": "Quote Pendek", "max": 110, "long": true}, {"key": "stats", "label": "Stats: satu baris satu stat, contoh charm 98", "max": 160, "long": true}, {"key": "number", "label": "Nomor Kartu", "max": 28}, {"key": "date", "label": "Tahun / Tanggal", "max": 28}], "filters": ["Clean Glossy", "Soft Glow", "Warm Film", "Cool Studio", "High Contrast", "Pastel Shine", "Holographic", "Black Gold", "Retro Arcade", "Neon Pop"], "themes": [{"id": "idol", "name": "Idol Photocard Card", "subtitle": "glossy idol collectible", "description": "soft pink/lilac photocard", "colors": ["#fff7fb", "#f9a8d4", "#c4b5fd", "#1f2937"], "defaults": {"name": "Main Character", "role": "Limited Edition", "rarity": "Fan Favorite", "skill": "Stage Smile", "quote": "Thanks for loving this era.", "number": "AUTO", "date": "2026", "stats": "charm 98\nenergy 92\nloyalty 100\nstyle 94"}}, {"id": "battle", "name": "Game Battle Card", "subtitle": "legendary RPG battle card", "description": "bold red/blue/silver", "colors": ["#111827", "#ef4444", "#60a5fa", "#f8fafc"], "defaults": {"name": "Player One", "role": "Battle Unit", "rarity": "Legendary", "skill": "Critical Charm", "quote": "Ready for the next battle.", "number": "AUTO", "date": "2026", "stats": "attack 96\ndefense 88\npower 99\nluck 91"}}, {"id": "sport", "name": "Sport Rookie Card", "subtitle": "sporty rookie card", "description": "clean bold athletic layout", "colors": ["#f8fafc", "#2563eb", "#ef4444", "#111827"], "defaults": {"name": "Rookie Star", "role": "Team Highlight", "rarity": "Rookie", "skill": "Speed Smile", "quote": "Built for the highlight reel.", "number": "AUTO", "date": "2026", "stats": "speed 96\npower 89\nfocus 92\nteamwork 100"}}, {"id": "bestie", "name": "Bestie Chaos Card", "subtitle": "playful duo energy", "description": "stickers, chaos labels, bright color", "colors": ["#fdf2f8", "#a78bfa", "#facc15", "#1d3557"], "defaults": {"name": "Chaos Duo", "role": "Bestie Unit", "rarity": "Rare Duo", "skill": "Instant Laugh", "quote": "Two people, one braincell.", "number": "AUTO", "date": "2026", "stats": "friendship 100\nchaos 97\nsnack 92\nloyalty 100"}}, {"id": "couple", "name": "Couple Collector Card", "subtitle": "romantic collector card", "description": "soft pink cream love stats", "colors": ["#fff1f2", "#e11d48", "#fecdd3", "#4a1626"], "defaults": {"name": "Sweet Pair", "role": "Couple Edition", "rarity": "Limited Couple Edition", "skill": "Soft Launch No More", "quote": "You plus me, officially printed.", "number": "AUTO", "date": "2026", "stats": "chemistry 100\nsweetness 98\ntrust 96\ncuteness 99"}}, {"id": "office", "name": "Office Staff Card", "subtitle": "funny employee card", "description": "navy grey cream office badge", "colors": ["#f8fafc", "#1d3557", "#94a3b8", "#0f172a"], "defaults": {"name": "Office Icon", "role": "Mood Booster Department", "rarity": "Official Staff", "skill": "Survives Meetings", "quote": "Busy but still iconic.", "number": "AUTO", "date": "2026", "stats": "focus 88\ncoffee 99\nrevisi 95\nstamina 90"}}, {"id": "school", "name": "School Club Card", "subtitle": "club member card", "description": "campus badge and achievement", "colors": ["#eff6ff", "#1d4ed8", "#fde68a", "#0f172a"], "defaults": {"name": "Club Legend", "role": "School Club", "rarity": "A+ Member", "skill": "Last-Minute Genius", "quote": "Homework later, memories now.", "number": "AUTO", "date": "2026", "stats": "brain 92\nstyle 89\nfriendship 98\nenergy 94"}}, {"id": "luxury", "name": "Luxury Black Card", "subtitle": "premium membership card", "description": "black gold minimal", "colors": ["#050505", "#d6b56d", "#111827", "#fff7d6"], "defaults": {"name": "Luxury Edit", "role": "Black Card Member", "rarity": "VIP", "skill": "Expensive Aura", "quote": "Quiet luxury, loud presence.", "number": "AUTO", "date": "2026", "stats": "aura 100\nstyle 98\ncalm 92\npower 96"}}, {"id": "arcade", "name": "Retro Arcade Card", "subtitle": "90s arcade score card", "description": "pixel neon score and press start", "colors": ["#12002f", "#22d3ee", "#f97316", "#f0abfc"], "defaults": {"name": "Player One", "role": "Arcade Hero", "rarity": "Player One", "skill": "Combo Smile", "quote": "Press start to slay.", "number": "AUTO", "date": "2026", "stats": "score 99\ncombo 94\nluck 91\nenergy 96"}}, {"id": "tarot", "name": "Magical Tarot Card", "subtitle": "fantasy tarot collectible", "description": "moon star celestial gold", "colors": ["#111827", "#8b5cf6", "#d6b56d", "#e0e7ff"], "defaults": {"name": "The Star", "role": "Tarot Edition", "rarity": "Mystic Rare", "skill": "Dream Energy", "quote": "Written in the stars.", "number": "AUTO", "date": "2026", "stats": "magic 98\nintuition 95\nluck 90\naura 99"}}, {"id": "foodie", "name": "Foodie Loyalty Card", "subtitle": "cute cafe loyalty card", "description": "cream brown stamp points", "colors": ["#fff7ed", "#9a6b4f", "#f9a8d4", "#3f2a1d"], "defaults": {"name": "Snack Hunter", "role": "Cafe Member", "rarity": "Loyal Customer", "skill": "Always Orders More", "quote": "One more bite, one more memory.", "number": "AUTO", "date": "2026", "stats": "snack 100\ncoffee 92\njoy 96\nloyalty 98"}}, {"id": "meme", "name": "Meme Edition Card", "subtitle": "super playful meme card", "description": "warning badge chaos meter", "colors": ["#fef3c7", "#ef4444", "#111827", "#22c55e"], "defaults": {"name": "Too Iconic", "role": "Meme Unit", "rarity": "Too Iconic", "skill": "Creates Drama Accidentally", "quote": "No thoughts, just vibes.", "number": "AUTO", "date": "2026", "stats": "chaos 100\ndrama 98\nluck 75\nvibes 100"}}]}, "icon-portrait": {"title": "Icon Portrait Photobooth", "emoji": "👑", "shortTitle": "Icon Portrait", "path": "/icon-portrait", "subtitle": "Portrait karakter ikonik, premium, editorial, fantasy, dan collectible.", "filePrefix": "icon-portrait", "fields": [{"key": "title", "label": "Nama / Title", "max": 46}, {"key": "subtitle", "label": "Subtitle Pendek", "max": 46}, {"key": "motto", "label": "Quote / Motto", "max": 120, "long": true}, {"key": "year", "label": "Tahun / Tanggal", "max": 30}, {"key": "label", "label": "Label Karakter", "max": 42}], "filters": ["Portrait Clean", "Soft Dream", "Warm Vintage", "Dramatic Dark", "Creamy Film", "Glow Premium", "Classic Painting", "Editorial Contrast", "Pop Art Bright", "Golden Soft"], "themes": [{"id": "royal", "name": "Royal Classic", "subtitle": "gold frame palace portrait", "colors": ["#fff7ed", "#b7791f", "#5b3417", "#fffaf0"], "defaults": {"title": "Queen of Everything", "subtitle": "Portrait Edition", "motto": "Grace with a little chaos.", "year": "2026", "label": "The Icon"}}, {"id": "princess", "name": "Princess Soft", "subtitle": "pearl ribbon dreamy", "colors": ["#fff0f6", "#f9a8d4", "#c084fc", "#4c1d95"], "defaults": {"title": "Princess of My World", "subtitle": "Soft Portrait", "motto": "Soft, sweet, and secretly powerful.", "year": "2026", "label": "The Muse"}}, {"id": "darkroyal", "name": "Dark Royalty", "subtitle": "emerald gold dramatic", "colors": ["#06140f", "#d6b56d", "#047857", "#f8fafc"], "defaults": {"title": "Born to Rule", "subtitle": "Dark Royalty", "motto": "Calm face, powerful aura.", "year": "2026", "label": "The Legend"}}, {"id": "oldmoney", "name": "Old Money Portrait", "subtitle": "beige luxury classic", "colors": ["#f7efe7", "#9a6b4f", "#4a2d20", "#fffaf0"], "defaults": {"title": "Timeless Icon", "subtitle": "Old Money Edition", "motto": "Class never asks for attention.", "year": "2026", "label": "The Golden Soul"}}, {"id": "painting", "name": "Vintage Painting", "subtitle": "museum canvas frame", "colors": ["#e6d4b8", "#7c4a24", "#2d2118", "#fff8ed"], "defaults": {"title": "A Portrait to Remember", "subtitle": "Museum Print", "motto": "Made of memories and soft light.", "year": "2026", "label": "The Muse"}}, {"id": "fairy", "name": "Fairy Garden", "subtitle": "floral soft green glow", "colors": ["#ecfdf5", "#86efac", "#7c3aed", "#064e3b"], "defaults": {"title": "The Dream Bloom", "subtitle": "Garden Portrait", "motto": "Magic looks good on you.", "year": "2026", "label": "The Dreamer"}}, {"id": "celestial", "name": "Celestial Muse", "subtitle": "moon star galaxy", "colors": ["#0f172a", "#a78bfa", "#e5e7eb", "#f8fafc"], "defaults": {"title": "Written in the Stars", "subtitle": "Celestial Muse", "motto": "A little moonlight, a lot of magic.", "year": "2026", "label": "The Star"}}, {"id": "popart", "name": "Pop Art Icon", "subtitle": "comic halftone bright", "colors": ["#fef3c7", "#ef4444", "#2563eb", "#111827"], "defaults": {"title": "Pop Icon", "subtitle": "Bold Portrait", "motto": "Too loud to be ordinary.", "year": "2026", "label": "The Main Character"}}, {"id": "y2k", "name": "Y2K Diva", "subtitle": "chrome butterfly glossy", "colors": ["#e0f2fe", "#ec4899", "#22d3ee", "#312e81"], "defaults": {"title": "Digital Diva", "subtitle": "Y2K Portrait", "motto": "Loading beauty... 100%.", "year": "2026", "label": "The Star"}}, {"id": "editorial", "name": "Editorial Cover Portrait", "subtitle": "minimal fashion editorial", "colors": ["#ffffff", "#111827", "#e5e7eb", "#dc2626"], "defaults": {"title": "The New Icon", "subtitle": "Editorial Portrait", "motto": "Effortless, but make it unforgettable.", "year": "2026", "label": "The Icon"}}, {"id": "nusantara", "name": "Nusantara Icon", "subtitle": "batik modern gold", "colors": ["#fff7ed", "#b45309", "#d6b56d", "#431407"], "defaults": {"title": "Pesona Nusantara", "subtitle": "Modern Heritage", "motto": "Hangat, anggun, dan berkarakter.", "year": "2026", "label": "Nusantara Icon"}}, {"id": "warrior", "name": "Fantasy Warrior", "subtitle": "hero emblem fantasy", "colors": ["#111827", "#ef4444", "#f59e0b", "#f8fafc"], "defaults": {"title": "The Brave One", "subtitle": "Fantasy Warrior", "motto": "Built for quests, born for legends.", "year": "2026", "label": "The Legend"}}, {"id": "angel", "name": "Angel Core", "subtitle": "white cloud feather glow", "colors": ["#f8fafc", "#facc15", "#e0e7ff", "#1e293b"], "defaults": {"title": "Soft Angel Energy", "subtitle": "Cloud Portrait", "motto": "Gentle, glowing, unforgettable.", "year": "2026", "label": "The Dreamer"}}, {"id": "academia", "name": "Dark Academia", "subtitle": "book texture antique", "colors": ["#2f241c", "#c7a16a", "#f3e8d1", "#111827"], "defaults": {"title": "The Quiet Genius", "subtitle": "Dark Academia", "motto": "Romanticizing life, one page at a time.", "year": "2026", "label": "The Muse"}}, {"id": "birthday", "name": "Birthday Icon", "subtitle": "confetti crown party", "colors": ["#fff1f2", "#ec4899", "#facc15", "#4c1d95"], "defaults": {"title": "Birthday Star", "subtitle": "Party Portrait", "motto": "Another year, another iconic era.", "year": "2026", "label": "The Birthday Star"}}]}, "certificate": {
      title: "Certificate Photobooth",
      emoji: "📜",
      guide: "Pilih template sertifikat, ambil atau upload foto, lalu isi nama saja.",
      filePrefix: "certificate-bestie",
      filters: ["Portrait Clean", "Soft Dream", "Warm Vintage", "Creamy Film", "Classic Painting", "Warm Film", "Pastel Glow", "Elegant Dark", "Soft Glow", "Golden Soft"],
      fields: [
        { key: "name", label: "Nama", max: 32 }
      ],
      themes: [
        {
          id: "besties-ribbon",
          name: "Besties Ribbon",
          subtitle: "pink lilac cute",
          colors: ["#FBF4E8", "#C49AD8", "#F6B6C7", "#5C486F"],
          banner: "CERTIFICATE OF BESTIES",
          message: "for being my partner in laughs, adventures, and unforgettable memories.",
          footer: "official photobooth edition",
          defaults: { name: "bestie name" }
        },
        {
          id: "pink-princess-cert",
          name: "Pink Princess",
          subtitle: "sweet pastel badge",
          colors: ["#FFF7FB", "#D58DB8", "#F6C0D8", "#6B4760"],
          banner: "CERTIFICATE OF CUTENESS",
          message: "for serving main character energy and adorable bestie behavior.",
          footer: "pink club certified",
          defaults: { name: "princess bestie" }
        },
        {
          id: "lavender-dream",
          name: "Lavender Dream",
          subtitle: "soft dreamy hearts",
          colors: ["#FAF7FF", "#A58BE3", "#E7D8FF", "#5A4B84"],
          banner: "CERTIFICATE OF MEMORIES",
          message: "for turning ordinary days into soft, sparkly, unforgettable moments.",
          footer: "dreamy photobooth edition",
          defaults: { name: "dream bestie" }
        },
        {
          id: "botanical-grace",
          name: "Botanical Grace",
          subtitle: "sage floral charm",
          colors: ["#FAF7F0", "#95A67A", "#D9E3C7", "#4F5D3F"],
          banner: "CERTIFICATE OF FRIENDSHIP",
          message: "for blooming through every season with kindness, calm, and love.",
          footer: "garden memories edition",
          defaults: { name: "lovely friend" }
        },
        {
          id: "vintage-classic",
          name: "Vintage Classic",
          subtitle: "classic elegant cream",
          colors: ["#F8F1E7", "#B28A57", "#E4D1BA", "#5B4730"],
          banner: "CERTIFICATE OF APPRECIATION",
          message: "for timeless loyalty, warm laughter, and truly iconic bestie moments.",
          footer: "heritage photobooth edition",
          defaults: { name: "dear bestie" }
        },
        {
          id: "playful-party",
          name: "Playful Party",
          subtitle: "confetti fun",
          colors: ["#FFF8F1", "#FF8AA5", "#FFD166", "#5A3E72"],
          banner: "CERTIFICATE OF CHAOS",
          message: "for always bringing the fun, the giggles, and the cutest chaos.",
          footer: "party mode edition",
          defaults: { name: "chaos coordinator" }
        }
      ]
    }, "game-character": {"title": "Game Character Photobooth", "emoji": "🎮", "shortTitle": "Game Character", "path": "/game-character", "subtitle": "Profil karakter game 4R dengan class, level, element, skill, ultimate, badge, dan stats.", "filePrefix": "game-character", "fields": [{"key": "name", "label": "Character Name", "max": 42}, {"key": "class", "label": "Class", "max": 38}, {"key": "level", "label": "Level", "max": 22}, {"key": "element", "label": "Element", "max": 24}, {"key": "skill", "label": "Skill Utama", "max": 54}, {"key": "ultimate", "label": "Ultimate Skill", "max": 58}, {"key": "quote", "label": "Quote Pendek", "max": 120, "long": true}, {"key": "achievement", "label": "Achievement / Badge", "max": 48}, {"key": "stats", "label": "Stats: satu baris satu stat, contoh HP 95", "max": 180, "long": true}], "filters": ["Game Clean", "Anime Soft", "Pixel Warm", "Cyber Neon", "Fantasy Glow", "Dark Contrast", "Pastel RPG", "Boss Mode", "Cozy Soft", "Horror Night"], "themes": [{"id": "rpg", "name": "RPG Hero Profile", "subtitle": "classic RPG hero UI", "colors": ["#ecfeff", "#2563eb", "#facc15", "#0f172a"], "defaults": {"name": "Player One", "class": "Hero", "level": "LV.99", "element": "Spark", "skill": "Brave Smile", "ultimate": "Main Character Strike", "quote": "Quest accepted. Drama optional.", "achievement": "Certified Icon", "stats": "HP 95\nMP 88\nCHARM 99\nLUCK 91\nCHAOS 87\nENERGY 93"}}, {"id": "pixel", "name": "Pixel Adventure", "subtitle": "8-bit border press start", "colors": ["#111827", "#22d3ee", "#f97316", "#fef3c7"], "defaults": {"name": "Pixel Player", "class": "Pixel Player", "level": "LV.88", "element": "Star", "skill": "Coin Collector", "ultimate": "Pixel Blast", "quote": "Press start to begin.", "achievement": "High Score", "stats": "HP 90\nCOIN 99\nLUCK 88\nENERGY 92"}}, {"id": "cyber", "name": "Cyber Player ID", "subtitle": "neon futuristic HUD", "colors": ["#020617", "#22d3ee", "#a78bfa", "#e0f2fe"], "defaults": {"name": "Cyber Agent", "class": "Cyber Agent", "level": "LV.77", "element": "Spark", "skill": "Neon Dash", "ultimate": "System Override", "quote": "Access granted.", "achievement": "Verified Player", "stats": "HP 88\nSPEED 99\nTECH 96\nAURA 91"}}, {"id": "magic", "name": "Magical Academy", "subtitle": "purple wand spellbook", "colors": ["#f5f3ff", "#8b5cf6", "#facc15", "#312e81"], "defaults": {"name": "Spell Caster", "class": "Spell Caster", "level": "LV.64", "element": "Moon", "skill": "Sparkle Spell", "ultimate": "Midnight Magic", "quote": "Magic is homework too.", "achievement": "Honor Student", "stats": "HP 86\nMP 99\nSPELL 96\nLUCK 90"}}, {"id": "boss", "name": "Boss Battle Card", "subtitle": "final boss dark red", "colors": ["#111827", "#dc2626", "#d6b56d", "#f8fafc"], "defaults": {"name": "Final Boss", "class": "Final Boss", "level": "LV.100", "element": "Shadow", "skill": "Intimidating Aura", "ultimate": "No Mercy Mode", "quote": "You have entered boss territory.", "achievement": "Boss Mode", "stats": "HP 100\nPOWER 99\nAURA 100\nCHAOS 95"}}, {"id": "cozy", "name": "Cozy Farming Game", "subtitle": "green daily quest", "colors": ["#ecfdf5", "#22c55e", "#fde68a", "#14532d"], "defaults": {"name": "Cozy Farmer", "class": "Cozy Farmer", "level": "LV.45", "element": "Flower", "skill": "Plant Happiness", "ultimate": "Harvest Joy", "quote": "Water 5 flowers.", "achievement": "Daily Quest Done", "stats": "HP 92\nCOZY 100\nLUCK 88\nJOY 96"}}, {"id": "idol", "name": "Idol Rhythm Game", "subtitle": "stage combo sparkle", "colors": ["#fdf2f8", "#ec4899", "#22d3ee", "#4c1d95"], "defaults": {"name": "Stage Idol", "class": "Stage Idol", "level": "LV.99", "element": "Star", "skill": "Perfect Combo", "ultimate": "Encore Shine", "quote": "Encore? Always.", "achievement": "Full Combo", "stats": "HP 90\nCHARM 100\nCOMBO 99\nENERGY 94"}}, {"id": "dating", "name": "Dating Sim Character", "subtitle": "romance affection UI", "colors": ["#fff1f2", "#fb7185", "#fecdd3", "#4a1626"], "defaults": {"name": "Love Interest", "class": "Love Interest", "level": "AFF.100", "element": "Heart", "skill": "Makes Heart Flutter", "ultimate": "Soft Smile Event", "quote": "Your affection level increased.", "achievement": "Route Unlocked", "stats": "AFFECTION 100\nCHARM 98\nLUCK 91\nSWEET 99"}}, {"id": "horror", "name": "Horror Survival Character", "subtitle": "spooky warning sign", "colors": ["#0a0a0a", "#ef4444", "#9ca3af", "#f8fafc"], "defaults": {"name": "Survivor", "class": "Survivor", "level": "LV.13", "element": "Shadow", "skill": "Runs Fast", "ultimate": "Flashlight Panic", "quote": "Survival rate: questionable.", "achievement": "Still Alive", "stats": "HP 87\nSPEED 94\nBRAVE 76\nPANIC 99"}}, {"id": "racing", "name": "Racing Player Card", "subtitle": "speed line race number", "colors": ["#f8fafc", "#ef4444", "#111827", "#facc15"], "defaults": {"name": "Speed Racer", "class": "Speed Racer", "level": "NO.01", "element": "Fire", "skill": "Turbo Smile", "ultimate": "Finish Line Flex", "quote": "Fast lane, good vibes.", "achievement": "Pole Position", "stats": "SPEED 100\nFOCUS 90\nPOWER 92\nSTYLE 96"}}, {"id": "party", "name": "Fantasy Party Mode", "subtitle": "group party profile", "colors": ["#f5f3ff", "#7c3aed", "#d6b56d", "#1e1b4b"], "defaults": {"name": "Chaos Squad", "class": "Party Mode", "level": "RANK S+", "element": "Chaos", "skill": "Shared Braincell", "ultimate": "Group Quest Complete", "quote": "Party formed successfully.", "achievement": "Party Leader", "stats": "TEAM 100\nCHAOS 96\nLOYALTY 99\nLUCK 88"}}, {"id": "hero", "name": "Superhero Profile", "subtitle": "comic action profile", "colors": ["#dbeafe", "#2563eb", "#ef4444", "#111827"], "defaults": {"name": "Superhero", "class": "Superhero", "level": "LV.99", "element": "Light", "skill": "Saves The Day", "ultimate": "Hero Entrance", "quote": "Cape optional, confidence required.", "achievement": "City Favorite", "stats": "POWER 96\nSPEED 92\nBRAVE 100\nCHARM 94"}}, {"id": "cafe", "name": "Cafe Quest Character", "subtitle": "coffee quest casual", "colors": ["#fff7ed", "#9a6b4f", "#f9a8d4", "#3f2a1d"], "defaults": {"name": "Cafe Wanderer", "class": "Cafe Wanderer", "level": "LV.32", "element": "Coffee", "skill": "Overthinking Latte", "ultimate": "Perfect Drink Found", "quote": "Quest: find the perfect drink.", "achievement": "Cafe Regular", "stats": "COFFEE 99\nCOZY 94\nLUCK 89\nVIBES 97"}}, {"id": "guild", "name": "Anime Guild Card", "subtitle": "guild rank quest", "colors": ["#eff6ff", "#1d4ed8", "#a78bfa", "#0f172a"], "defaults": {"name": "Guild Member", "class": "Guild Member", "level": "RANK A+", "element": "Wind", "skill": "Quest Partner", "ultimate": "Guild Sync", "quote": "Quest accepted together.", "achievement": "Trusted Ally", "stats": "QUEST 96\nTEAM 98\nCHARM 92\nLUCK 90"}}, {"id": "villain", "name": "Villain Mode", "subtitle": "dark dramatic purple", "colors": ["#1e102f", "#a21caf", "#ef4444", "#f8fafc"], "defaults": {"name": "The Villain", "class": "Villain", "level": "LV.99", "element": "Shadow", "skill": "Side Eye Attack", "ultimate": "Dramatic Exit", "quote": "Not evil, just well styled.", "achievement": "Plot Twist", "stats": "AURA 100\nDRAMA 96\nPOWER 94\nSTYLE 99"}}]}};



  CONFIGS["detective-case"] = {
    title: "Detective Case File",
    emoji: "🕵️",
    shortTitle: "Detective Case",
    path: "/detective-case",
    subtitle: "foto jadi berkas investigasi lucu siap cetak 4R",
    filePrefix: "detective-case",
    fields: [
      { key: "name", label: "Nama / Subject", max: 42 },
      { key: "number", label: "Nomor Kasus", max: 32 },
      { key: "headline", label: "Judul Kasus", max: 64 },
      { key: "status", label: "Status", max: 48 },
      { key: "stamp", label: "Stamp", max: 28 },
      { key: "evidence", label: "Evidence: satu baris satu poin", max: 220, long: true },
      { key: "warning", label: "Warning / Footer", max: 80 }
    ],
    filters: ["Clean Document", "Portrait Clean", "Warm Paper", "Soft Pink", "Pastel Glow", "Vintage Cream", "Office Clean", "Glow Premium", "Editorial Contrast", "Elegant Dark"],
    themes: [
      { id: "case-file", name: "Case File", emoji: "🕵️", style: "case", colors: ["#f7ecd9", "#8c5a2b", "#24160f", "#7a5231", "#c53929"], defaults: { name: "Main Character", number: "DET-001", headline: "TOO ICONIC", status: "UNDER INVESTIGATION", stamp: "CONFIDENTIAL", evidence: "caught stealing the spotlight\nsuspiciously photogenic\nmain character energy", warning: "warning: extremely iconic" } },
      { id: "top-secret", name: "Top Secret Dossier", emoji: "🔒", style: "secret", colors: ["#ecf0f4", "#334155", "#0f172a", "#64748b", "#dc2626"], defaults: { name: "Subject 009", number: "TS-009", headline: "TOO GLAM TO HIDE", status: "CLASSIFIED ACCESS ONLY", stamp: "TOP SECRET", evidence: "appears photogenic in every frame\nidentity protected by slay level\npublic exposure not recommended", warning: "classified level: slay" } },
      { id: "cute-suspect", name: "Cute Suspect", emoji: "🎀", style: "cute", colors: ["#fff1f7", "#f472b6", "#4a1d3d", "#fbcfe8", "#db2777"], defaults: { name: "Baby Face", number: "CUT-021", headline: "CAUGHT BEING ADORABLE", status: "TOO CUTE TO DENY", stamp: "SUSPECT", evidence: "cuteness level above legal limit\nsmiles without warning\ncauses instant gemas reaction", warning: "handle with extra blush" } },
      { id: "main-character", name: "Main Character", emoji: "🎬", style: "editorial", colors: ["#f7f2e8", "#b38b4d", "#1f2937", "#eadfc6", "#8b5e34"], defaults: { name: "Lead Energy", number: "MC-777", headline: "MAIN CHARACTER DETECTED", status: "SCENE STEALER CONFIRMED", stamp: "SPOTLIGHT", evidence: "walks like background music is playing\nrefuses to be a side character\ncamera naturally finds this face", warning: "status: impossible to ignore" } },
      { id: "celeb-scandal", name: "Celebrity Scandal", emoji: "📰", style: "scandal", colors: ["#f8efe5", "#b45309", "#25160c", "#a16207", "#dc2626"], defaults: { name: "Public Figure", number: "TAB-404", headline: "SPOTTED SERVING LOOKS AGAIN", status: "NO DENIAL POSSIBLE", stamp: "EXCLUSIVE", evidence: "caught looking expensive in public\ntabloid interest increasing rapidly\nmedia unable to move on", warning: "breaking news: still iconic" } },
      { id: "school-file", name: "School File", emoji: "🎓", style: "school", colors: ["#fffdf5", "#2563eb", "#0f172a", "#fde68a", "#dc2626"], defaults: { name: "Star Student", number: "SCH-113", headline: "DISCIPLINARY REPORT", status: "TOO MUCH CHARISMA IN CLASS", stamp: "REPORTED", evidence: "causes distraction by being photogenic\nsmiles during serious announcements\nhas suspicious levels of charm", warning: "offense: stealing attention" } },
      { id: "office-report", name: "Office Report", emoji: "💼", style: "office", colors: ["#f8fafc", "#1d4ed8", "#0f172a", "#cbd5e1", "#2563eb"], defaults: { name: "Office Icon", number: "HR-2026", headline: "INCIDENT REPORT", status: "BOOSTING OFFICE MORALE", stamp: "APPROVED", evidence: "arrives and raises the vibe instantly\nemail tone always somehow iconic\nmeeting survival rate extremely high", warning: "hr note: keep being fabulous" } },
      { id: "love-crime", name: "Love Crime", emoji: "💘", style: "love", colors: ["#fff1f2", "#e11d48", "#4a1626", "#fecdd3", "#fb7185"], defaults: { name: "Heart Thief", number: "LUV-143", headline: "CHARGED WITH STEALING HEARTS", status: "DANGEROUSLY LOVABLE", stamp: "HEART ALERT", evidence: "causes unexpected butterflies\nsmile linked to rapid heartbeat\nromantic threat level elevated", warning: "crime: making everyone soft" } },
      { id: "bestie-board", name: "Bestie Board", emoji: "👯", style: "bestie", colors: ["#faf5ff", "#8b5cf6", "#312e81", "#ddd6fe", "#ec4899"], defaults: { name: "Chaos Bestie", number: "BST-222", headline: "BESTIE CASE REPORT", status: "CHAOS LEVEL: FRIENDLY", stamp: "BESTIE ONLY", evidence: "laughs at the worst possible time\nknows too much gossip\nstill somehow the favorite person", warning: "warning: contagious chaos" } },
      { id: "royal-record", name: "Royal Record", emoji: "👑", style: "royal", colors: ["#fff7e6", "#d4a63f", "#24180a", "#6b3f14", "#b45309"], defaults: { name: "Royal Icon", number: "ROY-001", headline: "ROYAL CASE RECORD", status: "CONFIRMED AS ICON", stamp: "SEALED", evidence: "presence immediately upgrades the room\naura registered as premium\nrespectfully too majestic", warning: "crown recommended at all times" } }
    ]
  };

  const FILTER_MAP = {
    "original": "none",
    "Normal": "none",
    "Clean Glossy": "brightness(1.04) contrast(1.05) saturate(1.08)",
    "Soft Glow": "brightness(1.08) contrast(.96) saturate(1.06)",
    "Warm Film": "sepia(.20) brightness(1.04) contrast(.98) saturate(.96)",
    "Cool Studio": "brightness(1.02) contrast(1.08) saturate(.98) hue-rotate(188deg)",
    "High Contrast": "contrast(1.28) saturate(1.05)",
    "Pastel Shine": "brightness(1.10) contrast(.9) saturate(1.18)",
    "Holographic": "brightness(1.08) contrast(1.08) saturate(1.35) hue-rotate(18deg)",
    "Black Gold": "contrast(1.14) saturate(.88) brightness(.96)",
    "Retro Arcade": "contrast(1.15) saturate(1.35)",
    "Neon Pop": "contrast(1.2) saturate(1.45)",
    "Portrait Clean": "brightness(1.04) contrast(1.02) saturate(1.03)",
    "Soft Dream": "brightness(1.10) contrast(.92) saturate(1.08)",
    "Warm Vintage": "sepia(.26) contrast(.96) brightness(1.03)",
    "Dramatic Dark": "brightness(.92) contrast(1.22) saturate(.95)",
    "Creamy Film": "sepia(.12) brightness(1.08) contrast(.94)",
    "Glow Premium": "brightness(1.08) contrast(1.04) saturate(1.08)",
    "Classic Painting": "sepia(.35) contrast(.95) saturate(.82)",
    "Editorial Contrast": "contrast(1.25) saturate(.95)",
    "Pop Art Bright": "brightness(1.06) contrast(1.18) saturate(1.35)",
    "Golden Soft": "sepia(.16) brightness(1.08) saturate(1.05)",
    "Clean Document": "brightness(1.03) contrast(1.02)",
    "Warm Paper": "sepia(.18) brightness(1.04) contrast(.98)",
    "Soft Pink": "brightness(1.08) contrast(.96) saturate(1.12) hue-rotate(340deg)",
    "Pastel Glow": "brightness(1.12) contrast(.9) saturate(1.16)",
    "Vintage Cream": "sepia(.30) brightness(1.03) contrast(.94)",
    "Elegant Dark": "brightness(.92) contrast(1.18) saturate(.9)",
    "Bright Cute": "brightness(1.15) contrast(1.02) saturate(1.16)",
    "Gold Premium": "sepia(.12) brightness(1.05) contrast(1.06)",
    "Office Clean": "brightness(1.02) contrast(1.05) saturate(.95)",
    "Confetti Pop": "brightness(1.08) contrast(1.1) saturate(1.28)",
    "Game Clean": "brightness(1.03) contrast(1.08) saturate(1.08)",
    "Anime Soft": "brightness(1.10) contrast(.98) saturate(1.18)",
    "Pixel Warm": "sepia(.18) contrast(1.08) saturate(1.05)",
    "Cyber Neon": "contrast(1.25) saturate(1.45) brightness(.98)",
    "Fantasy Glow": "brightness(1.08) contrast(1.04) saturate(1.18)",
    "Dark Contrast": "brightness(.90) contrast(1.28) saturate(.95)",
    "Pastel RPG": "brightness(1.12) contrast(.92) saturate(1.20)",
    "Boss Mode": "brightness(.88) contrast(1.34) saturate(.95)",
    "Cozy Soft": "brightness(1.09) contrast(.96) saturate(1.05)",
    "Horror Night": "brightness(.82) contrast(1.22) saturate(.72)"
  };

  function getConfig(menu) { return CONFIGS[menu]; }
  function getTheme(menu, id) {
    const cfg = getConfig(menu);
    return cfg.themes.find(t => t.id === id) || cfg.themes[0];
  }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function randomCode(len=6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, n => chars[n % chars.length]).join('');
  }
  function autoDefaults(menu, theme) {
    const d = clone(theme.defaults || {});
    if (d.number === 'AUTO') d.number = `${theme.id.toUpperCase().slice(0,3)}-${randomCode(6)}`;
    if (d.date === '2026') d.date = String(new Date().getFullYear());
    if (d.year === '2026') d.year = String(new Date().getFullYear());
    if (d.date === 'Today') d.date = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
    return d;
  }
  function createState(menu, canvas, ctx) {
    const cfg = getConfig(menu);
    const theme = cfg.themes[0];
    return {
      menu, canvas, ctx,
      themeId: theme.id,
      iconFrameId: menu === 'icon-portrait' ? ICON_FRAME_CONFIGS[0].id : null,
      iconFrameImg: null,
      certificateFrameId: menu === 'certificate' ? CERTIFICATE_FRAME_CONFIGS[0].id : null,
      certificateFrameImg: null,
      filter: cfg.filters[0],
      photo: null,
      photoImg: null,
      zoom: 1,
      rotate: 0,
      photoX: 0,
      photoY: 0,
      edited: {},
      text: autoDefaults(menu, theme)
    };
  }
  function setTheme(state, id) {
    const oldTheme = getTheme(state.menu, state.themeId);
    const oldDefaults = autoDefaults(state.menu, oldTheme);
    const nextTheme = getTheme(state.menu, id);
    const nextDefaults = autoDefaults(state.menu, nextTheme);
    state.themeId = id;
    Object.entries(nextDefaults).forEach(([key, value]) => {
      if (!state.edited[key] || state.text[key] === oldDefaults[key]) {
        state.text[key] = value;
        state.edited[key] = false;
      }
    });
  }

  function roundRect(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }
  function fitFont(ctx, text, maxW, start, min, weight='900', family='Segoe UI, system-ui, sans-serif') {
    let s = start;
    while (s > min) {
      ctx.font = `${weight} ${s}px ${family}`;
      if (ctx.measureText(String(text || '')).width <= maxW) break;
      s -= 2;
    }
    ctx.font = `${weight} ${s}px ${family}`;
    return s;
  }
  function wrapLines(ctx, text, maxW, maxLines=3) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else line = test;
    });
    if (line) lines.push(line);
    const out = lines.slice(0, maxLines);
    if (lines.length > maxLines && out.length) {
      let last = out[out.length-1];
      while (last.length > 3 && ctx.measureText(last + '…').width > maxW) last = last.slice(0,-1);
      out[out.length-1] = last + '…';
    }
    return out;
  }
  function drawWrapped(ctx, text, x, y, maxW, lineH, maxLines=3, align='left') {
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    const lines = wrapLines(ctx, text, maxW, maxLines);
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineH));
    return y + lines.length * lineH;
  }
  function drawCoverImage(ctx, img, x, y, w, h, state) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(w / iw, h / ih) * (state.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.save();
    ctx.translate(x + w/2 + (state.photoX || 0), y + h/2 + (state.photoY || 0));
    ctx.rotate((state.rotate || 0) * Math.PI / 180);
    ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
    ctx.restore();
  }
  function drawPhoto(ctx, state, x, y, w, h, r=28) {
    const baseFilter = FILTER_MAP[state.filter] || 'none';
    const beautyFilter = (typeof Beautify !== 'undefined' && state.beautify && state.beautify !== 'off') ? Beautify.css(state.beautify) : 'none';
    const filter = [baseFilter, beautyFilter].filter(v => v && v !== 'none').join(' ') || 'none';
    ctx.save();
    roundRect(ctx,x,y,w,h,r); ctx.clip();
    if (state.photoImg) {
      if (typeof Beautify !== 'undefined' && state.beautify && state.beautify !== 'off') {
        ctx.filter = baseFilter;
        Beautify.drawCover(ctx, state.photoImg, x, y, w, h, {
          beautify: state.beautify,
          zoom: state.zoom,
          offsetX: state.photoX,
          offsetY: state.photoY,
          rotate: state.rotate
        });
        ctx.filter = 'none';
      } else {
        ctx.filter = filter;
        drawCoverImage(ctx, state.photoImg, x,y,w,h,state);
        ctx.filter = 'none';
      }
    } else {
      const th = getTheme(state.menu, state.themeId);
      const c = th.colors;
      const g = ctx.createLinearGradient(x,y,x+w,y+h);
      g.addColorStop(0,c[0]); g.addColorStop(1,c[2] || c[1]);
      ctx.fillStyle = g; ctx.fillRect(x,y,w,h);
      ctx.fillStyle = 'rgba(255,255,255,.86)';
      ctx.font = `${Math.min(w,h)*0.18}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📷', x+w/2, y+h/2-28);
      ctx.font = `900 ${Math.max(22, Math.min(w,h)*0.055)}px Segoe UI, sans-serif`;
      ctx.fillText('upload / ambil foto', x+w/2, y+h/2+50);
    }
    ctx.restore();
  }
  function bg(ctx, colors) {
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0, colors[0] || '#fff');
    g.addColorStop(.55, colors[2] || colors[0] || '#fff');
    g.addColorStop(1, colors[1] || '#eee');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.globalAlpha = .18;
    ctx.fillStyle = colors[1] || '#ddd';
    [[120,180,160],[1020,230,180],[1000,1540,220],[120,1500,120]].forEach(([x,y,r]) => {
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }
  function deco(ctx, theme, intensity=.9) {
    const c = theme.colors;
    ctx.save();
    ctx.fillStyle = c[1]; ctx.strokeStyle = c[1]; ctx.globalAlpha = intensity;
    ctx.font = '900 48px Segoe UI Emoji, Apple Color Emoji, sans-serif';
    const map = {
      idol:['♡','✦','✧'], bestie:['★','☺','♡'], couple:['♡','♥','✦'], arcade:['◆','●','▲'], tarot:['☾','✦','★'], y2k:['✦','♡','✧'], birthday:['★','✦','♡'], fairy:['✿','♡','✦'], celestial:['☾','✦','★'], cyber:['▣','◇','✦'], pixel:['■','◆','●'], horror:['⚠','✕','!']
    };
    const arr = map[theme.id] || ['✦','•','♡'];
    [[78,110],[1030,110],[1045,1640],[95,1645],[995,920],[105,890]].forEach(([x,y],i) => {
      ctx.fillText(arr[i % arr.length], x, y);
    });
    ctx.restore();
  }
  function statLines(str) {
    return String(str || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => {
      const m = s.match(/^(.+?)\s+(\d{1,3})$/);
      return m ? {name:m[1].toUpperCase(), value:Math.min(100, parseInt(m[2]))} : {name:s.toUpperCase(), value:85};
    });
  }
  function statBar(ctx, label, value, x, y, w, color, dark=false) {
    ctx.fillStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(15,23,42,.10)';
    roundRect(ctx,x,y,w,18,9); ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx,x,y,w*(value/100),18,9); ctx.fill();
    ctx.fillStyle = dark ? '#fff' : '#111827';
    ctx.font = '850 21px Segoe UI, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, y-5);
    ctx.textAlign = 'right';
    ctx.fillText(value, x+w, y-5);
  }
  function barcode(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    let cur = x;
    const p=[3,1,1,2,4,1,2,2,1,3,1,1,5,2,1,4,2,1,3,3,1,2,5,1];
    p.forEach((bw,i)=>{ const ww=bw*w/58; if(i%2===0) ctx.fillRect(cur,y,ww,h); cur+=ww; });
  }

  function drawTrading(state, theme) {
    const ctx = state.ctx, t = state.text, c = theme.colors;
    bg(ctx, c);
    const cardX=70, cardY=55, cardW=W-140, cardH=H-110;
    ctx.save();
    ctx.shadowColor='rgba(15,23,42,.22)'; ctx.shadowBlur=28; ctx.shadowOffsetY=12;
    ctx.fillStyle = c[0]; roundRect(ctx,cardX,cardY,cardW,cardH,52); ctx.fill();
    ctx.restore();
    ctx.strokeStyle=c[1]; ctx.lineWidth=9; roundRect(ctx,cardX,cardY,cardW,cardH,52); ctx.stroke();
    ctx.strokeStyle=c[2] || c[1]; ctx.lineWidth=3; roundRect(ctx,cardX+24,cardY+24,cardW-48,cardH-48,36); ctx.stroke();
    deco(ctx, theme, .55);

    ctx.fillStyle = c[3] || '#111827';
    ctx.textAlign='left'; ctx.textBaseline='top';
    fitFont(ctx, (t.name || '').toUpperCase(), 610, 58, 28, '950');
    ctx.fillText((t.name || '').toUpperCase(), 112, 108);
    ctx.fillStyle = c[1]; roundRect(ctx, 780, 106, 270, 58, 29); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font='950 25px Segoe UI, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText((t.rarity || 'RARE').toUpperCase(), 915, 135);

    drawPhoto(ctx,state,116,205,950,890,38);
    ctx.strokeStyle=c[1]; ctx.lineWidth=6; roundRect(ctx,116,205,950,890,38); ctx.stroke();

    ctx.fillStyle = c[1]; roundRect(ctx,116,1125,950,86,30); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font='950 34px Segoe UI, sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText((t.skill || '').toUpperCase(), 150, 1168);
    ctx.textAlign='right'; ctx.font='900 24px Segoe UI, sans-serif';
    ctx.fillText((t.role || '').toUpperCase(), 1035, 1168);

    const stats = statLines(t.stats).slice(0,5);
    stats.forEach((s,i)=> statBar(ctx, s.name, s.value, 145, 1285 + i*64, 560, c[1]));
    ctx.fillStyle = c[3] || '#111827';
    ctx.font='750 25px Segoe UI, sans-serif'; ctx.textAlign='left';
    drawWrapped(ctx, t.quote, 740, 1285, 300, 33, 4);
    barcode(ctx, 742, 1505, 240, 70, c[3] || '#111827');
    ctx.font='850 24px Segoe UI, sans-serif'; ctx.textAlign='right';
    ctx.fillText(t.number || '', 1040, 1605);
    ctx.textAlign='left'; ctx.fillText(t.date || '', 145, 1605);
  }

  function getProfileDisplayName() {
    const fallback = 'ICON';
    try {
      const p = (typeof Auth !== 'undefined' && Auth.getProfile) ? Auth.getProfile() : null;
      const session = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      const candidates = [
        p?.display_name,
        p?.full_name,
        p?.name,
        p?.username,
        p?.booth_name,
        session?.user?.user_metadata?.display_name,
        session?.user?.user_metadata?.full_name,
        session?.user?.email ? String(session.user.email).split('@')[0] : null,
        localStorage.getItem('sb_user_email') ? String(localStorage.getItem('sb_user_email')).split('@')[0] : null
      ];
      return (candidates.find(v => v && String(v).trim()) || fallback).toString().trim();
    } catch(e) {
      return fallback;
    }
  }

  function drawFullBleedPhoto(ctx, state) {
    if (state.photoImg) {
      const filter = FILTER_MAP[state.filter] || 'none';
      ctx.save();
      ctx.beginPath();
      ctx.rect(0,0,W,H);
      ctx.clip();
      ctx.filter = filter;
      drawCoverImage(ctx, state.photoImg, 0, 0, W, H, state);
      ctx.filter = 'none';
      ctx.restore();
    } else {
      const g = ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0, '#e0f2fe');
      g.addColorStop(.5, '#fce7f3');
      g.addColorStop(1, '#fef3c7');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = 'rgba(255,255,255,.86)';
      ctx.font = '120px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📷', W/2, H/2 - 40);
      ctx.font = '950 42px Segoe UI, sans-serif';
      ctx.fillText('upload / ambil foto', W/2, H/2 + 72);
    }
  }

  function drawFallbackIconFrame(ctx, frame) {
    // Fallback kalau PNG frame belum diupload ke /icon-frame.
    const styles = {
      'royal-classic': ['#d6b56d','#153047','#f8e7bd','royal'],
      'editorial-muse': ['#111111','#c7a16a','#f9f4ec','editorial'],
      'pop-art-icon': ['#111111','#ec4899','#facc15','pop'],
      'princess-soft': ['#f472b6','#c084fc','#fff0f6','soft'],
      'dark-royalty': ['#d6b56d','#0b1110','#047857','royal'],
      'old-money': ['#9a6b4f','#f7efe7','#4a2d20','editorial'],
      'vintage-painting': ['#7c4a24','#e6d4b8','#2d2118','royal'],
      'fairy-garden': ['#22c55e','#ecfdf5','#7c3aed','soft'],
      'celestial-muse': ['#a78bfa','#0f172a','#e5e7eb','royal'],
      'y2k-diva': ['#ec4899','#22d3ee','#f0abfc','pop'],
      'nusantara-icon': ['#b45309','#fff7ed','#d6b56d','royal'],
      'fantasy-warrior': ['#d6b56d','#111827','#ef4444','royal'],
      'angel-core': ['#facc15','#f8fafc','#e0e7ff','soft'],
      'dark-academia': ['#c7a16a','#2f241c','#f3e8d1','editorial'],
      'birthday-icon': ['#ec4899','#facc15','#fff1f2','pop']
    };
    const [a,b,c,mode] = styles[frame.id] || styles['royal-classic'];
    ctx.save();
    if (mode === 'pop') {
      ctx.fillStyle = a;
      ctx.fillRect(0,0,W,84);
      ctx.fillRect(0,H-84,W,84);
      ctx.fillStyle = b;
      ctx.fillRect(0,0,84,H);
      ctx.fillRect(W-84,0,84,H);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
      ctx.strokeRect(90,90,W-180,H-180);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 8;
      ctx.strokeRect(102,102,W-204,H-204);
      ctx.fillStyle = c;
      ['★','✦','⚡','●','◆'].forEach((s,i) => {
        ctx.font = `${i%2 ? 62 : 88}px Segoe UI Emoji, sans-serif`;
        ctx.fillText(s, [40,965,55,980,520][i], [180,250,1395,1510,78][i]);
      });
    } else if (mode === 'editorial') {
      ctx.strokeStyle = a;
      ctx.lineWidth = 2;
      ctx.strokeRect(70,70,W-140,H-140);
      ctx.strokeStyle = c;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(170,65); ctx.lineTo(W-170,65); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(170,H-65); ctx.lineTo(W-170,H-65); ctx.stroke();
      ctx.fillStyle = a;
      ctx.font = '400 68px Georgia, serif';
      ctx.save();
      ctx.translate(72, H-210);
      ctx.rotate(-Math.PI/2);
      ctx.fillText('ICON', 0, 0);
      ctx.restore();
      ctx.fillStyle = b;
      ctx.font = '56px Georgia, serif';
      ctx.fillText('✦', W/2-18, 92);
      ctx.fillText('✦', W/2-18, H-92);
    } else {
      ctx.strokeStyle = a;
      ctx.lineWidth = 16;
      roundRect(ctx,52,52,W-104,H-104,28);
      ctx.stroke();
      ctx.strokeStyle = b;
      ctx.lineWidth = 8;
      roundRect(ctx,86,86,W-172,H-172,18);
      ctx.stroke();
      ctx.fillStyle = a;
      ctx.font = '86px Segoe UI Emoji, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◆', 112, 112);
      ctx.fillText('◆', W-112, 112);
      ctx.fillText('◆', 112, H-112);
      ctx.fillText('◆', W-112, H-112);
      ctx.font = '110px Segoe UI Emoji, serif';
      ctx.fillText('✦', W/2, 95);
      ctx.fillText('✦', W/2, H-95);
    }
    ctx.restore();
  }

  function sampleAverageColor(ctx, x, y, w, h) {
    const sx = Math.max(0, Math.floor(x));
    const sy = Math.max(0, Math.floor(y));
    const sw = Math.min(W - sx, Math.floor(w));
    const sh = Math.min(H - sy, Math.floor(h));
    if (sw <= 0 || sh <= 0) return { r: 255, g: 255, b: 255 };
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, count = 0;
    // skip beberapa pixel biar ringan
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3];
      if (a > 20) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    if (!count) return { r: 255, g: 255, b: 255 };
    return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
  }

  function luminance(rgb) {
    const srgb = [rgb.r, rgb.g, rgb.b].map(v => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function pickProfileTextStyle(ctx, x, y, w, h) {
    const avg = sampleAverageColor(ctx, x, y, w, h);
    const lum = luminance(avg);
    const warm = avg.r > avg.b + 18;
    const cool = avg.b > avg.r + 18;

    if (lum < 0.42) {
      return {
        fill: warm ? '#fff7ed' : '#f8fafc',
        stroke: 'rgba(0,0,0,.62)',
        shadow: 'rgba(0,0,0,.55)',
        bg: 'rgba(255,255,255,.12)'
      };
    }

    if (lum > 0.70) {
      return {
        fill: warm ? '#3b2415' : '#111827',
        stroke: 'rgba(255,255,255,.70)',
        shadow: 'rgba(255,255,255,.55)',
        bg: 'rgba(0,0,0,.08)'
      };
    }

    // mid-tone / colorful area: pilih warna yang paling kontras tapi tetap aesthetic.
    if (cool) {
      return { fill:'#fff7ed', stroke:'rgba(15,23,42,.55)', shadow:'rgba(0,0,0,.45)', bg:'rgba(0,0,0,.16)' };
    }
    return { fill:'#111827', stroke:'rgba(255,255,255,.62)', shadow:'rgba(255,255,255,.45)', bg:'rgba(255,255,255,.18)' };
  }

  function drawProfileText(ctx, frame) {
    const name = getProfileDisplayName();
    if (!name) return;
    const text = name.toUpperCase();

    const x = W / 2;
    const y = H - 150;
    const maxW = 760;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '950 44px Segoe UI, system-ui, sans-serif';
    fitFont(ctx, text, maxW, 44, 24, '950');

    const measured = ctx.measureText(text).width;
    const padX = 34;
    const boxW = Math.min(maxW + 70, measured + padX * 2);
    const boxH = 72;
    const boxX = x - boxW / 2;
    const boxY = y - boxH / 2;

    // Sample setelah foto + frame digambar, jadi warna ngikutin suasana frame di belakang text.
    const style = pickProfileTextStyle(ctx, boxX - 18, boxY - 18, boxW + 36, boxH + 36);

    ctx.fillStyle = style.bg;
    roundRect(ctx, boxX, boxY, boxW, boxH, 36);
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = style.stroke;
    ctx.shadowColor = style.shadow;
    ctx.shadowBlur = 10;
    ctx.strokeText(text, x, y);

    ctx.shadowBlur = 8;
    ctx.fillStyle = style.fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawIcon(state, theme) {
    const ctx = state.ctx;
    const frame = getIconFrameById(state.iconFrameId || theme.id);

    ctx.clearRect(0,0,W,H);
    drawFullBleedPhoto(ctx, state);

    if (state.iconFrameImg) {
      ctx.drawImage(state.iconFrameImg, 0, 0, W, H);
    } else {
      drawFallbackIconFrame(ctx, frame);
    }

    drawProfileText(ctx, frame);
  }

    function drawSeal(ctx, x, y, r, text, color) {
    ctx.save();
    ctx.translate(x,y); ctx.rotate(-.18);
    ctx.fillStyle = color; ctx.globalAlpha = .95;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font = `950 ${Math.max(16,r*.22)}px Segoe UI, sans-serif`;
    wrapLines(ctx, text || 'CERTIFIED', r*1.35, 2).forEach((ln,i)=>ctx.fillText(ln.toUpperCase(),0,(i-.5)*r*.28));
    ctx.restore();
  }
  function drawCertificate(state, theme) {
    const ctx = state.ctx;
    const CW = state.canvas.width || W;
    const CH = state.canvas.height || H;
    const name = String((state.text && typeof state.text.name === 'string' ? state.text.name : '')).trim();
    const frame = getCertificateFrameById(state.certificateFrameId || CERTIFICATE_FRAME_CONFIGS[0].id);
    const photoRect = frame.photoRect || {x:150,y:195,w:610,h:800,r:42};
    const nameRect = frame.nameRect || {x:785,y:450,w:840,h:150};
    const paper = '#FBF6EF';

    function drawPhotoSlot() {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, photoRect.x, photoRect.y, photoRect.w, photoRect.h, photoRect.r || 32);
      ctx.clip();

      if (state.photoImg) {
        ctx.filter = FILTER_MAP[state.filter] || 'none';
        drawCoverImage(ctx, state.photoImg, photoRect.x, photoRect.y, photoRect.w, photoRect.h, state);
        ctx.filter = 'none';
      } else {
        // Placeholder dibuat full area dan subtle, bukan kotak kecil.
        ctx.fillStyle = 'rgba(255,255,255,.32)';
        ctx.fillRect(photoRect.x, photoRect.y, photoRect.w, photoRect.h);
        ctx.fillStyle = 'rgba(106,77,138,.55)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '82px Segoe UI Emoji, sans-serif';
        ctx.fillText('📷', photoRect.x + photoRect.w/2, photoRect.y + photoRect.h/2 - 18);
        ctx.font = '900 24px Segoe UI, sans-serif';
        ctx.fillText('upload foto', photoRect.x + photoRect.w/2, photoRect.y + photoRect.h/2 + 52);
      }
      ctx.restore();

      // Recreate a clean border on top so photo can sit above PNG without looking naked.
      ctx.save();
      ctx.strokeStyle = frame.nameColor || '#c9a45a';
      ctx.globalAlpha = .75;
      ctx.lineWidth = 2.5;
      roundRect(ctx, photoRect.x, photoRect.y, photoRect.w, photoRect.h, photoRect.r || 32);
      ctx.stroke();
      ctx.globalAlpha = .38;
      ctx.lineWidth = 1.4;
      roundRect(ctx, photoRect.x + 8, photoRect.y + 8, photoRect.w - 16, photoRect.h - 16, Math.max(18, (photoRect.r || 32) - 8));
      ctx.stroke();
      ctx.restore();
    }

    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, CW, CH);

    // Very subtle paper texture.
    ctx.save();
    ctx.globalAlpha = .05;
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#e9d8f4' : '#f7c9d6';
      const s = Math.random() * 2 + .6;
      ctx.beginPath();
      ctx.arc(Math.random() * CW, Math.random() * CH, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw photo slot first so the frame PNG renders on top (photo sits below frame layer).
    drawPhotoSlot();

    // Draw frame on top of photo.
    if (state.certificateFrameImg) {
      ctx.drawImage(state.certificateFrameImg, 0, 0, CW, CH);
    } else {
      ctx.save();
      ctx.strokeStyle = '#C49AD8';
      ctx.lineWidth = 4;
      roundRect(ctx, 47, 47, CW - 94, CH - 94, 18);
      ctx.stroke();
      ctx.lineWidth = 2;
      roundRect(ctx, 61, 61, CW - 122, CH - 122, 14);
      ctx.stroke();
      ctx.fillStyle = 'rgba(244,190,210,.65)';
      roundRect(ctx, 730, 85, 840, 115, 26); ctx.fill();
      ctx.strokeStyle = '#C49AD8'; ctx.lineWidth = 4; roundRect(ctx, 730, 85, 840, 115, 26); ctx.stroke();
      ctx.fillStyle = '#6A4D8A';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont(ctx, 'CERTIFICATE OF BESTIES', 760, 60, 26, '900', 'Georgia, Times New Roman, serif');
      ctx.fillText('CERTIFICATE OF BESTIES', 1150, 142);
      ctx.font = 'italic 40px Georgia, serif';
      ctx.fillStyle = '#4d3f5d';
      ctx.fillText('this certificate is proudly presented to', 1145, 305);
      ctx.strokeStyle = '#C49AD8';
      ctx.lineWidth = 3;
      roundRect(ctx, 800, 370, 780, 185, 26); ctx.stroke();
      ctx.font = 'italic 38px Georgia, serif';
      ctx.fillText('for sharing a bond filled with love,', 1140, 760);
      ctx.fillText('warmth, and unforgettable moments together.', 1140, 812);
      ctx.beginPath(); ctx.moveTo(1080, 900); ctx.lineTo(1525, 900); ctx.strokeStyle = '#2f2b3a'; ctx.lineWidth=2; ctx.stroke();
      fitFont(ctx, 'Signature', 220, 56, 20, '500', '"Brush Script MT", "Lucida Handwriting", "Segoe Script", cursive');
      ctx.fillStyle='#2f2b3a'; ctx.fillText('Signature', 1300, 950);
      ctx.font='500 22px Georgia, serif'; ctx.fillStyle='#6A4D8A'; ctx.fillText('official photobooth edition', CW/2, CH-40);
      ctx.restore();
    }

    // Draw name last, so it remains visible over the template.
    if (name) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const family = '"Brush Script MT", "Lucida Handwriting", "Segoe Script", cursive';
      fitFont(ctx, name, nameRect.w - 60, 94, 34, '700', family);
      ctx.lineWidth = 5;
      ctx.strokeStyle = frame.nameStroke || 'rgba(255,255,255,.72)';
      ctx.strokeText(name, nameRect.x + nameRect.w/2, nameRect.y + nameRect.h/2 + 6);
      ctx.fillStyle = frame.nameColor || '#6A4D8A';
      ctx.fillText(name, nameRect.x + nameRect.w/2, nameRect.y + nameRect.h/2 + 6);
      ctx.restore();
    }
  }

  function drawGame(state, theme) {
    const ctx = state.ctx, t = state.text, c = theme.colors;
    bg(ctx, c);
    ctx.fillStyle='rgba(2,6,23,.78)';
    roundRect(ctx,56,58,W-112,H-116,42); ctx.fill();
    ctx.strokeStyle=c[1]; ctx.lineWidth=6; roundRect(ctx,56,58,W-112,H-116,42); ctx.stroke();
    deco(ctx, theme, .5);

    ctx.fillStyle=c[1]; roundRect(ctx,95,95,990,98,28); ctx.fill();
    ctx.fillStyle='#fff'; ctx.textBaseline='middle';
    ctx.textAlign='left'; fitFont(ctx, t.name, 590, 43, 24, '950');
    ctx.fillText(t.name || '', 125, 144);
    ctx.textAlign='right'; ctx.font='950 36px Segoe UI, sans-serif';
    ctx.fillText(t.level || 'LV.99', 1050, 144);

    drawPhoto(ctx,state,95,235,990,760,36);
    ctx.strokeStyle=c[1]; ctx.lineWidth=7; roundRect(ctx,95,235,990,760,36); ctx.stroke();

    ctx.fillStyle='rgba(255,255,255,.10)'; roundRect(ctx,95,1035,990,520,28); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=2; roundRect(ctx,95,1035,990,520,28); ctx.stroke();

    ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.font='900 32px Segoe UI, sans-serif';
    ctx.fillText(`${t.class || 'Class'} • ${t.element || 'Element'}`, 130, 1070);
    ctx.fillStyle=c[2] || c[1]; ctx.font='900 28px Segoe UI, sans-serif';
    ctx.fillText(`SKILL: ${t.skill || ''}`, 130, 1128);
    ctx.fillText(`ULTIMATE: ${t.ultimate || ''}`, 130, 1178);
    ctx.fillStyle='#fff'; ctx.font='750 25px Segoe UI, sans-serif';
    drawWrapped(ctx, t.quote || '', 130, 1238, 420, 34, 3);

    const stats = statLines(t.stats).slice(0,6);
    stats.forEach((s,i)=> statBar(ctx, s.name, s.value, 620, 1090 + i*66, 390, c[1], true));
    ctx.fillStyle=c[1]; roundRect(ctx,130,1450,420,62,22); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='950 26px Segoe UI, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText((t.achievement || 'Achievement').toUpperCase(), 340, 1481);
    ctx.textAlign='right'; ctx.fillText('SSR', 1020, 1481);
  }



  function evidenceLines(str) {
    return String(str || '').split('\n').map(s => s.trim()).filter(Boolean);
  }

  function drawStampedLabel(ctx, text, x, y, w, h, color) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    roundRect(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.stroke();
    ctx.globalAlpha = .12;
    ctx.fillStyle = color;
    roundRect(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitFont(ctx, String(text || '').toUpperCase(), w - 24, 30, 18, '950');
    ctx.fillText(String(text || '').toUpperCase(), 0, 2);
    ctx.restore();
  }

  function drawDetectiveDecor(ctx, theme, paperX, paperY, paperW, paperH) {
    const c = theme.colors || ['#fff','#ddd','#111','#bbb','#c33'];
    const style = theme.style || 'case';
    ctx.save();
    if (style === 'secret') {
      ctx.fillStyle = c[2];
      ctx.fillRect(paperX, paperY, paperW, 26);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#facc15' : c[2];
        ctx.fillRect(paperX + i * (paperW / 10), paperY, paperW / 10, 26);
      }
    } else if (style === 'school') {
      ctx.strokeStyle = 'rgba(37,99,235,.13)';
      ctx.lineWidth = 2;
      for (let y = paperY + 84; y < paperY + paperH - 84; y += 44) {
        ctx.beginPath(); ctx.moveTo(paperX + 24, y); ctx.lineTo(paperX + paperW - 24, y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(239,68,68,.18)';
      ctx.beginPath(); ctx.moveTo(paperX + 64, paperY + 36); ctx.lineTo(paperX + 64, paperY + paperH - 36); ctx.stroke();
    } else if (style === 'office') {
      ctx.strokeStyle = 'rgba(148,163,184,.18)';
      ctx.lineWidth = 1.6;
      for (let x = paperX + 24; x < paperX + paperW; x += 36) {
        ctx.beginPath(); ctx.moveTo(x, paperY + 24); ctx.lineTo(x, paperY + paperH - 24); ctx.stroke();
      }
      for (let y = paperY + 24; y < paperY + paperH; y += 36) {
        ctx.beginPath(); ctx.moveTo(paperX + 24, y); ctx.lineTo(paperX + paperW - 24, y); ctx.stroke();
      }
    } else if (style === 'cute' || style === 'love' || style === 'bestie') {
      ctx.fillStyle = 'rgba(255,255,255,.78)';
      [['♡', paperX + paperW - 88, paperY + 88], ['✦', paperX + paperW - 130, paperY + 130], ['♡', paperX + 54, paperY + paperH - 48]].forEach(([s,x,y]) => {
        ctx.font = '900 36px Segoe UI Emoji, sans-serif';
        ctx.fillText(s, x, y);
      });
      ctx.fillStyle = 'rgba(255,255,255,.58)';
      roundRect(ctx, paperX + 82, paperY - 16, 114, 34, 10); ctx.fill();
      roundRect(ctx, paperX + paperW - 190, paperY - 10, 96, 28, 10); ctx.fill();
    } else if (style === 'royal') {
      ctx.strokeStyle = 'rgba(212,166,63,.75)';
      ctx.lineWidth = 4;
      roundRect(ctx, paperX + 12, paperY + 12, paperW - 24, paperH - 24, 18); ctx.stroke();
      ctx.font = '900 48px Segoe UI Emoji, sans-serif';
      ctx.fillStyle = 'rgba(212,166,63,.95)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('👑', paperX + paperW - 78, paperY + 36);
    } else if (style === 'scandal') {
      ctx.globalAlpha = .22;
      ctx.fillStyle = c[2];
      ctx.font = '900 18px "Courier New", monospace';
      for (let i = 0; i < 7; i++) {
        ctx.fillText('BREAKING NEWS • EXCLUSIVE REPORT • PAPARAZZI ALERT', paperX + 26, paperY + 70 + i * 26);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawDetective(state, theme) {
    const ctx = state.ctx, t = state.text || {}, c = theme.colors || ['#f7ecd9','#8c5a2b','#24160f','#7a5231','#c53929'];
    ctx.clearRect(0, 0, W, H);

    const bgGradient = ctx.createLinearGradient(0, 0, W, H);
    bgGradient.addColorStop(0, c[0]);
    bgGradient.addColorStop(.52, '#fff9ef');
    bgGradient.addColorStop(1, c[3] || '#c9b08b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // subtle deterministic paper dust, no random flicker on every render
    ctx.save();
    ctx.globalAlpha = .07;
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = i % 2 ? c[1] : c[3];
      const x = (i * 97) % W;
      const y = (i * 157) % H;
      const r = .6 + (i % 4) * .45;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // dibuat lebih mepet ke canvas biar hasilnya nggak kecil
    const boardX = 36, boardY = 46, boardW = W - 72, boardH = H - 92;
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.18)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = c[3] || '#8b6a49';
    roundRect(ctx, boardX, boardY, boardW, boardH, 32);
    ctx.fill();
    ctx.restore();

    const paperX = boardX + 26, paperY = boardY + 30, paperW = boardW - 52, paperH = boardH - 58;
    ctx.fillStyle = '#fbf4e7';
    roundRect(ctx, paperX, paperY, paperW, paperH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.09)';
    ctx.lineWidth = 2;
    roundRect(ctx, paperX, paperY, paperW, paperH, 20);
    ctx.stroke();

    drawDetectiveDecor(ctx, theme, paperX, paperY, paperW, paperH);

    // paper clip kanan atas
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,.24)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(boardX + boardW - 70, boardY + 76, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(boardX + boardW - 70, boardY + 94);
    ctx.lineTo(boardX + boardW - 70, boardY + 154);
    ctx.stroke();
    ctx.restore();

    // tab label
    ctx.fillStyle = theme.style === 'cute' || theme.style === 'love' || theme.style === 'bestie' ? c[3] : '#f7dbe5';
    roundRect(ctx, paperX + 28, paperY - 34, 235, 44, 18);
    ctx.fill();
    ctx.fillStyle = c[2] || '#111';
    ctx.font = '900 19px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((theme.name || 'Case File').toUpperCase(), paperX + 145, paperY - 12);

    // header
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = c[2] || '#111827';
    ctx.font = '900 27px "Courier New", monospace';
    ctx.fillText('CASE FILE', paperX + 38, paperY + 44);
    ctx.font = '900 23px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(t.number || 'DET-001').toUpperCase(), paperX + paperW - 54, paperY + 47);

    ctx.textAlign = 'left';
    fitFont(ctx, String(t.headline || 'TOO ICONIC').toUpperCase(), paperW - 78, 82, 36, '1000');
    ctx.fillStyle = c[2] || '#111827';
    ctx.fillText(String(t.headline || 'TOO ICONIC').toUpperCase(), paperX + 38, paperY + 96);

    ctx.font = '850 26px Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(36,22,15,.82)';
    ctx.fillText('Subject: ' + (t.name || 'Main Character'), paperX + 38, paperY + 202);

    // photo card: lebih besar
    const photoX = paperX + 38, photoY = paperY + 270, photoW = 500, photoH = 690;
    ctx.save();
    ctx.translate(photoX + photoW / 2, photoY + photoH / 2);
    ctx.rotate(-0.012);
    ctx.fillStyle = '#fffdf9';
    roundRect(ctx, -photoW / 2, -photoH / 2, photoW, photoH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 2.4;
    roundRect(ctx, -photoW / 2, -photoH / 2, photoW, photoH, 12);
    ctx.stroke();
    ctx.restore();

    drawPhoto(ctx, state, photoX + 24, photoY + 24, photoW - 48, photoH - 118, 10);

    ctx.fillStyle = 'rgba(0,0,0,.74)';
    ctx.font = '950 22px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PHOTO EVIDENCE', photoX + 26, photoY + photoH - 76);
    ctx.font = '800 18px Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.52)';
    ctx.fillText((theme.style === 'office' ? 'employee visual record' : 'suspect visual record').toUpperCase(), photoX + 26, photoY + photoH - 46);

    // right content: diperbesar dan diturunkan rapi
    const rightX = paperX + 590;
    const rightW = paperW - 630;

    drawStampedLabel(ctx, t.stamp || 'CONFIDENTIAL', rightX + 48, photoY + 54, 330, 84, c[4] || '#c53929');

    ctx.fillStyle = c[2] || '#111827';
    ctx.font = '950 27px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STATUS:', rightX, photoY + 210);

    ctx.fillStyle = 'rgba(15,23,42,.065)';
    roundRect(ctx, rightX, photoY + 252, rightW, 70, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.09)';
    ctx.lineWidth = 1.8;
    roundRect(ctx, rightX, photoY + 252, rightW, 70, 18);
    ctx.stroke();

    ctx.fillStyle = c[2] || '#111827';
    fitFont(ctx, String(t.status || 'UNDER INVESTIGATION').toUpperCase(), rightW - 32, 30, 18, '900');
    ctx.fillText((t.status || 'UNDER INVESTIGATION').toUpperCase(), rightX + 18, photoY + 272);

    ctx.font = '950 27px Segoe UI, sans-serif';
    ctx.fillText('EVIDENCE:', rightX, photoY + 370);

    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 1.6;
    const evs = evidenceLines(t.evidence || '').slice(0, 5);
    const evidence = evs.length ? evs : ['caught stealing the spotlight','suspiciously photogenic','main character energy'];
    let lineY = photoY + 424;
    evidence.forEach((line) => {
      ctx.beginPath();
      ctx.moveTo(rightX, lineY + 36);
      ctx.lineTo(rightX + rightW, lineY + 36);
      ctx.stroke();
      ctx.fillStyle = c[2] || '#111827';
      ctx.font = '850 25px Segoe UI, sans-serif';
      wrapLines(ctx, '• ' + line, rightW - 10, 2).slice(0, 2).forEach((ln, idx) => {
        ctx.fillText(ln, rightX + 8, lineY + idx * 30);
      });
      lineY += 80;
    });

    // bottom summary card supaya nggak kosong banget
    const summaryY = photoY + photoH + 54;
    const summaryH = paperY + paperH - summaryY - 118;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    roundRect(ctx, paperX + 38, summaryY, paperW - 76, Math.max(170, summaryH), 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.08)';
    ctx.lineWidth = 2;
    roundRect(ctx, paperX + 38, summaryY, paperW - 76, Math.max(170, summaryH), 22);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,.70)';
    ctx.font = '950 23px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CASE NOTES:', paperX + 70, summaryY + 34);

    ctx.font = '800 22px Segoe UI, sans-serif';
    ctx.fillStyle = c[2] || '#111827';
    const noteText = `${String(t.name || 'Subject')} has been officially documented as ${String(t.headline || 'too iconic').toLowerCase()}. Evidence remains strong and impossible to ignore.`;
    drawWrapped(ctx, noteText, paperX + 70, summaryY + 78, paperW - 140, 32, 3);

    ctx.strokeStyle = 'rgba(0,0,0,.13)';
    for (let y = summaryY + 188; y < summaryY + Math.max(170, summaryH) - 28; y += 42) {
      ctx.beginPath();
      ctx.moveTo(paperX + 70, y);
      ctx.lineTo(paperX + paperW - 70, y);
      ctx.stroke();
    }
    ctx.restore();

    // footer warning lebih keliatan
    ctx.fillStyle = c[3] || '#8b6a49';
    ctx.textAlign = 'center';
    fitFont(ctx, String(t.warning || 'warning: extremely iconic').toUpperCase(), paperW - 90, 40, 20, '950');
    ctx.fillText(String(t.warning || 'warning: extremely iconic').toUpperCase(), paperX + paperW / 2, paperY + paperH - 66);
  }

  function render(state) {
    const theme = getTheme(state.menu, state.themeId);
    if (state.menu === 'trading-card') drawTrading(state, theme);
    if (state.menu === 'icon-portrait') drawIcon(state, theme);
    if (state.menu === 'certificate') drawCertificate(state, theme);
    if (state.menu === 'game-character') drawGame(state, theme);
    if (state.menu === 'detective-case') drawDetective(state, theme);

    // Safe print guide hidden in final? Keep subtle only in preview? No guide drawn.
  }

  function exportDataUrl(state, mode='original') {
    if (mode === 'fit') {
      const out = document.createElement('canvas');
      out.width = W; out.height = H;
      const o = out.getContext('2d');
      o.fillStyle = '#ffffff'; o.fillRect(0,0,W,H);
      const pad = 55;
      o.drawImage(state.canvas, pad, pad, W-pad*2, H-pad*2);
      return out.toDataURL('image/png');
    }
    return state.canvas.toDataURL('image/png');
  }

  window.Product4R = {
    W, H, SAFE,
    CONFIGS,
    getConfig,
    getTheme,
    createState,
    setTheme,
    render,
    exportDataUrl,
    getIconFrames,
    getIconFrameById,
    getCertificateFrames,
    getCertificateFrameById,
    randomCode
  };
})();