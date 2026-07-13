# LUX Photobooth — Redeploy Ready

Repositori lengkap aplikasi web/PWA LUX Photobooth. Versi ini mempertahankan seluruh file dan fitur dari paket asli, lalu menambahkan konfigurasi terpusat, schema Supabase penuh, struktur Edge Function yang benar, cron cleanup yang diperbaiki, dokumentasi deployment, serta validasi otomatis untuk GitHub Actions.

## Isi aplikasi

Aplikasi mencakup login/register, template manager, kamera browser, beauty filter, hasil photostrip/photobox, print/share/QR/download, galeri, analytics, consent content sharing, event mode, CMS super-admin, Ganci, Kalender, ID Card, Magazine, Newspaper, Trading Card, Icon Portrait, Certificate, Game Character, dan Detective Case.

Teknologi utama:

- HTML, CSS, dan JavaScript tanpa build framework.
- Supabase Auth, Postgres, Storage, Row Level Security, dan Edge Functions.
- Vercel static hosting, rewrites, serverless API, dan cron.
- PWA dengan service worker dan manifest.

## Pengaturan layer foto per template

Template Manager sekarang menyimpan urutan layer pada setiap template:

- **Foto di belakang template** (`behind`) — foto dirender lebih dulu lalu PNG template berada di atasnya. Ini default dan tetap dipakai oleh seluruh template lama.
- **Foto di depan template** (`front`) — PNG template dirender lebih dulu lalu foto berada di atasnya pada area slot.

Pilihan dapat ditentukan saat membuat template dan dapat diubah lagi dari daftar template tersimpan tanpa upload ulang. Untuk project Supabase yang sudah berjalan, jalankan `supabase/migrations/0002_template_photo_layer.sql` atau `supabase db push` sebelum memakai kontrol tersebut.

## Deployment paling cepat

### 1. Upload ke GitHub

Upload **isi folder repositori ini** ke root repository. Jangan mengunggah folder pembungkus tambahan apabila Vercel diarahkan ke root repository.

### 2. Konfigurasi browser

File `config.js` sudah menunjuk ke project Supabase yang digunakan paket asli. Untuk project Supabase baru, ubah nilai berikut:

```js
window.LUX_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://PROJECT_REF.supabase.co',
  SUPABASE_ANON_KEY: 'PUBLIC_ANON_KEY',
  SUPER_ADMIN_EMAIL: 'admin@example.com',
  STORAGE_BUCKET: 'photobooth',
  APP_VERSION: 'redeploy-ready-v1.1-photo-layer'
});
```

Anon key adalah public browser key. Jangan pernah menaruh `service_role` key di `config.js`.

### 3. Siapkan Supabase database

Untuk project baru, buka Supabase SQL Editor dan jalankan seluruh migration berikut secara berurutan:

```text
supabase/migrations/0001_full_redeploy_schema.sql
supabase/migrations/0002_template_photo_layer.sql
```

Untuk project lama yang sebelumnya sudah memakai paket redeploy-ready v1, jalankan juga:

```text
supabase/migrations/0002_template_photo_layer.sql
```

Dengan Supabase CLI, kedua migration dapat diterapkan berurutan menggunakan `supabase db push`.

File tersebut membuat atau melengkapi:

- `profiles`
- `templates`
- `photo_sessions`
- `lux_events`
- `content_sharing_settings`
- `photo_consents`
- `pro_extension_logs`
- `id_cards`
- `analytics_sessions_view`
- trigger profile pengguna baru
- bucket Storage `photobooth`
- seluruh policy RLS utama

Sebelum menggunakan email super-admin yang berbeda, ganti email di `config.js`, migration SQL, dan secret Edge Function.

### 4. Deploy Supabase Edge Functions

Dengan Supabase CLI:

```bash
supabase link --project-ref PROJECT_REF
supabase secrets set SUPER_ADMIN_EMAIL="admin@example.com"
supabase secrets set SUPABASE_ANON_KEY="PUBLIC_ANON_KEY"
supabase functions deploy admin-change-password --no-verify-jwt
supabase functions deploy admin-toggle-active --no-verify-jwt
```

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia otomatis di environment Edge Function Supabase.

### 5. Deploy ke Vercel

Import repository GitHub ke Vercel. Framework preset dapat menggunakan **Other** dan tidak membutuhkan build command.

Tambahkan environment variables berikut di Vercel:

```text
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SERVICE_ROLE_KEY
CRON_SECRET=LONG_RANDOM_SECRET
RETENTION_DAYS=14
```

`SUPABASE_SERVICE_ROLE_KEY` dan `CRON_SECRET` hanya digunakan oleh `/api/cleanup` dan tidak boleh masuk ke file browser.

### 6. Validasi sebelum push

```bash
python3 scripts/validate_repo.py
```

Atau:

```bash
npm run validate
```

GitHub Actions akan menjalankan pemeriksaan yang sama pada setiap push dan pull request.

## Perbaikan utama pada versi ini

- Cleanup mengenali format baru `userId_timestamp_filename` dan format lama `timestamp_filename`.
- Cleanup menggunakan service role server-side, melakukan pagination, dan menghapus metadata `photo_sessions` terkait.
- Upload template dan welcome event menggunakan JWT pengguna, bukan anon token.
- Penghapusan file galeri menggunakan JWT pengguna.
- Toggle status akun CMS menggunakan Edge Function server-side.
- Database menolak perubahan plan, masa PRO, dan status aktif dari akun owner biasa.
- Policy Event memverifikasi status PRO aktif di database.
- Konfigurasi Supabase browser dipusatkan di `config.js`.
- Template Manager mendukung urutan layer foto depan/belakang per template, termasuk perubahan pada template lama.
- Struktur `admin-toggle-active` dipindahkan ke lokasi Supabase CLI yang benar tanpa menghapus salinan lama.
- Service worker mencakup seluruh halaman produk dan melakukan runtime cache untuk aset lokal.
- Semua file asli dipertahankan; daftar checksum tersedia di `FILE_MANIFEST.sha256`.

## Struktur penting

```text
api/cleanup.js                             Vercel cron cleanup
config.js                                 konfigurasi browser aktif
supabase/migrations/0001_full_redeploy_schema.sql
supabase/migrations/0002_template_photo_layer.sql
supabase/functions/admin-change-password/
supabase/functions/admin-toggle-active/
scripts/validate_repo.py                  pemeriksaan integritas
.github/workflows/validate.yml             CI GitHub
vercel.json                                routes, headers, cron
```

Panduan lebih rinci tersedia di [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Batas verifikasi

Pemeriksaan statis dan integritas repositori telah dijalankan. Kamera fisik, printer, Web Share API, dan koneksi ke Supabase produksi tetap perlu smoke test setelah deployment karena bergantung pada browser, izin perangkat, policy project, dan environment deployment.
