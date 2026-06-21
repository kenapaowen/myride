'use strict';

const PARTS = [
  { id: 'oli_mesin',    name: 'Oli mesin',                     interval: 2750,  note: 'Ganti tiap 2.500–3.000 km' },
  { id: 'filter_oli',   name: 'Filter oli',                    interval: 5500,  note: 'Ganti tiap 2x ganti oli (5.000–6.000 km)' },
  { id: 'filter_udara', name: 'Filter udara',                  interval: 10000, note: 'Cek 5.000 km, ganti 10.000 km' },
  { id: 'busi',         name: 'Busi',                          interval: 10000, note: 'Cek 5.000 km, ganti 10.000–12.000 km' },
  { id: 'oli_gardan',   name: 'Oli gardan / CVT',              interval: 5000,  note: 'Ganti tiap 5.000 km' },
  { id: 'filter_cvt',   name: 'Filter CVT',                    interval: 5000,  note: 'Bersihkan tiap 5.000 km' },
  { id: 'v_belt',       name: 'V-belt',                        interval: 18000, note: 'Cek 5.000 km, ganti 18.000–20.000 km' },
  { id: 'roller_cvt',   name: 'Roller CVT',                    interval: 15000, note: 'Cek 5.000 km, ganti 15.000–18.000 km' },
  { id: 'kampas_rem',   name: 'Kampas rem (depan & belakang)', interval: 5000,  note: 'Cek kondisi tiap 5.000 km' },
  { id: 'minyak_rem',   name: 'Minyak rem',                    interval: 12000, note: 'Ganti 12.000 km atau 1 tahun' },
  { id: 'aki',          name: 'Aki',                           interval: 5000,  note: 'Cek tiap 5.000 km' },
  { id: 'rantai',       name: 'Rantai keteng',                 interval: 5000,  note: 'Cek tiap 5.000–15.000 km' },
  { id: 'klep',         name: 'Setelan klep',                  interval: 15000, note: 'Cek tiap 15.000 km' },
  { id: 'coolant',      name: 'Coolant radiator',              interval: 15000, note: 'Ganti 15.000–18.000 km atau 1,5 tahun' },
  { id: 'ban',          name: 'Tekanan & kondisi ban',         interval: 500,   note: 'Cek tiap minggu / setiap berkendara' },
  { id: 'suspensi',     name: 'Suspensi belakang',             interval: 10000, note: 'Cek 10.000 km, evaluasi ganti 25.000–30.000 km' },
];

const SK = 'xmax_planner_multi_v1';
const LEGACY_SK = 'xmax2026_v3';

let store = { motors: [], activeMotorId: null };
let charts = {};
let modalMode = 'add'; // 'add' | 'edit'

function uid() { return 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

function freshMotorData(name, tag) {
  return {
    id: uid(),
    name: name || 'Motor Baru',
    tag: tag || '',
    odo: 0,
    lastDone: {},
    history: [],
  };
}

/* ───────── Load / migrate / save ───────── */
function loadStore() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) {
      store = JSON.parse(raw);
      if (store.motors && store.motors.length) return;
    }
  } catch (e) {}

  // Try migrating legacy single-motor data
  try {
    const legacyRaw = localStorage.getItem(LEGACY_SK);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const motor = freshMotorData('Yamaha XMAX Connected', 'XMAX · 2026');
      motor.odo = legacy.odo || 0;
      motor.lastDone = legacy.lastDone || {};
      motor.history = legacy.history || [];
      store = { motors: [motor], activeMotorId: motor.id };
      saveStore();
      return;
    }
  } catch (e) {}

  // Brand new install
  const motor = freshMotorData('Yamaha XMAX Connected', 'XMAX · 2026');
  store = { motors: [motor], activeMotorId: motor.id };
  saveStore();
}

function saveStore() {
  try { localStorage.setItem(SK, JSON.stringify(store)); } catch (e) {}
}

function getActiveMotor() {
  return store.motors.find(m => m.id === store.activeMotorId) || store.motors[0];
}

