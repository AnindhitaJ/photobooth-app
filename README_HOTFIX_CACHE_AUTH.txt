HOTFIX GAGAL VERIFIKASI

Ganti hanya:
1. sw.js
2. vercel.json

Setelah deploy:
1. Buka situs.
2. Tekan Ctrl+Shift+R / hard refresh.
3. Bila masih gagal, DevTools > Application > Service Workers > Unregister.
4. Application > Storage > Clear site data.
5. Tutup tab, buka situs kembali, lalu login ulang.

Penyebab: service worker lama memakai strategi cache-first untuk auth.js, sehingga halaman baru dapat berjalan dengan auth.js versi lama.
