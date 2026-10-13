/* Suara "cekrek" kamera — disintesis dengan Web Audio API (tanpa file mp3). */
(function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  // Panggil di dalam klik/tap user (wajib agar browser mengizinkan suara, terutama iOS/Safari)
  function unlock() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function click(c, t, freq, dur, vol) {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t);
  }

  function play() {
    try {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const t = c.currentTime;
      click(c, t, 3500, 0.05, 0.9);          // "ce"
      click(c, t + 0.07, 1800, 0.09, 0.7);   // "krek"
    } catch (e) { /* jangan sampai suara menggagalkan pengambilan foto */ }
  }

  window.ShutterSound = { unlock, play };
})();
    
