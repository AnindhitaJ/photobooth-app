-- Lux Photobooth — Restore Gallery Metadata v61
-- Pakai ini kalau Galeri jadi 0 sesi setelah cleanup metadata.
-- SQL ini mencoba mengembalikan baris photo_sessions dari file final result yang masih ada di Storage.
-- Tidak menghapus file apa pun.

insert into public.photo_sessions (
  user_id,
  file_path,
  created_at,
  product_type,
  photo_count,
  session_id
)
select
  ((regexp_match(o.name, '^results/([0-9a-fA-F-]{36})_(\d{13})_(.+)$'))[1])::uuid as user_id,
  o.name as file_path,
  coalesce(o.created_at, now()) as created_at,
  case
    -- kalau nama file lama mengandung photobox/4r, tandai photobox.
    -- kalau tidak ada petunjuk, default photostrip karena Storage tidak menyimpan ukuran gambar.
    when lower(o.name) like '%photobox%' or lower(o.name) like '%4r%' then 'photobox'
    else 'photostrip'
  end as product_type,
  1 as photo_count,
  (regexp_match(o.name, '^results/([0-9a-fA-F-]{36})_(\d{13})_(.+)$'))[2] as session_id
from storage.objects o
where o.bucket_id = 'photobooth'
  and o.name like 'results/%'
  and regexp_match(o.name, '^results/([0-9a-fA-F-]{36})_(\d{13})_(.+)$') is not null
  and (
    -- final result terbaru
    o.name like '%_strip.jpg'
    or o.name like '%/strip.jpg'
    -- final result lama yang pernah dipakai app
    or o.name like '%_foto.jpg'
    or o.name like '%/foto.jpg'
  )
  and not exists (
    select 1
    from public.photo_sessions ps
    where ps.file_path = o.name
  );

-- Cek hasil:
select product_type, count(*) as total
from public.photo_sessions
group by product_type
order by product_type;
