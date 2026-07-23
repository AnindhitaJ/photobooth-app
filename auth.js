/**
 * auth.js — Shared Supabase authentication and account-integrity guard.
 *
 * Semua halaman yang memuat file ini otomatis dilindungi, kecuali halaman
 * login, reset-password, dan download publik tujuan QR. Identitas akun dikunci
 * dari login sampai logout.
 */

const LUX_CONFIG = window.LUX_CONFIG || {};
const SUPABASE_URL  = LUX_CONFIG.SUPABASE_URL || '';
const SUPABASE_ANON = LUX_CONFIG.SUPABASE_ANON_KEY || '';
const LUX_SUPER_ADMIN_EMAIL = LUX_CONFIG.SUPER_ADMIN_EMAIL || 'luxphotobooth.id@gmail.com';


const LUX_FEATURE_PERMISSIONS = Object.freeze({
  all: 'Semua Fitur',
  photostrip: 'Photostrip',
  photobooth: 'Photobooth',
  ganci: 'Ganci Photo Insert',
  kalender: 'Photobooth Kalender',
  idcard: 'ID Card',
  magazine: 'Magazine Cover',
  newspaper: 'Newspaper Cover',
  'trading-card': 'Trading Card',
  certificate: 'Certificate',
  'game-character': 'Game Character',
  'detective-case': 'Detective Case File'
});

const LUX_DIRECT_FEATURE_PATHS = Object.freeze({
  '/ganci': 'ganci', '/ganci.html': 'ganci',
  '/kalender': 'kalender', '/kalender.html': 'kalender',
  '/idcard': 'idcard', '/idcard.html': 'idcard',
  '/magazine': 'magazine', '/magazine.html': 'magazine',
  '/newspaper': 'newspaper', '/newspaper.html': 'newspaper',
  '/trading-card': 'trading-card', '/trading-card.html': 'trading-card',
  '/certificate': 'certificate', '/certificate.html': 'certificate',
  '/game-character': 'game-character', '/game-character.html': 'game-character',
  '/detective-case': 'detective-case', '/detective-case.html': 'detective-case'
});

const LUX_CAPTURE_PATHS = new Set([
  '/template', '/template.html',
  '/camera', '/camera.html',
  '/preview', '/preview.html',
  '/filter', '/filter.html',
  '/result', '/result.html'
]);

const AUTH_KEYS = Object.freeze({
  session: 'sb_session',
  userId: 'sb_user_id',
  email: 'sb_user_email',
  profile: 'sb_profile',
  accountLock: 'sb_account_lock',
  flowOwner: 'lux_flow_owner_id'
});

const AUTH_PUBLIC_PATHS = new Set([
  '/login', '/login.html',
  '/reset-password', '/reset-password.html',
  // Halaman tujuan QR harus dapat dibuka dari perangkat tamu tanpa sesi akun.
  '/download', '/download.html'
]);

const nativeFetch = window.fetch.bind(window);
const AUTH_FETCH_TIMEOUT_MS = 10000;
let authRedirecting = false;

