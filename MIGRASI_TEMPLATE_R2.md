# Migrasi template Supabase ke Cloudflare R2

Versi ini menambahkan:

- `/migrate-templates` — halaman sekali pakai untuk menyalin template lama.
- `/api/migrate-templates` — API migrasi bertahap agar tidak perlu Cyberduck/rclone.

## Environment Vercel yang wajib tersedia

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `MIGRATION_SECRET` — buat sendiri, minimal 24 karakter acak.

## Cara menjalankan

1. Deploy proyek ini ke Vercel.
2. Buka `https://www.lux-photo.web.id/migrate-templates`.
3. Masukkan nilai `MIGRATION_SECRET`.
4. Klik **Mulai migrasi** dan tunggu sampai 100%.
5. Uji daftar template, preview, dan hasil foto.
6. Jangan menghapus folder Supabase selama 2–3 hari.
7. Setelah yakin stabil, hapus file lama dari Supabase secara bertahap.

Folder `templates/event-welcome/` sengaja tidak dimigrasikan oleh alat ini.
