-- Lux Photobooth — PRO Extension Logs v73
-- Jalankan di Supabase SQL Editor supaya bukti aktivasi/perpanjangan PRO tersimpan.

create table if not exists public.pro_extension_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  owner_email text,
  owner_booth_name text,
  previous_plan text,
  previous_pro_ends_at timestamptz,
  previous_days_left integer,
  new_plan text not null default 'pro',
  new_pro_ends_at timestamptz,
  new_days_left integer,
  duration_label text,
  action_type text not null check (action_type in ('activate_pro', 'extend_pro', 'set_free')),
  performed_by text,
  performed_by_email text,
  receipt_text text,
  created_at timestamptz not null default now()
);

create index if not exists pro_extension_logs_owner_email_idx
on public.pro_extension_logs (owner_email);

create index if not exists pro_extension_logs_created_at_idx
on public.pro_extension_logs (created_at desc);

alter table public.pro_extension_logs enable row level security;

drop policy if exists pro_extension_logs_super_admin_select on public.pro_extension_logs;
drop policy if exists pro_extension_logs_super_admin_insert on public.pro_extension_logs;
drop policy if exists pro_extension_logs_super_admin_update on public.pro_extension_logs;
drop policy if exists pro_extension_logs_super_admin_delete on public.pro_extension_logs;

create policy pro_extension_logs_super_admin_select
on public.pro_extension_logs
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com');

create policy pro_extension_logs_super_admin_insert
on public.pro_extension_logs
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com');

create policy pro_extension_logs_super_admin_update
on public.pro_extension_logs
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com')
with check ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com');

create policy pro_extension_logs_super_admin_delete
on public.pro_extension_logs
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com');

grant select, insert, update, delete on public.pro_extension_logs to authenticated;

-- Cek bukti terbaru:
select
  created_at,
  owner_email,
  action_type,
  previous_days_left,
  new_days_left,
  new_pro_ends_at,
  performed_by_email
from public.pro_extension_logs
order by created_at desc
limit 20;