async function fetchWithTimeout(input, init = {}, timeoutMs = AUTH_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const externalSignal = init.signal;
  let onExternalAbort = null;

  if (externalSignal) {
    onExternalAbort = () => controller.abort(externalSignal.reason);
    if (externalSignal.aborted) onExternalAbort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await nativeFetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Konfigurasi Supabase belum lengkap. Periksa /config.js.');
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return JSON.parse(decodeURIComponent(Array.from(atob(padded))
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  } catch (_) {
    return null;
  }
}

function currentPath() {
  let path = window.location.pathname || '/';
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

function isPublicAuthPage() {
  return AUTH_PUBLIC_PATHS.has(currentPath());
}

function addAuthGateStyle() {
  if (isPublicAuthPage()) return;
  document.documentElement.classList.add('lux-auth-pending');
  const style = document.createElement('style');
  style.id = 'lux-auth-gate-style';
  style.textContent = `
    html.lux-auth-pending body { visibility: hidden !important; }
    [data-lux-permission][hidden] { display: none !important; }
    #lux-auth-status {
      position: fixed; inset: 0; z-index: 2147483647; display: flex;
      align-items: center; justify-content: center; background: #0b1220;
      color: #fff; font: 600 14px/1.5 system-ui, sans-serif;
    }
  `;
  document.head.appendChild(style);
}

addAuthGateStyle();

const Auth = {
  _readyState: 'pending',
  _verifiedUser: null,
  _refreshPromise: null,
  _validationPromise: null,
  ready: null,

  getStoredSession() {
    try {
      const raw = localStorage.getItem(AUTH_KEYS.session);
      if (!raw) return null;
      const session = JSON.parse(raw);
      return session && typeof session === 'object' ? session : null;
    } catch (_) {
      return null;
    }
  },

  getSession() {
    const session = this.getStoredSession();
    if (!session?.access_token) return null;
    return session;
  },

  getToken() {
    return this.getSession()?.access_token || '';
  },

  getTokenUserId(token = this.getToken()) {
    return decodeJwtPayload(token)?.sub || null;
  },

  getSessionUserId(session = this.getSession()) {
    return session?.user?.id || session?.user?.sub || session?.session?.user?.id || null;
  },

  getUserId() {
    const identity = this.validateIdentity(this.getSession(), { setLocks: true });
    return identity.ok ? identity.userId : null;
  },

  getProfile() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEYS.profile) || 'null'); }
    catch (_) { return null; }
  },

  getBoothName() {
    return this.getProfile()?.booth_name || 'Photobooth';
  },

  getLogoUrl() {
    return this.getProfile()?.logo_url || '/logo.png';
  },

  showWatermark() {
    const p = this.getProfile();
    return p ? p.show_watermark !== false : true;
  },


  getPermissions() {
    if (this.isSuperAdmin?.()) return ['all'];
    const raw = this.getProfile()?.permissions;
    let values = raw;
    if (typeof values === 'string') {
      try { values = JSON.parse(values); }
      catch (_) { values = values.split(','); }
    }
    // Backward compatible: akun lama yang belum memiliki kolom permission
    // tetap memperoleh seluruh fitur sampai migrasi database diterapkan.
    if (!Array.isArray(values) || values.length === 0) return ['all'];
    const allowed = new Set(Object.keys(LUX_FEATURE_PERMISSIONS));
    const normalized = [...new Set(values.map(v => String(v || '').trim().toLowerCase()))]
      .filter(v => allowed.has(v));
    return normalized.length ? normalized : ['all'];
  },

  hasPermission(permission) {
    const key = String(permission || '').trim().toLowerCase();
    if (!key || this.isSuperAdmin?.()) return true;
    const permissions = this.getPermissions();
    return permissions.includes('all') || permissions.includes(key);
  },

  getPermissionLabel(permission) {
    return LUX_FEATURE_PERMISSIONS[String(permission || '').toLowerCase()] || 'fitur ini';
  },

  getCurrentFeaturePermission() {
    const path = currentPath();
    if (LUX_DIRECT_FEATURE_PATHS[path]) return LUX_DIRECT_FEATURE_PATHS[path];
    if (!LUX_CAPTURE_PATHS.has(path)) return null;

    const params = new URLSearchParams(window.location.search || '');
    const queryProduct = String(params.get('product') || '').toLowerCase();
    const eventProduct = String(localStorage.getItem('activeEventProductType') || '').toLowerCase();
    const captureFlow = String(localStorage.getItem('captureFlow') || '').toLowerCase();
    const returnUrl = String(localStorage.getItem('captureReturnUrl') || '');

    if (captureFlow === 'ganci') return 'ganci';
    if (captureFlow === 'product') {
      try {
        const returnPath = new URL(returnUrl || '/app', window.location.origin).pathname.replace(/\/+$/, '') || '/';
        return LUX_DIRECT_FEATURE_PATHS[returnPath] || 'photostrip';
      } catch (_) {
        return 'photostrip';
      }
    }
    if (captureFlow === 'photobox' || queryProduct === 'photobox' || eventProduct === 'photobox') {
      return 'photobooth';
    }
    return 'photostrip';
  },

  guardCurrentFeatureAccess() {
    const permission = this.getCurrentFeaturePermission();
    if (!permission || this.hasPermission(permission)) return true;
    ['captureFlow', 'captureReturnUrl', 'activeEventProductType'].forEach(k => localStorage.removeItem(k));
    const target = `/app?reason=permission_denied&feature=${encodeURIComponent(permission)}`;
    window.location.replace(target);
    return false;
  },

  applyPermissionVisibility(root = document) {
    root.querySelectorAll?.('[data-lux-permission]').forEach(el => {
      const allowed = this.hasPermission(el.getAttribute('data-lux-permission'));
      el.hidden = !allowed;
      el.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      if (!allowed) el.setAttribute('tabindex', '-1');
      else el.removeAttribute('tabindex');
    });
  },

  isExpired(session = this.getSession(), skewSeconds = 0) {
    if (!session?.expires_at) return false;
    return Number(session.expires_at) <= (Date.now() / 1000) + skewSeconds;
  },

  validateIdentity(session = this.getSession(), { setLocks = true } = {}) {
    if (!session?.access_token) return { ok: false, reason: 'missing_session' };

    const sessionId = this.getSessionUserId(session);
    const tokenId = this.getTokenUserId(session.access_token);

    // Session lama sebelum account-lock diperkenalkan mungkin belum memiliki
    // sb_user_id / sb_account_lock. Selama UUID pada session dan JWT sama,
    // key yang hilang aman dinormalisasi tanpa memindahkan akun.
    if (!sessionId || !tokenId) {
      return { ok: false, reason: 'missing_identity' };
    }
    if (sessionId !== tokenId) {
      return { ok: false, reason: 'token_identity_mismatch' };
    }

    let storedId = String(localStorage.getItem(AUTH_KEYS.userId) || '').trim();
    if (!storedId && setLocks) {
      localStorage.setItem(AUTH_KEYS.userId, sessionId);
      storedId = sessionId;
    }
    if (!storedId || storedId !== sessionId) {
      return { ok: false, reason: 'stored_identity_mismatch' };
    }

    let accountLock = String(localStorage.getItem(AUTH_KEYS.accountLock) || '').trim();
    let flowOwner = String(sessionStorage.getItem(AUTH_KEYS.flowOwner) || '').trim();

    if (accountLock && accountLock !== sessionId) {
      return { ok: false, reason: 'account_lock_mismatch' };
    }
    if (flowOwner && flowOwner !== sessionId) {
      return { ok: false, reason: 'flow_owner_mismatch' };
    }

    if (setLocks) {
      if (!accountLock) {
        localStorage.setItem(AUTH_KEYS.accountLock, sessionId);
        accountLock = sessionId;
      }
      if (!flowOwner) {
        sessionStorage.setItem(AUTH_KEYS.flowOwner, sessionId);
        flowOwner = sessionId;
      }
      if (!localStorage.getItem(AUTH_KEYS.email) && session?.user?.email) {
        localStorage.setItem(AUTH_KEYS.email, session.user.email);
      }
    }

    return { ok: true, userId: sessionId };
  },

  setSession(session, { requireSameUser = true } = {}) {
    if (!session?.access_token || !session?.user?.id) {
      throw new Error('Session Supabase tidak lengkap.');
    }

    const tokenUserId = this.getTokenUserId(session.access_token);
    if (!tokenUserId || tokenUserId !== session.user.id) {
      throw new Error('Identitas session dan token tidak cocok.');
    }

    const lockedId = localStorage.getItem(AUTH_KEYS.accountLock);
    const flowOwner = sessionStorage.getItem(AUTH_KEYS.flowOwner);
    if (requireSameUser && lockedId && lockedId !== session.user.id) {
      throw new Error('Akun berbeda terdeteksi. Logout terlebih dahulu.');
    }
    if (requireSameUser && flowOwner && flowOwner !== session.user.id) {
      throw new Error('Akun berbeda terdeteksi pada alur aktif.');
    }

    localStorage.setItem(AUTH_KEYS.session, JSON.stringify(session));
    localStorage.setItem(AUTH_KEYS.userId, session.user.id);
    localStorage.setItem(AUTH_KEYS.email, session.user.email || '');
    localStorage.setItem(AUTH_KEYS.accountLock, session.user.id);
    sessionStorage.setItem(AUTH_KEYS.flowOwner, session.user.id);
    this._verifiedUser = session.user;
    return session;
  },

  clearSession() {
    [AUTH_KEYS.session, AUTH_KEYS.userId, AUTH_KEYS.email, AUTH_KEYS.profile, AUTH_KEYS.accountLock]
      .forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem(AUTH_KEYS.flowOwner);
    this._verifiedUser = null;
  },

  redirectToLogin(reason = 'auth_required') {
    if (authRedirecting || isPublicAuthPage()) return false;
    authRedirecting = true;
    const next = `${window.location.pathname}${window.location.search || ''}`;
    const url = `/login?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`;
    window.location.replace(url);
    return false;
  },

  securityLogout(reason = 'session_invalid') {
    console.warn('[LUX AUTH] Session ditolak:', reason, {
      path: window.location.pathname,
      hasSession: !!this.getStoredSession(),
      storedUserId: localStorage.getItem(AUTH_KEYS.userId),
      accountLock: localStorage.getItem(AUTH_KEYS.accountLock),
      flowOwner: sessionStorage.getItem(AUTH_KEYS.flowOwner)
    });
    this.clearSession();
    try { this._channel?.postMessage({ type: 'logout', reason }); } catch (_) {}
    return this.redirectToLogin(reason);
  },

  logout() {
    this.clearSession();
    try { this._channel?.postMessage({ type: 'logout', reason: 'manual_logout' }); } catch (_) {}
    window.location.replace('/login');
  },

  requireAuth() {
    const session = this.getSession();
    const identity = this.validateIdentity(session);
    if (!identity.ok) return this.securityLogout(identity.reason);
    if (this.isExpired(session) && !session.refresh_token) {
      return this.securityLogout('session_expired');
    }
    return true;
  },

  async refreshSession() {
    if (this._refreshPromise) return this._refreshPromise;
    const current = this.getSession();
    if (!current?.refresh_token) throw new Error('Refresh token tidak tersedia.');

    this._refreshPromise = (async () => {
      const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.refresh_token })
      }, 12000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.access_token || !data?.user?.id) {
        throw new Error(data?.error_description || data?.msg || 'Gagal memperbarui session.');
      }
      return this.setSession(data, { requireSameUser: true });
    })();

    try { return await this._refreshPromise; }
    finally { this._refreshPromise = null; }
  },

  async verifyWithSupabase(session = this.getSession()) {
    if (!session?.access_token) throw new Error('Session tidak tersedia.');
    const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${session.access_token}`
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.id) {
      const err = new Error(data?.msg || data?.error_description || 'Session tidak valid.');
      err.status = res.status;
      throw err;
    }
    return data;
  },

  async ensureValidSession({ forceServerCheck = true } = {}) {
    if (isPublicAuthPage()) return true;
    if (this._validationPromise) return this._validationPromise;

    this._validationPromise = (async () => {
      let session = this.getSession();
      let identity = this.validateIdentity(session);
      if (!identity.ok) return this.securityLogout(identity.reason);

      try {
        if (this.isExpired(session, 120)) {
          session = await this.refreshSession();
          identity = this.validateIdentity(session);
          if (!identity.ok) return this.securityLogout(identity.reason);
        }

        if (forceServerCheck) {
          const user = await this.verifyWithSupabase(session);
          if (user.id !== identity.userId) {
            return this.securityLogout('server_identity_mismatch');
          }
          this._verifiedUser = user;
          localStorage.setItem(AUTH_KEYS.userId, user.id);
          localStorage.setItem(AUTH_KEYS.email, user.email || localStorage.getItem(AUTH_KEYS.email) || '');
        }

        this._readyState = 'ready';
        return true;
      } catch (err) {
        if (err?.status === 401 || err?.status === 403 || this.isExpired(session)) {
          return this.securityLogout('session_rejected');
        }
        // Timeout atau gangguan jaringan tidak boleh membuat layar PWA tersembunyi
        // selamanya. Session lokal diterima selama identitas konsisten dan token aktif.
        const localCheck = this.validateIdentity(session, { setLocks: false });
        if (!localCheck.ok || this.isExpired(session)) {
          return this.securityLogout('session_unverifiable');
        }
        console.warn('Verifikasi server tertunda karena jaringan:', err?.message || err);
        this._readyState = 'offline-valid';
        return true;
      }
    })();

    try {
      return await this._validationPromise;
    } finally {
      this._validationPromise = null;
    }
  },

  async authFetch(input, init = {}) {
    await this.ready;
    if (!this.requireAuth()) throw new Error('Authentication required');
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${this.getToken()}`);
    return nativeFetch(input, { ...init, headers });
  },

  async refreshProfile() {
    await Promise.resolve(this.ready).catch(() => false);
    const session = this.getSession();
    const userId = this.getUserId();
    if (!session || !userId) return null;
    try {
      const res = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${session.access_token}` }
      }, 8000);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.[0]) {
        localStorage.setItem(AUTH_KEYS.profile, JSON.stringify(data[0]));
        return data[0];
      }
    } catch (_) {}
    return null;
  },

  async updateProfile(updates) {
    await this.ready;
    const session = this.getSession();
    const userId = this.getUserId();
    if (!session || !userId) return false;
    try {
      const res = await nativeFetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data?.[0]) {
        localStorage.setItem(AUTH_KEYS.profile, JSON.stringify(data[0]));
        return data[0];
      }
      return await this.refreshProfile();
    } catch (e) {
      console.error('updateProfile exception:', e);
      return false;
    }
  },

  async uploadLogo(file) {
    await this.ready;
    const session = this.getSession();
    const userId = this.getUserId();
    if (!session || !userId) return null;
    const ext = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '');
    const path = `logos/${userId}/logo.${ext}`;
    try {
      const res = await nativeFetch(`${SUPABASE_URL}/storage/v1/object/photobooth/${path}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': file.type || 'image/png',
          'x-upsert': 'true'
        },
        body: file
      });
      if (!res.ok) throw new Error('Upload gagal');
      return `${SUPABASE_URL}/storage/v1/object/public/photobooth/${path}`;
    } catch (_) { return null; }
  }
};

