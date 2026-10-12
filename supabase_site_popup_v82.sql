-- Popup halaman depan (diatur dari CMS oleh super admin, tampil ke semua orang)
-- Jalankan sekali di Supabase SQL Editor.

create table if not exists public.site_popup (
  id          text primary key default 'main',
  enabled     boolean not null default false,
  title       text not null default '',
  description text not null default '',
  banner_url  text,
  version     integer not null default 1,   -- naik setiap disimpan: yang pernah menutup popup akan melihatnya lagi
  updated_at  timestamptz not null default now()
);

alter table public.site_popup enable row level security;

-- Semua orang (termasuk yang belum login) boleh MEMBACA
drop policy if exists site_popup_public_select on public.site_popup;
create policy site_popup_public_select
on public.site_popup for select
to anon, authenticated
using (true);

-- Hanya super admin yang boleh MENGUBAH
drop policy if exists site_popup_super_admin_insert on public.site_popup;
create policy site_popup_super_admin_insert
on public.site_popup for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com');

drop policy if exists site_popup_super_admin_update on public.site_popup;
create policy site_popup_super_admin_update
on public.site_popup for update
to authenticated
using ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com')
with check ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com');

drop policy if exists site_popup_super_admin_delete on public.site_popup;
create policy site_popup_super_admin_delete
on public.site_popup for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com');

-- Baris awal (nonaktif)
insert into public.site_popup (id, enabled) values ('main', false)
on conflict (id) do nothing;

-- Upload banner ke Storage (OPSIONAL).
-- Tanpa ini, CMS otomatis menyimpan banner sebagai data URL yang sudah dikompres di tabel.
update storage.buckets set public = true where id = 'photobooth';

drop policy if exists "photobooth_site_popup_insert" on storage.objects;
create policy "photobooth_site_popup_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'photobooth'
  and name like 'site/popup/%'
  and (auth.jwt() ->> 'email') = 'luxphotobooth.id@gmail.com'
);
