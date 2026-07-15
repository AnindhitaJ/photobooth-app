/**
 * Vercel server route: create a Supabase Auth user for the LUX super admin.
 * Required environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 * - SUPER_ADMIN_EMAIL (default: luxphotobooth.id@gmail.com)
 */

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPER_ADMIN_EMAIL = String(
  process.env.SUPER_ADMIN_EMAIL || 'luxphotobooth.id@gmail.com'
).trim().toLowerCase();

function send(res, status, body) {
  res.status(status).json(body);
}

function serviceHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { message: text }; }
}

async function verifyRequester(accessToken) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await readJson(response);
  if (!response.ok || !data?.email) {
    throw new Error('Session admin tidak valid atau sudah kedaluwarsa.');
  }
  if (String(data.email).trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
    const error = new Error('Akses ditolak. Hanya super admin yang dapat membuat akun.');
    error.statusCode = 403;
    throw error;
  }
  return data;
}

async function rollbackUser(userId) {
  if (!userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: serviceHeaders()
  }).catch(() => {});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return send(res, 500, {
      ok: false,
      error: 'SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset di environment deployment.'
    });
  }

  try {
    const authorization = String(req.headers.authorization || '');
    const accessToken = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';
    if (!accessToken) return send(res, 401, { ok: false, error: 'Authorization token tidak ditemukan.' });

    await verifyRequester(accessToken);

    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); }
      catch { return send(res, 400, { ok: false, error: 'Body JSON tidak valid.' }); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};

    const boothName = String(body.booth_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const whatsapp = String(body.whatsapp_number || '').replace(/[\s\-().]/g, '');
    const password = String(body.password || '');

    if (!boothName) return send(res, 400, { ok: false, error: 'Nama photobooth harus diisi.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return send(res, 400, { ok: false, error: 'Email tidak valid.' });
    if (!/^\+?[0-9]{8,20}$/.test(whatsapp)) return send(res, 400, { ok: false, error: 'Nomor WhatsApp tidak valid.' });
    if (password.length < 6) return send(res, 400, { ok: false, error: 'Password minimal 6 karakter.' });

    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          booth_name: boothName,
          whatsapp_number: whatsapp
        }
      })
    });
    const created = await readJson(createResponse);
    if (!createResponse.ok) {
      throw new Error(created?.msg || created?.message || created?.error || 'Supabase gagal membuat user.');
    }

    const userId = created?.id || created?.user?.id;
    if (!userId) throw new Error('Supabase tidak mengembalikan user ID.');

    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST',
      headers: serviceHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation'
      }),
      body: JSON.stringify({
        id: userId,
        booth_name: boothName,
        email,
        whatsapp_number: whatsapp
      })
    });
    const profile = await readJson(profileResponse);

    if (!profileResponse.ok) {
      await rollbackUser(userId);
      throw new Error(profile?.message || profile?.details || 'Profile gagal dibuat; user Auth sudah dibatalkan.');
    }

    return send(res, 200, {
      ok: true,
      user: {
        id: userId,
        email,
        booth_name: boothName,
        whatsapp_number: whatsapp
      }
    });
  } catch (error) {
    return send(res, error?.statusCode || 400, {
      ok: false,
      error: error?.message || String(error)
    });
  }
}
