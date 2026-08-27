-- LUX Photobooth - photo_sessions Gallery policy fix
-- Jalankan sekali di Supabase SQL Editor.
-- Tujuan: user authenticated dapat insert dan membaca metadata foto miliknya sendiri.

alter table public.photo_sessions enable row level security;

grant select, insert, update, delete on table public.photo_sessions to authenticated;

drop policy if exists "photo_sessions_select_own_v2" on public.photo_sessions;
drop policy if exists "photo_sessions_insert_own_v2" on public.photo_sessions;
drop policy if exists "photo_sessions_update_own_v2" on public.photo_sessions;
drop policy if exists "photo_sessions_delete_own_v2" on public.photo_sessions;

create policy "photo_sessions_select_own_v2"
on public.photo_sessions
for select
to authenticated
using (user_id::text = auth.uid()::text);

create policy "photo_sessions_insert_own_v2"
on public.photo_sessions
for insert
to authenticated
with check (user_id::text = auth.uid()::text);

create policy "photo_sessions_update_own_v2"
on public.photo_sessions
for update
to authenticated
using (user_id::text = auth.uid()::text)
with check (user_id::text = auth.uid()::text);

create policy "photo_sessions_delete_own_v2"
on public.photo_sessions
for delete
to authenticated
using (user_id::text = auth.uid()::text);

-- Cek policy aktif
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'photo_sessions'
order by policyname;
