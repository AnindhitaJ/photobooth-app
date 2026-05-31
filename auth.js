/**
 * auth.js — Shared Supabase Auth helper
 * Include di semua halaman yang butuh session
 */

const SUPABASE_URL  = 'https://eguiubpsijwjwxaxvkhi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndWl1YnBzaWp3and4YXh2a2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTM4NTcsImV4cCI6MjA5NDg4OTg1N30.jwFtqnsbWlhSEtEeF-ZTEBq63CUQpN4jHPRmFpY827o';

const Auth = {
  // Ambil session dari localStorage
  getSession() {
    try {
      const s = JSON.parse(localStorage.getItem('sb_session') || 'null');
      if (!s || !s.access_token) return null;
      if (s.expires_at && s.expires_at < Date.now() / 1000) {
        this.logout();
        return null;
      }
      return s;
    } catch(e) { return null; }
  },

  // Ambil token
  getToken() {
    const s = this.getSession();
    // Support berbagai format response Supabase
    return s?.access_token || s?.session?.access_token || SUPABASE_ANON;
  },

  getUserId() {
    const s = this.getSession();
    // Coba dari berbagai sumber
    const fromSession = s?.user?.id || s?.user?.sub || s?.session?.user?.id;
    if (fromSession) return fromSession;
    // Decode dari JWT token
    const token = this.getToken();
    if (token && token !== SUPABASE_ANON) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.sub;
      } catch(e) {}
    }
    return localStorage.getItem("sb_user_id") || null;
  },

  // Ambil profile dari localStorage
  getProfile() {
    try {
      return JSON.parse(localStorage.getItem('sb_profile') || 'null');
    } catch(e) { return null; }
  },

  // Ambil nama booth
  getBoothName() {
    return this.getProfile()?.booth_name || 'Photobooth';
  },

  // Ambil logo URL
  getLogoUrl() {
    return this.getProfile()?.logo_url || '/logo.png';
  },

  // Apakah watermark aktif
  showWatermark() {
    const p = this.getProfile();
    return p ? p.show_watermark !== false : true;
  },

  // Cek login, kalau tidak redirect ke login
  requireAuth() {
    const s = this.getSession();
    if (!s) { window.location.href = '/login'; return false; }
    return true;
  },

  // Logout
  logout() {
    ['sb_session','sb_user_id','sb_user_email','sb_profile'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  },

  // Refresh profile dari Supabase
  async refreshProfile() {
    const session = this.getSession();
    if (!session) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=*`, {
        headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data && data[0]) {
        localStorage.setItem('sb_profile', JSON.stringify(data[0]));
        return data[0];
      }
    } catch(e) {}
    return null;
  },

  // Update profile
  async updateProfile(updates) {
    const session = this.getSession();
    if (!session) { console.error('updateProfile: no session'); return false; }
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('updateProfile error:', res.status, errText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const data = await res.json();
      if (data && data[0]) {
        localStorage.setItem('sb_profile', JSON.stringify(data[0]));
        return data[0];
      }
      // Kalau return kosong tapi status ok, fetch ulang
      return await this.refreshProfile();
    } catch(e) { 
      console.error('updateProfile exception:', e);
      return false; 
    }
  },

  // Upload logo ke Supabase Storage
  async uploadLogo(file) {
    const session = this.getSession();
    if (!session) return null;
    const ext  = file.name.split('.').pop();
    const path = `logos/${session.user.id}/logo.${ext}`;
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photobooth/${path}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': file.type,
          'x-upsert': 'true'
        },
        body: file
      });
      if (!res.ok) throw new Error('Upload gagal');
      return `${SUPABASE_URL}/storage/v1/object/public/photobooth/${path}`;
    } catch(e) { return null; }
  }
};

// Auto-inject logo dan booth name di semua elemen
document.addEventListener('DOMContentLoaded', async () => {
  // Refresh profile dulu biar data terbaru
  await Auth.refreshProfile();

  const logoUrl   = Auth.getLogoUrl();
  const boothName = Auth.getBoothName();

  // Update semua img logo
  document.querySelectorAll('[data-auth-logo]').forEach(el => {
    if (el.tagName === 'IMG') el.src = logoUrl;
  });

  // Update semua teks booth name
  document.querySelectorAll('[data-auth-boothname]').forEach(el => {
    el.textContent = boothName;
  });

  // Update semua teks yang contain "LUX PHOTOBOOTH" atau "My Photobooth" jadi booth name
  document.querySelectorAll('.logo-text span, .header-title span:not([style]), .hud-logo').forEach(el => {
    if (el.textContent.includes('LUX PHOTOBOOTH') || el.textContent.includes('My Photobooth')) {
      el.textContent = boothName;
    }
  });

  // Update footer
  document.querySelectorAll('.footer').forEach(el => {
    if (el.textContent.includes('LUX PHOTOBOOTH')) {
      el.innerHTML = el.innerHTML.replace('LUX PHOTOBOOTH', boothName);
    }
  });

  // Update page title
  if (document.title.includes('LUX')) {
    document.title = document.title.replace('LUX Photobooth', boothName);
  }
});

// ── PLAN HELPERS ────────────────────────────────────────────────────────
Object.assign(Auth, {
  // Status plan: 'pro' | 'trial' | 'expired' | 'inactive'
  getPlanStatus() {
    const p = this.getProfile();
    if (!p) return 'expired';
    if (!p.is_active) return 'inactive';
    const now = new Date();
    if (p.plan === 'pro' && p.pro_ends_at && new Date(p.pro_ends_at) > now) return 'pro';
    if (p.plan === 'trial' && p.trial_ends_at && new Date(p.trial_ends_at) > now) return 'trial';
    return 'expired';
  },

  isPro() { return this.getPlanStatus() === 'pro'; },
  isTrialActive() { return this.getPlanStatus() === 'trial'; },
  hasAccess() {
    const s = this.getPlanStatus();
    return s === 'pro' || s === 'trial';
  },

  // Sisa hari trial/pro
  getDaysLeft() {
    const p = this.getProfile();
    if (!p) return 0;
    const now = Date.now();
    if (p.plan === 'pro' && p.pro_ends_at) return Math.max(0, Math.ceil((new Date(p.pro_ends_at) - now) / 86400000));
    if (p.plan === 'trial' && p.trial_ends_at) return Math.max(0, Math.ceil((new Date(p.trial_ends_at) - now) / 86400000));
    return 0;
  },

  isSuperAdmin() {
    return localStorage.getItem('sb_user_email') === 'luxphotobooth.id@gmail.com';
  }
});
