import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const R2_PUBLIC_URL = String(process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const MAX_MASTER_BYTES = 20 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function requireEnvironment() {
  const required = {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_URL,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) throw new Error(`Environment belum lengkap: ${missing.join(', ')}`);
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || '');
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

async function verifySupabaseUser(accessToken) {
  if (!accessToken) throw new Error('Session tidak ditemukan. Login ulang.');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const user = await response.json().catch(() => ({}));

  if (!response.ok || !user?.id) {
    throw new Error('Session tidak valid atau sudah kedaluwarsa. Login ulang.');
  }
  return user;
}

function sanitizeName(value) {
  const cleaned = String(value || 'template')
    .replace(/\.png$/i, '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return cleaned || 'template';
}

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    requireEnvironment();
    const user = await verifySupabaseUser(getBearerToken(req));

    const masterSize = Number(req.body?.masterSize || 0);
    const thumbnailSize = Number(req.body?.thumbnailSize || 0);
    if (!Number.isFinite(masterSize) || masterSize <= 0 || masterSize > MAX_MASTER_BYTES) {
      return json(res, 400, { ok: false, error: 'Ukuran template tidak valid atau melebihi 20 MB.' });
    }
    if (!Number.isFinite(thumbnailSize) || thumbnailSize <= 0 || thumbnailSize > MAX_THUMBNAIL_BYTES) {
      return json(res, 400, { ok: false, error: 'Ukuran thumbnail tidak valid atau melebihi 2 MB.' });
    }

    const safeName = sanitizeName(req.body?.name);
    const baseKey = `templates/${user.id}/${Date.now()}_${randomUUID()}_${safeName}`;
    const masterKey = `${baseKey}.png`;
    const thumbnailKey = `${baseKey}_thumb.jpg`;
    const client = r2Client();

    const [masterUploadUrl, thumbnailUploadUrl] = await Promise.all([
      getSignedUrl(client, new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: masterKey,
        ContentType: 'image/png',
        CacheControl: CACHE_CONTROL,
      }), { expiresIn: 600 }),
      getSignedUrl(client, new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: thumbnailKey,
        ContentType: 'image/jpeg',
        CacheControl: CACHE_CONTROL,
      }), { expiresIn: 600 }),
    ]);

    return json(res, 200, {
      ok: true,
      masterKey,
      thumbnailKey,
      masterUploadUrl,
      thumbnailUploadUrl,
      masterPublicUrl: `${R2_PUBLIC_URL}/${masterKey}`,
      thumbnailPublicUrl: `${R2_PUBLIC_URL}/${thumbnailKey}`,
      cacheControl: CACHE_CONTROL,
      expiresInSeconds: 600,
    });
  } catch (error) {
    console.error('Template presign error:', error);
    return json(res, 500, { ok: false, error: error?.message || 'Gagal menyiapkan upload template.' });
  }
}
