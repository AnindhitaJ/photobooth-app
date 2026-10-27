import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Presigned URL untuk upload hasil photobooth (strip, foto satuan, GIF, live strip, manifest)
 * LANGSUNG dari browser ke R2. File tidak melewati Vercel, jadi tidak kena limit body 4,5 MB
 * dan tidak ada transfer data file lewat fungsi serverless.
 *
 * Key dibentuk di server dari user yang tervalidasi: results/<userId>_<ts>_<filename>
 */

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const R2_PUBLIC_URL = String(process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/webm', 'video/mp4',
  'application/json',
]);

// File hasil bisa ditimpa (key sama setelah foto diedit), jadi jangan immutable.
// Manifest selalu harus fresh.
const CACHE_MEDIA = 'public, max-age=300';
const CACHE_MANIFEST = 'no-cache';

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || '');
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

async function verifySupabaseUser(accessToken) {
  if (!accessToken) throw new Error('Session tidak ditemukan. Login ulang.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const user = await response.json().catch(() => ({}));
  if (!response.ok || !user?.id) throw new Error('Session tidak valid atau sudah kedaluwarsa. Login ulang.');
  return user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const missing = Object.entries({
      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY, R2_PUBLIC_URL,
      R2_ENDPOINT: process.env.R2_ENDPOINT,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET: process.env.R2_BUCKET,
    }).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new Error(`Environment belum lengkap: ${missing.join(', ')}`);

    const user = await verifySupabaseUser(getBearerToken(req));

    const { userId, ts, filename, contentType, size } = req.body || {};
    if (String(userId) !== String(user.id)) {
      return json(res, 403, { ok: false, error: 'User tidak cocok dengan session.' });
    }
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || tsNum <= 0) {
      return json(res, 400, { ok: false, error: 'Session id tidak valid.' });
    }
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(String(filename || '')) || String(filename).includes('..')) {
      return json(res, 400, { ok: false, error: 'Nama file tidak valid.' });
    }
    const type = String(contentType || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(type)) {
      return json(res, 400, { ok: false, error: 'Tipe file tidak diizinkan.' });
    }
    const bytes = Number(size);
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
      return json(res, 400, { ok: false, error: 'Ukuran file tidak valid atau melebihi 25 MB.' });
    }

    const key = `results/${user.id}_${Math.trunc(tsNum)}_${filename}`;
    const cacheControl = type === 'application/json' ? CACHE_MANIFEST : CACHE_MEDIA;

    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: type,
      CacheControl: cacheControl,
    }), { expiresIn: 300 });

    return json(res, 200, {
      ok: true, key, uploadUrl, cacheControl,
      publicUrl: `${R2_PUBLIC_URL}/${key}`,
      contentType: type,
    });
  } catch (error) {
    console.error('Result presign error:', error);
    return json(res, 500, { ok: false, error: error?.message || 'Gagal menyiapkan upload.' });
  }
}
