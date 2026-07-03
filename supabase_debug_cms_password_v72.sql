-- Lux Photobooth — Debug CMS Password v72
-- Jalankan ini untuk cek apakah row profiles nyambung ke auth.users.

select
  p.id as profile_id,
  p.email as profile_email,
  u.id as auth_user_id,
  u.email as auth_email,
  u.email_confirmed_at,
  u.updated_at as auth_updated_at,
  case
    when u.id is null then 'ERROR: profile tidak punya pasangan auth.users'
    when lower(coalesce(p.email,'')) <> lower(coalesce(u.email,'')) then 'WARNING: email profile beda dengan auth'
    else 'OK'
  end as auth_link_status
from public.profiles p
left join auth.users u on u.id = p.id
order by p.email;

-- Cek user tertentu:
-- select p.id, p.email, u.id, u.email, u.email_confirmed_at, u.updated_at
-- from public.profiles p
-- left join auth.users u on u.id = p.id
-- where p.email = 'email@user.com';
