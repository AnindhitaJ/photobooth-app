# Audit PWA dan Kamera — v1.24

## Penyebab utama

1. `camera.html` tidak memulihkan stream kamera setelah PWA masuk background, layar dikunci, atau aplikasi berpindah. Track kamera dapat berhenti, tetapi UI tetap menganggap kamera siap.
2. Beberapa pemanggilan `startCamera()` dapat berjalan bersamaan. Proses lama dapat selesai setelah proses baru dan menimpa atau menghentikan stream yang benar.
3. `setMode()` sebelumnya selalu mengaktifkan tombol shutter walaupun `startCamera()` gagal, karena error ditangkap di dalam fungsi dan Promise tetap dianggap selesai.
4. `video.play()` sebelumnya mengabaikan error. Akibatnya stream dapat tersedia tetapi preview masih hitam atau belum memiliki dimensi video.
5. Service worker menggunakan fallback halaman login untuk semua kegagalan `network-first`, termasuk request `/auth.js` dan `/config.js`. Dalam kondisi jaringan lemah atau cache parsial, browser dapat menerima HTML sebagai JavaScript dan aplikasi gagal secara acak.
6. Instalasi service worker memakai `Promise.allSettled`, sehingga service worker baru tetap aktif walaupun sebagian aset inti gagal masuk cache.
7. Validasi autentikasi menahan `body` tetap tersembunyi sampai verifikasi server dan refresh profil selesai, tanpa timeout. Saat PWA baru bangun atau jaringan menggantung, layar dapat terlihat kosong terlalu lama.
8. Validasi session pada halaman kamera dilakukan berulang kali pada proses awal dan saat resume, meningkatkan kemungkinan race dan keterlambatan.

## Perubahan

- `sw.js`
  - versi cache dinaikkan ke `v1.24-pwa-recovery`;
  - precache dibuat atomik;
  - fallback HTML hanya untuk navigasi;
  - JavaScript/CSS/JSON tidak pernah diganti halaman login;
  - aset dinamis memakai network-first, gambar memakai cache-first;
  - navigasi memakai timeout agar tidak menggantung tanpa batas.

- `auth.js`
  - fetch autentikasi diberi timeout;
  - validasi session dikunci dengan satu Promise agar tidak berjalan paralel;
  - UI ditampilkan dari profil cache lebih dahulu;
  - refresh profil berjalan tanpa menahan seluruh layar;
  - permission dan branding diterapkan ulang setelah profil terbaru diterima.

- `camera.html`
  - pembukaan kamera memakai sequence guard untuk mencegah race;
  - stream lama dihentikan secara konsisten;
  - preview harus benar-benar siap sebelum tombol shutter dianggap siap;
  - error kamera dibedakan berdasarkan jenisnya;
  - device ID lama otomatis fallback ke kamera default;
  - countdown dibatalkan saat aplikasi masuk background;
  - kamera dipulihkan saat PWA kembali aktif;
  - tombol Ambil berfungsi sebagai retry berbasis user gesture;
  - validasi auth awal tidak lagi dilakukan berulang kali.

- `local-camera.js`
  - modal kamera lokal menangani suspend/resume PWA;
  - tombol Ulang timer dapat membuka ulang kamera bila stream mati;
  - proses open lama tidak dapat menimpa proses baru.

## Pemeriksaan yang sudah dilakukan

- `node --check` untuk `sw.js`, `auth.js`, `local-camera.js`, dan seluruh inline script `camera.html`;
- verifikasi seluruh 44 aset precache tersedia;
- verifikasi seluruh aset precache merespons HTTP 200 melalui server statis lokal.

## Pengujian perangkat yang tetap diperlukan

- Android Chrome PWA: install, buka kamera, pindah aplikasi 10–20 detik, kembali, lalu ambil foto;
- Android Chrome PWA: kunci layar, buka lagi, lalu ambil foto;
- iPhone/iPad standalone PWA: izinkan kamera, background/resume, lalu gunakan tombol Ambil sebagai retry;
- cabut-pasang webcam eksternal dan pastikan fallback ke kamera default;
- simulasi jaringan lambat/offline ketika membuka `/app` dan `/camera`.
