import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const MAX_UPLOAD_BYTES = Math.max(1, Number(process.env.MAX_UPLOAD_BYTES || 12 * 1024 * 1024));

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/webm',
  'application/json'
]);

function json(res, status, body) {
  return res.status(status).json(body);
}

function readBearer(req) {
  const value = String(req.headers.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

async function verifySupabaseUser(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const error = new Error('SUPABASE_URL atau SUPABASE_ANON_KEY belum diset di Vercel Environment Variables.');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id) {
    const error = new Error('Session Supabase tidak valid atau sudah kedaluwarsa.');
    error.statusCode = 401;
    throw error;
  }
  return data;
}

function validateObjectKey(fileName, userId) {
  const key = String(fileName || '').trim();
  if (!key || key.length > 512) {
    throw new Error('Nama file tidak valid.');
  }
  if (key.includes('..') || key.includes('\\') || /[\r\n\0]/.test(key)) {
    throw new Error('Nama file mengandung karakter terlarang.');
  }

  // Browser boleh menentukan timestamp dan nama file, tetapi prefix pemilik wajib
  // cocok dengan user ID yang diambil langsung dari access token Supabase.
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^results/${escapedUserId}_[0-9]{10,17}_[a-zA-Z0-9._-]+$`);
  if (!pattern.test(key)) {
    const error = new Error('File path tidak cocok dengan akun yang sedang login.');
    error.statusCode = 403;
    throw error;
  }
  return key;
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); }
    catch { throw new Error('Body JSON tidak valid.'); }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const accessToken = readBearer(req);
    if (!accessToken) return json(res, 401, { error: 'Authorization token tidak ditemukan.' });

    const user = await verifySupabaseUser(accessToken);
    const body = parseBody(req);
    const contentType = String(body.contentType || '').toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return json(res, 415, { error: `Tipe file tidak diizinkan: ${contentType || 'unknown'}` });
    }
    if (typeof body.data !== 'string' || !body.data) {
      return json(res, 400, { error: 'Data file tidak tersedia.' });
    }

    const key = validateObjectKey(body.fileName, user.id);
    const buffer = Buffer.from(body.data, 'base64');
    if (!buffer.length) return json(res, 400, { error: 'File kosong.' });
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return json(res, 413, { error: `Ukuran file melebihi batas ${MAX_UPLOAD_BYTES} byte.` });
    }

    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET || !process.env.R2_PUBLIC_URL) {
      return json(res, 500, { error: 'Konfigurasi Cloudflare R2 di Vercel belum lengkap.' });
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        owner_id: user.id,
        owner_email: String(user.email || '').slice(0, 256)
      }
    }));

    const baseUrl = String(process.env.R2_PUBLIC_URL).replace(/\/$/, '');
    return json(res, 200, {
      ok: true,
      key,
      ownerId: user.id,
      url: `${baseUrl}/${key}`
    });
  } catch (error) {
    console.error('R2 upload error:', error);
    return json(res, error?.statusCode || 400, {
      error: error?.message || 'Upload gagal.'
    });
  }
}
