# admin-toggle-active

Supabase Edge Function untuk mengaktifkan / menonaktifkan akun user dari CMS.
Menggunakan service_role key sehingga bisa bypass RLS policy.

## Deploy

```bash
supabase functions deploy admin-toggle-active
```

## Request

POST /functions/v1/admin-toggle-active

Headers:
  Authorization: Bearer <super_admin_access_token>
  Content-Type: application/json

Body:
  { "user_id": "<uuid>", "is_active": true | false }

## Response

{ "ok": true }
atau
{ "ok": false, "error": "pesan error" }

## Environment Variables (wajib ada di Supabase secrets)

- SUPABASE_URL         — otomatis tersedia
- SUPABASE_SERVICE_ROLE_KEY — otomatis tersedia
- SUPER_ADMIN_EMAIL    — set via: supabase secrets set SUPER_ADMIN_EMAIL=luxphotobooth.id@gmail.com
