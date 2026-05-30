import { apiFetch, apiSSE } from '../api/client.js';
import { showToast }        from '../components/toast.js';
import { getUser }          from '../api/client.js';

let vitalsSSE   = null;
let qrTimer     = null;
let qrInterval  = null;
let pollTimer   = null;

export function mountPatient(container) {
  const user = getUser();
  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
        <div>
          <div class="section-title">Patient Dashboard</div>
          <h1 style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700;letter-spacing:1px">
            Welcome back, <span class="neon-text" id="pt-name">Loading…</span>
          </h1>
          <p style="font-size:13px;color:var(--muted);margin-top:4px">
            Patient ID: <span class="mono neon-text" id="pt-id">—</span>
            · Blood Type: <span id="pt-blood" style="color:#f87171">—</span>
            · Condition: <span id="pt-condition" style="color:#a78bfa">—</span>
          </p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div class="badge badge-success" id="pt-verified" style="display:none"><div class="badge-dot"></div>Verified</div>
          <button class="btn btn-neon" onclick="window._generateQR()">⬡ Generate QR Access</button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="grid4" style="margin-bottom:16px" id="pt-stats">
        ${['','','',''].map(() => `<div class="glass stat-card"><div class="skeleton" style="height:60px;width:100%"></div></div>`).join('')}
      </div>

      <!-- Main grid -->
      <div class="grid2" style="margin-bottom:16px">

        <!-- Left column -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- Vitals input -->
          <div class="glass glow-border" style="padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <div class="card-title neon-text">Log Daily Vitals</div>
              <div class="badge badge-info">Manual Input</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group"><label>Heart Rate (bpm)</label><input type="number" id="inp-hr"   class="form-input" placeholder="72"></div>
              <div class="form-group"><label>SpO₂ (%)</label>        <input type="number" id="inp-spo2" class="form-input" placeholder="98"></div>
              <div class="form-group"><label>Systolic BP (mmHg)</label><input type="number" id="inp-bp"  class="form-input" placeholder="120"></div>
              <div class="form-group"><label>Glucose (mg/dL)</label> <input type="number" id="inp-glu"  class="form-input" placeholder="95"></div>
            </div>
            <button class="btn btn-neon" style="width:100%;margin-top:16px;justify-content:center" onclick="window._submitVitals()">
              ⬡ Process Vitals
            </button>
          </div>

          <!-- Medical Records -->
          <div class="glass glow-border" style="padding:20px;flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <div class="card-title neon-text">Medical Records</div>
              <div class="badge badge-info">🔒 Encrypted</div>
            </div>
            <div id="records-list"><div class="loader"><div class="spinner"></div> Fetching…</div></div>
          </div>

          <!-- Active Prescriptions -->
          <div class="glass glass-purple" style="padding:20px">
            <div class="card-title purple-text" style="margin-bottom:14px">💊 Active Prescriptions</div>
            <div id="prescriptions-list"><div class="loader"><div class="spinner"></div></div></div>
          </div>
        </div>

        <!-- Right column -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- Live vitals stream -->
          <div class="glass glass-purple glow-purple" style="padding:20px">
            <div class="card-title purple-text" style="margin-bottom:14px">📡 Live Health Stream</div>
            <div id="vitals-container"><div class="loader"><div class="spinner"></div></div></div>
          </div>

          <!-- AI Risk Summary -->
          <div class="glass glow-border" id="risk-card" style="padding:20px;display:none">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div class="card-title neon-text">🤖 AI Risk Summary</div>
              <div class="badge badge-success" id="risk-badge">Low Risk</div>
            </div>
            <div id="risk-diagnosis" style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:10px"></div>
            <div id="risk-annotation" style="font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace;line-height:1.5;padding:10px;background:rgba(0,245,255,.04);border:1px solid rgba(0,245,255,.1);border-radius:8px"></div>
          </div>

          <!-- Medical history -->
          <div class="glass glass-amber" style="padding:20px">
            <div class="card-title amber-text" style="margin-bottom:14px">📋 Medical History</div>
            <div id="history-list"><div style="color:var(--muted);font-size:12px">Loading…</div></div>
          </div>

          <!-- QR token -->
          <div class="glass glow-border" style="padding:20px;text-align:center">
            <div class="card-title neon-text" style="margin-bottom:6px">Secure QR Access Token</div>
            <p style="font-size:12px;color:var(--muted);margin-bottom:14px">One-time 15-min token for record access</p>
            <div id="qr-container">
              <div class="qr-wrap" style="position:relative">
                <div class="qr-glow"></div>
                <div class="scan-line"></div>
                <canvas id="qrCanvas" width="140" height="140"></canvas>
              </div>
            </div>
            <div id="qr-placeholder" style="padding:20px;border:1px dashed rgba(0,245,255,0.2);border-radius:8px;color:var(--muted);font-size:12px">
              Click "Generate QR Access" to create token
            </div>
            <div id="qr-timer" style="display:none;margin-top:10px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--neon)"></div>
          </div>
        </div>
      </div>

      <!-- Access Log -->
      <div class="glass glow-border" style="padding:20px">
        <div class="card-title neon-text" style="margin-bottom:14px">🕐 Access Log</div>
        <div id="activity-log"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  // Wire handlers
  window._generateQR   = generateQR;
  window._submitVitals = submitVitals;

  // Load data
  loadPatientProfile();
  loadRecords();
  loadVitals();
  loadActivity();

  // Poll for doctor updates every 30s
  pollTimer = setInterval(() => {
    loadPatientProfile();
    loadRecords();
  }, 30000);
}

