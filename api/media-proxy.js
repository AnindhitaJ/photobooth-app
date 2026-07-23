const DEFAULT_ALLOWED_MEDIA_HOSTS = [
  'media.lux-photo.web.id',
  'eguiubpsijwjwxaxvkhi.supabase.co'
];

const IMAGE_TYPES_BY_EXTENSION = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif'
});

function normalizeHost(value) {
  try {
    return new URL(String(value || '').trim()).hostname.toLowerCase();
  } catch (_) {
    return '';
  }
}

function allowedHosts() {
  const hosts = new Set(DEFAULT_ALLOWED_MEDIA_HOSTS);

  [process.env.R2_PUBLIC_URL, process.env.SUPABASE_URL]
    .map(normalizeHost)
    .filter(Boolean)
    .forEach(host => hosts.add(host));

  return hosts;
}

function inferImageType(sourceUrl, upstreamType) {
  const normalized = String(upstreamType || '').split(';')[0].trim().toLowerCase();
  if (normalized.startsWith('image/')) return normalized;

  const pathname = sourceUrl.pathname.toLowerCase();
  for (const [extension, mime] of Object.entries(IMAGE_TYPES_BY_EXTENSION)) {
    if (pathname.endsWith(extension)) return mime;
  }

  return '';
}

function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawSrc = Array.isArray(req.query?.src) ? req.query.src[0] : req.query?.src;
    if (!rawSrc) {
      return res.status(400).json({
        error: 'Parameter src wajib diisi',
        allowed_hosts: [...allowedHosts()]
      });
    }

    let sourceUrl;
    try {
      sourceUrl = new URL(rawSrc);
    } catch (_) {
      return res.status(400).json({ error: 'URL media tidak valid' });
    }

    const sourceHost = sourceUrl.hostname.toLowerCase();
    if (sourceUrl.protocol !== 'https:' || !allowedHosts().has(sourceHost)) {
      return res.status(403).json({
        error: 'Host media tidak diizinkan',
        host: sourceHost,
        allowed_hosts: [...allowedHosts()]
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let upstream;
    try {
      upstream = await fetch(sourceUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'User-Agent': 'LUX-Photobooth-Media-Proxy/1.1'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Media upstream gagal (${upstream.status})`,
        host: sourceHost
      });
    }

    const contentType = inferImageType(
      sourceUrl,
      upstream.headers.get('content-type')
    );

    if (!contentType) {
      return res.status(415).json({
        error: 'Resource bukan gambar atau Content-Type tidak dikenali',
        upstream_content_type: upstream.headers.get('content-type') || null
      });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return res.status(502).json({ error: 'Media upstream kosong' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(arrayBuffer.byteLength));
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    console.error('media-proxy error:', error);
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? 'Timeout ketika mengambil media dari penyimpanan'
        : (error?.message || 'Gagal mengambil media')
    });
  }
}
