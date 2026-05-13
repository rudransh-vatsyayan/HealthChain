import { apiFetch } from '../api/client.js';
import { showToast } from '../components/toast.js';
import { getUser }   from '../api/client.js';

let vitalsSSE   = null;
let qrTimer     = null;
let qrInterval  = null;

export function mountPatient(container) {
  const user = getUser();
  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
        <div>
          <div class="section-title">Patient Dashboard</div>
          <h1 style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700;letter-spacing:1px">
            Welcome back, <span class="neon-text" id="pt-name">Loading…</span>
          </h1>
          <p style="font-size:13px;color:var(--muted);margin-top:4px">
            Patient ID: <span class="mono neon-text" id="pt-id">—</span>
            · Blood Type: <span id="pt-blood" style="color:#f87171">—</span>
          </p>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="badge badge-success" id="pt-verified" style="display:none"><div class="badge-dot"></div>Verified</div>
          <button class="btn btn-neon" onclick="window._generateQR()">⬡ Generate QR Access</button>
        </div>
      </div>

      <div class="grid4" style="margin-bottom:16px" id="pt-stats">
        ${['','','',''].map(() => `<div class="glass stat-card"><div class="skeleton" style="height:60px;width:100%"></div></div>`).join('')}
      </div>

      <div class="grid2" style="margin-bottom:16px">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="glass glow-border" style="padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <div class="card-title neon-text">Log Daily Vitals</div>
              <div class="badge badge-info">Manual Input</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group"><label>Heart Rate</label><input type="number" id="inp-hr" class="form-input" placeholder="72"></div>
              <div class="form-group"><label>SpO₂ (%)</label><input type="number" id="inp-spo2" class="form-input" placeholder="98"></div>
              <div class="form-group"><label>Systolic BP</label><input type="number" id="inp-bp" class="form-input" placeholder="120"></div>
              <div class="form-group"><label>Glucose</label><input type="number" id="inp-glu" class="form-input" placeholder="95"></div>
            </div>
            <button class="btn btn-neon" style="width:100%;margin-top:16px;justify-content:center" onclick="window._submitVitals()">⬡ Process Vitals</button>
          </div>
          <div class="glass glow-border" style="padding:20px;flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <div class="card-title neon-text">Medical Records</div>
              <div class="badge badge-info">Encrypted</div>
            </div>
            <div id="records-list"><div class="loader"><div class="spinner"></div> Fetching…</div></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="glass glass-purple glow-purple" style="padding:20px">
            <div class="card-title purple-text" style="margin-bottom:14px">Live Health Stream</div>
            <div id="vitals-container"><div class="loader"><div class="spinner"></div></div></div>
          </div>
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

      <div class="glass glow-border" style="padding:20px">
        <div class="card-title neon-text" style="margin-bottom:14px">Access Log</div>
        <div id="activity-log"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  // Wire up global handlers
  window._generateQR = generateQR;
  window._submitVitals = async () => {
    const hr = document.getElementById('inp-hr').value;
    const sp = document.getElementById('inp-spo2').value;
    const bp = document.getElementById('inp-bp').value;
    const gl = document.getElementById('inp-glu').value;
    if (!hr && !sp && !bp && !gl) return showToast('Please enter at least one value', 'error');

    try {
      await apiFetch('/vitals', {
        method: 'POST',
        body: JSON.stringify({ hr, sp, bp, gl })
      });
      showToast('Vitals processed & health score updated', 'success');
      loadPatientProfile(); // Refresh health score
    } catch (e) { showToast('Failed to save vitals', 'error'); }
  };

  // Load all data
  loadPatientProfile();
  loadRecords();
  loadVitals();
  loadActivity();
}

export function unmountPatient() {
  if (vitalsSSE) { vitalsSSE.close(); vitalsSSE = null; }
  if (qrTimer)   { clearInterval(qrTimer); qrTimer = null; }
  if (qrInterval){ clearInterval(qrInterval); qrInterval = null; }
}

