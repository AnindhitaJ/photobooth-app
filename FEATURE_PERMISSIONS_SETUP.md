# Setup Feature Permissions

## Fitur yang dapat diatur

- `all` — seluruh fitur
- `photostrip`
- `photobooth` — mengontrol menu Photobox 4R dan alur 4R
- `ganci`
- `kalender`
- `idcard`
- `magazine`
- `newspaper`
- `trading-card`
- `certificate`
- `game-character`
- `detective-case`

Galeri, Admin, Tutorial, Tentang Aplikasi, Event, dan menu umum lainnya tidak dibatasi permission.

## Urutan deployment

1. Jalankan `supabase_feature_permissions_v75.sql` di Supabase SQL Editor.
2. Pastikan environment Vercel memiliki:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPER_ADMIN_EMAIL=luxphotobooth.id@gmail.com`
3. Deploy source terbaru.
4. Login CMS menggunakan `luxphotobooth.id@gmail.com`.
5. Pada daftar akun, pilih tombol **Permission**, centang fitur, lalu simpan.

## Perilaku default

- Semua profil lama dimigrasikan menjadi `permissions = ["all"]`.
- Semua akun baru yang dibuat dari CMS otomatis memakai `permissions = ["all"]`.
- Jika data permission belum tersedia saat masa transisi, frontend memperlakukan akun sebagai `all` agar akun lama tidak terkunci.

## Pengamanan

- UI dashboard hanya menampilkan kartu fitur yang diizinkan.
- Akses langsung ke URL fitur dan alur kamera/filter/hasil juga diperiksa.
- Perubahan permission memakai endpoint server `/api/admin-update-permissions`.
- Endpoint memverifikasi token Supabase dan email super admin.
- Trigger database menolak perubahan kolom `permissions` oleh akun biasa.

## Uji cepat

1. Atur satu akun hanya `photostrip`.
2. Login sebagai akun tersebut.
3. Pastikan hanya Photostrip yang terlihat; Galeri/Admin/Tutorial tetap terlihat melalui menu.
4. Buka `/magazine` secara langsung; aplikasi harus kembali ke `/app` dengan notifikasi permission.
5. Kembalikan akun ke **Select All** dan pastikan semua kartu muncul kembali.
