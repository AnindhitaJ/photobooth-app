  console.log('CMS_PASSWORD_VERIFY_V72');
  const CMS_URL = window.LUX_CONFIG?.SUPABASE_URL || SUPABASE_URL;
  const CMS_ANON = window.LUX_CONFIG?.SUPABASE_ANON_KEY || SUPABASE_ANON;
  const SUPER_ADMIN_EMAIL = window.LUX_CONFIG?.SUPER_ADMIN_EMAIL || 'luxphotobooth.id@gmail.com';

  let allUsers = [];
  let selectedUserId = null;
  let selectedPasswordUserId = null;
  let selectedPermissionUserId = null;
  let currentProReceipt = null;

  const FEATURE_PERMISSION_KEYS = Object.freeze([
    'photostrip', 'photobooth', 'vintage', 'upload-photo', 'ganci', 'kalender', 'idcard', 'magazine',
    'newspaper', 'trading-card', 'certificate', 'game-character', 'detective-case'
  ]);

  function normalizedSessionEmail() {
    const sessionEmail = Auth.getSession()?.user?.email || localStorage.getItem('sb_user_email') || '';
    return String(sessionEmail).trim().toLowerCase();
  }

  function ensureExpectedSuperAdmin() {
    if (normalizedSessionEmail() !== String(SUPER_ADMIN_EMAIL).trim().toLowerCase()) {
      throw new Error('Akses ditolak. Wajib login sebagai luxphotobooth.id@gmail.com.');
    }
    return true;
  }

  // ── AUTH CHECK ───────────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', async () => {
    await Promise.resolve(Auth.ready).catch(() => false);
    const session = Auth.getSession();
    if (!session) { window.location.href = '/login'; return; }
    try {
      ensureExpectedSuperAdmin();
    } catch (error) {
      alert(error.message);
      window.location.href = '/app';
      return;
    }
    loadUsers();
  });

  // ── CREATE ACCOUNT (SUPER ADMIN ONLY) ────────────────────────────────
  function normalizeCreateWhatsapp(value) {
    return String(value || '').replace(/[\s\-().]/g, '');
  }

  function openCreateAccountModal() {
    document.getElementById('createAccountModal').classList.add('open');
    setTimeout(() => document.getElementById('createBoothName').focus(), 50);
  }

  function closeCreateAccountModal() {
    document.getElementById('createAccountModal').classList.remove('open');
  }

  async function confirmCreateAccount() {
    const boothName = document.getElementById('createBoothName').value.trim();
    const email = document.getElementById('createEmail').value.trim().toLowerCase();
    const whatsapp = normalizeCreateWhatsapp(document.getElementById('createWhatsapp').value);
    const password = document.getElementById('createPassword').value;
    const btn = document.getElementById('btnConfirmCreateAccount');
    const session = Auth.getSession();

    if (!boothName) return showToast('Nama photobooth harus diisi', 'error');
    if (!/^\S+@\S+\.\S+$/.test(email)) return showToast('Email tidak valid', 'error');
    if (!/^\+?[0-9]{8,20}$/.test(whatsapp)) return showToast('Nomor WhatsApp tidak valid', 'error');
    if (password.length < 6) return showToast('Password minimal 6 karakter', 'error');
    if (!session?.access_token) return showToast('Session admin habis. Login ulang.', 'error');

    btn.disabled = true;
    btn.textContent = 'Membuat...';
    try {
      const response = await fetch('/api/admin-create-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booth_name: boothName,
          email,
          whatsapp_number: whatsapp,
          password,
          permissions: ['all']
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Gagal membuat akun (HTTP ${response.status})`);
      }

      ['createBoothName','createEmail','createWhatsapp','createPassword'].forEach(id => {
        document.getElementById(id).value = '';
      });
      closeCreateAccountModal();
      showToast(`Akun ${email} berhasil dibuat`, 'success');
      await loadUsers();
    } catch (error) {
      showToast(error.message || 'Gagal membuat akun', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Buat Akun';
    }
  }

  // ── LOAD USERS ───────────────────────────────────────────────────────
  async function loadUsers() {
    try {
      const session = Auth.getSession();
      const res = await fetch(`${CMS_URL}/rest/v1/profiles?select=*&order=created_at.desc`, {
        headers: {
          'apikey': CMS_ANON,
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      allUsers = await res.json();
      renderStats();
      renderTable(allUsers);
    } catch(e) {
      document.getElementById('tableWrap').innerHTML = `<div class="empty">❌ Gagal memuat data: ${e.message}</div>`;
    }
  }

  function getPlanStatus(u) {
    const now = new Date();
    if (u.is_active === false) return 'inactive';
    const isMarkedPro = u.plan === 'pro';
    const hasValidProEnd = !u.pro_ends_at || new Date(u.pro_ends_at) > now;
    return (isMarkedPro && hasValidProEnd) ? 'pro' : 'free';
  }

  function renderStats() {
    let free=0, pro=0, inactive=0;
    allUsers.forEach(u => {
      const s = getPlanStatus(u);
      if (s==='pro') pro++;
      else if (s==='inactive') inactive++;
      else free++;
    });
    document.getElementById('statTotal').textContent    = allUsers.length;
    document.getElementById('statFree').textContent     = free;
    document.getElementById('statPro').textContent      = pro;
    document.getElementById('statInactive').textContent = inactive;
  }

  function renderTable(users) {
    if (!users.length) {
      document.getElementById('tableWrap').innerHTML = '<div class="empty">Belum ada akun terdaftar</div>';
      return;
    }
    const rows = users.map(u => {
      const status = getPlanStatus(u);
      const badgeMap = {
        pro:      '<span class="badge badge-pro">⭐ PRO</span>',
        free:     '<span class="badge badge-free">🆓 Free</span>',
        inactive: '<span class="badge badge-inactive">⛔ Nonaktif</span>',
      };
      const badge = badgeMap[status] || badgeMap.free;

      const endDate = u.pro_ends_at ? new Date(u.pro_ends_at).toLocaleDateString('id-ID') : '—';
      const endInfo = status === 'pro' ? (u.pro_ends_at ? `s/d ${endDate}` : 'PRO aktif') : '—';

      const activeBtn = u.is_active
        ? `<button class="btn-sm btn-deactivate" onclick="toggleActive('${u.id}', false)">⛔ Nonaktifkan</button>`
        : `<button class="btn-sm btn-activate" onclick="toggleActive('${u.id}', true)">✅ Aktifkan</button>`;

      const safeEmail = (u.email || '').replace(/'/g, '&#39;');
      const proBtn = status !== 'pro'
        ? `<button class="btn-sm btn-pro" onclick="openProModal('${u.id}','${safeEmail}')">⭐ Aktifkan PRO</button>`
        : `<button class="btn-sm btn-pro" onclick="openProModal('${u.id}','${safeEmail}')">⏳ Perpanjang PRO</button><button class="btn-sm btn-free" onclick="setFree('${u.id}')">🆓 Jadikan Free</button>`;

      const passBtn = `<button class="btn-sm btn-password" onclick="openPasswordModal('${u.id}','${(u.email||'').replace(/'/g, '&#39;')}')">🔑 Ganti Password</button>`;
      const permissionBtn = `<button class="btn-sm btn-permission" onclick="openPermissionModal('${u.id}','${safeEmail}')">🔐 Permission</button>`;
      const permissionInfo = formatPermissionSummary(u.permissions);
      const waBtn = u.whatsapp_number
        ? `<button class="btn-sm btn-free" onclick="copyWhatsapp('${String(u.whatsapp_number || '').replace(/'/g, '&#39;')}')">📱 Copy WA</button>`
        : '';

      return `<tr>
        <td data-label="Akun">
          <div style="font-weight:700">${u.booth_name || '—'}</div>
          <div style="font-size:11px;color:var(--text2)">${u.email || '—'}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:3px">📱 ${u.whatsapp_number || 'Belum ada nomor WA'}</div>
        </td>
        <td data-label="Status">${badge}</td>
        <td data-label="Berlaku" style="font-size:12px;color:var(--text2)">${endInfo}</td>
        <td data-label="Permission"><span class="permission-badge">${permissionInfo}</span></td>
        <td data-label="Daftar" style="font-size:12px;color:var(--text2)">${new Date(u.created_at).toLocaleDateString('id-ID')}</td>
        <td data-label="Aksi"><div class="btn-actions">${permissionBtn}${proBtn}${activeBtn}${passBtn}${waBtn}</div></td>
      </tr>`;
    }).join('');

    document.getElementById('tableWrap').innerHTML = `
      <table>
        <thead><tr>
          <th>Akun</th><th>Status</th><th>Berlaku</th><th>Permission</th><th>Daftar</th><th>Aksi</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function normalizePermissions(value) {
    let permissions = value;
    if (typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions); }
      catch (_) { permissions = permissions.split(','); }
    }
    if (!Array.isArray(permissions) || !permissions.length) return ['all'];
    const normalized = [...new Set(permissions.map(v => String(v || '').trim().toLowerCase()))]
      .filter(v => v === 'all' || FEATURE_PERMISSION_KEYS.includes(v));
    return normalized.length ? normalized : ['all'];
  }

  function formatPermissionSummary(value) {
    const permissions = normalizePermissions(value);
    if (permissions.includes('all')) return '✅ Semua fitur';
    return `🔐 ${permissions.length} fitur aktif`;
  }

  function openPermissionModal(userId, email) {
    try { ensureExpectedSuperAdmin(); }
    catch (error) { return showToast(error.message, 'error'); }
    selectedPermissionUserId = userId;
    const user = allUsers.find(u => u.id === userId) || {};
    const permissions = normalizePermissions(user.permissions);
    const allSelected = permissions.includes('all');
    document.getElementById('permissionUserEmail').textContent = email || user.email || userId;
    document.querySelectorAll('.permission-item').forEach(input => {
      input.checked = allSelected || permissions.includes(input.value);
    });
    document.getElementById('permissionAll').checked = allSelected || FEATURE_PERMISSION_KEYS.every(key => permissions.includes(key));
    document.getElementById('permissionModal').classList.add('open');
  }

  function closePermissionModal() {
    document.getElementById('permissionModal').classList.remove('open');
    selectedPermissionUserId = null;
  }

  function toggleAllPermissions(checked) {
    document.querySelectorAll('.permission-item').forEach(input => { input.checked = checked; });
  }

  function syncSelectAllPermission() {
    const items = [...document.querySelectorAll('.permission-item')];
    document.getElementById('permissionAll').checked = items.length > 0 && items.every(input => input.checked);
  }

  async function confirmUpdatePermissions() {
    if (!selectedPermissionUserId) return;
    try { ensureExpectedSuperAdmin(); }
    catch (error) { return showToast(error.message, 'error'); }

    const selected = [...document.querySelectorAll('.permission-item:checked')].map(input => input.value);
    if (!selected.length) return showToast('Pilih minimal satu permission', 'error');
    const permissions = selected.length === FEATURE_PERMISSION_KEYS.length ? ['all'] : selected;
    const btn = document.getElementById('btnConfirmPermission');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const session = Auth.getSession();
      if (!session?.access_token) throw new Error('Session admin habis. Login ulang.');
      const response = await fetch('/api/admin-update-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: selectedPermissionUserId, permissions })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);

      const idx = allUsers.findIndex(u => u.id === selectedPermissionUserId);
      if (idx !== -1) allUsers[idx] = { ...allUsers[idx], permissions: data.permissions || permissions };
      renderTable(allUsers);
      closePermissionModal();
      showToast('✅ Permission berhasil diperbarui', 'success');
    } catch (error) {
      showToast('❌ Gagal menyimpan permission: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Permission';
    }
  }

  function copyWhatsapp(number) {
    navigator.clipboard?.writeText(number).then(() => {
      alert('Nomor WA disalin: ' + number);
    }).catch(() => {
      prompt('Copy nomor WA:', number);
    });
  }

  function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allUsers.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.booth_name || '').toLowerCase().includes(q) ||
      (u.whatsapp_number || '').toLowerCase().includes(q)
    );
    renderTable(filtered);
  }


  async function patchProfile(userId, updates) {
    ensureExpectedSuperAdmin();
    const session = Auth.getSession();
    if (!session?.access_token) throw new Error('Session tidak ditemukan');

    const res = await fetch(`${CMS_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': CMS_ANON,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString()
      })
    });

    const raw = await res.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch(e) {}

    if (!res.ok) {
      let errDetail = (data && (data.message || data.error || data.details)) || raw || `HTTP ${res.status}`;
      // Detect RLS / permission error
      if (res.status === 403 || (typeof errDetail === 'string' && errDetail.includes('policy'))) {
        errDetail = 'Akses ditolak oleh Supabase (RLS policy). Pastikan super admin menggunakan service_role key atau RLS sudah dikonfigurasi untuk admin.';
      }
      throw new Error(errDetail);
    }

    if (Array.isArray(data) && data[0]) {
      const idx = allUsers.findIndex(u => u.id === userId);
      if (idx !== -1) allUsers[idx] = { ...allUsers[idx], ...data[0] };
      renderStats();
      renderTable(allUsers);
      return data[0];
    }

    // Kalau policy return kosong tapi PATCH sukses, update local supaya UI langsung berubah.
    const idx = allUsers.findIndex(u => u.id === userId);
    if (idx !== -1) allUsers[idx] = { ...allUsers[idx], ...updates };
    renderStats();
    renderTable(allUsers);
    setTimeout(loadUsers, 450);
    return true;
  }

  // ── TOGGLE ACTIVE ─────────────────────────────────────────────────────
  async function toggleActive(userId, active) {
    try {
      const session = Auth.getSession();
      if (!session?.access_token) throw new Error('Session tidak ditemukan, silakan login ulang');

      const res = await fetch(`${CMS_URL}/functions/v1/admin-toggle-active`, {
        method: 'POST',
        headers: {
          'apikey': CMS_ANON,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, is_active: active })
      });

      if (!res.ok) {
        const raw = await res.text();
        let msg = `HTTP ${res.status}`;
        try { const e = JSON.parse(raw); msg = e.message || e.error || e.details || msg; } catch(_) {}
        throw new Error(msg);
      }

      // Update local state langsung
      const idx = allUsers.findIndex(u => u.id === userId);
      if (idx !== -1) allUsers[idx] = { ...allUsers[idx], is_active: active };
      renderStats();
      renderTable(allUsers);
      showToast(active ? '✅ Akun diaktifkan' : '⛔ Akun dinonaktifkan', 'success');
      setTimeout(loadUsers, 600);
    } catch(e) {
      console.error('toggleActive error:', e);
      showToast('❌ Gagal update status: ' + e.message, 'error');
    }
  }

  // ── SET FREE ──────────────────────────────────────────────────────────
  async function setFree(userId) {
    try {
      await patchProfile(userId, {
        plan: 'free',
        pro_ends_at: null,
        updated_at: new Date().toISOString()
      });
      const idx = allUsers.findIndex(u => u.id === userId);
      if (idx !== -1) allUsers[idx] = { ...allUsers[idx], plan: 'free', pro_ends_at: null };
      renderStats();
      renderTable(allUsers);
      showToast('🆓 Akun dijadikan Free', 'success');
      setTimeout(loadUsers, 600);
    } catch(e) {
      console.error('setFree error:', e);
      showToast('❌ Gagal jadikan Free: ' + e.message, 'error');
    }
  }


  // ── CHANGE PASSWORD MODAL ────────────────────────────────────────────
  function openPasswordModal(userId, email) {
    selectedPasswordUserId = userId;
    document.getElementById('passwordUserEmail').textContent = email || userId;
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('passwordModal').classList.add('open');
    setTimeout(() => document.getElementById('newPasswordInput').focus(), 80);
  }

  function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('open');
    selectedPasswordUserId = null;
  }

  async function confirmChangePassword() {
    const password = document.getElementById('newPasswordInput').value.trim();
    if (!selectedPasswordUserId) return;
    if (password.length < 6) {
      showToast('❌ Password minimal 6 karakter', 'error');
      return;
    }

    const btn = document.getElementById('btnConfirmPassword');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const session = Auth.getSession();
      const res = await fetch(`${CMS_URL}/functions/v1/admin-change-password`, {
        method: 'POST',
        headers: {
          'apikey': CMS_ANON,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedPasswordUserId,
          password
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      showToast(data.message || '✅ Password berhasil diganti dan terverifikasi', 'success');
      closePasswordModal();
    } catch(e) {
      console.error(e);
      showToast('❌ Gagal ganti password: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Password';
    }
  }

  // ── PRO MODAL ─────────────────────────────────────────────────────────
  function openProModal(userId, email) {
    selectedUserId = userId;
    const user = allUsers.find(u => u.id === userId) || {};
    const status = getPlanStatus(user);
    const isExtend = status === 'pro';

    document.getElementById('modalUserEmail').textContent = email || user.email || userId;
    const title = document.getElementById('proModalTitle');
    const sub = document.getElementById('proModalSub');
    const btn = document.getElementById('btnConfirmPro');

    if (title) title.textContent = isExtend ? '⏳ Perpanjang PRO' : '⭐ Aktifkan PRO';
    if (sub) sub.innerHTML = isExtend
      ? `Pilih durasi perpanjangan PRO untuk <span class="modal-user" id="modalUserEmail">${email || user.email || userId}</span>`
      : `Pilih durasi PRO untuk <span class="modal-user" id="modalUserEmail">${email || user.email || userId}</span>`;
    if (btn) btn.textContent = isExtend ? '⏳ Perpanjang PRO' : '⭐ Aktifkan PRO';

    document.querySelector('input[value="1week"]').checked = true;
    document.querySelectorAll('.duration-opt').forEach(el => el.classList.remove('selected'));
    document.querySelector('#opt1week').classList.add('selected');
    document.getElementById('customDate').value = '';
    document.getElementById('customDateWrap').style.display = 'none';
    document.getElementById('proModal').classList.add('open');
  }
  function closeProModal() {
    document.getElementById('proModal').classList.remove('open');
    selectedUserId = null;
  }
  function onDurationChange() {
    const val = document.querySelector('input[name="duration"]:checked').value;
    document.querySelectorAll('.duration-opt').forEach(el => el.classList.remove('selected'));
    document.getElementById('customDateWrap').style.display = val === 'custom' ? 'block' : 'none';
    // Highlight selected
    const map = { '1week':'opt1week','1month':'opt1month','3month':'opt3month','custom':'optCustom' };
    document.getElementById(map[val]).classList.add('selected');
  }


  function formatDateTimeID(value) {
    if (!value) return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('id-ID', {
      weekday:'long',
      year:'numeric',
      month:'long',
      day:'numeric',
      hour:'2-digit',
      minute:'2-digit'
    });
  }

  function remainingDaysUntil(value) {
    if (!value) return 0;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.max(0, Math.ceil((d.getTime() - Date.now()) / (24*60*60*1000)));
  }

  function durationLabel(val, proEnd) {
    if (val === '1week') return '1 Minggu (7 hari)';
    if (val === '1month') return '1 Bulan (30 hari)';
    if (val === '3month') return '3 Bulan (90 hari)';
    return `Custom sampai ${formatDateTimeID(proEnd)}`;
  }

  function buildProReceiptText(r) {
    const actionLabel = r.actionType === 'extend_pro' ? 'Perpanjangan PRO' : 'Aktivasi PRO';
    const previous = r.wasPro
      ? `Sebelumnya: PRO aktif, sisa ${r.previousDaysLeft} hari, berlaku sampai ${formatDateTimeID(r.previousProEndsAt)}`
      : `Sebelumnya: ${r.previousPlanLabel}`;
    const after = `Sekarang: PRO aktif, sisa ${r.newDaysLeft} hari, berlaku sampai ${formatDateTimeID(r.newProEndsAt)}`;

    return [
      `Bukti ${actionLabel} Lux Photobooth`,
      ``,
      `Akun Owner       : ${r.email || '-'}`,
      `Nama Photobooth  : ${r.boothName || '-'}`,
      ``,
      previous,
      after,
      `Durasi dipilih   : ${r.durationLabel}`,
      ``,
      `Diproses oleh    : ${r.performedByEmail || '-'}`,
      `Waktu proses     : ${formatDateTimeID(r.performedAt)}`,
      ``,
      `Catatan: bukti ini dibuat otomatis dari CMS Lux Photobooth sebagai bukti perubahan status akun owner.`
    ].join('\n');
  }

  function makeProReceiptSummary(r) {
    if (r.actionType === 'extend_pro') {
      return `Akun ${r.email} sudah diperpanjang. Sisa PRO sebelumnya ${r.previousDaysLeft} hari, sekarang menjadi ${r.newDaysLeft} hari. Berlaku sampai ${formatDateTimeID(r.newProEndsAt)}.`;
    }
    return `Akun ${r.email} sudah diubah statusnya menjadi PRO selama ${r.newDaysLeft} hari. Berlaku sampai ${formatDateTimeID(r.newProEndsAt)}.`;
  }

  async function saveProExtensionLog(receipt) {
    const session = Auth.getSession();
    if (!session?.access_token) throw new Error('Session tidak ditemukan');

    const payload = {
      owner_user_id: receipt.userId,
      owner_email: receipt.email || null,
      owner_booth_name: receipt.boothName || null,
      previous_plan: receipt.previousPlan || null,
      previous_pro_ends_at: receipt.previousProEndsAt || null,
      previous_days_left: receipt.previousDaysLeft,
      new_plan: 'pro',
      new_pro_ends_at: receipt.newProEndsAt,
      new_days_left: receipt.newDaysLeft,
      duration_label: receipt.durationLabel,
      action_type: receipt.actionType,
      performed_by: session.user?.id || null,
      performed_by_email: receipt.performedByEmail || null,
      receipt_text: buildProReceiptText({ ...receipt, savedToDb: true })
    };

    const res = await fetch(`${CMS_URL}/rest/v1/pro_extension_logs`, {
      method: 'POST',
      headers: {
        'apikey': CMS_ANON,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const raw = await res.text();
      let msg = raw || `HTTP ${res.status}`;
      try { const e = JSON.parse(raw); msg = e.message || e.error || e.details || msg; } catch(_) {}
      throw new Error(msg);
    }
  }

  function showProReceiptModal(receipt) {
    currentProReceipt = receipt;
    const summary = makeProReceiptSummary(receipt);
    const text = buildProReceiptText(receipt);

    document.getElementById('proReceiptSummary').textContent = summary;
    document.getElementById('proReceiptEmail').textContent = receipt.email || '—';
    document.getElementById('proReceiptEnd').textContent = formatDateTimeID(receipt.newProEndsAt);
    document.getElementById('proReceiptBefore').textContent = receipt.wasPro
      ? `PRO, sisa ${receipt.previousDaysLeft} hari`
      : receipt.previousPlanLabel;
    document.getElementById('proReceiptAfter').textContent = `PRO, sisa ${receipt.newDaysLeft} hari`;
    document.getElementById('proReceiptText').value = text;

    const subject = encodeURIComponent(`Konfirmasi ${receipt.actionType === 'extend_pro' ? 'Perpanjangan' : 'Aktivasi'} PRO Lux Photobooth`);
    const body = encodeURIComponent(text);
    const emailTo = encodeURIComponent(receipt.email || '');
    const emailLink = document.getElementById('proReceiptEmailLink');
    emailLink.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;

    document.getElementById('proReceiptModal').classList.add('open');
  }

  function closeProReceiptModal() {
    document.getElementById('proReceiptModal').classList.remove('open');
  }

  async function copyProReceipt() {
    const text = document.getElementById('proReceiptText').value || '';
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Bukti disalin', 'success');
    } catch(e) {
      document.getElementById('proReceiptText').select();
      showToast('Silakan copy manual dari textarea', 'error');
    }
  }

  function pdfSafeText(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  function wrapPdfText(ctx, text, maxChars) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function makeReceiptPdfBlob(receipt) {
    const actionLabel = receipt.actionType === 'extend_pro' ? 'Perpanjangan PRO' : 'Aktivasi PRO';
    const title = `Bukti ${actionLabel}`;
    const subtitle = 'Lux Photobooth Owner Account';
    const summary = makeProReceiptSummary(receipt);

    const rows = [
      ['Akun Owner', receipt.email || '-'],
      ['Nama Photobooth', receipt.boothName || '-'],
      ['Sebelumnya', receipt.wasPro ? `PRO, sisa ${receipt.previousDaysLeft} hari, sampai ${formatDateTimeID(receipt.previousProEndsAt)}` : receipt.previousPlanLabel],
      ['Sekarang', `PRO, sisa ${receipt.newDaysLeft} hari, sampai ${formatDateTimeID(receipt.newProEndsAt)}`],
      ['Durasi dipilih', receipt.durationLabel],
      ['Diproses oleh', receipt.performedByEmail || '-'],
      ['Waktu proses', formatDateTimeID(receipt.performedAt)]
    ];

    const pageW = 595.28;
    const pageH = 841.89;
    const left = 56;
    let y = 780;
    const ops = [];

    function text(x, yPos, size, value) {
      ops.push(`BT /F1 ${size} Tf ${x} ${yPos} Td (${pdfSafeText(value)}) Tj ET`);
    }
    function rect(x, yPos, w, h) {
      ops.push(`${x} ${yPos} ${w} ${h} re S`);
    }
    function fillRect(x, yPos, w, h, gray='0.96') {
      ops.push(`${gray} g ${x} ${yPos} ${w} ${h} re f 0 g`);
    }
    function line(x1, y1, x2, y2) {
      ops.push(`${x1} ${y1} m ${x2} ${y2} l S`);
    }

    // Border & header
    ops.push('0.12 0.21 0.34 RG 0.12 0.21 0.34 rg');
    rect(36, 36, pageW - 72, pageH - 72);
    fillRect(36, 730, pageW - 72, 75, '0.94');

    text(left, 778, 22, title);
    text(left, 754, 12, subtitle);
    text(410, 778, 11, 'CMS Receipt');
    text(410, 758, 10, new Date(receipt.performedAt || Date.now()).toLocaleDateString('id-ID'));

    // Summary box
    y = 696;
    fillRect(left, y - 48, pageW - 112, 58, '0.98');
    rect(left, y - 48, pageW - 112, 58);
    text(left + 14, y - 12, 12, 'Ringkasan');
    const sumLines = wrapPdfText(null, summary, 78).slice(0, 2);
    sumLines.forEach((ln, idx) => text(left + 14, y - 30 - (idx * 14), 10, ln));

    // Detail table
    y = 610;
    text(left, y + 24, 14, 'Detail Perubahan Status');
    line(left, y + 12, pageW - left, y + 12);

    rows.forEach(([label, value]) => {
      const rowH = 46;
      fillRect(left, y - rowH + 8, pageW - 112, rowH, '0.995');
      rect(left, y - rowH + 8, pageW - 112, rowH);
      text(left + 14, y - 8, 10, label);
      const lines = wrapPdfText(null, value, 58).slice(0, 2);
      lines.forEach((ln, idx) => text(left + 170, y - 8 - (idx * 13), 10, ln));
      y -= rowH;
    });

    // Footer note
    y -= 12;
    line(left, y, pageW - left, y);
    y -= 24;
    text(left, y, 10, 'Catatan: bukti ini dibuat otomatis dari CMS Lux Photobooth sebagai bukti perubahan status akun owner.');
    text(left, 58, 9, 'Lux Photobooth - PRO Account Receipt');

    const stream = ops.join('\n');
    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((obj, idx) => {
      offsets[idx + 1] = pdf.length;
      pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  }

  function downloadProReceipt() {
    if (!currentProReceipt) {
      showToast('❌ Data bukti belum tersedia', 'error');
      return;
    }

    const email = (currentProReceipt.email || 'owner').replace(/[^a-z0-9@._-]/gi, '_');
    const filename = `bukti-pro-${email}-${Date.now()}.pdf`;
    const blob = makeReceiptPdfBlob(currentProReceipt);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmActivatePro() {
    if (!selectedUserId) return;
    const val = document.querySelector('input[name="duration"]:checked').value;
    let proEnd;
    const now = new Date();
    if (val === '1week')  proEnd = new Date(now.getTime() + 7*24*60*60*1000);
    if (val === '1month') proEnd = new Date(now.getTime() + 30*24*60*60*1000);
    if (val === '3month') proEnd = new Date(now.getTime() + 90*24*60*60*1000);
    if (val === 'custom') {
      const d = document.getElementById('customDate').value;
      if (!d) { showToast('❌ Pilih tanggal custom', 'error'); return; }
      proEnd = new Date(d + 'T23:59:59');
    }

    const btn = document.getElementById('btnConfirmPro');
    const userBefore = allUsers.find(u => u.id === selectedUserId) || {};
    const wasPro = getPlanStatus(userBefore) === 'pro';
    const previousProEndsAt = userBefore.pro_ends_at || null;
    const previousDaysLeft = remainingDaysUntil(previousProEndsAt);
    const previousPlan = userBefore.plan || (wasPro ? 'pro' : 'free');
    const previousPlanLabel = wasPro
      ? `PRO, sisa ${previousDaysLeft} hari`
      : (userBefore.is_active === false ? 'Nonaktif / Free' : 'Free');

    btn.disabled = true;
    btn.textContent = wasPro ? '⏳ Memperpanjang...' : '⏳ Mengaktifkan...';

    try {
      const session = Auth.getSession();
      if (!session?.access_token) throw new Error('Session tidak ditemukan, silakan login ulang');

      const res = await fetch(`${CMS_URL}/rest/v1/profiles?id=eq.${selectedUserId}`, {
        method: 'PATCH',
        headers: {
          'apikey': CMS_ANON,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          plan: 'pro',
          pro_ends_at: proEnd.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString()
        })
      });

      const raw = await res.text();
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const e = JSON.parse(raw); errMsg = e.message || e.error || e.details || errMsg; } catch(_) {}
        throw new Error(errMsg);
      }

      let updated = null;
      try { const arr = JSON.parse(raw); updated = Array.isArray(arr) ? arr[0] : null; } catch(_) {}

      const idx = allUsers.findIndex(u => u.id === selectedUserId);
      if (idx !== -1) {
        allUsers[idx] = { ...allUsers[idx], plan: 'pro', pro_ends_at: proEnd.toISOString(), is_active: true, ...(updated || {}) };
      }

      const receipt = {
        userId: selectedUserId,
        email: (updated && updated.email) || userBefore.email || document.getElementById('modalUserEmail')?.textContent || '',
        boothName: (updated && updated.booth_name) || userBefore.booth_name || '',
        actionType: wasPro ? 'extend_pro' : 'activate_pro',
        wasPro,
        previousPlan,
        previousPlanLabel,
        previousProEndsAt,
        previousDaysLeft,
        newProEndsAt: proEnd.toISOString(),
        newDaysLeft: remainingDaysUntil(proEnd),
        durationLabel: durationLabel(val, proEnd),
        performedAt: new Date().toISOString(),
        performedByEmail: localStorage.getItem('sb_user_email') || '',
        savedToDb: false
      };

      try {
        await saveProExtensionLog(receipt);
        receipt.savedToDb = true;
      } catch(logErr) {
        console.warn('pro_extension_logs not saved:', logErr);
      }

      renderStats();
      renderTable(allUsers);
      closeProModal();
      showProReceiptModal(receipt);
      showToast(wasPro ? '✅ Perpanjangan PRO berhasil' : '✅ Aktivasi PRO berhasil', 'success');
      setTimeout(loadUsers, 800);
    } catch(e) {
      console.error('confirmActivatePro error:', e);
      showToast('❌ Gagal aktifkan/perpanjang PRO: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      const userNow = allUsers.find(u => u.id === selectedUserId) || {};
      btn.textContent = getPlanStatus(userNow) === 'pro' ? '⏳ Perpanjang PRO' : '⭐ Aktifkan PRO';
    }
  }

  // ── TOAST ─────────────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg, type='') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' '+type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3500);
  }