async function loadPatientProfile() {
  try {
    const p = await apiFetch('/patients/me');
    document.getElementById('pt-name').textContent  = p.name;
    document.getElementById('pt-id').textContent    = p.patientId;
    document.getElementById('pt-blood').textContent = p.bloodType;
    if (p.isVerified) document.getElementById('pt-verified').style.display = 'inline-flex';

    document.getElementById('pt-stats').innerHTML = `
      <div class="glass stat-card glow-border">
        <div class="section-title">Health Score</div>
        <div class="stat-val neon-text">${p.healthScore}</div>
        <div class="stat-label">Excellent</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.healthScore}%;background:linear-gradient(90deg,var(--neon),#0099cc)"></div></div>
      </div>
      <div class="glass stat-card glass-purple">
        <div class="section-title">Records</div>
        <div class="stat-val purple-text" id="rec-count">—</div>
        <div class="stat-label">Total files</div>
        <div class="progress-bar"><div class="progress-fill" style="width:60%;background:linear-gradient(90deg,#7c3aed,#a78bfa)"></div></div>
      </div>
      <div class="glass stat-card glass-green">
        <div class="section-title">Access Grants</div>
        <div class="stat-val green-text">3</div>
        <div class="stat-label">Active permissions</div>
        <div class="progress-bar"><div class="progress-fill" style="width:30%;background:linear-gradient(90deg,var(--neon3),#34d399)"></div></div>
      </div>
      <div class="glass stat-card glass-amber">
        <div class="section-title">Insurance</div>
        <div class="stat-val amber-text" style="font-size:18px">${p.insurance}</div>
        <div class="stat-label">Active policy</div>
      </div>`;
  } catch(e) { showToast('Could not load patient profile', 'error'); }
}

async function loadRecords() {
  try {
    const records = await apiFetch('/records');
    const el = document.getElementById('records-list');
    const rcEl = document.getElementById('rec-count');
    if (rcEl) rcEl.textContent = records.length;
    if (!records.length) { el.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:16px">No records found.</div>`; return; }
    el.innerHTML = records.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:8px;border:1px solid rgba(0,245,255,0.08);background:rgba(0,245,255,0.03);cursor:pointer;transition:all .2s"
           onmouseover="this.style.borderColor='rgba(0,245,255,0.22)'" onmouseout="this.style.borderColor='rgba(0,245,255,0.08)'">
        <span style="font-size:18px;width:24px;text-align:center">${r.icon}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${r.type}</div>
          <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">${r.recordId} · ${r.doctorName} · ${r.date}</div>
        </div>
        <div class="badge ${r.status==='flagged'?'badge-danger':r.status==='active'?'badge-purple':'badge-success'}">${r.status}</div>
      </div>`).join('');
  } catch(e) { showToast('Could not load records', 'error'); }
}

function loadVitals() {
  // Snapshot first
  apiFetch('/vitals').then(renderVitals).catch(() => {});

  // SSE stream
  const token = localStorage.getItem('hc_token');
  vitalsSSE = new EventSource(`/api/vitals/stream?token=${token}`);
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
    const m = Math.floor(secs/60), s = secs % 60;
    timerEl.textContent = `Expires in ${m}:${String(s).padStart(2,'0')}`;
    if (secs <= 0) {
      clearInterval(qrTimer);
      timerEl.textContent = 'Token expired';
      document.getElementById('qr-container').classList.remove('show');
      document.getElementById('qr-placeholder').style.display = '';
    }
  }, 1000);
  apiFetch('/activity', { method:'POST', body: JSON.stringify({ actor:'Patient', action:'Generated QR access token', color:'#00f5ff' }) }).catch(()=>{});
  showToast('QR token generated — valid 15 min', 'success');
  if (qrInterval) clearInterval(qrInterval);
  qrInterval = setInterval(() => { if (document.getElementById('qr-container')?.classList.contains('show')) drawQR(); }, 800);
}

function drawQR() {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), s=140, m=4, mod=21, cell=Math.floor((s-m*2)/mod);
  ctx.clearRect(0,0,s,s);
  const pat = Array.from({length:mod}, ()=>Array.from({length:mod}, ()=>Math.random()>.5));
  ctx.fillStyle='rgba(0,245,255,0.08)'; ctx.fillRect(0,0,s,s);
  for(let r=0;r<mod;r++) for(let c=0;c<mod;c++) if(pat[r][c]){ ctx.fillStyle=`rgba(0,245,255,${.7+Math.random()*.3})`; ctx.fillRect(m+c*cell,m+r*cell,cell-1,cell-1); }
  [[0,0],[0,mod-7],[mod-7,0]].forEach(([pr,pc])=>{
    ctx.fillStyle='rgba(0,245,255,0.9)'; ctx.fillRect(m+pc*cell,m+pr*cell,7*cell,7*cell);
    ctx.fillStyle='rgba(3,7,18,1)';      ctx.fillRect(m+pc*cell+cell,m+pr*cell+cell,5*cell,5*cell);
    ctx.fillStyle='rgba(0,245,255,0.9)'; ctx.fillRect(m+pc*cell+2*cell,m+pr*cell+2*cell,3*cell,3*cell);
  });
}
