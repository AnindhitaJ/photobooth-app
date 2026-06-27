-- Lux Photobooth — Fix WhatsApp Register Save v62
-- Jalankan di Supabase SQL Editor.
-- Tujuan: supaya nomor WA dari form register ikut masuk ke public.profiles.whatsapp_number.

alter table public.profiles
add column if not exists whatsapp_number text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_whatsapp_number_check'
  ) then
    alter table public.profiles
    add constraint profiles_whatsapp_number_check
    check (
      whatsapp_number is null
      or whatsapp_number = ''
      or whatsapp_number ~ '^\+?[0-9]{8,20}$'
    );
  end if;
end $$;

-- Backfill akun yang sudah daftar dan nomor WA-nya tersimpan di auth user metadata.
update public.profiles p
set whatsapp_number = u.raw_user_meta_data->>'whatsapp_number'
from auth.users u
where p.id = u.id
  and (p.whatsapp_number is null or p.whatsapp_number = '')
  and coalesce(u.raw_user_meta_data->>'whatsapp_number', '') <> '';

-- Buat/replace trigger function supaya signup berikutnya otomatis simpan whatsapp_number.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    booth_name,
    email,
    whatsapp_number
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'booth_name', 'My Photobooth'),
    new.email,
    new.raw_user_meta_data->>'whatsapp_number'
  )
  on conflict (id) do update
  set
    booth_name = excluded.booth_name,
    email = excluded.email,
    whatsapp_number = coalesce(excluded.whatsapp_number, public.profiles.whatsapp_number);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Cek:
select id, booth_name, email, whatsapp_number
from public.profiles
order by email;