export function unmountPatient() {
  if (vitalsSSE)  { vitalsSSE.close(); vitalsSSE = null; }
  if (qrTimer)    { clearInterval(qrTimer); qrTimer = null; }
  if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
  if (pollTimer)  { clearInterval(pollTimer); pollTimer = null; }
}

// ── Data loaders ─────────────────────────────────────────────────────────────

async function loadPatientProfile() {
  try {
    const p = await apiFetch('/patients/me');

    document.getElementById('pt-name').textContent      = p.name;
    document.getElementById('pt-id').textContent        = p.patientId;
    document.getElementById('pt-blood').textContent     = p.bloodType;
    document.getElementById('pt-condition').textContent = p.condition || 'N/A';
    if (p.isVerified) document.getElementById('pt-verified').style.display = 'inline-flex';

    const riskScore   = p.riskScore || 0;
    const riskLabel   = riskScore > 60 ? 'High Risk' : riskScore > 30 ? 'Medium Risk' : 'Low Risk';
    const riskColor   = riskScore > 60 ? '#f87171'   : riskScore > 30 ? '#fbbf24'     : '#34d399';
    const scoreLabel  = p.healthScore >= 85 ? 'Excellent' : p.healthScore >= 70 ? 'Good' : 'Needs Attention';

    document.getElementById('pt-stats').innerHTML = `
      <div class="glass stat-card glow-border">
        <div class="section-title">Health Score</div>
        <div class="stat-val neon-text">${p.healthScore}</div>
        <div class="stat-label">${scoreLabel}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.healthScore}%;background:linear-gradient(90deg,var(--neon),#0099cc)"></div></div>
      </div>
      <div class="glass stat-card glass-purple">
        <div class="section-title">Records</div>
        <div class="stat-val purple-text" id="rec-count">${p.recordCount ?? '—'}</div>
        <div class="stat-label">Total files</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,(p.recordCount||0)*10)}%;background:linear-gradient(90deg,#7c3aed,#a78bfa)"></div></div>
      </div>
      <div class="glass stat-card glass-green">
        <div class="section-title">Risk Score</div>
        <div class="stat-val" style="color:${riskColor}">${p.riskScore ?? 0}</div>
        <div class="stat-label">${riskLabel}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.riskScore||0}%;background:${riskColor}"></div></div>
      </div>
      <div class="glass stat-card glass-amber">
        <div class="section-title">Insurance</div>
        <div class="stat-val amber-text" style="font-size:16px">${p.insurance}</div>
        <div class="stat-label">Active policy</div>
      </div>`;

    // Prescriptions
    renderPrescriptions(p.prescriptions || []);

    // Medical history
    renderHistory(p.medicalHistory || []);

    // AI Risk summary
    if (p.diagnosis || p.riskAnnotations) {
      const card   = document.getElementById('risk-card');
      const badge  = document.getElementById('risk-badge');
      const diag   = document.getElementById('risk-diagnosis');
      const annot  = document.getElementById('risk-annotation');
      if (card) card.style.display = 'block';
      if (badge) { badge.textContent = riskLabel; badge.style.color = riskColor; badge.style.borderColor = riskColor + '40'; badge.style.background = riskColor + '15'; }
      if (diag  && p.diagnosis)       diag.textContent  = p.diagnosis;
      if (annot && p.riskAnnotations) annot.textContent = '🔍 ' + p.riskAnnotations;
    }
  } catch(e) { showToast('Could not load patient profile', 'error'); }
}

