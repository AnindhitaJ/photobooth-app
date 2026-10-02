-- Auto Download setting for photobooth profile
-- Run once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists auto_download boolean not null default false;
