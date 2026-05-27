/**
 * Vercel Cron Job — Auto-cleanup foto > 14 hari
 * Jadwal: setiap hari jam 00:00 UTC
 *
 * Cara kerja:
 * - List semua file di Supabase bucket results/
 * - Cek nama file: format timestamp_xxx.jpg (13 digit UNIX ms di depan)
 * - Kalau umur file > 14 hari → hapus
 */

const SUPABASE_URL       = 'https://eguiubpsijwjwxaxvkhi.supabase.co';
const SUPABASE_ANON      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndWl1YnBzaWp3and4YXh2a2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTM4NTcsImV4cCI6MjA5NDg4OTg1N30.jwFtqnsbWlhSEtEeF-ZTEBq63CUQpN4jHPRmFpY827o';
const BUCKET             = 'photobooth';
const RETENTION_DAYS     = 14;
const RETENTION_MS       = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  // Vercel Cron kirim header Authorization: Bearer <CRON_SECRET>
  // Kalau env CRON_SECRET di-set, validasi. Kalau tidak, tetap jalan.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const now = Date.now();
  const log = [];

  try {
    // 1. List semua file di results/
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: 'results/',
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'asc' }
      })
    });

    if (!listRes.ok) {
      throw new Error(`List gagal: HTTP ${listRes.status}`);
    }

    const files = await listRes.json();
    if (!Array.isArray(files)) throw new Error('Response tidak valid dari Supabase');

    // 2. Filter file yang sudah > 14 hari
    const toDelete = [];
    for (const f of files) {
      if (!f.name) continue;

      // Ambil timestamp dari nama file (13 digit di awal)
      const tsMatch = f.name.match(/^(\d{13})_/);
      if (!tsMatch) continue; // skip file tanpa format timestamp

      const fileTs = parseInt(tsMatch[1]);
      const age    = now - fileTs;

      if (age > RETENTION_MS) {
        toDelete.push(`results/${f.name}`);
        log.push(`HAPUS: ${f.name} (umur ${Math.floor(age / 86400000)} hari)`);
      }
    }

    if (toDelete.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Tidak ada file yang perlu dihapus',
        checked: files.length,
        deleted: 0,
        log
      });
    }

    // 3. Hapus dalam batch (Supabase max 1000 per request)
    const BATCH = 100;
    let totalDeleted = 0;
    for (let i = 0; i < toDelete.length; i += BATCH) {
      const batch = toDelete.slice(i, i + BATCH);
      const delRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefixes: batch })
      });

      if (delRes.ok) {
        const result = await delRes.json();
        totalDeleted += Array.isArray(result) ? result.length : batch.length;
      } else {
        log.push(`GAGAL batch ${i}-${i+BATCH}: HTTP ${delRes.status}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${totalDeleted} file dihapus`,
      checked: files.length,
      deleted: totalDeleted,
      log
    });

  } catch(e) {
    return res.status(500).json({ success: false, error: e.message, log });
  }
}
