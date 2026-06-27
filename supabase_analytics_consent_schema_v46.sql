-- Lux Photobooth — Analytics + Content Sharing Consent Schema
-- Jalankan di Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1) Template product type
alter table public.templates
add column if not exists product_type text not null default 'photostrip';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'templates_product_type_check') then
    alter table public.templates
    add constraint templates_product_type_check
    check (product_type in ('photostrip', 'photobox'));
  end if;
end $$;

update public.templates
set product_type = 'photobox'
where lower(coalesce(category, '')) like '%photobox%'
   or lower(coalesce(category, '')) = '4r'
   or lower(coalesce(category, '')) like '%4r%';

create index if not exists idx_templates_product_type on public.templates(product_type);

-- 2) Event table
create table if not exists public.lux_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  welcome_screen_url text,
  welcome_overlay_enabled boolean not null default true,
  template_ids jsonb not null default '[]'::jsonb,
  product_types jsonb not null default '["photostrip","photobox"]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lux_events
add column if not exists product_types jsonb not null default '["photostrip","photobox"]'::jsonb;

alter table public.lux_events enable row level security;

drop policy if exists "lux_events_select_own" on public.lux_events;
create policy "lux_events_select_own" on public.lux_events
for select using (auth.uid() = user_id);

drop policy if exists "lux_events_insert_own" on public.lux_events;
create policy "lux_events_insert_own" on public.lux_events
for insert with check (auth.uid() = user_id);

drop policy if exists "lux_events_update_own" on public.lux_events;
create policy "lux_events_update_own" on public.lux_events
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "lux_events_delete_own" on public.lux_events;
create policy "lux_events_delete_own" on public.lux_events
for delete using (auth.uid() = user_id);

create index if not exists idx_lux_events_user_created
on public.lux_events(user_id, created_at desc);

-- 3) Photo sessions analytics columns
alter table public.photo_sessions
add column if not exists event_id uuid references public.lux_events(id) on delete set null;

alter table public.photo_sessions
add column if not exists template_id uuid references public.templates(id) on delete set null;

alter table public.photo_sessions
add column if not exists product_type text;

alter table public.photo_sessions
add column if not exists photo_count integer default 1;

alter table public.photo_sessions
add column if not exists session_duration integer;

alter table public.photo_sessions
add column if not exists session_id text;

alter table public.photo_sessions
add column if not exists template_name text;

alter table public.photo_sessions
add column if not exists template_category text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photo_sessions_product_type_check') then
    alter table public.photo_sessions
    add constraint photo_sessions_product_type_check
    check (product_type is null or product_type in ('photostrip', 'photobox'));
  end if;
end $$;

create index if not exists idx_photo_sessions_event_created
on public.photo_sessions(event_id, created_at desc);

create index if not exists idx_photo_sessions_template_created
on public.photo_sessions(template_id, created_at desc);

create index if not exists idx_photo_sessions_product_created
on public.photo_sessions(product_type, created_at desc);

create index if not exists idx_photo_sessions_session_id
on public.photo_sessions(session_id);

-- 4) Owner content sharing settings
create table if not exists public.content_sharing_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  instagram_brand text,
  tiktok_brand text,
  consent_message text default 'Kami ingin menggunakan beberapa hasil foto terbaik sebagai konten di Instagram atau TikTok.',
  follow_message text default 'Ikuti akun kami untuk melihat hasil foto dan konten terbaru.',
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.content_sharing_settings enable row level security;

drop policy if exists "content_sharing_settings_select_own" on public.content_sharing_settings;
create policy "content_sharing_settings_select_own" on public.content_sharing_settings
for select using (auth.uid() = user_id);

drop policy if exists "content_sharing_settings_insert_own" on public.content_sharing_settings;
create policy "content_sharing_settings_insert_own" on public.content_sharing_settings
for insert with check (auth.uid() = user_id);

drop policy if exists "content_sharing_settings_update_own" on public.content_sharing_settings;
create policy "content_sharing_settings_update_own" on public.content_sharing_settings
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 5) Consent data
create table if not exists public.photo_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_session_id uuid references public.photo_sessions(id) on delete set null,
  session_id text,
  event_id uuid references public.lux_events(id) on delete set null,
  publish_consent boolean not null default false,
  tag_consent boolean not null default false,
  instagram_username text,
  tiktok_username text,
  final_photo_url text,
  created_at timestamptz not null default now()
);

alter table public.photo_consents enable row level security;

drop policy if exists "photo_consents_select_own" on public.photo_consents;
create policy "photo_consents_select_own" on public.photo_consents
for select using (auth.uid() = user_id);

drop policy if exists "photo_consents_insert_own" on public.photo_consents;
create policy "photo_consents_insert_own" on public.photo_consents
for insert with check (auth.uid() = user_id);

drop policy if exists "photo_consents_update_own" on public.photo_consents;
create policy "photo_consents_update_own" on public.photo_consents
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "photo_consents_delete_own" on public.photo_consents;
create policy "photo_consents_delete_own" on public.photo_consents
for delete using (auth.uid() = user_id);

create index if not exists idx_photo_consents_user_created
on public.photo_consents(user_id, created_at desc);

create index if not exists idx_photo_consents_event_created
on public.photo_consents(event_id, created_at desc);

create index if not exists idx_photo_consents_publish
on public.photo_consents(publish_consent, created_at desc);

create index if not exists idx_photo_consents_tag
on public.photo_consents(tag_consent, created_at desc);

create index if not exists idx_photo_consents_session_id
on public.photo_consents(session_id);

-- 6) Analytics helper view
create or replace view public.analytics_sessions_view as
select
  ps.id,
  ps.user_id,
  ps.event_id,
  le.name as event_name,
  ps.template_id,
  coalesce(ps.template_name, t.name) as template_name,
  coalesce(ps.template_category, t.category) as template_category,
  coalesce(ps.product_type, t.product_type) as product_type,
  ps.photo_count,
  ps.session_duration,
  ps.file_path,
  ps.created_at
from public.photo_sessions ps
left join public.lux_events le on le.id = ps.event_id
left join public.templates t on t.id = ps.template_id;