window.Auth = Auth;

// Semua request data pada halaman terlindungi menunggu validasi session selesai.
// Request internal Auth menggunakan nativeFetch sehingga tidak terjadi rekursi.
window.fetch = async function guardedFetch(input, init = {}) {
  const rawUrl = typeof input === 'string' ? input : (input?.url || '');
  let parsedUrl = null;
  try { parsedUrl = new URL(rawUrl, window.location.origin); } catch (_) {}

  const isSupabase = !!parsedUrl && !!SUPABASE_URL && parsedUrl.href.startsWith(SUPABASE_URL);
  const isSupabaseTokenEndpoint = isSupabase && parsedUrl.pathname.includes('/auth/v1/token');
  const isLocalApi = !!parsedUrl && parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith('/api/');
  const mustGuard = !isPublicAuthPage() && ((isSupabase && !isSupabaseTokenEndpoint) || isLocalApi);

  if (!mustGuard) return nativeFetch(input, init);

  await Auth.ready;
  if (!Auth.requireAuth()) throw new Error('Authentication required');

  const headers = new Headers(init.headers || (typeof input !== 'string' ? input?.headers : undefined) || {});
  const currentAuthorization = headers.get('Authorization') || '';
  if (!currentAuthorization || currentAuthorization === `Bearer ${SUPABASE_ANON}`) {
    headers.set('Authorization', `Bearer ${Auth.getToken()}`);
  }
  if (isSupabase && !headers.has('apikey')) headers.set('apikey', SUPABASE_ANON);

  return nativeFetch(input, { ...init, headers });
};

