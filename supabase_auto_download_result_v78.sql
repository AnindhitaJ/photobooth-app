-- Auto Download Result toggle
-- Jalankan sekali di Supabase SQL Editor.

alter table public.profiles
  add column if not exists auto_download_result boolean not null default false;

comment on column public.profiles.auto_download_result is
  'Jika true, result.html otomatis mengunduh hasil utama, foto satuan, GIF, dan live photo sebagai file terpisah.';
