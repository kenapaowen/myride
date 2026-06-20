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

const SK = 'xmax2026_v3';
let state = { odo: 0, lastDone: {}, history: [] };
let charts = {};

function loadState() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) state = JSON.parse(raw);
  } catch (e) {}
}

function saveState() {
  try { localStorage.setItem(SK, JSON.stringify(state)); } catch (e) {}
}

function fmt(n) { return new Intl.NumberFormat('id-ID').format(Math.round(n || 0)); }
function fmtRp(n) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function getStatus(part) {
  const last = state.lastDone[part.id] || 0;
  const next = last + part.interval;
  const odo = Number(state.odo) || 0;
  const remaining = next - odo;
  const progress = Math.min(1, Math.max(0, (odo - last) / part.interval));
  let status = 'ok';
  if (remaining <= 0) status = 'overdue';
  else if (remaining <= part.interval * 0.12) status = 'soon';
  return { last, next, remaining, progress, status };
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
  state.odo = Number(document.getElementById('odometerInput').value) || 0;
  saveState();
  renderTopStats();
}

function renderTopStats() {
  const statuses = PARTS.map(p => getStatus(p).status);
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
    document.getElementById('chk-' + p.id).checked = false;
    document.getElementById('lbl-' + p.id).classList.remove('selected');
  });
}

function submitService() {
  const km = Number(document.getElementById('fKm').value);
  const date = document.getElementById('fDate').value;
  const note = document.getElementById('fNote').value.trim();
  const cost = Number(document.getElementById('fCost').value) || 0;
  const selected = PARTS.filter(p => document.getElementById('chk-' + p.id).checked);

  if (!km || !date) { showToast('Isi tanggal dan KM servis dulu!'); return; }
  if (!selected.length) { showToast('Centang minimal satu part yang diservis!'); return; }

  selected.forEach(p => { state.lastDone[p.id] = km; });

  state.history.unshift({
    id: Date.now(),
    date, km, cost, note,
    parts: selected.map(p => ({ id: p.id, name: p.name })),
  });

  // Sync odometer if this service is at/after current odo
  if (km > (Number(state.odo) || 0)) {
    state.odo = km;
    document.getElementById('odometerInput').value = km;
  }

  saveState();
  renderTopStats();

  document.getElementById('fKm').value = '';
  document.getElementById('fNote').value = '';
  document.getElementById('fCost').value = '';
  clearAllParts();

  showToast(`Servis dicatat — ${selected.length} part diupdate!`);
}

/* ───────── Jadwal panel ───────── */
function renderSchedule() {
  const labels = { ok: 'Aman', soon: 'Segera', overdue: 'Terlambat' };
  const sorted = PARTS.map(p => ({ ...p, ...getStatus(p) })).sort((a, b) => a.remaining - b.remaining);

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
  const el = document.getElementById('histContainer');
  if (!state.history.length) {
    el.innerHTML = '<div class="empty">Belum ada riwayat servis. Isi form input servis terlebih dahulu.</div>';
    return;
  }
  const total = state.history.reduce((s, h) => s + (Number(h.cost) || 0), 0);
  el.innerHTML = `
    <div class="history-total">Total biaya tercatat: <strong>${fmtRp(total)}</strong></div>
    <div class="history-list">
      ${state.history.map((h, i) => `
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
  state.history.splice(i, 1);
  saveState();
  renderHistory();
}

/* ───────── Dashboard panel ───────── */
function renderDashboard() {
  const h = state.history;

  // Summary stats
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
    document.getElementById('freqList').innerHTML = '<div class="empty">Belum ada data servis.</div>';
    return;
  }

  renderCostByMonthChart();
  renderPartCostChart();
  renderFreqList();
  renderKmGapChart();
}

function chartTextColor() { return '#9a9a9e'; }
function chartGridColor() { return '#2e2e33'; }

function renderCostByMonthChart() {
  const byMonth = {};
  [...state.history].reverse().forEach(h => {
    const key = h.date.slice(0, 7); // YYYY-MM
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
    data: {
      labels: niceLabels,
      datasets: [{
        label: 'Biaya',
        data,
        backgroundColor: '#e8a020',
        borderRadius: 4,
        maxBarThickness: 36,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => fmtRp(ctx.parsed.y) } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: chartTextColor(), font: { size: 11 } } },
        y: {
          grid: { color: chartGridColor() },
          ticks: { color: chartTextColor(), font: { size: 11 }, callback: v => 'Rp' + (v / 1000) + 'rb' },
        },
      },
    },
  });
}

function renderPartCostChart() {
  // Distribute session cost evenly across parts serviced in that session
  const byPart = {};
  state.history.forEach(h => {
    const share = (Number(h.cost) || 0) / (h.parts.length || 1);
    h.parts.forEach(p => { byPart[p.name] = (byPart[p.name] || 0) + share; });
  });
  const entries = Object.entries(byPart).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 7);

  const ctx = document.getElementById('partCostChart').getContext('2d');
  if (charts.partCostChart) charts.partCostChart.destroy();

  if (!entries.length) {
    document.getElementById('partCostChart').parentElement.innerHTML =
      '<div class="empty" style="height:100%;display:flex;align-items:center;justify-content:center">Belum ada biaya tercatat.</div>';
    return;
  }

  const palette = ['#e8a020', '#3a8de0', '#1d9e75', '#e24b4a', '#a87fdd', '#dd7fb0', '#7fc4dd'];
  charts.partCostChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{ data: entries.map(e => Math.round(e[1])), backgroundColor: palette, borderWidth: 0 }],
    },
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

function renderFreqList() {
  const byPart = {};
  state.history.forEach(h => {
    h.parts.forEach(p => { byPart[p.name] = (byPart[p.name] || 0) + 1; });
  });
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

function renderKmGapChart() {
  const sorted = [...state.history].sort((a, b) => a.km - b.km);
  const labels = sorted.map(h => fmt(h.km) + ' km');
  const data = sorted.map((h, i) => i === 0 ? h.km : h.km - sorted[i - 1].km);

  const ctx = document.getElementById('kmChart').getContext('2d');
  if (charts.kmChart) charts.kmChart.destroy();
  charts.kmChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Jarak sejak servis sebelumnya',
        data,
        borderColor: '#3a8de0',
        backgroundColor: 'rgba(58,141,224,0.12)',
        fill: true,
        tension: 0.25,
        pointBackgroundColor: '#3a8de0',
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) + ' km' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: chartTextColor(), font: { size: 10 } } },
        y: { grid: { color: chartGridColor() }, ticks: { color: chartTextColor(), font: { size: 11 } } },
      },
    },
  });
}

/* ───────── Export / Import ───────── */
function exportData() {
  const payload = { ...state, exported: new Date().toISOString(), app: 'xmax-planner-2026', version: 3 };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'xmax-servis-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  showToast('Data di-export!');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (d.history && d.lastDone) {
        state = d;
        saveState();
        document.getElementById('odometerInput').value = state.odo || 0;
        renderTopStats();
        showToast('Data berhasil di-import!');
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
loadState();
document.getElementById('odometerInput').value = state.odo || 0;
document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);
renderPartsCheck();
renderTopStats();
