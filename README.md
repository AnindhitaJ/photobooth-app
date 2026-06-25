# photobooth-app

## Supabase migration

Untuk fitur Photostrip / Photobox yang DB-aware, jalankan file `supabase_templates_product_type.sql` di Supabase SQL Editor.


## Event feature setup

Jalankan `supabase_lux_events.sql` di Supabase SQL Editor sebelum memakai fitur Event.
Fitur Event dibatasi untuk akun PRO atau super admin. Akun Free akan melihat pesan upgrade.


## Event welcome upload fix v41

Welcome screen Event sekarang mencoba upload ke Storage.
Kalau Storage ditolak RLS 403, aplikasi otomatis fallback menyimpan welcome screen sebagai data URL di `lux_events.welcome_screen_url`, jadi create event tetap berhasil.

File `supabase_event_welcome_storage_policy_optional.sql` hanya opsional kalau ingin menyimpan welcome screen sebagai public file di bucket.
