Supabase Edge Function: admin-change-password

Fungsi ini dibutuhkan karena password user lain hanya boleh diubah dari server memakai SUPABASE_SERVICE_ROLE_KEY.
Jangan taruh service role key di frontend/browser.

Deploy:
1. supabase functions deploy admin-change-password
2. set secret:
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxxxx
   supabase secrets set SUPER_ADMIN_EMAIL=luxphotobooth.id@gmail.com

CMS akan memanggil:
https://<project>.supabase.co/functions/v1/admin-change-password

Payload:
{ "user_id": "...", "password": "passwordBaru" }
