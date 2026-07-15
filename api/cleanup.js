/**
 * Vercel Cron Job — hapus file Supabase Storage yang lebih tua dari masa retensi.
 * Jadwal default di vercel.json: setiap hari pukul 00:00 UTC.
 *
 * Environment yang disarankan:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - CRON_SECRET
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eguiubpsijwjwxaxvkhi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndWl1YnBzaWp3and4YXh2a2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTM4NTcsImV4cCI6MjA5NDg4OTg1N30.jwFtqnsbWlhSEtEeF-ZTEBq63CUQpN4jHPRmFpY827o';
const BUCKET = process.env.SUPABASE_BUCKET || 'photobooth';
const RETENTION_DAYS = Math.max(1, Number(process.env.RETENTION_DAYS || 14));
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

function authHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
}

function fileTimestamp(file) {
  const createdAt = Date.parse(file?.created_at || file?.createdAt || '');
  if (Number.isFinite(createdAt)) return createdAt;

  // Format upload aplikasi: <userId>_<13 digit timestamp>_<filename>.
  const nameMatch = String(file?.name || '').match(/(?:^|_)(\d{13})(?:_|$)/);
  return nameMatch ? Number(nameMatch[1]) : NaN;
}

async function listAllFiles() {
  const allFiles = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        prefix: 'results/',
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'created_at', order: 'asc' }
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`List gagal: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
    }

    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Response Supabase Storage tidak valid');
    allFiles.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return allFiles;
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  const log = [];

  try {
    const files = await listAllFiles();
    const toDelete = [];

    for (const file of files) {
      if (!file?.name) continue;
      const timestamp = fileTimestamp(file);
      if (!Number.isFinite(timestamp)) {
        log.push(`LEWATI: ${file.name} (tanggal tidak dikenali)`);
        continue;
      }

      const age = now - timestamp;
      if (age > RETENTION_MS) {
        toDelete.push(`results/${file.name}`);
        log.push(`HAPUS: ${file.name} (umur ${Math.floor(age / 86400000)} hari)`);
      }
    }

    const BATCH_SIZE = 100;
    let totalDeleted = 0;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ prefixes: batch })
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        log.push(`GAGAL batch ${i}-${i + batch.length - 1}: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
        continue;
      }

      const deleted = await response.json().catch(() => []);
      totalDeleted += Array.isArray(deleted) ? deleted.length : batch.length;
    }

    return res.status(200).json({
      success: true,
      retentionDays: RETENTION_DAYS,
      checked: files.length,
      candidates: toDelete.length,
      deleted: totalDeleted,
      message: toDelete.length ? `${totalDeleted} file dihapus` : 'Tidak ada file yang perlu dihapus',
      log
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || String(error),
      log
    });
  }
}
