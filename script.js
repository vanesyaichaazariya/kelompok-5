/* ============================================================
   OMPRENG MBG - LOGIC FINAL (SEMUA ROLE BISA AKSES SEMUA MENU)
   ============================================================ */

const STORAGE_KEY = 'ompreng_mbg_data';
const TOTAL_OMPRENG = 120;

let state = { transaksi: [] };
let filterState = { status: 'all', cari: '' };

// ============ LOGIKA AKSES ROLE ============
function checkUserRole() {
  const role = localStorage.getItem('user_role');
  const isLoginPage = window.location.pathname.includes('login.html');
  
  // Jika belum login, tendang ke halaman login
  if (!role && !isLoginPage) {
    window.location.href = 'login.html';
    return;
  }

  // Tampilkan nama dan role di header
  const nameEl = document.getElementById('display-name');
  const roleEl = document.getElementById('display-role');
  const avatarEl = document.getElementById('user-avatar-text');

  if (nameEl && roleEl && role) {
    nameEl.textContent = role;
    roleEl.textContent = 'Akses Terverifikasi';
    if (avatarEl) avatarEl.textContent = role.charAt(0).toUpperCase();
  }
}

// ============ UTIL ============
function generateId() { return 'TRX-' + Date.now() + '-' + Math.floor(Math.random() * 1000); }

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateOnly(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function isTerlambat(trx) {
  if (trx.status !== 'Dipinjam' || !trx.targetKembali) return false;
  return new Date() > new Date(trx.targetKembali + 'T23:59:59');
}

function getStokTersedia() {
  const dipinjam = state.transaksi.filter(t => t.status === 'Dipinjam').reduce((s, t) => s + t.jumlah, 0);
  return TOTAL_OMPRENG - dipinjam;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ============ STORAGE ============
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.transaksi)) state.transaksi = p.transaksi;
    }
  } catch (e) { console.warn(e); }
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn(e); }
}

// ============ TOAST ============
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}

// ============ RENDER: BERANDA ============
function renderBeranda() {
  const totalEl = document.getElementById('stat-total');
  if (!totalEl) return;

  const aktif = state.transaksi.filter(t => t.status === 'Dipinjam');
  const totalDipinjam = aktif.reduce((s, t) => s + t.jumlah, 0);

  document.getElementById('stat-total').textContent = TOTAL_OMPRENG;
  document.getElementById('stat-dipinjam').textContent = totalDipinjam;
  document.getElementById('stat-tersedia').textContent = TOTAL_OMPRENG - totalDipinjam;
  document.getElementById('stat-transaksi').textContent = state.transaksi.length;

  const tbody = document.getElementById('tabel-peminjaman-aktif');
  if (!tbody) return;

  if (aktif.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada peminjaman aktif.</td></tr>';
    return;
  }

  tbody.innerHTML = aktif.slice(0, 5).map(t => {
    const late = isTerlambat(t);
    return `
      <tr>
        <td>${escapeHtml(t.nama)}</td>
        <td>${escapeHtml(t.kelas)}</td>
        <td>${t.jumlah} buah</td>
        <td>${formatDate(t.waktuPinjam)}</td>
        <td>${late ? '<span class="badge badge-terlambat">⚠️ Terlambat</span>' : '<span class="badge badge-dipinjam">Dipinjam</span>'}</td>
      </tr>`;
  }).join('');
}

// ============ RENDER: PEMINJAMAN ============
function renderPeminjaman() {
  const tbody = document.getElementById('tabel-peminjaman');
  if (!tbody) return;

  const aktif = state.transaksi.filter(t => t.status === 'Dipinjam');

  if (aktif.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada peminjaman aktif.</td></tr>';
    return;
  }

  tbody.innerHTML = aktif.map(t => {
    const late = isTerlambat(t);
    return `
      <tr>
        <td>${escapeHtml(t.nama)}</td>
        <td>${escapeHtml(t.tipe)}</td>
        <td>${escapeHtml(t.kelas)}</td>
        <td>${t.jumlah} buah</td>
        <td>${formatDate(t.waktuPinjam)}</td>
        <td>${formatDateOnly(t.targetKembali)}</td>
        <td>${late ? '<span class="badge badge-terlambat">⚠️ Terlambat</span>' : '<span class="badge badge-dipinjam">Dipinjam</span>'}</td>
      </tr>`;
  }).join('');
}

