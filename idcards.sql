-- Optional Supabase schema for ID Card Photobooth
-- Jalankan di Supabase SQL editor kalau mau history ID Card benar-benar tersimpan ke database.

create table if not exists public.id_cards (
  id uuid primary key default gen_random_uuid(),
  local_id text unique,
  profile_id uuid,
  nickname text,
  id_number text unique,
  role text,
  mood text,
  fun_fact text,
  language text default 'id',
  color_theme text,
  photo_url text,
  logo_url text,
  export_url text,
  created_at timestamptz default now()
);

alter table public.id_cards enable row level security;

create policy "id_cards_select_own"
on public.id_cards for select
using (auth.uid() = profile_id);

create policy "id_cards_insert_own"
on public.id_cards for insert
with check (auth.uid() = profile_id);

create policy "id_cards_update_own"
on public.id_cards for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "id_cards_delete_own"
on public.id_cards for delete
using (auth.uid() = profile_id);
