-- LUX Photobooth: tambah permission "vintage" dan "upload-photo"
-- Jalankan SETELAH supabase_feature_permissions_v75.sql, satu kali di Supabase SQL Editor.

begin;

alter table public.profiles
  drop constraint if exists profiles_permissions_valid;

alter table public.profiles
  add constraint profiles_permissions_valid check (
    jsonb_typeof(permissions) = 'array'
    and jsonb_array_length(permissions) > 0
    and permissions <@ '[
      "all",
      "photostrip",
      "photobooth",
      "vintage",
      "upload-photo",
      "ganci",
      "kalender",
      "idcard",
      "magazine",
      "newspaper",
      "trading-card",
      "certificate",
      "game-character",
      "detective-case"
    ]'::jsonb
  );

-- Vintage dulu ikut permission "photostrip". Agar akun yang sudah punya photostrip
-- tidak kehilangan Vintage, beri "vintage" otomatis. Setelah ini bisa diatur sendiri dari CMS.
-- "upload-photo" fitur baru, sengaja TIDAK diberikan otomatis (aktifkan per akun dari CMS).
update public.profiles
set permissions = permissions || '["vintage"]'::jsonb
where not (permissions ? 'all')
  and (permissions ? 'photostrip')
  and not (permissions ? 'vintage');

commit;

-- Verifikasi:
-- select id, email, permissions from public.profiles order by created_at desc;