// ============ RENDER: PENGEMBALIAN ============
function renderPengembalian() {
  const select = document.getElementById('pilih-peminjaman');
  const tbody = document.getElementById('tabel-pengembalian');
  if (!select || !tbody) return;

  const aktif = state.transaksi.filter(t => t.status === 'Dipinjam');

  select.innerHTML = '<option value="">-- Pilih Peminjaman --</option>' +
    aktif.map(t => `<option value="${t.id}">${escapeHtml(t.nama)} - ${escapeHtml(t.kelas)} (${t.jumlah} buah)</option>`).join('');

  if (aktif.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Tidak ada peminjaman aktif.</td></tr>';
    return;
  }

  tbody.innerHTML = aktif.map(t => {
    const late = isTerlambat(t);
    return `
      <tr>
        <td>${escapeHtml(t.nama)}</td>
        <td>${escapeHtml(t.kelas)}</td>
        <td>${t.jumlah} buah</td>
        <td>${formatDate(t.waktuPinjam)}</td>
        <td>${formatDateOnly(t.targetKembali)} ${late ? '⚠️' : ''}</td>
        <td><button class="btn-icon" onclick="pilihUntukKembali('${t.id}')">↩️ Pilih</button></td>
      </tr>`;
  }).join('');
}

// ============ RENDER: RIWAYAT ============
function renderRiwayat() {
  const tbody = document.getElementById('tabel-riwayat');
  if (!tbody) return;

  let data = [...state.transaksi];

  if (filterState.status === 'Terlambat') {
    data = data.filter(t => isTerlambat(t));
  } else if (filterState.status !== 'all') {
    data = data.filter(t => t.status === filterState.status);
  }

  if (filterState.cari.trim() !== '') {
    const q = filterState.cari.toLowerCase();
    data = data.filter(t => t.nama.toLowerCase().includes(q));
  }

  data.sort((a, b) => new Date(b.waktuPinjam) - new Date(a.waktuPinjam));

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Belum ada transaksi.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(t => {
    const late = isTerlambat(t);
    const statusBadge = t.status === 'Dipinjam'
      ? (late ? '<span class="badge badge-terlambat">⚠️ Terlambat</span>' : '<span class="badge badge-dipinjam">Dipinjam</span>')
      : '<span class="badge badge-kembali">Dikembalikan</span>';

    const kondisiBadge = t.kondisi && t.kondisi !== 'Baik'
      ? `<span class="badge badge-danger">${escapeHtml(t.kondisi)}</span>`
      : (t.kondisi ? escapeHtml(t.kondisi) : '-');

    return `
      <tr>
        <td>${escapeHtml(t.nama)}</td>
        <td>${escapeHtml(t.tipe)}</td>
        <td>${escapeHtml(t.kelas)}</td>
        <td>${t.jumlah}</td>
        <td>${formatDate(t.waktuPinjam)}</td>
        <td>${formatDateOnly(t.targetKembali)}</td>
        <td>${formatDate(t.waktuKembali)}</td>
        <td>${kondisiBadge}</td>
        <td>${statusBadge}</td>
        <td>
          ${t.status === 'Dipinjam'
            ? `<button class="btn-icon" onclick="pilihUntukKembali('${t.id}');window.location.href='pengembalian.html'">↩️ Kembalikan</button>`
            : `<button class="btn-icon" onclick="hapusTransaksi('${t.id}')">🗑️ Hapus</button>`}
        </td>
      </tr>`;
  }).join('');
}

// ============ RENDER GLOBAL ============
function renderAll() {
  renderBeranda();
  renderPeminjaman();
  renderPengembalian();
  renderRiwayat();
}

// ============ HANDLER: PEMINJAMAN ============
function handleFormPeminjaman(e) {
  e.preventDefault();

  const nama = document.getElementById('nama-peminjam').value.trim();
  const tipe = document.getElementById('tipe-peminjam').value;
  const kelas = document.getElementById('kelas-jabatan').value.trim();
  const jumlah = parseInt(document.getElementById('jumlah-ompreng').value, 10);
  const targetKembali = document.getElementById('tanggal-kembali').value;
  const keterangan = document.getElementById('keterangan').value.trim();

  if (!nama || !tipe || !kelas || !jumlah || !targetKembali) {
    showToast('Harap lengkapi semua field wajib!', 'error');
    return;
  }
  if (jumlah < 1) { showToast('Jumlah ompreng minimal 1!', 'error'); return; }

  const tersedia = getStokTersedia();
  if (jumlah > tersedia) {
    showToast(`Stok tidak mencukupi! Tersedia: ${tersedia} ompreng.`, 'error');
    return;
  }

  state.transaksi.push({
    id: generateId(), nama, tipe, kelas, jumlah, keterangan,
    waktuPinjam: new Date().toISOString(),
    targetKembali, waktuKembali: null, kondisi: null, catatan: '', status: 'Dipinjam'
  });

  saveData();
  renderAll();
  showToast(`✅ Peminjaman ${jumlah} ompreng oleh ${nama} berhasil dicatat.`, 'success');

  e.target.reset();
  document.getElementById('jumlah-ompreng').value = 1;
}