Auth.ready = Auth.ensureValidSession({ forceServerCheck: true });
window.LUX_AUTH_READY = Auth.ready;

function applyAuthenticatedUi() {
  Auth.applyPermissionVisibility(document);
  document.documentElement.classList.remove('lux-auth-pending');

  const logoUrl = Auth.getLogoUrl();
  const boothName = Auth.getBoothName();
  document.querySelectorAll('[data-auth-logo]').forEach(el => {
    if (el.tagName === 'IMG') el.src = logoUrl;
  });
  document.querySelectorAll('[data-auth-boothname]').forEach(el => { el.textContent = boothName; });
  document.querySelectorAll('.logo-text span, .header-title span:not([style]), .hud-logo').forEach(el => {
    if (el.textContent.includes('LUX PHOTOBOOTH') || el.textContent.includes('My Photobooth')) {
      el.textContent = boothName;
    }
  });
  document.querySelectorAll('.footer').forEach(el => {
    if (el.textContent.includes('LUX PHOTOBOOTH')) {
      el.innerHTML = el.innerHTML.replace('LUX PHOTOBOOTH', boothName);
    }
  });
  if (document.title.includes('LUX')) {
    document.title = document.title.replace('LUX Photobooth', boothName);
  }
}

Auth.ready.then(async ok => {
  if (!ok || isPublicAuthPage()) return;
  if (!Auth.guardCurrentFeatureAccess()) return;
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  // Tampilkan UI memakai profil cache lebih dahulu. Refresh profil tidak lagi
  // menahan seluruh layar ketika koneksi PWA sedang lambat atau baru bangun.
  applyAuthenticatedUi();

  Auth.refreshProfile().then(profile => {
    if (!profile || authRedirecting) return;
    if (!Auth.guardCurrentFeatureAccess()) return;
    applyAuthenticatedUi();
  }).catch(err => {
    console.warn('Refresh profil tertunda:', err?.message || err);
  });
}).catch(err => {
  console.error('Auth initialization failed:', err);
  Auth.securityLogout('auth_initialization_failed');
});