/* ───────── Helpers ───────── */
function fmt(n) { return new Intl.NumberFormat('id-ID').format(Math.round(n || 0)); }
function fmtRp(n) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function getStatus(motor, part) {
  const last = motor.lastDone[part.id] || 0;
  const next = last + part.interval;
  const odo = Number(motor.odo) || 0;
  const remaining = next - odo;
  const progress = Math.min(1, Math.max(0, (odo - last) / part.interval));
  let status = 'ok';
  if (remaining <= 0) status = 'overdue';
  else if (remaining <= part.interval * 0.12) status = 'soon';
  return { last, next, remaining, progress, status };
}

/* ───────── Motor selector ───────── */
function renderMotorSelect() {
  const sel = document.getElementById('motorSelect');
  sel.innerHTML = store.motors.map(m =>
    `<option value="${m.id}" ${m.id === store.activeMotorId ? 'selected' : ''}>${m.name}</option>`
  ).join('');
  document.getElementById('btnDeleteMotor').style.display = store.motors.length > 1 ? 'inline-flex' : 'none';
  renderBrandHeader();
}

function renderBrandHeader() {
  const motor = getActiveMotor();
  if (!motor) return;
  document.getElementById('brandTag').textContent = (motor.tag || 'PLANNER SERVIS').toUpperCase();
  document.getElementById('brandTitle').textContent = motor.name;
}

function switchMotor(id) {
  store.activeMotorId = id;
  saveStore();
  refreshAllForActiveMotor();
}

function refreshAllForActiveMotor() {
  const motor = getActiveMotor();
  document.getElementById('odometerInput').value = motor.odo || 0;
  renderBrandHeader();
  renderTopStats();
  clearAllParts();
  // Re-render whichever panel is active
  const activePanel = document.querySelector('.panel.active');
  if (activePanel) {
    const id = activePanel.id.replace('panel-', '');
    if (id === 'jadwal') renderSchedule();
    if (id === 'riwayat') renderHistory();
    if (id === 'dashboard') renderDashboard();
  }
}

/* ───────── Motor modal (add/edit) ───────── */
function openMotorModal(mode) {
  modalMode = mode;
  const motor = getActiveMotor();
  document.getElementById('motorModalTitle').textContent = mode === 'add' ? 'Tambah motor' : 'Edit motor';
  document.getElementById('motorNameInput').value = mode === 'edit' && motor ? motor.name : '';
  document.getElementById('motorTagInput').value = mode === 'edit' && motor ? (motor.tag || '') : '';
  document.getElementById('motorModalOverlay').classList.add('show');
}

function closeMotorModal() {
  document.getElementById('motorModalOverlay').classList.remove('show');
}

function closeMotorModalBg(e) {
  if (e.target.id === 'motorModalOverlay') closeMotorModal();
}

function saveMotorModal() {
  const name = document.getElementById('motorNameInput').value.trim();
  const tag = document.getElementById('motorTagInput').value.trim();
  if (!name) { showToast('Isi nama motor dulu!'); return; }

  if (modalMode === 'add') {
    const motor = freshMotorData(name, tag);
    store.motors.push(motor);
    store.activeMotorId = motor.id;
    showToast('Motor "' + name + '" ditambahkan!');
  } else {
    const motor = getActiveMotor();
    if (motor) { motor.name = name; motor.tag = tag; }
    showToast('Motor diperbarui!');
  }

  saveStore();
  closeMotorModal();
  renderMotorSelect();
  refreshAllForActiveMotor();
}

function removeCurrentMotor() {
  if (store.motors.length <= 1) { showToast('Minimal harus ada 1 motor.'); return; }
  const motor = getActiveMotor();
  if (!confirm(`Hapus motor "${motor.name}"? Semua data servisnya akan terhapus.`)) return;

  store.motors = store.motors.filter(m => m.id !== motor.id);
  store.activeMotorId = store.motors[0].id;
  saveStore();
  renderMotorSelect();
  refreshAllForActiveMotor();
  showToast('Motor dihapus.');
}

/* ───────── Tabs ───────── */
function setTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
  if (id === 'jadwal') renderSchedule();
  if (id === 'riwayat') renderHistory();
  if (id === 'dashboard') renderDashboard();
}

