# Perbaikan Flow Ganci dan Storage — v1.25

## Penyebab utama

Foto kamera sebelumnya dibuat pada resolusi tinggi dan kualitas JPEG 0,98, lalu seluruh data base64 disimpan di `localStorage` melalui key `ganciState`. `localStorage` umumnya memiliki kuota kecil. Ketika kuota penuh, `setItem()` melempar `QuotaExceededError`, sehingga foto tidak sampai ke state Ganci dan layout cetak tidak dapat dibuat. Kondisi ini tampak acak karena ukuran JPEG berbeda-beda untuk setiap foto dan perangkat.

Masalah tambahan adalah kemungkinan service worker masih menyajikan file JavaScript versi lama ketika jaringan tidak stabil.

## Perbaikan

- Foto Ganci disimpan sebagai `Blob` di IndexedDB, bukan base64 di `localStorage`.
- `localStorage` hanya menyimpan metadata kecil dan referensi foto.
- Browser diminta memakai persistent storage melalui `navigator.storage.persist()` bila didukung.
- Foto kamera Ganci dibatasi maksimum 1800×2400 px dengan kualitas JPEG 0,90.
- Proses capture dikunci agar timer dan tombol tidak memicu penyimpanan ganda.
- Callback kamera dapat menunggu proses penyimpanan dan menampilkan error yang jelas.
- Stream kamera ditutup sebelum layout 300 DPI digenerate untuk mengurangi penggunaan RAM.
- Layout cetak dibuat otomatis setelah foto berhasil disimpan.
- Hasil galeri lokal Ganci disimpan ke IndexedDB.
- Download menggunakan Blob URL agar lebih stabil dibanding tautan data URL berukuran besar.
- Cache service worker dinaikkan ke `lux-photobooth-v1.25-ganci-storage` dan file `ganci-storage.js` ditambahkan ke precache.
- Registrasi service worker menggunakan `updateViaCache: "none"` agar patch terbaru lebih cepat aktif.

## File utama yang berubah

- `ganci-storage.js` — helper penyimpanan IndexedDB dan persistent storage.
- `ganci.html` — flow capture, save, restore, dan auto-generate layout.
- `local-camera.js` — penguncian capture, output Blob, resize, dan error handling.
- `filter.html` — hasil filter Ganci disimpan melalui IndexedDB.
- `ganci-print.js` — download Blob URL dan galeri lokal IndexedDB.
- `sw.js` — cache v1.25 dan precache helper baru.
- `app.html`, `vercel.json` — pembaruan service worker dan cache headers.

## Setelah deploy

1. Deploy semua file dalam satu versi, jangan hanya `ganci.html`.
2. Buka aplikasi dalam kondisi online, lalu refresh satu kali.
3. Pada perangkat yang pernah memakai versi lama, tutup semua tab LUX Photobooth lalu buka kembali.
4. Uji foto Ganci minimal lima kali berturut-turut, termasuk retake dan reload halaman.
5. Pastikan setelah capture: preview foto muncul, kartu layout terbuka, dan status layout berubah menjadi hasil 300 DPI.

## Catatan kuota

Aplikasi web tidak dapat memaksa browser memberikan angka kuota tertentu. Perbaikan ini mengganti media penyimpanan dari `localStorage` yang kecil ke IndexedDB yang kuotanya jauh lebih besar dan meminta status persistent storage ketika browser mengizinkan.
