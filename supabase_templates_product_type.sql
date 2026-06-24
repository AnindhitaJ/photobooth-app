-- Lux Photobooth: split template product type
-- Jalankan di Supabase SQL Editor.
-- product_type = jenis produk, category = tema/desain.

alter table public.templates
add column if not exists product_type text not null default 'photostrip';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'templates_product_type_check'
  ) then
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

update public.templates
set product_type = 'photostrip'
where product_type is null;

create index if not exists idx_templates_product_type_created
on public.templates (product_type, created_at desc);