/* ───────── Odometer + top stats ───────── */
function saveOdo() {
  const motor = getActiveMotor();
  motor.odo = Number(document.getElementById('odometerInput').value) || 0;
  saveStore();
  renderTopStats();
}

function renderTopStats() {
  const motor = getActiveMotor();
  const statuses = PARTS.map(p => getStatus(motor, p).status);
  document.getElementById('cntOverdue').textContent = statuses.filter(s => s === 'overdue').length;
  document.getElementById('cntSoon').textContent = statuses.filter(s => s === 'soon').length;
}

/* ───────── Form: part checkboxes ───────── */
function renderPartsCheck() {
  document.getElementById('partsCheckGrid').innerHTML = PARTS.map(p => `
    <label class="part-check" id="lbl-${p.id}" onclick="togglePart('${p.id}')">
      <input type="checkbox" id="chk-${p.id}" onclick="event.stopPropagation(); togglePart('${p.id}')" />
      <div>
        <div class="pname">${p.name}</div>
        <div class="pnote">${p.note}</div>
      </div>
    </label>
  `).join('');
}

function togglePart(id) {
  const chk = document.getElementById('chk-' + id);
  const lbl = document.getElementById('lbl-' + id);
  chk.checked = !chk.checked;
  lbl.classList.toggle('selected', chk.checked);
}

function selectAllParts() {
  PARTS.forEach(p => {
    document.getElementById('chk-' + p.id).checked = true;
    document.getElementById('lbl-' + p.id).classList.add('selected');
  });
}

function clearAllParts() {
  PARTS.forEach(p => {
    const chk = document.getElementById('chk-' + p.id);
    const lbl = document.getElementById('lbl-' + p.id);
    if (chk) chk.checked = false;
    if (lbl) lbl.classList.remove('selected');
  });
}

function submitService() {
  const motor = getActiveMotor();
  const km = Number(document.getElementById('fKm').value);
  const date = document.getElementById('fDate').value;
  const note = document.getElementById('fNote').value.trim();
  const cost = Number(document.getElementById('fCost').value) || 0;
  const selected = PARTS.filter(p => document.getElementById('chk-' + p.id).checked);

  if (!km || !date) { showToast('Isi tanggal dan KM servis dulu!'); return; }
  if (!selected.length) { showToast('Centang minimal satu part yang diservis!'); return; }

  selected.forEach(p => { motor.lastDone[p.id] = km; });

  motor.history.unshift({
    id: Date.now(),
    date, km, cost, note,
    parts: selected.map(p => ({ id: p.id, name: p.name })),
  });

  if (km > (Number(motor.odo) || 0)) {
    motor.odo = km;
    document.getElementById('odometerInput').value = km;
  }

  saveStore();
  renderTopStats();

  document.getElementById('fKm').value = '';
  document.getElementById('fNote').value = '';
  document.getElementById('fCost').value = '';
  clearAllParts();

  showToast(`Servis dicatat — ${selected.length} part diupdate!`);
}

/* ───────── Jadwal panel ───────── */
function renderSchedule() {
  const motor = getActiveMotor();
  const labels = { ok: 'Aman', soon: 'Segera', overdue: 'Terlambat' };
  const sorted = PARTS.map(p => ({ ...p, ...getStatus(motor, p) })).sort((a, b) => a.remaining - b.remaining);

  document.getElementById('schedList').innerHTML = sorted.map(p => `
    <div class="part-card ${p.status}">
      <div class="card-head">
        <div>
          <div class="part-name">${p.name}</div>
          <div class="part-sub">${p.note}</div>
        </div>
        <span class="badge ${p.status}">${labels[p.status]}</span>
      </div>
      <div class="timeline">
        <div class="timeline-fill fill-${p.status}" style="width:${Math.round(p.progress * 100)}%"></div>
      </div>
      <div class="card-meta">
        <span>Terakhir: ${fmt(p.last)} km</span>
        <span>${p.remaining > 0 ? 'Sisa ' + fmt(p.remaining) + ' km' : 'Lewat ' + fmt(-p.remaining) + ' km'}</span>
        <span>Target: ${fmt(p.next)} km</span>
      </div>
    </div>
  `).join('');
}

