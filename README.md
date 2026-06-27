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


## Supabase Analytics + Consent Schema

Jalankan `supabase_analytics_consent_schema_v46.sql` di Supabase SQL Editor untuk persiapan analytics, event tracking, dan content sharing consent.


## WhatsApp owner registration

Jalankan `supabase_profiles_whatsapp_v47.sql` di Supabase SQL Editor sebelum deploy v47. Field register akan menyimpan `whatsapp_number` ke tabel `profiles`.


## Analytics + Consent Ready v48

Jalankan `supabase_analytics_consent_ready_v48.sql` di Supabase SQL Editor. Setelah deploy, buka `/admin` lalu tombol Analytics / Content Sharing.


## WhatsApp display v52

Jalankan `supabase_profiles_whatsapp_v52.sql` di Supabase SQL Editor jika kolom `profiles.whatsapp_number` belum ada. Nomor WA tampil di Admin Profile dan CMS Dashboard.


## Analytics Accuracy v54

`photo_sessions` sekarang hanya dicatat untuk final result (`strip.jpg`). File pendukung seperti foto satuan/GIF/live/manifest tidak dihitung sebagai session. Kalau data lama sudah terlanjur inflated, jalankan `supabase_fix_analytics_sessions_v54.sql`.


## Gallery Product Split v61

Jika Galeri tampil 0 sesi setelah cleanup metadata, jalankan `supabase_restore_gallery_metadata_v61.sql` di Supabase SQL Editor untuk restore metadata dari Storage.


## Register WhatsApp fix v62

Jalankan `supabase_fix_register_whatsapp_v62.sql` di Supabase SQL Editor. Register sekarang upsert profile supaya `whatsapp_number` tidak kosong.


## Tutorial feature v63

Menambahkan halaman `/tutorial`, submenu Tutorial di Admin, serta popup onboarding di index kalau akun belum punya template.


## Web/PWA Latest v68

Versi ini kembali fokus ke web-based PWA saja:
- Tidak ada APK / Android project.
- Kamera memakai kamera browser seperti sebelumnya (`navigator.mediaDevices`).
- Tetap membawa fitur terakhir sebelum eksperimen Android bridge: admin unified sidebar, tutorial owner, gallery product split, register WA fix, analytics/content sharing, event, dan PWA cache.
- Deploy ZIP ini ke Vercel.
