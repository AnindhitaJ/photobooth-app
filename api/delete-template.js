import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'photobooth';
const R2_PUBLIC_URL = String(process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const SUPER_ADMIN_EMAIL = String(process.env.SUPER_ADMIN_EMAIL || 'luxphotobooth.id@gmail.com').toLowerCase();

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

function serviceHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
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
  if (!response.ok || !user?.id) throw new Error('Session tidak valid atau sudah kedaluwarsa.');
  return user;
}

async function fetchTemplate(templateId) {
  const query = new URLSearchParams({
    id: `eq.${templateId}`,
    select: 'id,user_id,src',
    limit: '1',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/templates?${query}`, {
    headers: serviceHeaders(),
  });
  const rows = await response.json().catch(() => []);
  if (!response.ok) throw new Error(`Gagal membaca template: HTTP ${response.status}`);
  return Array.isArray(rows) ? rows[0] : null;
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

function parseR2Key(src) {
  if (!src || !src.startsWith(`${R2_PUBLIC_URL}/`)) return null;
  const key = decodeURIComponent(src.slice(R2_PUBLIC_URL.length + 1));
  if (!key.startsWith('templates/') || key.startsWith('templates/event-welcome/')) return null;
  return key;
}

function parseSupabaseKey(src) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/`;
  if (!src || !src.startsWith(prefix)) return null;
  const key = decodeURIComponent(src.slice(prefix.length));
  if (!key.startsWith('templates/') || key.startsWith('templates/event-welcome/')) return null;
  return key;
}

async function deleteR2Files(masterKey) {
  const thumbKey = masterKey.replace(/\.png$/i, '_thumb.jpg');
  const client = r2Client();
  await Promise.all([
    client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: masterKey })),
    client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: thumbKey })),
  ]);
  return [masterKey, thumbKey];
}

async function deleteSupabaseFiles(masterKey) {
  const thumbKey = masterKey.replace(/\.png$/i, '_thumb.jpg');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}`, {
    method: 'DELETE',
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [masterKey, thumbKey] }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gagal menghapus file Supabase: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }
  return [masterKey, thumbKey];
}

async function deleteTemplateRow(templateId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/templates?id=eq.${encodeURIComponent(templateId)}`, {
    method: 'DELETE',
    headers: serviceHeaders({ Prefer: 'return=minimal' }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gagal menghapus data template: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    requireEnvironment();
    const user = await verifySupabaseUser(getBearerToken(req));
    const templateId = String(req.body?.templateId || '').trim();
    if (!templateId) return json(res, 400, { ok: false, error: 'Template ID tidak valid.' });

    const template = await fetchTemplate(templateId);
    if (!template) return json(res, 404, { ok: false, error: 'Template tidak ditemukan.' });

    const isOwner = String(template.user_id || '') === String(user.id);
    const isSuperAdmin = String(user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
    if (!isOwner && !isSuperAdmin) {
      return json(res, 403, { ok: false, error: 'Kamu tidak memiliki izin menghapus template ini.' });
    }

    let deletedFiles;
    const r2Key = parseR2Key(template.src);
    const supabaseKey = parseSupabaseKey(template.src);
    if (r2Key) deletedFiles = await deleteR2Files(r2Key);
    else if (supabaseKey) deletedFiles = await deleteSupabaseFiles(supabaseKey);
    else return json(res, 400, { ok: false, error: 'Lokasi file template tidak dikenali.' });

    await deleteTemplateRow(templateId);
    return json(res, 200, { ok: true, templateId, deletedFiles });
  } catch (error) {
    console.error('Delete template error:', error);
    return json(res, 500, { ok: false, error: error?.message || 'Gagal menghapus template.' });
  }
}