/* ───────── Riwayat panel ───────── */
function renderHistory() {
  const motor = getActiveMotor();
  const el = document.getElementById('histContainer');
  if (!motor.history.length) {
    el.innerHTML = '<div class="empty">Belum ada riwayat servis untuk motor ini. Isi form input servis terlebih dahulu.</div>';
    return;
  }
  const total = motor.history.reduce((s, h) => s + (Number(h.cost) || 0), 0);
  el.innerHTML = `
    <div class="history-total">Total biaya tercatat: <strong>${fmtRp(total)}</strong></div>
    <div class="history-list">
      ${motor.history.map((h, i) => `
        <div class="hist-item">
          <div>
            <div class="hist-title"><i class="ti ti-tool"></i> Servis ${fmt(h.km)} km</div>
            <div class="hist-meta">${h.date}${h.cost ? ' · ' + fmtRp(h.cost) : ''}${h.note ? ' · ' + h.note : ''}</div>
            <div class="hist-tags">${h.parts.map(p => `<span class="part-tag">${p.name}</span>`).join('')}</div>
          </div>
          <button class="hist-del" onclick="deleteHistory(${i})" aria-label="Hapus">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function deleteHistory(i) {
  if (!confirm('Hapus catatan servis ini?')) return;
  const motor = getActiveMotor();
  motor.history.splice(i, 1);
  saveStore();
  renderHistory();
}

/* ───────── Dashboard panel ───────── */
function renderDashboard() {
  const motor = getActiveMotor();
  const h = motor.history;

  const totalCost = h.reduce((s, x) => s + (Number(x.cost) || 0), 0);
  const totalSessions = h.length;
  const totalPartsServiced = h.reduce((s, x) => s + x.parts.length, 0);
  const avgCost = totalSessions ? totalCost / totalSessions : 0;

  document.getElementById('dashStats').innerHTML = `
    <div class="dash-stat">
      <div class="dash-stat-val">${fmtRp(totalCost)}</div>
      <div class="dash-stat-lbl">Total biaya</div>
    </div>
    <div class="dash-stat">
      <div class="dash-stat-val">${totalSessions}</div>
      <div class="dash-stat-lbl">Sesi servis</div>
    </div>
    <div class="dash-stat">
      <div class="dash-stat-val">${totalPartsServiced}</div>
      <div class="dash-stat-lbl">Part diservis</div>
    </div>
    <div class="dash-stat">
      <div class="dash-stat-val">${fmtRp(avgCost)}</div>
      <div class="dash-stat-lbl">Rata-rata / sesi</div>
    </div>
  `;

  if (!h.length) {
    ['costChart', 'partCostChart', 'kmChart'].forEach(id => {
      if (charts[id]) { charts[id].destroy(); charts[id] = null; }
    });
    document.getElementById('freqList').innerHTML = '<div class="empty">Belum ada data servis untuk motor ini.</div>';
    return;
  }

  renderCostByMonthChart(motor);
  renderPartCostChart(motor);
  renderFreqList(motor);
  renderKmGapChart(motor);
}

function chartTextColor() { return '#9a9a9e'; }
function chartGridColor() { return '#2e2e33'; }

function renderCostByMonthChart(motor) {
  const byMonth = {};
  [...motor.history].reverse().forEach(h => {
    const key = h.date.slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + (Number(h.cost) || 0);
  });
  const labels = Object.keys(byMonth).sort();
  const data = labels.map(k => byMonth[k]);
  const niceLabels = labels.map(k => {
    const [y, m] = k.split('-');
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return months[parseInt(m, 10) - 1] + ' ' + y.slice(2);
  });

  const ctx = document.getElementById('costChart').getContext('2d');
  if (charts.costChart) charts.costChart.destroy();
  charts.costChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: niceLabels, datasets: [{ label: 'Biaya', data, backgroundColor: '#e8a020', borderRadius: 4, maxBarThickness: 36 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtRp(ctx.parsed.y) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: chartTextColor(), font: { size: 11 } } },
        y: { grid: { color: chartGridColor() }, ticks: { color: chartTextColor(), font: { size: 11 }, callback: v => 'Rp' + (v / 1000) + 'rb' } },
      },
    },
  });
}

