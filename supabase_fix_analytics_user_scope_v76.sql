-- Lux Photobooth — Business Analytics user isolation v76
-- Jalankan sekali di Supabase SQL Editor setelah deploy versi ini.
-- Tujuan:
-- 1) memastikan analytics_sessions_view menghormati RLS tabel asal;
-- 2) memastikan photo_sessions hanya dapat dibaca user pemilik data;
-- 3) mempertahankan isolasi event per user.

begin;

alter table public.photo_sessions enable row level security;
alter table public.lux_events enable row level security;
alter table public.photo_consents enable row level security;

-- Photo sessions: user hanya dapat membaca sesi miliknya sendiri.
drop policy if exists "photo_sessions_select_own_v2" on public.photo_sessions;
create policy "photo_sessions_select_own_v2"
on public.photo_sessions
for select
to authenticated
using (auth.uid() = user_id);

-- View dijalankan sebagai caller (authenticated user), bukan sebagai owner view.
-- Dengan demikian RLS pada photo_sessions/lux_events tetap berlaku saat view dibaca.
alter view public.analytics_sessions_view
set (security_invoker = true);

commit;
