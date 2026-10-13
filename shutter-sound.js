/* Suara "cekrek": utama pakai file /cekrek.mp3 (HTML Audio), cadangan sintesis Web Audio. */
(function () {
  let ctx = null;
  const audio = new Audio('/cekrek.mp3');
  audio.preload = 'auto';
  audio.volume = 1;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  // Panggil di dalam klik/tap user.
  function unlock() {
    try {
      // iOS: agar suara tetap bunyi walau tombol silent aktif (Safari 16.4+)
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) {}
    try {
      const c = getCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    } catch (e) {}
    try {
      audio.muted = true;
      const p = audio.play();
      const done = () => { try { audio.pause(); audio.currentTime = 0; } catch (e) {} audio.muted = false; };
      if (p && p.then) p.then(done).catch(() => { audio.muted = false; });
      else done();
    } catch (e) { audio.muted = false; }
  }

  function click(c, t, freq, dur, vol) {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t);
  }

  function synth() {
    try {
      const c = getCtx(); if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const t = c.currentTime;
      click(c, t, 3500, 0.05, 0.9);
      click(c, t + 0.07, 1800, 0.09, 0.7);
    } catch (e) {}
  }

  function play() {
    try {
      audio.muted = false;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && p.catch) p.catch(synth);
    } catch (e) { synth(); }
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
  }

  window.ShutterSound = { unlock, play };
})();
