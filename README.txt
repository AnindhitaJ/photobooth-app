ROOT FIX — PHOTOSTRIP KEMBALI KE INDEX

Ganti 4 file berikut di root proyek:
1. auth.js
2. login.html
3. sw.js
4. vercel.json

Penyebab yang diperbaiki:
- auth.js lama menolak session lama hanya karena sb_user_id/account-lock belum ada,
  lalu mengirim ke login.
- login lama/cache lama mengembalikan user ke index.
- service worker memakai cacheFirst untuk auth.js.
- fallback navigasi /template salah: cache hanya menyimpan /template.html sehingga
  saat network gagal, service worker mengembalikan /index.html.

Setelah deploy:
- buka DevTools > Application > Service Workers > Unregister
- Application > Storage > Clear site data
- tutup semua tab situs lalu login ulang satu kali