// Sinkronisasi lintas tab. Pergantian akun di tab lain langsung membatalkan alur aktif.
window.addEventListener('storage', event => {
  if (![AUTH_KEYS.session, AUTH_KEYS.userId, AUTH_KEYS.accountLock].includes(event.key)) return;
  if (isPublicAuthPage() || authRedirecting) return;
  const result = Auth.validateIdentity(Auth.getSession(), { setLocks: false });
  if (!result.ok) Auth.securityLogout('cross_tab_identity_change');
});

try {
  Auth._channel = new BroadcastChannel('lux-auth');
  Auth._channel.onmessage = event => {
    if (event.data?.type === 'logout' && !isPublicAuthPage()) {
      Auth.clearSession();
      Auth.redirectToLogin(event.data.reason || 'logged_out_elsewhere');
    }
  };
} catch (_) {}

window.addEventListener('pageshow', event => {
  if (!isPublicAuthPage() && event.persisted) Auth.ensureValidSession({ forceServerCheck: true });
});

document.addEventListener('visibilitychange', () => {
  if (!isPublicAuthPage() && document.visibilityState === 'visible') {
    Auth.ensureValidSession({ forceServerCheck: true });
  }
});

setInterval(() => {
  if (!isPublicAuthPage() && document.visibilityState === 'visible') {
    Auth.ensureValidSession({ forceServerCheck: true });
  }
}, 120000);

