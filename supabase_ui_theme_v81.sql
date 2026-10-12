-- Tema warna aplikasi per akun
-- Jalankan sekali di Supabase SQL Editor.
-- Default 'pink' (tampilan asli). Nilai valid: pink, biru, cokelat, hijau, ungu, merah, oranye, teal, slate, emas.
-- Nilai yang tidak dikenal otomatis dianggap 'pink' oleh ui-theme.js.

alter table public.profiles
  add column if not exists ui_theme text not null default 'pink';

comment on column public.profiles.ui_theme is
  'Tema warna UI aplikasi untuk akun ini (dibaca oleh ui-theme.js, diatur di Admin > Profil).';
