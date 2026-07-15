# LUX Photobooth — Template Text Editor

Static multi-page PWA untuk photobooth berbasis HTML, CSS, JavaScript, Supabase, dan Vercel.

Versi ini menambahkan **elemen teks bebas pada Template Manager**:

- tombol **Tambah Nama/Teks**;
- dapat menambahkan lebih dari satu teks;
- drag, resize, rotate, duplicate, dan delete;
- enam pilihan font sistem;
- enam preset warna;
- warna awal otomatis putih atau navy berdasarkan luminance area template;
- teks dirender pada hasil JPG, print, share, QR, dan output lain yang memakai komposit final;
- template lama tetap kompatibel dan tidak membutuhkan migration baru.

## Deploy

Paket ini ditujukan untuk redeploy terhadap Supabase yang sudah digunakan aplikasi. Instruksi lengkap ada di `docs/DEPLOYMENT.md`.

```bash
npm run validate
npm run serve
```

Konfigurasi browser berada di `config.js`. Supabase anon key memang public; service-role key tidak boleh disimpan di sana.

## Struktur penting

- `admin.html` — Template Manager dan editor teks.
- `template.html` — pemilihan template dan pemisahan slot foto/teks.
- `camera.html` — alur capture berdasarkan jumlah slot foto.
- `result.html` — compositing foto, template, dan teks.
- `auth.js` / `config.js` — session dan konfigurasi Supabase.
- `sw.js` / `manifest.json` — PWA.
- `vercel.json` — routing dan deployment Vercel.