// ── PLAN HELPERS ────────────────────────────────────────────────────────
Object.assign(Auth, {
  // Status plan sederhana: 'pro' | 'free' | 'inactive'
  // Tidak ada konsep free trial / expired lagi.
  getPlanStatus() {
    const p = this.getProfile();
    if (!p) return 'free';
    if (p.is_active === false) return 'inactive';

    const now = new Date();
    const isMarkedPro = p.plan === 'pro';
    const hasValidProEnd = !p.pro_ends_at || new Date(p.pro_ends_at) > now;

    if (isMarkedPro && hasValidProEnd) return 'pro';
    return 'free';
  },

  isPro() {
    return this.getPlanStatus() === 'pro';
  },

  // Disisakan agar file lama yang masih memanggil fungsi ini tidak error.
  isTrialActive() { return false; },

  // Free tetap boleh akses. Nonaktif saja yang diblok.
  hasAccess() {
    return this.getPlanStatus() !== 'inactive';
  },

  // Sisa hari PRO, untuk Free nilainya 0.
  getDaysLeft() {
    const p = this.getProfile();
    if (!p || !p.pro_ends_at || this.getPlanStatus() !== 'pro') return 0;
    return Math.max(0, Math.ceil((new Date(p.pro_ends_at) - Date.now()) / 86400000));
  },

  isSuperAdmin() {
    const email = this.getSession()?.user?.email || localStorage.getItem('sb_user_email') || '';
    return String(email).trim().toLowerCase() === String(LUX_SUPER_ADMIN_EMAIL).trim().toLowerCase();
  },

  needsProWatermark() {
    return !this.isSuperAdmin() && this.getPlanStatus() === 'free';
  },

  drawProWatermark(ctx, width, height, options = {}) {
    if (!ctx || !width || !height || !this.needsProWatermark()) return;
    const text = String(options.text || 'PROPERTI OF LUX PHOTOBOOTH');
    const angle = (options.angleDeg ?? -28) * Math.PI / 180;
    const alpha = options.alpha ?? 0.18;
    const fontSize = Math.max(24, Math.round(Math.min(width, height) * 0.058));
    const gapX = Math.max(fontSize * 2.2, 150);
    const gapY = Math.max(fontSize * 1.9, 120);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.045));

    const textW = Math.max(ctx.measureText(text).width, fontSize * 7.5);
    const spanW = textW + gapX;
    const diag = Math.ceil(Math.sqrt(width * width + height * height));
    const cols = Math.ceil(diag / spanW) + 3;
    const rows = Math.ceil(diag / gapY) + 3;

    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const x = col * spanW + ((row % 2) * spanW / 2);
        const y = row * gapY;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }
    }
    ctx.restore();
  },

  cloneCanvasForExport(canvas, options = {}) {
    if (!canvas) return null;
    const out = document.createElement('canvas');
    out.width = canvas.width || 1;
    out.height = canvas.height || 1;
    const o = out.getContext('2d');
    o.drawImage(canvas, 0, 0);
    if (this.needsProWatermark() && options.watermark !== false) {
      this.drawProWatermark(o, out.width, out.height, options);
    }
    return out;
  },

  exportCanvasDataURL(canvas, mime = 'image/png', quality, options = {}) {
    const out = this.cloneCanvasForExport(canvas, options);
    return out ? out.toDataURL(mime, quality) : '';
  },

  exportCanvasBlob(canvas, mime = 'image/png', quality, options = {}) {
    const out = this.cloneCanvasForExport(canvas, options);
    return new Promise(resolve => {
      if (!out) return resolve(null);
      out.toBlob(resolve, mime, quality);
    });
  }
});
