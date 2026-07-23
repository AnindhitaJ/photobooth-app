# Uji penerimaan PWA LUX Photobooth v1.24

## 1. Pemeriksaan sebelum deploy

Jalankan dari folder proyek:

```bash
npm run validate
```

Hasil yang dapat diterima adalah `PASSED: 0 errors`.

## 2. Deploy bersih

1. Deploy seluruh isi folder, bukan hanya file yang berubah.
2. Pastikan `/sw.js` merespons status 200 dan header `Cache-Control: no-cache, no-store, must-revalidate`.
3. Pastikan `/manifest.json`, `/auth.js`, `/config.js`, `/camera`, dan `/app` merespons status 200.
4. Buka aplikasi di browser biasa sekali sebelum memasang PWA.

## 3. Hapus versi PWA lama

Pada perangkat uji, uninstall PWA lama. Di Chrome, hapus data situs untuk domain aplikasi, lalu buka kembali situs dan pasang ulang PWA. Langkah ini wajib karena service worker dan cache lama dapat tetap aktif walaupun source sudah diperbarui.

## 4. Uji kamera berulang

Lakukan minimal 20 siklus:

1. Buka PWA.
2. Masuk ke kamera.
3. Tunggu preview benar-benar bergerak.
4. Ambil foto.
5. Kembali ke kamera.
6. Pindah ke aplikasi lain selama 10–30 detik.
7. Kembali ke PWA dan ambil foto lagi.
8. Kunci layar selama 10–30 detik, buka kembali, lalu ambil foto.
9. Ganti kamera depan/belakang apabila tersedia.

Lulus apabila tidak ada preview hitam permanen, tombol Ambil tidak aktif sebelum kamera siap, dan kamera pulih tanpa reload manual.

## 5. Uji jaringan

Ulangi alur kamera pada kondisi:

- Wi-Fi stabil;
- jaringan lambat;
- offline setelah halaman pernah dibuka;
- online kembali setelah offline.

Lulus apabila file JavaScript tidak pernah berubah menjadi halaman login dan aplikasi tidak blank permanen.

## 6. Catat bukti error

Apabila masalah muncul, catat:

- perangkat dan versi OS;
- browser/PWA;
- waktu kejadian;
- langkah tepat sebelum error;
- screenshot atau rekaman layar;
- Console error dan Network request yang gagal dari Chrome DevTools remote debugging.

Tanpa data tersebut, error intermittent sulit dibedakan antara masalah kamera OS, service worker lama, jaringan, atau source aplikasi.
