/**
 * Update feature permissions for one profile.
 * Only the exact LUX super-admin email is authorized.
 */

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPER_ADMIN_EMAIL = String(
  process.env.SUPER_ADMIN_EMAIL || 'luxphotobooth.id@gmail.com'
).trim().toLowerCase();

const FEATURE_KEYS = Object.freeze([
  'photostrip', 'photobooth', 'ganci', 'kalender', 'idcard', 'magazine',
  'newspaper', 'trading-card', 'certificate', 'game-character', 'detective-case'
]);
const ALLOWED_KEYS = new Set(['all', ...FEATURE_KEYS]);

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
    const error = new Error('Session admin tidak valid atau sudah kedaluwarsa.');
    error.statusCode = 401;
    throw error;
  }
  if (String(data.email).trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
    const error = new Error('Akses ditolak. Wajib login sebagai luxphotobooth.id@gmail.com.');
    error.statusCode = 403;
    throw error;
  }
  return data;
}

function normalizePermissions(input) {
  if (!Array.isArray(input)) {
    const error = new Error('Format permissions harus berupa array.');
    error.statusCode = 400;
    throw error;
  }
  const values = [...new Set(input.map(value => String(value || '').trim().toLowerCase()))]
    .filter(Boolean);
  if (!values.length) {
    const error = new Error('Pilih minimal satu permission.');
    error.statusCode = 400;
    throw error;
  }
  const invalid = values.filter(value => !ALLOWED_KEYS.has(value));
  if (invalid.length) {
    const error = new Error(`Permission tidak dikenal: ${invalid.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  if (values.includes('all') || FEATURE_KEYS.every(key => values.includes(key))) return ['all'];
  return values.filter(value => value !== 'all');
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

    const userId = String(body.user_id || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return send(res, 400, { ok: false, error: 'User ID tidak valid.' });
    }
    const permissions = normalizePermissions(body.permissions);

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: serviceHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify({ permissions, updated_at: new Date().toISOString() })
      }
    );
    const profile = await readJson(response);
    if (!response.ok) {
      throw new Error(profile?.message || profile?.details || profile?.error || 'Gagal memperbarui permission.');
    }
    if (!Array.isArray(profile) || !profile[0]) {
      const error = new Error('Profile tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    return send(res, 200, {
      ok: true,
      user_id: userId,
      permissions: profile[0].permissions || permissions
    });
  } catch (error) {
    return send(res, error?.statusCode || 400, {
      ok: false,
      error: error?.message || String(error)
    });
  }
}
