-- Optional: Supabase Storage policy untuk welcome screen Event
-- Ini opsional, karena v41 sudah punya fallback data URL kalau upload Storage ditolak.
-- Jalankan hanya kalau kamu mau file welcome screen tersimpan sebagai public URL di bucket photobooth.

-- Pastikan bucket photobooth public.
update storage.buckets
set public = true
where id = 'photobooth';

drop policy if exists "photobooth_event_welcome_insert" on storage.objects;
create policy "photobooth_event_welcome_insert"
on storage.objects for insert
to authenticated, anon
with check (
  bucket_id = 'photobooth'
  and name like 'templates/event-welcome/%'
);

drop policy if exists "photobooth_event_welcome_select" on storage.objects;
create policy "photobooth_event_welcome_select"
on storage.objects for select
to authenticated, anon
using (
  bucket_id = 'photobooth'
  and name like 'templates/event-welcome/%'
);
