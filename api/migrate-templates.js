import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'photobooth';
const R2_PUBLIC_URL = String(process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const MIGRATION_SECRET = process.env.MIGRATION_SECRET || '';
const PAGE_SIZE = 1000;

function json(res, status, body) {
  return res.status(status).json(body);
}

function requireEnvironment() {
  const required = [
    ['SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY],
    ['R2_ENDPOINT', process.env.R2_ENDPOINT],
    ['R2_ACCESS_KEY_ID', process.env.R2_ACCESS_KEY_ID],
    ['R2_SECRET_ACCESS_KEY', process.env.R2_SECRET_ACCESS_KEY],
    ['R2_BUCKET', process.env.R2_BUCKET],
    ['R2_PUBLIC_URL', R2_PUBLIC_URL],
    ['MIGRATION_SECRET', MIGRATION_SECRET]
  ];
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Environment belum lengkap: ${missing.join(', ')}`);
}

function serviceHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra
  };
}

function encodeObjectPath(path) {
  return String(path).split('/').map(encodeURIComponent).join('/');
}

function contentTypeFromPath(path) {
  const lower = String(path).toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

async function listDirectory(prefix) {
  const entries = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: serviceHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        prefix,
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Gagal membaca folder ${prefix}: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
    }

    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`Respons daftar object tidak valid untuk ${prefix}`);
    entries.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return entries;
}

async function listTemplateObjects(prefix = 'templates') {
  const entries = await listDirectory(prefix);
  const objects = [];

  for (const entry of entries) {
    if (!entry?.name) continue;
    const path = `${prefix}/${entry.name}`;

    // Folder Storage biasanya tidak memiliki id/metadata object.
    const isFolder = !entry.id && !entry.metadata;
    if (isFolder) {
      // Welcome screen bukan template editor dan dimigrasikan terpisah bila diperlukan.
      if (path === 'templates/event-welcome') continue;
      objects.push(...await listTemplateObjects(path));
      continue;
    }

    if (!path.startsWith('templates/event-welcome/')) {
      objects.push({
        path,
        size: Number(entry?.metadata?.size || 0),
        contentType: entry?.metadata?.mimetype || contentTypeFromPath(path)
      });
    }
  }

  return objects;
}

function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
}

async function copyOneObject(client, item) {
  const path = String(item?.path || '');
  if (!path.startsWith('templates/') || path.startsWith('templates/event-welcome/')) {
    throw new Error(`Path tidak diizinkan: ${path || '(kosong)'}`);
  }

  const sourceURL = `${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${encodeObjectPath(path)}`;
  const source = await fetch(sourceURL, { headers: serviceHeaders() });
  if (!source.ok) {
    const detail = await source.text().catch(() => '');
    throw new Error(`Download gagal ${path}: HTTP ${source.status}${detail ? ` — ${detail}` : ''}`);
  }

  const body = Buffer.from(await source.arrayBuffer());
  const contentType = source.headers.get('content-type') || item?.contentType || contentTypeFromPath(path);

  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: path,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable'
  }));

  return { path, bytes: body.length };
}

async function fetchRows(table, columns) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}&limit=1000`, {
    headers: serviceHeaders()
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gagal membaca tabel ${table}: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }
  return await response.json();
}

async function patchRow(table, id, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: serviceHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gagal update ${table}/${id}: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }
}

async function updateTemplateDatabaseURLs() {
  const oldPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  const rows = await fetchRows('templates', 'id,src');
  const candidates = rows.filter(row => typeof row?.src === 'string' && row.src.startsWith(`${oldPrefix}templates/`) && !row.src.startsWith(`${oldPrefix}templates/event-welcome/`));

  let updated = 0;
  const failures = [];
  const concurrency = 8;

  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(async row => {
      const nextURL = `${R2_PUBLIC_URL}/${row.src.slice(oldPrefix.length)}`;
      await patchRow('templates', row.id, { src: nextURL });
      return row.id;
    }));

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') updated += 1;
      else failures.push({ id: batch[index]?.id, error: result.reason?.message || String(result.reason) });
    });
  }

  return { found: candidates.length, updated, failures };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    requireEnvironment();
    if (req.headers.authorization !== `Bearer ${MIGRATION_SECRET}`) {
      return json(res, 401, { ok: false, error: 'Migration secret salah.' });
    }

    const action = String(req.body?.action || '');

    if (action === 'inventory') {
      const objects = await listTemplateObjects();
      const totalBytes = objects.reduce((sum, item) => sum + Number(item.size || 0), 0);
      return json(res, 200, { ok: true, objects, totalObjects: objects.length, totalBytes });
    }

    if (action === 'copy') {
      const paths = Array.isArray(req.body?.paths) ? req.body.paths.slice(0, 10) : [];
      if (!paths.length) return json(res, 400, { ok: false, error: 'Batch path kosong.' });

      const client = r2Client();
      const results = await Promise.allSettled(paths.map(item => copyOneObject(client, item)));
      const copied = [];
      const failed = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') copied.push(result.value);
        else failed.push({ path: paths[index]?.path, error: result.reason?.message || String(result.reason) });
      });

      return json(res, failed.length ? 207 : 200, { ok: failed.length === 0, copied, failed });
    }

    if (action === 'update-database') {
      const database = await updateTemplateDatabaseURLs();
      return json(res, database.failures.length ? 207 : 200, {
        ok: database.failures.length === 0,
        database
      });
    }

    return json(res, 400, { ok: false, error: 'Action tidak dikenal.' });
  } catch (error) {
    console.error('Template migration error:', error);
    return json(res, 500, { ok: false, error: error?.message || String(error) });
  }
}
