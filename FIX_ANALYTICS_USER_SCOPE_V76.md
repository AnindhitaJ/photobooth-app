# Fix Business Analytics — User Scope v76

Perubahan ini memperbaiki kasus ketika filter **Semua Event** pada `analytics.html` dapat menghitung sesi milik user lain.

## Perubahan aplikasi

- `analytics.html` sekarang selalu mengambil `user_id` dari session login melalui `Auth.getUserId()`.
- Query `analytics_sessions_view`, `photo_consents`, dan `lux_events` diberi filter eksplisit `user_id=eq.<USER_LOGIN>`.
- Consent Rate sekarang mengikuti filter event yang sedang dipilih.
- Data final strip tetap difilter seperti versi sebelumnya.

## Perubahan database yang wajib dijalankan

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan:

`supabase_fix_analytics_user_scope_v76.sql`

Script tersebut membuat `analytics_sessions_view` memakai `security_invoker = true` sehingga RLS pada tabel sumber tetap dihormati.

## Perilaku setelah fix

- **Semua Event** = seluruh data analytics milik user yang sedang login saja.
- **Event tertentu** = data milik user login untuk event tersebut saja.
- User A tidak ikut menghitung data User B, dan sebaliknya.
