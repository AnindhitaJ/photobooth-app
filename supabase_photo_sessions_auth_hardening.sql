-- Jalankan sekali di Supabase SQL Editor.
-- Memastikan metadata foto hanya dapat dibaca/ditulis oleh user yang sama
-- dengan JWT Supabase aktif.

alter table public.photo_sessions enable row level security;

-- Hapus policy versi patch ini agar script aman dijalankan ulang.
drop policy if exists "photo_sessions_select_own_v2" on public.photo_sessions;
drop policy if exists "photo_sessions_insert_own_v2" on public.photo_sessions;
drop policy if exists "photo_sessions_update_own_v2" on public.photo_sessions;
drop policy if exists "photo_sessions_delete_own_v2" on public.photo_sessions;

create policy "photo_sessions_select_own_v2"
on public.photo_sessions
for select
to authenticated
using (auth.uid() = user_id);

create policy "photo_sessions_insert_own_v2"
on public.photo_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "photo_sessions_update_own_v2"
on public.photo_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "photo_sessions_delete_own_v2"
on public.photo_sessions
for delete
to authenticated
using (auth.uid() = user_id);
