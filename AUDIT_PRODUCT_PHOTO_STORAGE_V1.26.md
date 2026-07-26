# LUX Photobooth v1.26 — Stable Product Photo Flow

## Cakupan

Perbaikan diterapkan pada:

- Ganci Photo Insert
- Photobooth Kalender
- ID Card
- Magazine Cover
- Newspaper Cover, termasuk empat slot foto
- Trading Card
- Certificate
- Game Character
- Detective Case File

## Perubahan utama

1. Foto hasil kamera dikompresi proporsional sebelum dipakai, maksimal 1600 × 2000 px dengan JPEG quality 0.88.
2. Foto disimpan sebagai Blob di IndexedDB dan diverifikasi sebelum kamera ditutup.
3. Setiap fitur memakai key penyimpanan terpisah sehingga foto antarf fitur tidak saling menimpa.
4. Object URL lama dicabut setelah foto pengganti berhasil masuk ke layout untuk mengurangi kebocoran memori.
5. Foto dapat dipulihkan setelah refresh halaman.
6. Foto lama dari `localStorage.productPhoto` dimigrasikan ke IndexedDB lalu data Base64 lama dihapus.
7. Upload foto pada fitur yang mendukung upload memakai alur optimasi dan penyimpanan yang sama.
8. Browser diminta mengaktifkan persistent storage jika didukung.
9. Service Worker cache dinaikkan ke `lux-photobooth-v1.26-all-product-photo-storage` dan memasukkan modul `product-photo-flow.js`.
10. Tombol kamera dilindungi oleh proses capture tunggal pada `local-camera.js`; callback ditunggu sampai penyimpanan dan render layout selesai.

## Catatan kapasitas

Aplikasi web tidak dapat memaksa browser memberikan kuota cache tertentu. Pendekatan yang dipakai adalah IndexedDB, persistent storage request, kompresi foto, verifikasi write-read, dan pemisahan key per fitur. Ini lebih stabil daripada menyimpan Base64 besar di localStorage.