function renderPrescriptions(rxs) {
  const el = document.getElementById('prescriptions-list');
  if (!el) return;
  const active = rxs.filter(r => r.active !== false);
  if (!active.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px">No active prescriptions.</div>`;
    return;
  }
  el.innerHTML = active.map(rx => `
    <div style="padding:10px 12px;margin-bottom:8px;border-radius:8px;background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.18)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:13px;font-weight:600;color:#c4b5fd">💊 ${rx.medication}</span>
        <div class="badge badge-purple" style="font-size:9px">${rx.dosage || ''}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace">
        ${rx.frequency || ''} · By ${rx.prescribedBy || 'Doctor'} · From ${rx.startDate || 'N/A'}
      </div>
    </div>`).join('');
}

function renderHistory(history) {
  const el = document.getElementById('history-list');
  if (!el) return;
  if (!history.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px">No medical history recorded.</div>`;
    return;
  }
  el.innerHTML = history.map(h => {
    const col = h.status === 'resolved' ? '#34d399' : h.status === 'chronic' ? '#fbbf24' : '#f87171';
    return `<div class="timeline-item">
      <div class="tl-dot" style="background:${col}"></div>
      <div style="flex:1">
        <div style="font-size:13px"><span style="color:${col}">${h.condition}</span>
          <span class="badge" style="margin-left:8px;font-size:9px;color:${col};border-color:${col}40;background:${col}15">${h.status}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${h.notes || ''}</div>
        <div class="tl-time">${h.diagnosedDate || ''} · ${h.recordedBy || ''}</div>
      </div>
    </div>`;
  }).join('');
}

