(function () {
  const audio = new Audio('/cekrek.mp3');
  audio.preload = 'auto';

  function unlock() {
    // "pancing" izin audio dari klik user
    audio.muted = true;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(() => { audio.muted = false; });
  }

  function play() {
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  window.ShutterSound = { unlock, play };
})();
