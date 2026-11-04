/* ============================================================
   app.js — KPI eLearning Dashboard
   ============================================================ */

// ── Data disematkan (tidak perlukan pelayan web / fetch)
function getInlineData() {
  // Struktur asas sahaja — tajuk, pembangun, nilai KPI diambil dari Google Sheets
  const emptyKpi = { "pembangun_id": "", "tajuk": "", "Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0 };
  const emptyCidos = {
    "Q1": { "kursus_dibuka": 0, "kursus_blended": 0, "peratus_blended": 0, "senarai_kursus": [] },
    "Q2": { "kursus_dibuka": 0, "kursus_blended": 0, "peratus_blended": 0, "senarai_kursus": [] },
    "Q3": { "kursus_dibuka": 0, "kursus_blended": 0, "peratus_blended": 0, "senarai_kursus": [] },
    "Q4": { "kursus_dibuka": 0, "kursus_blended": 0, "peratus_blended": 0, "senarai_kursus": [] }
  };
  function makeJab(id, nama) {
    return {
      "id": id, "nama": nama,
      "pembangun": [],
      "kpi": {
        "video_pdp":       { ...emptyKpi, "sasaran": 80 },
        "video_ai":        { ...emptyKpi, "sasaran": 70 },
        "ebook":           { ...emptyKpi, "sasaran": 60 },
        "microcredential": { ...emptyKpi, "sasaran": 50 }
      },
      "cidos": JSON.parse(JSON.stringify(emptyCidos)),
      "kpi_extra": []
    };
  }
  return {
    "tahun": 2025,
    "jabatan": [
      makeJab("jab-jee",  "Jabatan Kejuruteraan Elektrik"),
      makeJab("jab-jea",  "Jabatan Kejuruteraan Awam"),
      makeJab("jab-jem",  "Jabatan Kejuruteraan Mekanikal"),
      makeJab("jab-perd", "Jabatan Perdagangan"),
      makeJab("jab-tmk",  "Jabatan Teknologi Maklumat dan Komunikasi"),
      makeJab("jab-pa",   "Jabatan Pengajian Am"),
      makeJab("jab-msk",  "Jabatan Matematik, Sains dan Komputer")
    ]
  };
}



// ── Ambang KPI
const THRESHOLDS = {
  video_pdp:       80,
  video_ai:        70,
  ebook:           60,
  microcredential: 50,
  cidos_blended:   70
};

const ITEM_META = {
  video_pdp:       { icon: '📹', label: 'Video PDP' },
  video_ai:        { icon: '🤖', label: 'Video AI' },
  ebook:           { icon: '📚', label: 'eBook' },
  microcredential: { icon: '🏅', label: 'Microcredential' }
};

const SUKUAN_LABELS = {
  Q1: 'Q1 — Jan hingga Mac',
  Q2: 'Q2 — Apr hingga Jun',
  Q3: 'Q3 — Jul hingga Sep',
  Q4: 'Q4 — Okt hingga Dis'
};

// ── State
let appData    = null;
let peranan    = sessionStorage.getItem('peranan') || 'admin';
let jabatanId  = sessionStorage.getItem('jabatan') || '';
let sukuan     = sessionStorage.getItem('sukuan')  || 'Q3';
let activeSection = 'home';

// ── Utility
function statusClass(nilai, sasaran) {
  if (nilai === 0) return 'grey';
  if (nilai >= sasaran)            return 'green';
  if (nilai >= sasaran - 10)       return 'yellow';
  return 'red';
}

function statusLabel(nilai, sasaran) {
  if (nilai === 0) return '— Belum Bermula';
  if (nilai >= sasaran)      return '✔ Sasaran Dicapai';
  if (nilai >= sasaran - 10) return '⚠ Hampir Sasaran';
  return '✖ Di Bawah Sasaran';
}

function badgeHtml(cls, text) {
  return `<span class="badge ${cls}">${text}</span>`;
}

function progressHtml(nilai, cls) {
  const w = Math.min(nilai, 100);
  return `<div class="progress-bar-wrap">
    <div class="progress-bar-fill ${cls}" style="width:${w}%"></div>
  </div>`;
}

// nilai semasa sukuan aktif atau purata semua sukuan
function getKpiValue(kpiObj, sq) {
  const v = kpiObj[sq];
  return (v !== undefined) ? v : 0;
}

function avgAllSukuan(kpiObj) {
  const vals = ['Q1','Q2','Q3','Q4'].map(q => kpiObj[q] || 0).filter(v => v > 0);
  return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0) / vals.length) : 0;
}

function jabatanById(id) {
  return appData.jabatan.find(j => j.id === id);
}

function pembangunById(jab, pid) {
  return (jab.pembangun || []).find(p => p.id === pid);
}

// ── Animated counter
function animateCounter(el, target, duration) {
  if (!el) return;
  const start = 0;
  const step  = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.round(current) + (el.dataset.suffix || '');
  }, 16);
}

// ── Trigger counters on all [data-counter] elements
function runCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target = parseFloat(el.dataset.counter) || 0;
    el.dataset.suffix = el.dataset.counter.includes('.') ? '' : '%';
    animateCounter(el, target, 800);
  });
}

// ── Greeting + live clock
function updateGreeting() {
  const now  = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Selamat Pagi' : hour < 18 ? 'Selamat Petang' : 'Selamat Malam';
  const jab  = jabatanById(jabatanId);
  const who  = peranan === 'admin' ? 'Admin Pusat' : (jab?.nama.replace(/^Jabatan\s+/i,'') || '');
  const el   = document.getElementById('greeting-text');
  if (el) el.textContent = `${greet}, ${who} 👋`;

  const timeEl = document.getElementById('greeting-time');
  if (timeEl) {
    const days = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
    const months = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    const d = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const t = now.toLocaleTimeString('ms-MY', { hour:'2-digit', minute:'2-digit' });
    timeEl.innerHTML = `${d}<br>${t}`;
  }
}

// ── Alert banner — jabatan di bawah sasaran
function renderAlertBanner() {
  const el = document.getElementById('alert-banner');
  if (!el) return;
  const atRisk = appData.jabatan.filter(j => {
    const vals = Object.keys(ITEM_META).map(k => getKpiValue(j.kpi[k], sukuan)).filter(v=>v>0);
    const avg  = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    return avg > 0 && avg < 60;
  });
  if (atRisk.length === 0) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.className = 'alert-banner';
  el.innerHTML = `⚠️ <strong>${atRisk.length} jabatan</strong> mencatatkan purata KPI di bawah 60% bagi ${sukuan}: ${atRisk.map(j=>j.nama.replace(/^Jabatan\s+/i,'')).join(', ')}`;
}

// ── Sidebar & header setup
function setupUI() {
  // Sukuan button highlight
  document.querySelectorAll('.sq-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === sukuan);
  });

  // Header info
  document.getElementById('header-sukuan').textContent = sukuan + ' ' + appData.tahun;

  const jab = jabatanById(jabatanId);
  const jabNama = jab ? jab.nama : 'Semua Jabatan';
  document.getElementById('header-jabatan').textContent = jabNama;
  document.getElementById('header-title').textContent =
    peranan === 'admin' ? 'Admin Pusat' : 'Ketua Jabatan — ' + jabNama;

  // Sidebar user
  document.getElementById('sidebar-user').innerHTML = `
    <strong>${peranan === 'admin' ? 'Admin Pusat' : 'Ketua Jabatan'}</strong>
    ${jab ? jab.nama : 'Semua Jabatan'}
  `;

  // Greeting & clock
  updateGreeting();
  if (!window._clockInterval) {
    window._clockInterval = setInterval(updateGreeting, 30000);
  }

  // Tunjuk/sembunyikan butang Tahun Baru — Admin sahaja
  const btnReset = document.getElementById('btn-reset-year');
  if (btnReset) btnReset.style.display = peranan === 'admin' ? 'block' : 'none';
}

// ── Section switching
function showSection(name, el) {
  event.preventDefault();
  activeSection = name;
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSection(name);
}

function changeSukuan(sq) {
  sukuan = sq;
  sessionStorage.setItem('sukuan', sq);
  document.querySelectorAll('.sq-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === sq);
  });
  document.getElementById('header-sukuan').textContent = sq + ' ' + appData.tahun;
  // Reset notif dismiss supaya muncul semula untuk sukuan baru
  window._notifDismissed = false;
  renderSection(activeSection);
}

function renderSection(name) {
  if (name === 'home')       renderHome();
  if (name === 'kpi')        renderKpi();
  if (name === 'cidos')      renderCidos();
  if (name === 'pembangun')  renderPembangun();
  if (name === 'laporan')    renderLaporan();
}

// ============================================================
// HOME SECTION
// ============================================================
function renderHome() {
  if (peranan === 'admin') renderHomeAdmin();
  else renderHomeKetua();
  renderAlertBanner();
  renderNotifBanner();
  setTimeout(runCounters, 100);
}

