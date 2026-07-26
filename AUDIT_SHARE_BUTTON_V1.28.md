# Audit Share Button v1.28

## Masalah
Tombol Share Strip dinonaktifkan selama proses prefetch file. Jika request media lambat, timeout, atau rewrite belum aktif, tombol terlihat tetapi tidak dapat diklik hingga 25 detik atau lebih.

## Perbaikan
- Tombol Share Strip tidak pernah dinonaktifkan oleh prefetch latar belakang.
- Prefetch tetap berjalan untuk menyiapkan file share berkualitas asli.
- Bila Blob sudah tersedia, aplikasi membagikan file.
- Bila Blob belum tersedia, aplikasi langsung membagikan URL tanpa menunggu jaringan.
- `navigator.share()` dipanggil langsung dari event klik agar transient user activation tidak hilang.
- Fallback terakhir tetap mengunduh file.
- Cache PWA dinaikkan ke `lux-photobooth-v1.28-share-button-fix`.
- URL script dan service worker diberi cache-buster v1.28.
