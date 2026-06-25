-- Lux Photobooth Events
-- Jalankan di Supabase SQL Editor.
-- Fitur event hanya untuk PRO/super admin di aplikasi.

create extension if not exists pgcrypto;

create table if not exists public.lux_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  welcome_screen_url text,
  welcome_overlay_enabled boolean not null default true,
  template_ids jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lux_events enable row level security;

drop policy if exists "lux_events_select_own" on public.lux_events;
create policy "lux_events_select_own"
on public.lux_events for select
using (auth.uid() = user_id);

drop policy if exists "lux_events_insert_own" on public.lux_events;
create policy "lux_events_insert_own"
on public.lux_events for insert
with check (auth.uid() = user_id);

drop policy if exists "lux_events_update_own" on public.lux_events;
create policy "lux_events_update_own"
on public.lux_events for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "lux_events_delete_own" on public.lux_events;
create policy "lux_events_delete_own"
on public.lux_events for delete
using (auth.uid() = user_id);

create index if not exists idx_lux_events_user_created
on public.lux_events (user_id, created_at desc);

-- Kalau upload welcome screen gagal karena policy storage,
-- pastikan bucket "photobooth" punya policy upload/select untuk user terautentikasi
-- seperti policy yang sudah dipakai template/result.