// ── SVG Donut chart (inline, no library)
function donutSvg(pct, colour, size) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#cbd5e1" stroke-width="7"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colour}" stroke-width="7"
      stroke-dasharray="${fill} ${circ}" stroke-dashoffset="${circ/4}"
      stroke-linecap="round"/>
    <text x="${cx}" y="${cy+1}" text-anchor="middle" dominant-baseline="middle"
      font-size="${size > 70 ? 13 : 11}" font-weight="700" fill="#ffffff">${pct > 0 ? pct+'%' : '—'}</text>
  </svg>`;
}

// ── Horizontal bar (SVG inline)
function barSvg(pct, colour, w, h) {
  const filled = Math.round((pct / 100) * w);
  return `<svg width="${w}" height="${h}" style="border-radius:99px;overflow:hidden">
    <rect width="${w}" height="${h}" fill="#e2e8f0" rx="${h/2}"/>
    <rect width="${filled}" height="${h}" fill="${colour}" rx="${h/2}"/>
  </svg>`;
}

const COLOURS = { green:'#34d399', yellow:'#fbbf24', red:'#f87171', grey:'#94a3b8' };

function renderHomeAdmin() {
  document.getElementById('home-subtitle').textContent =
    `Pencapaian ${SUKUAN_LABELS[sukuan]} | ${appData.tahun}`;

  const items = Object.keys(ITEM_META);

  // Purata setiap item merentasi semua jabatan
  const averages = {};
  items.forEach(key => {
    const vals = appData.jabatan.map(j => getKpiValue(j.kpi[key], sukuan)).filter(v => v > 0);
    averages[key] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
  });
  const cidosVals = appData.jabatan.map(j => {
    const platform = j.cidos_platform || j.cidos['Q1']?.kursus_dibuka || 0;
    const blended  = j.cidos[sukuan]?.kursus_blended || 0;
    return platform > 0 ? Math.round((blended/platform)*100) : 0;
  }).filter(v => v > 0);
  const cidosAvg = cidosVals.length ? Math.round(cidosVals.reduce((a,b)=>a+b,0)/cidosVals.length) : 0;

  // ── ROW 1: 5 Donut KPI Cards
  const allItems = [...items.map(k => ({ key:k, ...ITEM_META[k], val:averages[k], thr:THRESHOLDS[k] })),
                    { key:'cidos', icon:'🖥️', label:'CIDOS Blended', val:cidosAvg, thr:THRESHOLDS.cidos_blended }];

  const kpiCards = allItems.map(it => {
    const cls = statusClass(it.val, it.thr);
    const col = COLOURS[cls];
    const tooltip = `${it.label}: ${it.val > 0 ? it.val+'%' : 'Tiada data'} | Sasaran ≥${it.thr}% | ${statusLabel(it.val, it.thr)}`;
    return `<div class="kpi-card ${cls}" style="text-align:center;padding:16px 12px" data-tooltip="${tooltip}">
      <div style="font-size:20px;margin-bottom:6px">${it.icon}</div>
      <div style="margin:0 auto 6px">${donutSvg(it.val, col, 72)}</div>
      <div class="kpi-card-label">${it.label}</div>
      <div style="font-size:20px;font-weight:800;color:#1e293b;margin:4px 0" data-counter="${it.val}">0%</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px">Sasaran ≥${it.thr}%</div>
      <div style="margin-top:6px">${badgeHtml(cls, statusLabel(it.val, it.thr))}</div>
    </div>`;
  }).join('');
  document.getElementById('kpi-cards-home').innerHTML = kpiCards;

  // ── ROW 2a: Bar chart trend semua sukuan (semua item)
  const sqLabels = ['Q1','Q2','Q3','Q4'];
  const sqAvgs = sqLabels.map(sq => {
    const all = appData.jabatan.flatMap(j =>
      items.map(k => getKpiValue(j.kpi[k], sq)).filter(v=>v>0)
    );
    return all.length ? Math.round(all.reduce((a,b)=>a+b,0)/all.length) : 0;
  });
  const maxSq = Math.max(...sqAvgs, 100);
  const barW = 52, barGap = 22, chartH = 120, labelH = 20;
  const totalW = sqLabels.length * (barW + barGap) + barGap;
  const bars = sqLabels.map((sq, i) => {
    const v = sqAvgs[i];
    const barH = v > 0 ? Math.round((v / maxSq) * chartH) : 2;
    const x = barGap + i * (barW + barGap);
    const y = chartH - barH;
    const isCur = sq === sukuan;
    const col = isCur ? '#3b82d4' : '#93c5fd';
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${col}" rx="4"/>
      <text x="${x + barW/2}" y="${y - 4}" text-anchor="middle" font-size="11" font-weight="${isCur?'700':'400'}" fill="${isCur?'#1e40af':'#374151'}">${v > 0 ? v+'%' : ''}</text>
      <text x="${x + barW/2}" y="${chartH + labelH - 4}" text-anchor="middle" font-size="11" font-weight="${isCur?'700':'400'}" fill="${isCur?'#1e40af':'#6b7280'}">${sq}</text>`;
  }).join('');

  const trendChart = `<div class="card-box" style="flex:1;min-width:220px">
    <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#1e293b">📈 Trend Pencapaian Per Sukuan</div>
    <svg width="100%" viewBox="0 0 ${totalW} ${chartH + labelH + 8}" style="overflow:visible">
      <line x1="0" y1="${chartH}" x2="${totalW}" y2="${chartH}" stroke="#cbd5e1" stroke-width="1"/>
      ${bars}
    </svg>
    <div style="font-size:11px;color:#64748b;margin-top:4px;text-align:center">■ Sukuan semasa (biru gelap)</div>
  </div>`;

  // ── ROW 2b: Heatmap status jabatan × item
  const heatItems = [...items, 'cidos'];
  const heatHeaders = heatItems.map(k =>
    `<th style="font-size:11px;font-weight:600;text-align:center;padding:6px 8px;white-space:nowrap">
      ${k === 'cidos' ? '🖥️ CIDOS' : ITEM_META[k].icon + ' ' + ITEM_META[k].label.replace('Video ','')}</th>`
  ).join('');

  const heatRows = appData.jabatan.map(j => {
    const cells = heatItems.map(k => {
      let v, thr;
      if (k === 'cidos') {
        const platform = j.cidos_platform || j.cidos['Q1']?.kursus_dibuka || 0;
        const blended  = j.cidos[sukuan]?.kursus_blended || 0;
        v = platform > 0 ? Math.round((blended/platform)*100) : 0;
        thr = THRESHOLDS.cidos_blended;
      } else {
        v = getKpiValue(j.kpi[k], sukuan);
        thr = THRESHOLDS[k];
      }
      const cls = statusClass(v, thr);
      const bg = cls==='green'?'#dcfce7':cls==='yellow'?'#fef3c7':cls==='red'?'#fee2e2':'#f1f5f9';
      const tc = cls==='green'?'#15803d':cls==='yellow'?'#92400e':cls==='red'?'#991b1b':'#64748b';
      return `<td style="text-align:center;padding:7px 6px;background:${bg};color:${tc};font-weight:700;font-size:12px;border-radius:4px">${v > 0 ? v+'%' : '—'}</td>`;
    }).join('');

    // Purata baris
    const vals = heatItems.map(k => {
      if (k === 'cidos') {
        const platform = j.cidos_platform || j.cidos['Q1']?.kursus_dibuka || 0;
        const blended  = j.cidos[sukuan]?.kursus_blended || 0;
        return platform > 0 ? Math.round((blended/platform)*100) : 0;
      }
      return getKpiValue(j.kpi[k], sukuan);
    }).filter(v => v > 0);
    const avg = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
    const avgCls = statusClass(avg, 70);

    // Short name (buang "Jabatan " prefix)
    const shortNama = j.nama.replace(/^Jabatan\s+/i,'');
    return `<tr style="cursor:pointer" onclick="drillJabatan('${j.id}')" title="Klik untuk lihat butiran">
      <td style="font-size:12px;font-weight:600;padding:7px 10px;white-space:nowrap">${shortNama}</td>
      ${cells}
      <td style="text-align:center;padding:7px 8px">${badgeHtml(avgCls, avg+'%')}</td>
    </tr>`;
  }).join('');

  const heatmap = `<div class="card-box" style="flex:2;min-width:0;overflow:auto">
    <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#1e293b">🗂️ Status KPI Per Jabatan <span style="font-size:11px;color:#64748b;font-weight:400">— klik jabatan untuk butiran</span></div>
    <table style="width:100%;border-collapse:separate;border-spacing:2px 4px;font-size:12px">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;font-size:11px">Jabatan</th>
        ${heatHeaders}
        <th style="text-align:center;font-size:11px;padding:6px 8px">Purata</th>
      </tr></thead>
      <tbody>${heatRows}</tbody>
    </table>
  </div>`;

  // ── ROW 3: Progress bar per item (overall)
  const progressBars = allItems.map(it => {
    const cls = statusClass(it.val, it.thr);
    const col = COLOURS[cls];
    const w = it.val > 0 ? it.val : 0;
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:#1e293b">
        <span>${it.icon} ${it.label}</span>
        <span style="font-weight:700;color:${col}">${it.val > 0 ? it.val+'%' : '—'} <span style="font-weight:400;color:#64748b">/ sasaran ${it.thr}%</span></span>
      </div>
      <div style="background:#e2e8f0;border-radius:99px;height:10px;position:relative;overflow:hidden">
        <div style="width:${w}%;height:100%;background:${col};border-radius:99px;transition:width .6s ease"></div>
        <div style="position:absolute;top:0;left:${it.thr}%;width:2px;height:100%;background:rgba(0,0,0,.15)"></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('home-extra').innerHTML = `
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      ${trendChart}
      <div class="card-box" style="min-width:220px;flex:1">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:#1e293b">📊 Pencapaian Keseluruhan ${sukuan}</div>
        ${progressBars}
      </div>
    </div>
    ${heatmap}`;
}

function drillJabatan(jid) {
  jabatanId = jid;
  sessionStorage.setItem('jabatan', jid);
  peranan = 'ketua';
  sessionStorage.setItem('peranan', 'ketua');
  setupUI();
  const navKpi = document.querySelector('[onclick*="kpi"]');
  showSection('kpi', navKpi);
}

function renderHomeKetua() {
  const jab = jabatanById(jabatanId);
  if (!jab) return;
  document.getElementById('home-subtitle').textContent =
    `Pencapaian ${SUKUAN_LABELS[sukuan]} | ${appData.tahun}`;

  const items = Object.keys(ITEM_META);

  // Donut cards
  const platform = jab.cidos_platform || jab.cidos['Q1']?.kursus_dibuka || 0;
  const cidosBlendedVal = jab.cidos[sukuan]?.kursus_blended || 0;
  const cidosB = platform > 0 ? Math.round((cidosBlendedVal/platform)*100) : 0;
  const ciCls  = statusClass(cidosB, THRESHOLDS.cidos_blended);

  const allItems = [...items.map(k => {
    const pb = pembangunById(jab, jab.kpi[k].pembangun_id);
    return { key:k, ...ITEM_META[k], val:getKpiValue(jab.kpi[k], sukuan), thr:THRESHOLDS[k], pb };
  }), { key:'cidos', icon:'🖥️', label:'CIDOS Blended', val:cidosB, thr:THRESHOLDS.cidos_blended, pb:null }];

  const kpiCards = allItems.map(it => {
    const cls = statusClass(it.val, it.thr);
    const col = COLOURS[cls];
    const tooltip = `${it.label}: ${it.val > 0 ? it.val+'%' : 'Tiada data'} | Sasaran ≥${it.thr}% | ${statusLabel(it.val, it.thr)}${it.pb ? ' · ' + it.pb.nama : ''}`;
    return `<div class="kpi-card ${cls}" style="text-align:center;padding:16px 12px" data-tooltip="${tooltip}">
      <div style="font-size:20px;margin-bottom:6px">${it.icon}</div>
      <div style="margin:0 auto 6px">${donutSvg(it.val, col, 72)}</div>
      <div class="kpi-card-label">${it.label}</div>
      <div style="font-size:20px;font-weight:800;color:#1e293b;margin:4px 0" data-counter="${it.val}">0%</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px">
        Sasaran ≥${it.thr}%${it.pb ? ' · ' + it.pb.nama : ''}
      </div>
      <div style="margin-top:6px">${badgeHtml(cls, statusLabel(it.val, it.thr))}</div>
    </div>`;
  }).join('');
  document.getElementById('kpi-cards-home').innerHTML = kpiCards;

  // Bar chart trend 4 sukuan
  const sqLabels = ['Q1','Q2','Q3','Q4'];
  const sqAvgs = sqLabels.map(sq => {
    const vals = items.map(k => getKpiValue(jab.kpi[k], sq)).filter(v=>v>0);
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
  });
  const maxSq = Math.max(...sqAvgs, 100);
  const barW = 52, barGap = 22, chartH = 110, labelH = 20;
  const totalW = sqLabels.length * (barW + barGap) + barGap;
  const bars = sqLabels.map((sq, i) => {
    const v = sqAvgs[i];
    const barH = v > 0 ? Math.round((v/maxSq)*chartH) : 2;
    const x = barGap + i*(barW+barGap), y = chartH - barH;
    const isCur = sq === sukuan;
    const col = isCur ? '#3b82d4' : '#93c5fd';
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${col}" rx="4"/>
      <text x="${x+barW/2}" y="${y-4}" text-anchor="middle" font-size="11" font-weight="${isCur?'700':'400'}" fill="${isCur?'#1e40af':'#374151'}">${v>0?v+'%':''}</text>
      <text x="${x+barW/2}" y="${chartH+labelH-4}" text-anchor="middle" font-size="11" font-weight="${isCur?'700':'400'}" fill="${isCur?'#1e40af':'#6b7280'}">${sq}</text>`;
  }).join('');

  // Progress bar per item berbanding sasaran — 4 sukuan
  const itemProgress = allItems.map(it => {
    const sqBars = sqLabels.map(sq => {
      let v;
      if (it.key === 'cidos') {
        const plat = jab.cidos_platform || jab.cidos['Q1']?.kursus_dibuka || 0;
        const bl   = jab.cidos[sq]?.kursus_blended || 0;
        v = plat > 0 ? Math.round((bl/plat)*100) : 0;
      } else {
        v = getKpiValue(jab.kpi[it.key], sq);
      }
      const cls = statusClass(v, it.thr);
      const col = COLOURS[cls];
      const isCur = sq === sukuan;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:11px;width:22px;color:${isCur?'#1e40af':'#64748b'};font-weight:${isCur?'700':'400'}">${sq}</span>
        <div style="flex:1;background:#e2e8f0;border-radius:99px;height:8px;position:relative;overflow:hidden">
          <div style="width:${v}%;height:100%;background:${col};border-radius:99px;transition:width .6s ease"></div>
          <div style="position:absolute;top:0;left:${it.thr}%;width:2px;height:100%;background:rgba(0,0,0,.2)"></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${col};width:32px;text-align:right">${v>0?v+'%':'—'}</span>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;margin-bottom:5px;color:#1e293b">${it.icon} ${it.label} <span style="font-weight:400;color:#64748b">≥${it.thr}%</span></div>
      ${sqBars}
    </div>`;
  }).join('');

  document.getElementById('home-extra').innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div class="card-box" style="flex:1;min-width:200px">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#1e293b">📈 Trend Keseluruhan Per Sukuan</div>
        <svg width="100%" viewBox="0 0 ${totalW} ${chartH+labelH+8}" style="overflow:visible">
          <line x1="0" y1="${chartH}" x2="${totalW}" y2="${chartH}" stroke="#cbd5e1" stroke-width="1"/>
          ${bars}
        </svg>
        <div style="font-size:11px;color:#64748b;text-align:center;margin-top:4px">■ Sukuan semasa (biru gelap) | nilai = purata 4 item</div>
      </div>
      <div class="card-box" style="flex:2;min-width:280px">
        <div style="font-size:13px;font-weight:700;margin-bottom:14px;color:#1e293b">📊 Pencapaian Per Item — Semua Sukuan</div>
        ${itemProgress}
      </div>
    </div>`;
}

// ============================================================
// KPI SECTION
// ============================================================
function renderKpi() {
  const jabList = peranan === 'admin' ? appData.jabatan : [jabatanById(jabatanId)].filter(Boolean);
  let html = '';

  jabList.forEach(jab => {
    // Baris item asal — sembunyi jika tajuk kosong (bermakna tahun baru belum diisi)
    const rows = Object.keys(ITEM_META).map(key => {
      const kpiObj = jab.kpi[key];
      // Jika tajuk kosong, sembunyikan baris — pengguna tambah melalui butang + Tambah
      if (!kpiObj.tajuk) return '';
      const pb = pembangunById(jab, kpiObj.pembangun_id);
      const cells = ['Q1','Q2','Q3','Q4'].map(sq => {
        const v = getKpiValue(kpiObj, sq);
        const cls = statusClass(v, THRESHOLDS[key]);
        return `<td class="text-center" style="white-space:nowrap">
          ${v > 0 ? badgeHtml(cls, v+'%') : badgeHtml('grey','—')}
          <button onclick="openKpiEdit('${jab.id}','${key}','${sq}',null)" title="Kemaskini ${sq}" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:.5;vertical-align:middle" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.5">✏️</button>
        </td>`;
      }).join('');
      const avg = avgAllSukuan(kpiObj);
      const avgCls = statusClass(avg, THRESHOLDS[key]);
      return `<tr>
        <td>${ITEM_META[key].icon} ${ITEM_META[key].label}</td>
        <td>${kpiObj.tajuk}</td>
        <td>${pb ? pb.nama : '—'}</td>
        ${cells}
        <td class="text-center">${avg > 0 ? badgeHtml(avgCls, avg+'%') : '—'}</td>
        <td class="text-center">
          <button onclick="deleteKpiStandard('${jab.id}','${key}')" title="Padam item ini" style="background:none;border:none;cursor:pointer;font-size:15px;opacity:.45;vertical-align:middle" onmouseover="this.style.opacity=1;this.style.color='#ef4444'" onmouseout="this.style.opacity=.45;this.style.color=''">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    // Baris bahan tambahan (daripada butang Tambah Bahan Digital)
    const extraRows = (jab.kpi_extra || []).map(ex => {
      const pb = pembangunById(jab, ex.pembangun_id);
      const m = ITEM_META[ex.item] || { icon: '📄', label: ex.item };
      const exIdx = (jab.kpi_extra || []).indexOf(ex);
      const cells = ['Q1','Q2','Q3','Q4'].map(sq => {
        const v = ex[sq] || 0;
        const cls = statusClass(v, ex.sasaran);
        return `<td class="text-center" style="white-space:nowrap">
          ${v > 0 ? badgeHtml(cls, v+'%') : badgeHtml('grey','—')}
          <button onclick="openKpiEdit('${jab.id}',null,'${sq}',${exIdx})" title="Kemaskini ${sq}" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:.5;vertical-align:middle" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.5">✏️</button>
        </td>`;
      }).join('');
      const vals = ['Q1','Q2','Q3','Q4'].map(sq => ex[sq]||0).filter(v=>v>0);
      const avg = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
      const avgCls = statusClass(avg, ex.sasaran);
      return `<tr style="background:#fafff4">
        <td>${m.icon} ${m.label} ${badgeHtml('green','Baharu')}</td>
        <td>${ex.tajuk}</td>
        <td>${pb ? pb.nama : '—'}</td>
        ${cells}
        <td class="text-center">${avg > 0 ? badgeHtml(avgCls, avg+'%') : '—'}</td>
        <td class="text-center">
          <button onclick="deleteKpiExtra('${jab.id}',${exIdx})" title="Padam item ini" style="background:none;border:none;cursor:pointer;font-size:15px;opacity:.45;vertical-align:middle" onmouseover="this.style.opacity=1;this.style.color='#ef4444'" onmouseout="this.style.opacity=.45;this.style.color=''">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    // Butang tambah per item
    const itemBtns = Object.keys(ITEM_META).map(key =>
      `<button class="btn-add" style="font-size:11px;padding:5px 10px"
         onclick="openBahanModal('${jab.id}','${key}')">
         + ${ITEM_META[key].icon} ${ITEM_META[key].label}
       </button>`
    ).join('');

    html += `<div class="card-box mb-24">
      <div class="flex-between mb-16">
        <h3 style="font-size:15px;font-weight:700;color:#1e293b">🏢 ${jab.nama}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${itemBtns}</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Item</th><th>Tajuk</th><th>Pembangun</th>
            <th class="text-center">Q1</th><th class="text-center">Q2</th>
            <th class="text-center">Q3</th><th class="text-center">Q4</th>
            <th class="text-center">Purata</th>
            <th class="text-center">Padam</th>
          </tr></thead>
          <tbody>${rows}${extraRows}</tbody>
        </table>
      </div>
    </div>`;
  });

  document.getElementById('kpi-detail-content').innerHTML = html;
}

// Padam item KPI standard (kosongkan tajuk & pembangun_id sahaja — kekal dalam struktur)
function deleteKpiStandard(jabId, key) {
  const jab = jabatanById(jabId);
  if (!jab || !jab.kpi[key]) return;
  const tajuk = jab.kpi[key].tajuk || key;
  if (!confirm(`Padam item "${tajuk}" daripada ${jab.nama}?\n\nData KPI item ini akan dikosongkan.`)) return;

  jab.kpi[key].tajuk        = '';
  jab.kpi[key].pembangun_id = '';
  ['Q1','Q2','Q3','Q4'].forEach(sq => { jab.kpi[key][sq] = 0; });

  renderKpi();
  renderHome();
  showToast(`🗑️ Item "${tajuk}" dipadamkan.`);
}

// Padam item bahan digital tambahan (kpi_extra)
function deleteKpiExtra(jabId, exIdx) {
  const jab = jabatanById(jabId);
  if (!jab || !jab.kpi_extra || !jab.kpi_extra[exIdx]) return;
  const tajuk = jab.kpi_extra[exIdx].tajuk || 'item ini';
  if (!confirm(`Padam bahan digital "${tajuk}" daripada ${jab.nama}?`)) return;

  jab.kpi_extra.splice(exIdx, 1);

  renderKpi();
  renderHome();
  showToast(`🗑️ Bahan "${tajuk}" dipadamkan.`);
}



// ============================================================
// CIDOS SECTION
// ============================================================
let cidosActiveSq = sukuan;

function renderCidos() {
  const jabList = peranan === 'admin' ? appData.jabatan : [jabatanById(jabatanId)].filter(Boolean);

  // Satu jadual tunggal — setiap baris = 1 jabatan
  const rows = jabList.map(jab => {
    // Platform didaftarkan — ambil nilai terbesar atau yang ada (satu nilai untuk jabatan)
    const platform = jab.cidos_platform || jab.cidos['Q1']?.kursus_dibuka || 0;

    // Blended per sukuan — boleh klik untuk kemaskini
    const sqCells = ['Q1','Q2','Q3','Q4'].map(sq => {
      const d = jab.cidos[sq] || {};
      const blended = d.kursus_blended || 0;
      const pct = platform > 0 ? Math.round((blended / platform) * 100) : 0;
      const cls = statusClass(pct, THRESHOLDS.cidos_blended);
      return `<td class="text-center" style="min-width:90px;cursor:pointer" title="Klik untuk kemaskini ${sq}"
        onclick="openCidosModal('${jab.id}','${sq}')">
        <div style="font-weight:700;font-size:13px">${blended > 0 ? blended : '—'}</div>
        <div style="margin-top:3px">${pct > 0 ? badgeHtml(cls, pct+'%') : badgeHtml('grey','—')}</div>
      </td>`;
    }).join('');

    // Purata blended keseluruhan
    const allBlended = ['Q1','Q2','Q3','Q4'].map(sq => jab.cidos[sq]?.kursus_blended || 0);
    const totalBlended = allBlended.reduce((a,b)=>a+b,0);
    const totalPct = platform > 0 ? Math.round((totalBlended / (platform * 4)) * 100) : 0;
    const totalCls = statusClass(totalPct, THRESHOLDS.cidos_blended);

    return `<tr>
      <td style="font-weight:600">${jab.nama}</td>
      <td class="text-center" style="font-weight:700;font-size:15px">${platform || '—'}
        <button title="Kemaskini platform" style="background:none;border:none;cursor:pointer;font-size:13px;margin-left:4px"
          onclick="openCidosModal('${jab.id}','platform')">✏️</button>
      </td>
      ${sqCells}
      <td class="text-center"><strong>${badgeHtml(totalCls, totalPct+'%')}</strong></td>
    </tr>`;
  }).join('');

  const html = `<div class="card-box">
    <div class="flex-between mb-16">
      <h3 style="font-size:15px;font-weight:700;color:#1e293b">🖥️ Pemantauan CIDOS — ${appData.tahun}</h3>
      <span style="font-size:12px;color:#64748b">✏️ = Kemaskini platform | Klik nilai blended untuk kemaskini sukuan</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Jabatan</th>
          <th class="text-center">Platform<br>Didaftarkan</th>
          <th class="text-center">Q1<br><span style="font-weight:400;font-size:11px">Blended / %</span></th>
          <th class="text-center">Q2<br><span style="font-weight:400;font-size:11px">Blended / %</span></th>
          <th class="text-center">Q3<br><span style="font-weight:400;font-size:11px">Blended / %</span></th>
          <th class="text-center">Q4<br><span style="font-weight:400;font-size:11px">Blended / %</span></th>
          <th class="text-center">Purata<br>Tahunan</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:12px;font-size:12px;color:#64748b">
      % dikira: Bilangan Platform Blended ÷ Platform Didaftarkan × 100 &nbsp;|&nbsp;
      Sasaran: ≥${THRESHOLDS.cidos_blended}%
    </div>
  </div>`;

  document.getElementById('cidos-content').innerHTML = html;
}

function cidosSwitchTab(jabId, sq) {
  cidosActiveSq = sq;
  renderCidos();
}

// ============================================================
// PEMBANGUN SECTION
// ============================================================
function renderPembangun() {
  const jabList = peranan === 'admin' ? appData.jabatan : [jabatanById(jabatanId)].filter(Boolean);
  let html = '';

  jabList.forEach(jab => {
    if (!jab.pembangun) return;

    // Paparan kosong selepas reset tahun baru
    if (jab.pembangun.length === 0) {
      html += `<div class="card-box mb-24">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:#1e293b">🏢 ${jab.nama}</h3>
        <p style="color:#94a3b8;font-size:13px;text-align:center;padding:24px 0">
          ✏️ Tiada pembangun. Tambah bahan digital baru untuk daftarkan pembangun.
        </p>
      </div>`;
      return;
    }

    const rows = jab.pembangun.map(pb => {
      const items = Object.keys(ITEM_META).filter(k => jab.kpi[k].pembangun_id === pb.id);
      if (items.length === 0) return '';

      return items.map((key, i) => {
        const kpiObj = jab.kpi[key];
        const cells = ['Q1','Q2','Q3','Q4'].map(sq => {
          const v = getKpiValue(kpiObj, sq);
          const cls = statusClass(v, THRESHOLDS[key]);
          return `<td class="text-center">${v > 0 ? badgeHtml(cls, v+'%') : badgeHtml('grey','—')}</td>`;
        }).join('');
        const avg = avgAllSukuan(kpiObj);
        const avgCls = statusClass(avg, THRESHOLDS[key]);
        const sCls = avg >= THRESHOLDS[key] ? 'green' : avg >= THRESHOLDS[key]-10 ? 'yellow' : avg > 0 ? 'red' : 'grey';
        return `<tr>
          ${i === 0 ? `<td rowspan="${items.length}" style="font-weight:700;vertical-align:top;padding-top:14px">${pb.nama}</td>` : ''}
          <td>${ITEM_META[key].icon} ${ITEM_META[key].label}</td>
          <td style="font-size:12px;color:#64748b">${kpiObj.tajuk}</td>
          ${cells}
          <td class="text-center">${avg > 0 ? badgeHtml(avgCls, avg+'%') : '—'}</td>
        </tr>`;
      }).join('');
    }).join('');

    html += `<div class="card-box mb-24">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;color:#1e293b">🏢 ${jab.nama}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Pembangun</th><th>Item</th><th>Tajuk</th>
            <th class="text-center">Q1</th><th class="text-center">Q2</th>
            <th class="text-center">Q3</th><th class="text-center">Q4</th>
            <th class="text-center">Purata</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  });

  document.getElementById('pembangun-content').innerHTML = html;
}

// ============================================================
// LAPORAN SECTION
// ============================================================
function renderLaporan() {
  const jabList = peranan === 'admin' ? appData.jabatan : [jabatanById(jabatanId)].filter(Boolean);
  const now = new Date().toLocaleDateString('ms-MY', { year:'numeric', month:'long', day:'numeric' });

  let html = `<div class="laporan-header">
    <div>
      <h2>📋 Laporan KPI eLearning ${appData.tahun}</h2>
      <p>${peranan === 'admin' ? 'Semua Jabatan' : (jabatanById(jabatanId)?.nama || '')} | ${SUKUAN_LABELS[sukuan]}</p>
      <p>Dicetak: ${now}</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn-export" onclick="exportCsv()">⬇ Export CSV</button>
      <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
    </div>
  </div>`;

  jabList.forEach(jab => {
    // KPI Table
    const kpiRows = Object.keys(ITEM_META).map(key => {
      const kpiObj = jab.kpi[key];
      const pb = pembangunById(jab, kpiObj.pembangun_id);
      const cells = ['Q1','Q2','Q3','Q4'].map(sq => {
        const v = getKpiValue(kpiObj, sq);
        const cls = statusClass(v, THRESHOLDS[key]);
        return `<td class="text-center">${v > 0 ? badgeHtml(cls, v+'%') : badgeHtml('grey','—')}</td>`;
      }).join('');
      const avg = avgAllSukuan(kpiObj);
      const avgCls = statusClass(avg, THRESHOLDS[key]);
      return `<tr>
        <td>${ITEM_META[key].icon} ${ITEM_META[key].label}</td>
        <td style="font-size:12px">${kpiObj.tajuk}</td>
        <td>${pb ? pb.nama : '—'}</td>
        ${cells}
        <td class="text-center"><strong>${avg > 0 ? badgeHtml(avgCls, avg+'%') : '—'}</strong></td>
      </tr>`;
    }).join('');

    // CIDOS Annual
    const annualRows = ['Q1','Q2','Q3','Q4'].map(sq => {
      const d = jab.cidos[sq] || {};
      const cls = statusClass(d.peratus_blended || 0, THRESHOLDS.cidos_blended);
      return `<tr>
        <td><strong>${sq}</strong></td>
        <td class="text-center">${d.kursus_dibuka || '—'}</td>
        <td class="text-center">${d.kursus_blended || '—'}</td>
        <td class="text-center">${d.peratus_blended > 0 ? badgeHtml(cls, d.peratus_blended+'%') : badgeHtml('grey','—')}</td>
      </tr>`;
    }).join('');

    const totalD = ['Q1','Q2','Q3','Q4'].reduce((s,sq) => s+(jab.cidos[sq]?.kursus_dibuka||0),0);
    const totalB = ['Q1','Q2','Q3','Q4'].reduce((s,sq) => s+(jab.cidos[sq]?.kursus_blended||0),0);
    const totalP = totalD > 0 ? Math.round((totalB/totalD)*100) : 0;

    html += `<div class="card-box mb-24">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;color:#1e293b">🏢 ${jab.nama}</h3>

      <h4 style="font-size:13px;margin-bottom:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">KPI ITEM PEMBELAJARAN</h4>
      <div class="table-wrap mb-16">
        <table>
          <thead><tr>
            <th>Item</th><th>Tajuk</th><th>Pembangun</th>
            <th class="text-center">Q1</th><th class="text-center">Q2</th>
            <th class="text-center">Q3</th><th class="text-center">Q4</th>
            <th class="text-center">Purata</th>
          </tr></thead>
          <tbody>${kpiRows}</tbody>
        </table>
      </div>

      <h4 style="font-size:13px;margin-bottom:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">CIDOS — RINGKASAN TAHUNAN</h4>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Sukuan</th>
            <th class="text-center">Kursus Dibuka</th>
            <th class="text-center">Kursus Blended</th>
            <th class="text-center">% Blended</th>
          </tr></thead>
          <tbody>
            ${annualRows}
            <tr style="background:#f8fafc;font-weight:700">
              <td>JUMLAH</td>
              <td class="text-center">${totalD}</td>
              <td class="text-center">${totalB}</td>
              <td class="text-center">${badgeHtml(statusClass(totalP,70), totalP+'%')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  });

  document.getElementById('laporan-content').innerHTML = html;
}

// ============================================================
// EXPORT CSV
// ============================================================
function exportCsv() {
  const jabList = peranan === 'admin' ? appData.jabatan : [jabatanById(jabatanId)].filter(Boolean);
  const rows = [['Jabatan','Item','Tajuk','Pembangun','Q1','Q2','Q3','Q4','Purata','Status']];

  jabList.forEach(jab => {
    // Baris KPI standard
    Object.keys(ITEM_META).forEach(key => {
      const kpiObj = jab.kpi[key];
      const pb = pembangunById(jab, kpiObj.pembangun_id);
      const vals = ['Q1','Q2','Q3','Q4'].map(sq => getKpiValue(kpiObj, sq));
      const avg = avgAllSukuan(kpiObj);
      const status = statusLabel(avg, THRESHOLDS[key]);
      rows.push([
        jab.nama, ITEM_META[key].label, kpiObj.tajuk,
        pb ? pb.nama : '—',
        ...vals.map(v => v > 0 ? v+'%' : '0%'),
        avg > 0 ? avg+'%' : '0%', status
      ]);
    });

    // Baris kpi_extra (bahan digital tambahan)
    (jab.kpi_extra || []).forEach(ex => {
      const m = ITEM_META[ex.item] || { label: ex.item };
      const pb = pembangunById(jab, ex.pembangun_id);
      const vals = ['Q1','Q2','Q3','Q4'].map(sq => ex[sq] || 0);
      const vFilt = vals.filter(v=>v>0);
      const avg = vFilt.length ? Math.round(vFilt.reduce((a,b)=>a+b,0)/vFilt.length) : 0;
      rows.push([
        jab.nama, m.label + ' (Tambahan)', ex.tajuk,
        pb ? pb.nama : ex.pembangun || '—',
        ...vals.map(v => v > 0 ? v+'%' : '0%'),
        avg > 0 ? avg+'%' : '0%', statusLabel(avg, ex.sasaran || 70)
      ]);
    });

    // Baris CIDOS
    const platform = jab.cidos_platform || jab.cidos['Q1']?.kursus_dibuka || 0;
    const blendedVals = ['Q1','Q2','Q3','Q4'].map(sq => jab.cidos[sq]?.kursus_blended || 0);
    const totalB = blendedVals.reduce((a,b)=>a+b,0);
    const avgPct = platform > 0 ? Math.round((totalB/(platform*4))*100) : 0;
    rows.push([
      jab.nama, 'CIDOS Blended', 'Platform: '+platform, '—',
      ...blendedVals.map(v => v > 0 ? v+' kursus' : '0'),
      avgPct > 0 ? avgPct+'%' : '0%', statusLabel(avgPct, THRESHOLDS.cidos_blended)
    ]);
  });

  // Bina CSV string dengan BOM untuk Excel UTF-8
  const csv = '\uFEFF' + rows.map(r =>
    r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
  ).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `kpi-laporan-${appData.tahun}-${sukuan}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ CSV berjaya dimuat turun');
}

// ============================================================
// RESET + TAHUN BARU
// ============================================================
function openResetModal() {
  const el = document.getElementById('reset-old-year');
  if (el) el.textContent = appData.tahun;
  const inp = document.getElementById('reset-new-year');
  if (inp) inp.value = appData.tahun + 1;
  document.getElementById('modal-reset').classList.add('open');
}

function exportDataAsJson() {
  const json = JSON.stringify(appData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `kpi-data-${appData.tahun}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function confirmReset() {
  const inp = document.getElementById('reset-new-year');
  const newYear = parseInt(inp ? inp.value : 0);
  if (!newYear || newYear < 2020 || newYear > 2099) {
    alert('Sila masukkan tahun yang sah (2020–2099).');
    return;
  }

  // 1. Export data lama sebagai JSON
  exportDataAsJson();

  // 2. Kosongkan semua nilai KPI, CIDOS, kpi_extra dan senarai pembangun
  const oldYear = appData.tahun;
  appData.jabatan.forEach(jab => {
    Object.keys(ITEM_META).forEach(key => {
      ['Q1','Q2','Q3','Q4'].forEach(sq => { jab.kpi[key][sq] = 0; });
      // Kosongkan tajuk dan pembangun_id KPI supaya boleh isi semula
      jab.kpi[key].tajuk        = '';
      jab.kpi[key].pembangun_id = '';
    });
    ['Q1','Q2','Q3','Q4'].forEach(sq => {
      if (jab.cidos[sq]) {
        jab.cidos[sq].kursus_blended  = 0;
        jab.cidos[sq].peratus_blended = 0;
        jab.cidos[sq].senarai_kursus  = [];
      }
    });
    jab.kpi_extra  = [];
    jab.pembangun  = [];  // padam semua nama pembangun
  });

  // 3. Set tahun baru
  appData.tahun = newYear;

  // 4. Tutup modal & kemaskini UI
  closeModal('modal-reset');
  document.getElementById('header-sukuan').textContent = sukuan + ' ' + appData.tahun;
  window._notifDismissed = false;
  renderSection(activeSection);

  showToast(`✅ Data ${oldYear} dieksport & dikosongkan. Tahun baru: ${newYear}`);

  // Kemaskini dropdown tahun dengan tahun baru
  renderTahunDropdown([]);
  // Maklum Sheets bahawa data telah di-reset dan cipta tab baru
  syncToSheets('resetYear', { tahun: newYear }, () => loadTahunList());
}

// ============================================================
// NOTIFIKASI BELUM KEMASKINI
// ============================================================
function renderNotifBanner() {
  const el = document.getElementById('notif-banner');
  if (!el) return;
  if (window._notifDismissed) { el.style.display = 'none'; return; }

  const jabList = peranan === 'admin' ? appData.jabatan : [jabatanById(jabatanId)].filter(Boolean);
  const missing = [];

  jabList.forEach(jab => {
    const shortNama = jab.nama.replace(/^Jabatan\s+/i, '');
    Object.keys(ITEM_META).forEach(key => {
      const v = getKpiValue(jab.kpi[key], sukuan);
      if (v === 0) missing.push(`${shortNama} — ${ITEM_META[key].label}`);
    });
  });

  if (missing.length === 0) { el.style.display = 'none'; return; }

  el.style.display = 'flex';
  el.className = 'notif-banner';
  const limit = 4;
  const shown = missing.slice(0, limit);
  const extra = missing.length > limit ? ` <em>+${missing.length - limit} lagi</em>` : '';
  el.innerHTML = `
    <div class="notif-banner-body">
      🔔 <strong>${missing.length} item</strong> belum dikemaskini bagi <strong>${sukuan}</strong>:
      ${shown.join(', ')}${extra}
    </div>
    <button class="notif-dismiss" onclick="dismissNotif()" title="Tutup">✕</button>`;
}

function dismissNotif() {
  window._notifDismissed = true;
  const el = document.getElementById('notif-banner');
  if (el) el.style.display = 'none';
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(msg, type) {
  const t = document.createElement('div');
  const cls = type === 'error' ? ' toast-error' : type === 'warn' ? ' toast-warn' : '';
  t.className = 'toast' + cls;
  t.textContent = msg;
  document.body.appendChild(t);
  const delay = (type === 'error' || type === 'warn') ? 6000 : 3000;
  setTimeout(() => {
    t.classList.add('hide');
    t.addEventListener('animationend', () => t.remove());
  }, delay);
}

// ============================================================
// MODAL — KPI EDIT (ikon pen ✏️)
// ============================================================
let keJabId  = null;
let keKey    = null;   // item key (video_pdp dll) — null jika kpi_extra
let keSq     = null;   // Q1/Q2/Q3/Q4
let keExIdx  = null;   // index dalam kpi_extra — null jika item standard

function openKpiEdit(jabId, itemKey, sq, exIdx) {
  keJabId  = jabId;
  keKey    = itemKey;
  keSq     = sq;
  keExIdx  = exIdx !== null && exIdx !== undefined ? Number(exIdx) : null;

  const jab = jabatanById(jabId);
  if (!jab) return;

  let itemLabel, currentVal;
  if (keExIdx !== null) {
    // kpi_extra
    const ex = (jab.kpi_extra || [])[keExIdx];
    if (!ex) return;
    const m = ITEM_META[ex.item] || { label: ex.item };
    itemLabel   = `${m.label} — ${ex.tajuk}`;
    currentVal  = ex[sq] || 0;
  } else {
    // KPI standard
    itemLabel  = `${ITEM_META[itemKey].icon} ${ITEM_META[itemKey].label} — ${jab.kpi[itemKey].tajuk}`;
    currentVal = getKpiValue(jab.kpi[itemKey], sq);
  }

  document.getElementById('modal-kpi-edit-title').textContent = `Kemaskini ${sq} — ${jab.nama.replace(/^Jabatan\s+/i,'')}`;
  document.getElementById('ke-item').value   = itemLabel;
  document.getElementById('ke-sukuan').value = sq + ' (' + SUKUAN_LABELS[sq].split('—')[1]?.trim() + ')';
  const nilaiEl = document.getElementById('ke-nilai');
  nilaiEl.value = currentVal > 0 ? currentVal : '';
  document.getElementById('modal-kpi-edit').classList.add('open');
  setTimeout(() => nilaiEl.focus(), 100);
}

function saveKpiEdit() {
  const jab = jabatanById(keJabId);
  if (!jab) { closeModal('modal-kpi-edit'); return; }

  const rawVal = document.getElementById('ke-nilai').value;
  const nilai  = Math.min(100, Math.max(0, parseInt(rawVal) || 0));

  if (keExIdx !== null) {
    // Kemaskini kpi_extra
    const ex = (jab.kpi_extra || [])[keExIdx];
    if (!ex) { closeModal('modal-kpi-edit'); return; }
    ex[keSq] = nilai;
  } else {
    // Kemaskini KPI standard
    jab.kpi[keKey][keSq] = nilai;
  }

  closeModal('modal-kpi-edit');
  renderKpi();
  renderHome();

  // Auto-sync ke Google Sheets
  if (keExIdx !== null) {
    const ex = (jab.kpi_extra || [])[keExIdx];
    const m  = ITEM_META[ex?.item] || { label: ex?.item };
    const pb = pembangunById(jab, ex?.pembangun_id);
    syncToSheets('saveBahan', {
      tahun: appData.tahun,
      jabatan: jab.nama, item: ex.item, tajuk: ex.tajuk,
      pembangun: pb ? pb.nama : '',
      Q1: ex.Q1||0, Q2: ex.Q2||0, Q3: ex.Q3||0, Q4: ex.Q4||0
    });
  } else {
    const kpiObj = jab.kpi[keKey];
    syncToSheets('saveKpi', {
      tahun: appData.tahun,
      jabatan: jab.nama, item: keKey,
      tajuk: kpiObj.tajuk,
      pembangun: pembangunById(jab, kpiObj.pembangun_id)?.nama || '',
      Q1: kpiObj.Q1||0, Q2: kpiObj.Q2||0, Q3: kpiObj.Q3||0, Q4: kpiObj.Q4||0
    });
  }
  showToast(`✅ ${keSq} dikemaskini: ${nilai}%`);
}

// ============================================================
// MODAL — CIDOS
// ============================================================
let modalCidosJabId = null;
let modalCidosSq    = null;

function openCidosModal(jabId, sq) {
  const jab = jabatanById(jabId);
  if (!jab) return;
  modalCidosJabId = jabId;
  modalCidosSq    = sq;

  if (sq === 'platform') {
    // Mod: kemaskini bilangan platform didaftarkan sahaja
    document.getElementById('modal-cidos-title').textContent = 'Kemaskini Platform Didaftarkan';
    document.getElementById('mc-jabatan').value  = jab.nama;
    document.getElementById('mc-sukuan').value   = 'Platform keseluruhan jabatan';
    document.getElementById('mc-platform').value = jab.cidos_platform || jab.cidos['Q1']?.kursus_dibuka || 0;
    document.getElementById('mc-blended').value  = '';
    document.getElementById('mc-blended').disabled = true;
    document.querySelector('label[for="mc-blended"], #mc-blended').closest?.('.form-group')?.style && null;
    document.getElementById('mc-blended').placeholder = '— tidak diperlukan';
  } else {
    // Mod: kemaskini blended untuk sukuan tertentu
    document.getElementById('modal-cidos-title').textContent = 'Kemaskini Blended — ' + sq;
    document.getElementById('mc-jabatan').value  = jab.nama;
    document.getElementById('mc-sukuan').value   = sq + ' — ' + SUKUAN_LABELS[sq].split('—')[1].trim();
    const d = jab.cidos[sq] || {};
    document.getElementById('mc-platform').value = jab.cidos_platform || jab.cidos['Q1']?.kursus_dibuka || 0;
    document.getElementById('mc-platform').disabled = true;
    document.getElementById('mc-blended').value  = d.kursus_blended || 0;
    document.getElementById('mc-blended').disabled = false;
    document.getElementById('mc-blended').placeholder = 'cth. 7';
  }
  document.getElementById('modal-cidos').classList.add('open');
}

function saveCidos(e) {
  e.preventDefault();
  const jab = jabatanById(modalCidosJabId);
  if (!jab) { closeModal('modal-cidos'); return; }

  if (modalCidosSq === 'platform') {
    // Simpan bilangan platform untuk jabatan
    const platform = parseInt(document.getElementById('mc-platform').value) || 0;
    jab.cidos_platform = platform;
    // Kemas kini Q1 sebagai rujukan juga
    ['Q1','Q2','Q3','Q4'].forEach(sq => {
      if (!jab.cidos[sq]) jab.cidos[sq] = { kursus_dibuka:0, kursus_blended:0, peratus_blended:0, senarai_kursus:[] };
      jab.cidos[sq].kursus_dibuka = platform;
    });
  } else {
    // Simpan blended untuk sukuan tertentu
    const platform = jab.cidos_platform || jab.cidos['Q1']?.kursus_dibuka || 0;
    const blended  = parseInt(document.getElementById('mc-blended').value) || 0;
    if (!jab.cidos[modalCidosSq]) jab.cidos[modalCidosSq] = {};
    jab.cidos[modalCidosSq].kursus_blended  = Math.min(blended, platform);
    jab.cidos[modalCidosSq].peratus_blended = platform > 0
      ? Math.round((Math.min(blended, platform) / platform) * 100) : 0;
  }

  // Reset disabled state
  document.getElementById('mc-platform').disabled = false;
  document.getElementById('mc-blended').disabled  = false;
  closeModal('modal-cidos');
  renderCidos();
  renderHome();

  // Auto-sync ke Google Sheets
  const platform = jab.cidos_platform || 0;
  syncToSheets('saveCidos', {
    tahun: appData.tahun,
    jabatan:  jab.nama,
    platform: platform,
    Q1: jab.cidos['Q1']?.kursus_blended || 0,
    Q2: jab.cidos['Q2']?.kursus_blended || 0,
    Q3: jab.cidos['Q3']?.kursus_blended || 0,
    Q4: jab.cidos['Q4']?.kursus_blended || 0
  });
}

// ============================================================
// MODAL — Bahan Digital (Tambah Item KPI)
// ============================================================
let modalBahanJabId   = null;
let modalBahanItemKey = null;

function openBahanModal(jabId, itemKey) {
  modalBahanJabId   = jabId;
  modalBahanItemKey = itemKey || null;
  const jab = jabatanById(jabId);
  const title = itemKey
    ? `Tambah ${ITEM_META[itemKey]?.label || 'Bahan'} — ${jab?.nama}`
    : `Tambah Bahan Digital — ${jab?.nama}`;
  document.getElementById('modal-bahan-title').textContent = title;
  ['mb-tajuk','mb-pembangun'].forEach(id => document.getElementById(id).value = '');
  ['mb-q1','mb-q2','mb-q3','mb-q4'].forEach(id => document.getElementById(id).value = 0);
  document.getElementById('modal-bahan').classList.add('open');
}

function saveBahan(e) {
  e.preventDefault();
  const tajuk = document.getElementById('mb-tajuk').value.trim();
  const pemb  = document.getElementById('mb-pembangun').value.trim();
  const q1 = parseInt(document.getElementById('mb-q1').value) || 0;
  const q2 = parseInt(document.getElementById('mb-q2').value) || 0;
  const q3 = parseInt(document.getElementById('mb-q3').value) || 0;
  const q4 = parseInt(document.getElementById('mb-q4').value) || 0;

  const jab = jabatanById(modalBahanJabId);
  if (!jab) { closeModal('modal-bahan'); return; }

  // Cari pembangun sedia ada atau cipta baru
  let pb = jab.pembangun.find(p => p.nama.toLowerCase() === pemb.toLowerCase());
  if (!pb) {
    pb = { id: 'p' + Date.now(), nama: pemb };
    jab.pembangun.push(pb);
  }

  // Tambah sebagai rekod bahan tambahan
  if (!jab.kpi_extra) jab.kpi_extra = [];
  const key = modalBahanItemKey || 'video_pdp';
  jab.kpi_extra.push({ item: key, tajuk, pembangun_id: pb.id, sasaran: THRESHOLDS[key], Q1: q1, Q2: q2, Q3: q3, Q4: q4 });

  closeModal('modal-bahan');
  renderKpi();

  // Auto-sync ke Google Sheets
  syncToSheets('saveBahan', {
    tahun: appData.tahun,
    jabatan:  jab.nama,
    item:     key,
    tajuk:    tajuk,
    pembangun: pemb,
    Q1: q1, Q2: q2, Q3: q3, Q4: q4
  });
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ============================================================
// GOOGLE SHEETS INTEGRATION
// ============================================================
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxI2wMdytGX-bhhpPdacSm9OK8D8EdcILes7jNZ8GCl_ISuEZsTV9L689PTvcBM0JSC/exec';

// Semak sama ada dibuka melalui file:/// (tiada pelayan)
function isFileProtocol() {
  return window.location.protocol === 'file:';
}

// Hantar data ke Google Sheets — guna GET + URLSearchParams (elak CORS preflight)
function syncToSheets(action, payload, onDone) {
  // Halang jika dibuka melalui file:/// — CORS akan sekat sentiasa
  if (isFileProtocol()) {
    const syncEl = document.getElementById('sync-status');
    if (syncEl) {
      syncEl.textContent = '⚠️ Mod luar talian';
      syncEl.style.display = 'inline';
      syncEl.title = 'Buka melalui Live Server (http://) untuk sync ke Google Sheets';
      setTimeout(() => { syncEl.style.display = 'none'; }, 5000);
    }
    showToast('⚠️ Luar talian: Data disimpan dalam sesi ini sahaja. Buka via Live Server untuk sync ke Sheets.', 'warn');
    console.warn('[syncToSheets] Diabaikan — dibuka melalui file:///. Guna Live Server (http://) untuk CORS berfungsi.');
    if (onDone) onDone(false, 'file:// protocol');
    return;
  }

  const syncEl = document.getElementById('sync-status');
  if (syncEl) { syncEl.textContent = '🔄 Menyimpan...'; syncEl.style.display = 'inline'; }

  // Encode semua data sebagai URL parameter — tidak mencetuskan CORS preflight
  const params = new URLSearchParams({ action, ...payload });
  const url = SHEETS_URL + '?' + params.toString();

  fetch(url, { method: 'GET', mode: 'cors' })
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
    return res.json();
  })
  .then(data => {
    if (data.status === 'ok') {
      if (syncEl) { syncEl.textContent = '✅ Tersimpan'; setTimeout(() => { syncEl.style.display = 'none'; }, 3000); }
      if (onDone) onDone(true, null);
    } else {
      const msg = data.message || data.error || JSON.stringify(data);
      if (syncEl) { syncEl.textContent = '❌ Ralat Sheets'; setTimeout(() => { syncEl.style.display = 'none'; }, 5000); }
      showToast(`❌ Sheets: ${msg}`, 'error');
      console.error('[syncToSheets] Sheets ralat:', msg, '| Payload:', payload);
      if (onDone) onDone(false, msg);
    }
  })
  .catch(err => {
    let msg = err.message || String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      msg = 'Tiada sambungan internet atau CORS tidak dibenarkan pada Apps Script.';
    } else if (msg.includes('401') || msg.includes('403')) {
      msg = 'Apps Script tidak dibenarkan — semak tetapan perkongsian deployment.';
    } else if (msg.includes('404')) {
      msg = 'URL Apps Script tidak dijumpai — SHEETS_URL mungkin sudah luput.';
    } else if (msg.includes('500')) {
      msg = 'Ralat dalaman Apps Script — semak kod Google Apps Script.';
    }
    if (syncEl) { syncEl.textContent = '❌ Gagal simpan'; setTimeout(() => { syncEl.style.display = 'none'; }, 5000); }
    showToast(`❌ Gagal: ${msg}`, 'error');
    console.error('[syncToSheets] Gagal hantar:', msg, '| Action:', action, '| Payload:', payload);
    if (onDone) onDone(false, msg);
  });
}

// Muatkan senarai tahun yang ada dari Sheets dan isi dropdown
function loadTahunList() {
  if (isFileProtocol()) return;
  fetch(SHEETS_URL + '?action=listTahun', { mode: 'cors' })
    .then(r => r.json())
    .then(res => {
      if (res.status !== 'ok') return;
      renderTahunDropdown(res.tahunList || []);
    })
    .catch(() => {});
}

// Render dropdown tahun dalam header
function renderTahunDropdown(tahunList) {
  const el = document.getElementById('tahun-select');
  if (!el) return;
  el.innerHTML = '';
  // Pastikan tahun semasa ada dalam senarai
  const allTahun = [...new Set([appData.tahun, ...tahunList])].sort((a,b) => b - a);
  allTahun.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (t === appData.tahun) opt.selected = true;
    el.appendChild(opt);
  });
  el.style.display = 'inline-block';
}

// Tukar paparan kepada tahun yang dipilih
function changeViewTahun(tahun) {
  tahun = parseInt(tahun);
  if (!tahun) return;
  const syncEl = document.getElementById('sync-status');
  if (syncEl) { syncEl.textContent = '🔄 Memuatkan ' + tahun + '...'; syncEl.style.display = 'inline'; }

  fetch(SHEETS_URL + '?action=loadAll&tahun=' + tahun, { mode: 'cors' })
    .then(r => r.json())
    .then(res => {
      if (res.status !== 'ok' || !res.data) return;
      // Reset SEMUA data tempatan dahulu — nilai, tajuk, pembangun, kpi_extra
      appData.jabatan.forEach(jab => {
        Object.keys(jab.kpi).forEach(key => {
          ['Q1','Q2','Q3','Q4'].forEach(sq => { jab.kpi[key][sq] = 0; });
          jab.kpi[key].tajuk        = '';  // kosongkan tajuk lama
          jab.kpi[key].pembangun_id = '';  // kosongkan pembangun lama
        });
        ['Q1','Q2','Q3','Q4'].forEach(sq => {
          if (jab.cidos[sq]) {
            jab.cidos[sq].kursus_blended  = 0;
            jab.cidos[sq].peratus_blended = 0;
            jab.cidos[sq].senarai_kursus  = [];
          }
        });
        jab.kpi_extra = [];
        jab.pembangun = [];  // kosongkan senarai pembangun lama
      });
      appData.tahun = tahun;
      applySheetData(res.data);
      document.getElementById('header-sukuan').textContent = sukuan + ' ' + tahun;
      if (syncEl) { syncEl.textContent = '✅ Tahun ' + tahun; setTimeout(() => { syncEl.style.display = 'none'; }, 3000); }
      renderSection(activeSection);
    })
    .catch(() => {
      if (syncEl) { syncEl.textContent = '⚠️ Gagal muatkan tahun ' + tahun; setTimeout(() => { syncEl.style.display = 'none'; }, 4000); }
    });
}

// Muatkan data dari Google Sheets (tahun semasa) dan gabung dengan appData
function loadFromSheets() {
  if (isFileProtocol()) {
    const syncEl = document.getElementById('sync-status');
    if (syncEl) { syncEl.textContent = '⚠️ Mod luar talian'; syncEl.style.display = 'inline'; syncEl.title = 'Buka via Live Server untuk sync'; setTimeout(() => { syncEl.style.display = 'none'; }, 4000); }
    console.warn('[loadFromSheets] Diabaikan — dibuka melalui file:///.');
    return;
  }

  const syncEl = document.getElementById('sync-status');
  if (syncEl) { syncEl.textContent = '🔄 Memuatkan data...'; syncEl.style.display = 'inline'; }

  fetch(SHEETS_URL + '?action=loadAll&tahun=' + appData.tahun, { mode: 'cors' })
    .then(r => r.json())
    .then(res => {
      if (res.status !== 'ok' || !res.data) return;
      applySheetData(res.data);
      if (syncEl) { syncEl.textContent = '✅ Data terkini'; setTimeout(() => { syncEl.style.display = 'none'; }, 3000); }
      renderSection(activeSection);
      // Muatkan senarai tahun selepas data berjaya diambil
      loadTahunList();
    })
    .catch(() => {
      if (syncEl) { syncEl.textContent = '⚠️ Tiada sambungan'; setTimeout(() => { syncEl.style.display = 'none'; }, 4000); }
    });
}

// Terapkan data dari Sheets ke dalam appData (KPI, CIDOS, BahanDigital)
function applySheetData(sheetData) {
  // ── KPI rows: [Jabatan, Item, Q1, Q2, Q3, Q4, Tajuk, Pembangun]
  (sheetData.KPI || []).forEach(row => {
    const [jabNama, item, q1, q2, q3, q4, tajuk, pembNama] = row;
    const jab = appData.jabatan.find(j => j.nama === jabNama);
    if (!jab || !jab.kpi[item]) return;
    if (q1 !== '' && q1 !== undefined) jab.kpi[item].Q1 = Number(q1) || 0;
    if (q2 !== '' && q2 !== undefined) jab.kpi[item].Q2 = Number(q2) || 0;
    if (q3 !== '' && q3 !== undefined) jab.kpi[item].Q3 = Number(q3) || 0;
    if (q4 !== '' && q4 !== undefined) jab.kpi[item].Q4 = Number(q4) || 0;
    // Kemaskini tajuk dan pembangun dari Sheets
    if (tajuk)    jab.kpi[item].tajuk = tajuk;
    if (pembNama) {
      let pb = jab.pembangun.find(p => p.nama === pembNama);
      if (!pb) { pb = { id: 'p_' + item + '_' + jab.id, nama: pembNama }; jab.pembangun.push(pb); }
      jab.kpi[item].pembangun_id = pb.id;
    }
  });

  // ── CIDOS rows: [Jabatan, Platform, Q1_Blended, Q2_Blended, Q3_Blended, Q4_Blended, Dikemaskini]
  (sheetData.CIDOS || []).forEach(row => {
    const [jabNama, platform, q1b, q2b, q3b, q4b] = row;
    const jab = appData.jabatan.find(j => j.nama === jabNama);
    if (!jab) return;
    jab.cidos_platform = Number(platform) || 0;
    const plat = jab.cidos_platform;
    [['Q1', q1b], ['Q2', q2b], ['Q3', q3b], ['Q4', q4b]].forEach(([sq, bl]) => {
      if (!jab.cidos[sq]) jab.cidos[sq] = { kursus_dibuka: plat, kursus_blended: 0, peratus_blended: 0, senarai_kursus: [] };
      jab.cidos[sq].kursus_blended  = Number(bl) || 0;
      jab.cidos[sq].peratus_blended = plat > 0 ? Math.round(((Number(bl)||0) / plat) * 100) : 0;
    });
  });

  // ── BahanDigital rows: [Jabatan, Item, Tajuk, Pembangun, Q1, Q2, Q3, Q4, Tarikh]
  (sheetData.BahanDigital || []).forEach(row => {
    const [jabNama, item, tajuk, pemb, q1, q2, q3, q4] = row;
    const jab = appData.jabatan.find(j => j.nama === jabNama);
    if (!jab) return;
    if (!jab.kpi_extra) jab.kpi_extra = [];
    // Elak duplikasi — semak tajuk + jabatan
    const exists = jab.kpi_extra.find(x => x.tajuk === tajuk && x.item === item);
    if (exists) return;
    let pb = jab.pembangun.find(p => p.nama === pemb);
    if (!pb) { pb = { id: 'p' + Date.now() + Math.random(), nama: pemb }; jab.pembangun.push(pb); }
    jab.kpi_extra.push({
      item: item || 'video_pdp', tajuk, pembangun_id: pb.id,
      sasaran: THRESHOLDS[item] || 70,
      Q1: Number(q1)||0, Q2: Number(q2)||0, Q3: Number(q3)||0, Q4: Number(q4)||0
    });
  });
}

// ============================================================
// INIT — data disematkan terus, tidak perlukan pelayan web
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // Hanya jalankan pada dashboard.html (ada elemen sidebar)
  if (!document.getElementById('sidebar')) return;
  appData = getInlineData();
  setupUI();
  renderHome();
  // Load data terkini dari Google Sheets (jika ada internet)
  loadFromSheets();
  // Muatkan senarai tahun secara berasingan untuk dropdown
  loadTahunList();
});
