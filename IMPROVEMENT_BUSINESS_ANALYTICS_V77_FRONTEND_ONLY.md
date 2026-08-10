# Business Analytics V77 — Frontend Only

Versi ini tidak membutuhkan perubahan SQL atau migrasi database baru.

## Improvement
- KPI: Total Session, Total Foto, Avg Foto/Session, Consent Rate.
- Perbandingan otomatis dengan periode sebelumnya untuk Hari Ini, 7 Hari, 30 Hari, dan Custom Range.
- Custom date range.
- Session Trend chart tanpa library eksternal.
- Peak Hours dalam bentuk ranking dan share.
- Product Mix Photostrip vs Photobox.
- Template, kategori, dan peak day menampilkan persentase share.
- Event Performance: session, foto, average foto, share, consent.
- Auto Insight yang lebih actionable.
- Export CSV mengikuti filter aktif.
- Dedup session berdasarkan session_id/final strip agar metrik lebih stabil.

## Data integrity frontend
- `result.html` sekarang ikut menyimpan `event_id` pada metadata `photo_sessions` menggunakan kolom yang sudah existing.
- Consent pada `result.html` memakai `cloudSessionId` yang sama dengan sesi foto, bukan membuat timestamp baru.
- Tidak ada file SQL yang diubah dan tidak ada SQL baru yang perlu dijalankan.

## Catatan
Data historis yang sebelumnya tersimpan tanpa `event_id` tetap tidak bisa direkonstruksi otomatis. Perbaikan event/session ID berlaku untuk data baru setelah versi ini dipakai.
