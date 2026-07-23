-- LUX Photobooth — Fix Gallery Product Type v74
-- Jalankan di Supabase SQL Editor setelah deploy result.html terbaru.
-- Tujuan:
-- 1. Menormalkan nilai product_type yang kosong/tidak valid.
-- 2. Memperbaiki sesi yang sudah memiliki petunjuk Photobox pada metadata template.
-- 3. Menyediakan query pemeriksaan sesi lama yang masih belum dapat ditentukan.

update public.photo_sessions
set product_type = 'photobox'
where product_type is null
  and (
    lower(coalesce(template_category, '')) like '%photobox%'
    or lower(coalesce(template_category, '')) like '%4r%'
    or lower(coalesce(template_name, '')) like '%photobox%'
    or lower(coalesce(template_name, '')) like '%4r%'
  );

update public.photo_sessions
set product_type = 'photostrip'
where product_type is null
  and (
    lower(coalesce(template_category, '')) like '%photostrip%'
    or lower(coalesce(template_name, '')) like '%photostrip%'
  );

-- Sesi tanpa metadata template tidak aman ditebak melalui SQL karena nama file
-- final selalu memakai suffix _strip.jpg untuk kedua jenis produk. Versi galeri
-- terbaru memulihkannya di browser berdasarkan rasio gambar.
select
  session_id,
  min(created_at) as created_at,
  max(product_type) as product_type,
  max(template_name) as template_name,
  max(template_category) as template_category,
  count(*) as file_count
from public.photo_sessions
group by session_id
order by min(created_at) desc;