// ============ HANDLER: PILIH UNTUK KEMBALI ============
window.pilihUntukKembali = function (id) {
  const select = document.getElementById('pilih-peminjaman');
  if (!select) return;
  select.value = id;
  select.dispatchEvent(new Event('change'));
  const detail = document.getElementById('detail-peminjaman');
  if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// ============ HANDLER: SELECT PEMINJAMAN ============
function handleSelectPeminjaman(e) {
  const id = e.target.value;
  const detailBox = document.getElementById('detail-peminjaman');
  const form = document.getElementById('form-pengembalian');

  if (!id) {
    detailBox.classList.add('hidden');
    form.classList.add('hidden');
    return;
  }

  const trx = state.transaksi.find(t => t.id === id);
  if (!trx) return;

  document.getElementById('d-nama').textContent = trx.nama;
  document.getElementById('d-tipe').textContent = trx.tipe;
  document.getElementById('d-kelas').textContent = trx.kelas;
  document.getElementById('d-jumlah').textContent = trx.jumlah + ' buah';
  document.getElementById('d-waktu').textContent = formatDate(trx.waktuPinjam);
  document.getElementById('d-target').textContent = formatDateOnly(trx.targetKembali);

  detailBox.classList.remove('hidden');
  form.classList.remove('hidden');
  form.dataset.id = id;
}

// ============ HANDLER: PENGEMBALIAN ============
function handleFormPengembalian(e) {
  e.preventDefault();

  const id = e.target.dataset.id;
  const kondisi = document.getElementById('kondisi').value;
  const catatan = document.getElementById('catatan-kembali').value.trim();

  if (!id) { showToast('Pilih peminjaman dulu!', 'error'); return; }

  const trx = state.transaksi.find(t => t.id === id);
  if (!trx) return;

  trx.status = 'Dikembalikan';
  trx.waktuKembali = new Date().toISOString();
  trx.kondisi = kondisi;
  trx.catatan = catatan;

  saveData();
  renderAll();
  showToast(`✅ Pengembalian oleh ${trx.nama} berhasil dicatat.`, 'success');

  e.target.reset();
  e.target.classList.add('hidden');
  document.getElementById('detail-peminjaman').classList.add('hidden');
  document.getElementById('pilih-peminjaman').value = '';
}

// ============ HANDLER: HAPUS ============
window.hapusTransaksi = function (id) {
  const trx = state.transaksi.find(t => t.id === id);
  if (!trx) return;
  if (!confirm(`Hapus transaksi atas nama "${trx.nama}"?`)) return;
  state.transaksi = state.transaksi.filter(t => t.id !== id);
  saveData(); renderAll();
  showToast('🗑️ Transaksi berhasil dihapus.', 'success');
};

function handleHapusSemua() {
  if (state.transaksi.length === 0) { showToast('Tidak ada data untuk dihapus.', 'warning'); return; }
  if (!confirm('Hapus SEMUA riwayat? Tindakan ini tidak bisa dibatalkan.')) return;
  state.transaksi = [];
  saveData(); renderAll();
  showToast('🗑️ Semua riwayat berhasil dihapus.', 'success');
}

// ============ HANDLER: FILTER ============
function handleFilterRiwayat() {
  filterState.status = document.getElementById('filter-status').value;
  filterState.cari = document.getElementById('filter-cari').value;
  renderRiwayat();
}

function handleResetFilter() {
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-cari').value = '';
  filterState = { status: 'all', cari: '' };
  renderRiwayat();
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('user_role');
  checkUserRole(); // Hanya cek login, tidak membatasi menu
  loadData();

  const formPeminjaman = document.getElementById('form-peminjaman');
  if (formPeminjaman) formPeminjaman.addEventListener('submit', handleFormPeminjaman);

  const formPengembalian = document.getElementById('form-pengembalian');
  if (formPengembalian) formPengembalian.addEventListener('submit', handleFormPengembalian);

  const selectPeminjaman = document.getElementById('pilih-peminjaman');
  if (selectPeminjaman) selectPeminjaman.addEventListener('change', handleSelectPeminjaman);

  const fs = document.getElementById('filter-status');
  const fc = document.getElementById('filter-cari');
  if (fs) fs.addEventListener('change', handleFilterRiwayat);
  if (fc) fc.addEventListener('input', handleFilterRiwayat);

  const btnReset = document.getElementById('btn-reset-filter');
  if (btnReset) btnReset.addEventListener('click', handleResetFilter);

  const btnHapus = document.getElementById('btn-hapus-semua');
  if (btnHapus) btnHapus.addEventListener('click', handleHapusSemua);

  renderAll();
});
