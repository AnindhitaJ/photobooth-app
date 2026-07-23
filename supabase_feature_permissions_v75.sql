-- LUX Photobooth feature permission migration
-- Jalankan satu kali di Supabase SQL Editor sebelum deploy source terbaru.

begin;

alter table public.profiles
  add column if not exists permissions jsonb;

-- Semua akun lama dan akun baru memperoleh semua fitur secara default.
update public.profiles
set permissions = '["all"]'::jsonb
where permissions is null
   or jsonb_typeof(permissions) <> 'array'
   or jsonb_array_length(permissions) = 0;

alter table public.profiles
  alter column permissions set default '["all"]'::jsonb,
  alter column permissions set not null;

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

comment on column public.profiles.permissions is
  'Fitur yang boleh dipakai akun. ["all"] berarti seluruh fitur. Hanya super admin LUX yang boleh mengubah.';

-- Mencegah pemilik akun mengubah permission-nya sendiri melalui REST/API.
-- Service role tetap dapat mengubahnya melalui endpoint CMS yang terverifikasi.
create or replace function public.guard_profile_permission_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if new.permissions is distinct from old.permissions then
    if jwt_role <> 'service_role' and jwt_email <> 'luxphotobooth.id@gmail.com' then
      raise exception 'Permission hanya dapat diubah oleh CMS LUX super admin.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_permission_update on public.profiles;
create trigger trg_guard_profile_permission_update
before update of permissions on public.profiles
for each row execute function public.guard_profile_permission_update();

commit;

-- Verifikasi setelah migrasi:
-- select id, email, permissions from public.profiles order by created_at desc;