async function loadRecords() {
  try {
    const records = await apiFetch('/records');
    const el      = document.getElementById('records-list');
    const rcEl    = document.getElementById('rec-count');
    if (rcEl) rcEl.textContent = records.length;
    if (!records.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:16px">No records found.</div>`;
      return;
    }
    el.innerHTML = records.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:8px;border:1px solid rgba(0,245,255,0.08);background:rgba(0,245,255,0.03);cursor:pointer;transition:all .2s"
           onmouseover="this.style.borderColor='rgba(0,245,255,0.22)'" onmouseout="this.style.borderColor='rgba(0,245,255,0.08)'">
        <span style="font-size:18px;width:28px;text-align:center">${r.icon || '📄'}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${r.type}</div>
          <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">
            ${r.recordId} · ${r.doctorName} · ${r.date}
          </div>
          ${r.notes ? `<div style="font-size:10px;color:var(--muted);margin-top:3px;opacity:.7">${r.notes.slice(0,80)}${r.notes.length>80?'…':''}</div>` : ''}
        </div>
        <div class="badge ${r.status==='flagged'?'badge-danger':r.status==='active'?'badge-purple':'badge-success'}">${r.status}</div>
        <span style="font-size:10px;opacity:.4">🔒</span>
      </div>`).join('');
  } catch(e) { showToast('Could not load records', 'error'); }
}

function loadVitals() {
  apiFetch('/vitals').then(renderVitals).catch(() => {});
  vitalsSSE = apiSSE('/vitals/stream');
  vitalsSSE.onmessage = e => renderVitals(JSON.parse(e.data));
  vitalsSSE.onerror   = () => vitalsSSE.close();
}

function renderVitals(vitals) {
  const el = document.getElementById('vitals-container');
  if (!el) return;
  el.innerHTML = vitals.map(v => `
    <div class="vital-bar">
      <div class="vital-label">${v.label}</div>
      <div class="vital-track"><div class="vital-fill" style="width:${v.pct}%;background:${v.color}"></div></div>
      <div class="vital-val" style="color:${v.color}">${v.val}<span style="font-size:9px;opacity:.6"> ${v.unit}</span></div>
    </div>`).join('');
}

async function loadActivity() {
  try {
    const logs = await apiFetch('/activity');
    const el   = document.getElementById('activity-log');
    if (!el) return;
    el.innerHTML = logs.map(a => {
      const diff = Date.now() - new Date(a.createdAt).getTime();
      const ago  = diff < 3600000 ? `${Math.round(diff/60000)}m ago`
                 : diff < 86400000 ? `${Math.round(diff/3600000)}h ago`
                 : `${Math.round(diff/86400000)}d ago`;
      return `<div class="timeline-item">
        <div class="tl-dot" style="background:${a.color}"></div>
        <div style="flex:1">
          <div style="font-size:13px"><span style="color:${a.color}">${a.actor}</span> <span style="color:var(--muted)">${a.action}</span></div>
          <div class="tl-time">${ago}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {}
}

async function submitVitals() {
  const hr = document.getElementById('inp-hr').value;
  const sp = document.getElementById('inp-spo2').value;
  const bp = document.getElementById('inp-bp').value;
  const gl = document.getElementById('inp-glu').value;
  if (!hr && !sp && !bp && !gl) return showToast('Please enter at least one value', 'error');
  try {
    await apiFetch('/vitals', { method: 'POST', body: JSON.stringify({ hr, sp, bp, gl }) });
    showToast('Vitals processed & health score updated', 'success');
    loadPatientProfile();
  } catch(e) { showToast('Failed to save vitals', 'error'); }
}

function generateQR() {
  document.getElementById('qr-placeholder').style.display = 'none';
  document.getElementById('qr-container').classList.add('show');
  drawQR();
  let secs = 900;
  if (qrTimer) clearInterval(qrTimer);
  const timerEl = document.getElementById('qr-timer');
  timerEl.style.display = 'block';
  qrTimer = setInterval(() => {
    secs--;
    const m = Math.floor(secs / 60), s = secs % 60;
    timerEl.textContent = `Expires in ${m}:${String(s).padStart(2, '0')}`;
    if (secs <= 0) {
      clearInterval(qrTimer);
      timerEl.textContent = 'Token expired';
      document.getElementById('qr-container').classList.remove('show');
      document.getElementById('qr-placeholder').style.display = '';
    }
  }, 1000);
  apiFetch('/activity', { method: 'POST', body: JSON.stringify({ actor: 'Patient', action: 'Generated QR access token', color: '#00f5ff' }) }).catch(() => {});
  showToast('QR token generated — valid 15 min', 'success');
  if (qrInterval) clearInterval(qrInterval);
  qrInterval = setInterval(() => {
    if (document.getElementById('qr-container')?.classList.contains('show')) drawQR();
  }, 800);
}

function drawQR() {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), s = 140, m = 4, mod = 21, cell = Math.floor((s - m * 2) / mod);
  ctx.clearRect(0, 0, s, s);
  const pat = Array.from({ length: mod }, () => Array.from({ length: mod }, () => Math.random() > .5));
  ctx.fillStyle = 'rgba(0,245,255,0.08)'; ctx.fillRect(0, 0, s, s);
  for (let r = 0; r < mod; r++) for (let c = 0; c < mod; c++) if (pat[r][c]) {
    ctx.fillStyle = `rgba(0,245,255,${.7 + Math.random() * .3})`;
    ctx.fillRect(m + c * cell, m + r * cell, cell - 1, cell - 1);
  }
  [[0, 0], [0, mod - 7], [mod - 7, 0]].forEach(([pr, pc]) => {
    ctx.fillStyle = 'rgba(0,245,255,0.9)'; ctx.fillRect(m + pc * cell, m + pr * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = 'rgba(3,7,18,1)';      ctx.fillRect(m + pc * cell + cell, m + pr * cell + cell, 5 * cell, 5 * cell);
    ctx.fillStyle = 'rgba(0,245,255,0.9)'; ctx.fillRect(m + pc * cell + 2 * cell, m + pr * cell + 2 * cell, 3 * cell, 3 * cell);
  });
}
