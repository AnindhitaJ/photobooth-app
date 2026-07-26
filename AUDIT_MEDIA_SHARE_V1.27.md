# Audit Media Share v1.27

## Gejala

Tombol **Share Strip** pada Galeri menampilkan request gagal ke
`https://media.lux-photo.web.id/results/...` dengan `0 B transferred` dan hanya
`Provisional headers` pada Chrome DevTools.

## Akar masalah

Preview `<img>` dapat menampilkan file lintas domain tanpa izin CORS, tetapi
`fetch()` untuk membuat `Blob` membutuhkan header CORS. Alur Galeri dan halaman
Download masih mengambil URL CDN secara langsung. Akibatnya share/download
bergantung pada konfigurasi CORS bucket dan dapat gagal walaupun preview tetap
terlihat.

## Perbaikan

- Menambahkan `media-fetch.js` sebagai helper tunggal untuk preview, fetch,
  prefetch, download, MIME, timeout, validasi respons, dan memory cache terbatas.
- Menambahkan rewrite Vercel `/media/:path*` ke domain R2 agar browser mengambil
  hasil foto melalui origin aplikasi yang sama.
- Supabase public storage tetap memakai `/api/media-proxy` yang telah memiliki
  validasi host dan tipe gambar.
- Galeri tidak lagi melakukan fetch lintas domain langsung.
- File strip diprefetch saat modal dibuka. Tombol file-share baru aktif setelah
  Blob siap sehingga Web Share API tidak kehilangan user activation karena
  menunggu network request setelah klik.
- Browser yang tidak mendukung file sharing memakai share URL atau download
  otomatis sebagai fallback.
- Preview, download JPG, GIF, foto satuan, manifest QR, dan canvas merge memakai
  URL media yang aman.
- Service Worker tidak menyimpan `/media/*` ke Cache Storage PWA agar file foto
  besar tidak memenuhi quota. Cache HTTP/CDN tetap digunakan.
- Cache aplikasi dinaikkan ke `lux-photobooth-v1.27-media-share-fix`.

## Verifikasi

- Repository validator.
- Pemeriksaan sintaks seluruh JavaScript eksternal.
- Pemeriksaan sintaks inline script `gallery.html` dan `download.html`.
- Unit test pemetaan URL R2/Supabase dan pengambilan Blob pada `media-fetch.js`.
- Pemeriksaan integritas ZIP.
