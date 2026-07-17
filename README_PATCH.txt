PATCH PHOTOBOX 4R — SLOT 4/5/6 + WORDING PHOTOSTRIP

Ganti hanya:
1. template.html
2. sw.js

Perubahan:
- Setiap kategori built-in Photobox 4R sekarang memiliki variasi 4, 5, dan 6 slot.
- Pola jumlah slot berulang 4 → 5 → 6 di dalam tiap kategori.
- Nama template sama dengan built-in Photostrip (tanpa suffix "4R").
- Judul, subtitle, footer, dan label slot mengikuti wording Photostrip.
- Ukuran output tetap 1181 × 1772 px (4R / 10×15 cm).
- Cache service worker dinaikkan ke v1.16.

Sesudah deploy, lakukan hard refresh. Jika versi lama masih tampil, unregister service worker dan clear site data satu kali.