function renderPartCostChart(motor) {
  const byPart = {};
  motor.history.forEach(h => {
    const share = (Number(h.cost) || 0) / (h.parts.length || 1);
    h.parts.forEach(p => { byPart[p.name] = (byPart[p.name] || 0) + share; });
  });
  const entries = Object.entries(byPart).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 7);

  if (charts.partCostChart) { charts.partCostChart.destroy(); charts.partCostChart = null; }

  // Always ensure the canvas exists before drawing or showing empty-state
  const wrap = document.querySelector('.dash-grid-2 .chart-wrap.small');
  wrap.innerHTML = '<canvas id="partCostChart"></canvas>';

  if (!entries.length) {
    wrap.innerHTML = '<div class="empty" style="height:100%;display:flex;align-items:center;justify-content:center">Belum ada biaya tercatat.</div>';
    return;
  }

  const ctx = document.getElementById('partCostChart').getContext('2d');
  const palette = ['#e8a020', '#3a8de0', '#1d9e75', '#e24b4a', '#a87fdd', '#dd7fb0', '#7fc4dd'];
  charts.partCostChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => Math.round(e[1])), backgroundColor: palette, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: chartTextColor(), font: { size: 11 }, boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtRp(ctx.parsed) } },
      },
    },
  });
}

function renderFreqList(motor) {
  const byPart = {};
  motor.history.forEach(h => { h.parts.forEach(p => { byPart[p.name] = (byPart[p.name] || 0) + 1; }); });
  const entries = Object.entries(byPart).sort((a, b) => b[1] - a[1]);
  document.getElementById('freqList').innerHTML = entries.length
    ? entries.map(([name, count]) => `
        <div class="freq-row">
          <span class="freq-name">${name}</span>
          <span class="freq-count">${count}x</span>
        </div>
      `).join('')
    : '<div class="empty">Belum ada data servis.</div>';
}

function renderKmGapChart(motor) {
  const sorted = [...motor.history].sort((a, b) => a.km - b.km);
  const labels = sorted.map(h => fmt(h.km) + ' km');
  const data = sorted.map((h, i) => i === 0 ? h.km : h.km - sorted[i - 1].km);

  const ctx = document.getElementById('kmChart').getContext('2d');
  if (charts.kmChart) charts.kmChart.destroy();
  charts.kmChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Jarak sejak servis sebelumnya', data, borderColor: '#3a8de0', backgroundColor: 'rgba(58,141,224,0.12)', fill: true, tension: 0.25, pointBackgroundColor: '#3a8de0', pointRadius: 4 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) + ' km' } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: chartTextColor(), font: { size: 10 } } },
        y: { grid: { color: chartGridColor() }, ticks: { color: chartTextColor(), font: { size: 11 } } },
      },
    },
  });
}

/* ───────── Export / Import (all motors) ───────── */
function exportData() {
  const payload = { ...store, exported: new Date().toISOString(), app: 'xmax-planner-multi', version: 4 };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'motor-servis-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  showToast('Data semua motor di-export!');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (Array.isArray(d.motors) && d.motors.length) {
        store = { motors: d.motors, activeMotorId: d.activeMotorId || d.motors[0].id };
        saveStore();
        renderMotorSelect();
        refreshAllForActiveMotor();
        showToast('Data berhasil di-import!');
      } else if (d.history && d.lastDone) {
        // legacy single-motor file
        const motor = freshMotorData('Motor (Import)', '');
        motor.odo = d.odo || 0;
        motor.lastDone = d.lastDone || {};
        motor.history = d.history || [];
        store.motors.push(motor);
        store.activeMotorId = motor.id;
        saveStore();
        renderMotorSelect();
        refreshAllForActiveMotor();
        showToast('Data lama berhasil di-import sebagai motor baru!');
      } else {
        showToast('File tidak valid.');
      }
    } catch (err) {
      showToast('Gagal membaca file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ───────── Init ───────── */
loadStore();
document.getElementById('odometerInput').value = getActiveMotor().odo || 0;
document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);
renderPartsCheck();
renderMotorSelect();
renderTopStats();
