-- Lux Photobooth — WhatsApp Number for Owner Registration
-- Jalankan di Supabase SQL Editor sebelum deploy v47.

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
      or whatsapp_number ~ '^\\+?[0-9]{8,20}$'
    );
  end if;
end $$;
