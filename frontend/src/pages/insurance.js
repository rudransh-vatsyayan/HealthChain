import { apiFetch, apiSSE } from '../api/client.js';
import { showToast }        from '../components/toast.js';

let sseConn = null;
let selectedPatientId = null;

export function mountInsurance(container) {
  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">
      <div style="margin-bottom:20px">
        <div class="section-title">Insurance Hub</div>
        <h1 style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700">
          <span class="amber-text" id="ins-name">MediShield</span> Analytics
        </h1>
        <p style="font-size:13px;color:var(--muted)">
          Federated Insights Only · No Raw Records Access ·
          <span class="mono" style="color:#fbbf24" id="ins-policy">Secure Session Active</span>
        </p>
      </div>

      <!-- Population stats row -->
      <div class="grid4" style="margin-bottom:16px" id="pop-stats">
        ${['','','',''].map(()=>`<div class="glass stat-card"><div class="skeleton" style="height:60px"></div></div>`).join('')}
      </div>

      <!-- Main grid: Access flow + Data flow diagram -->
      <div class="grid2" style="margin-bottom:16px;gap:20px">

        <!-- Access Request Panel -->
        <div class="glass glass-amber" style="padding:20px">
          <div class="card-title amber-text" style="margin-bottom:6px">Patient Data Access Request</div>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">
            Select a patient ID to request federated insights (no raw data transmitted)
          </p>

          <!-- Patient selector -->
          <div style="margin-bottom:14px">
            <label style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;display:block;margin-bottom:6px">SELECT PATIENT (ANONYMIZED)</label>
            <select id="ins-patient-select" class="form-input" style="width:100%">
              <option value="">— Loading patients… —</option>
            </select>
          </div>

          <!-- Mode toggle -->
          <div style="display:flex;gap:8px;margin-bottom:14px">
            <button class="btn btn-amber" id="btn-pop-mode"  style="flex:1;justify-content:center;font-size:12px" onclick="window._insMode('population')">◎ Population</button>
            <button class="btn" id="btn-pat-mode" style="flex:1;justify-content:center;font-size:12px;color:var(--muted);border:1px solid var(--border)" onclick="window._insMode('patient')">⬡ Patient Specific</button>
          </div>

          <div id="ins-status-steps" class="ins-status"></div>

          <div id="ins-action-area" style="margin-top:16px">
            <button class="btn btn-amber" id="ins-btn" style="width:100%;justify-content:center" onclick="window._startInsFlow()">
              ⬡ Send Access Request
            </button>
          </div>
        </div>

        <!-- Data flow SVG -->
        <div class="glass glow-border" style="padding:20px">
          <div class="card-title neon-text" style="margin-bottom:4px">Secure Data Flow</div>
          <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Federated channel — no raw data leaves hospital nodes</p>
          <svg id="flow-svg" viewBox="0 0 480 160" style="width:100%;height:160px">
            <defs>
              <marker id="fa"  viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="rgba(0,245,255,0.7)"   stroke-width="1.5" stroke-linecap="round"/></marker>
              <marker id="fa2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="rgba(245,158,11,0.7)" stroke-width="1.5" stroke-linecap="round"/></marker>
            </defs>
            <rect x="10"  y="55" width="100" height="50" rx="8" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" stroke-width="1"/>
            <text x="60"  y="77" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="Rajdhani,sans-serif" font-weight="700" letter-spacing="1">HOSPITAL</text>
            <text x="60"  y="94" text-anchor="middle" fill="rgba(167,139,250,0.6)" font-size="9" font-family="JetBrains Mono,monospace">LOCAL DATA</text>
            <rect x="190" y="55" width="100" height="50" rx="8" fill="rgba(0,245,255,0.08)" stroke="rgba(0,245,255,0.3)" stroke-width="1"/>
            <text x="240" y="77" text-anchor="middle" fill="#00f5ff" font-size="10" font-family="Rajdhani,sans-serif" font-weight="700" letter-spacing="1">FED NODE</text>
            <text x="240" y="94" text-anchor="middle" fill="rgba(0,245,255,0.5)" font-size="9" font-family="JetBrains Mono,monospace">INSIGHTS</text>
            <rect x="370" y="55" width="100" height="50" rx="8" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.35)" stroke-width="1"/>
            <text x="420" y="77" text-anchor="middle" fill="#fbbf24" font-size="10" font-family="Rajdhani,sans-serif" font-weight="700" letter-spacing="1">INSURER</text>
            <text x="420" y="94" text-anchor="middle" fill="rgba(251,191,36,0.5)" font-size="9" font-family="JetBrains Mono,monospace">READ-ONLY</text>
            <line x1="110" y1="80" x2="188" y2="80" stroke="rgba(0,245,255,0.3)"   stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#fa)"  class="flow-path"/>
            <line x1="290" y1="80" x2="368" y2="80" stroke="rgba(245,158,11,0.3)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#fa2)" class="flow-path"/>
            <text x="240" y="140" text-anchor="middle" fill="rgba(0,245,255,0.4)"   font-size="10" font-family="JetBrains Mono,monospace">AES-256 · ZK-Proof · Federated</text>
            <text x="60"  y="140" text-anchor="middle" fill="rgba(167,139,250,0.4)" font-size="9"  font-family="JetBrains Mono,monospace">private keys</text>
            <text x="420" y="140" text-anchor="middle" fill="rgba(251,191,36,0.4)" font-size="9"  font-family="JetBrains Mono,monospace">derived only</text>
          </svg>
          <!-- Audit log -->
          <div style="margin-top:12px">
            <div style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-bottom:6px;font-family:'JetBrains Mono',monospace">ACCESS AUDIT LOG</div>
            <div id="ins-audit-log" style="max-height:80px;overflow-y:auto"></div>
          </div>
        </div>
      </div>

      <!-- Insights panel (shown after access granted) -->
      <div id="insights-panel" style="display:none">
        <div class="glass glow-border" style="padding:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
            <div>
              <div class="card-title neon-text">Federated Insights Dashboard</div>
              <p style="font-size:12px;color:var(--muted);margin-top:4px">Derived metrics only — no raw patient data</p>
            </div>
            <div class="badge badge-success"><div class="badge-dot"></div>ACCESS AUTHORIZED</div>
          </div>
          <div id="insights-content"></div>
        </div>
      </div>
    </div>`;

  renderInsSteps(-1, []);
  window._startInsFlow = startInsFlow;
  window._insMode      = setInsMode;

  // Load population insights + patient list
  loadPopulationInsights();
  loadAnonymizedPatients();
  loadAuditLog();

  // Set user name
  try {
    const u = JSON.parse(localStorage.getItem('hc_user') || '{}');
    const el = document.getElementById('ins-name');
    if (el && u.name) el.textContent = u.name;
  } catch(_) {}
}

export function unmountInsurance() {
  if (sseConn) { sseConn.close(); sseConn = null; }
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
let insMode = 'population';
function setInsMode(mode) {
  insMode = mode;
  const btnPop = document.getElementById('btn-pop-mode');
  const btnPat = document.getElementById('btn-pat-mode');
  if (btnPop) btnPop.className = mode === 'population' ? 'btn btn-amber' : 'btn';
  if (btnPat) btnPat.className = mode === 'patient'    ? 'btn btn-amber' : 'btn';
  if (btnPop && mode !== 'population') btnPop.style.cssText = 'flex:1;justify-content:center;font-size:12px;color:var(--muted);border:1px solid var(--border)';
  if (btnPat && mode !== 'patient')    btnPat.style.cssText = 'flex:1;justify-content:center;font-size:12px;color:var(--muted);border:1px solid var(--border)';
  const sel = document.getElementById('ins-patient-select');
  if (sel) sel.style.display = mode === 'patient' ? 'block' : 'none';
}

// ── Load anonymized patient list ──────────────────────────────────────────────
async function loadAnonymizedPatients() {
  try {
    const patients = await apiFetch('/insurance/patients');
    const sel = document.getElementById('ins-patient-select');
    if (!sel) return;
    sel.innerHTML = `<option value="">— Select Patient ID —</option>` +
      patients.map(p => `<option value="${p.patientDisplayId}">${p.patientDisplayId} · ${p.ageGroup} · ${p.riskBand} risk · ${p.coverageTier}</option>`).join('');
    sel.style.display = 'none'; // hidden until patient mode
    sel.addEventListener('change', () => { selectedPatientId = sel.value || null; });
  } catch(_) {}
}

// ── Population insights ───────────────────────────────────────────────────────
async function loadPopulationInsights() {
  try {
    const data = await apiFetch('/insurance/insights?mode=population');
    const el   = document.getElementById('pop-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="glass stat-card glass-amber">
        <div class="section-title">Enrolled</div>
        <div class="stat-val amber-text">${data.totalEnrolled}</div>
        <div class="stat-label">Total members</div>
      </div>
      <div class="glass stat-card glass-green">
        <div class="section-title">Avg Eligibility</div>
        <div class="stat-val green-text">${data.avgEligibilityScore}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${data.avgEligibilityScore}%;background:linear-gradient(90deg,#10b981,#34d399)"></div></div>
      </div>
      <div class="glass stat-card">
        <div class="section-title">Claim Rate</div>
        <div class="stat-val neon-text">${data.claimRate}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${data.claimRate}%;background:linear-gradient(90deg,var(--neon),#0099cc)"></div></div>
      </div>
      <div class="glass stat-card glass-amber">
        <div class="section-title">Fraud Alerts</div>
        <div class="stat-val amber-text">${data.fraudAlerts}</div>
        <div class="stat-label">Requires review</div>
      </div>`;
  } catch(_) {}
}

// ── Audit log ─────────────────────────────────────────────────────────────────
async function loadAuditLog() {
  try {
    const logs = await apiFetch('/activity');
    const el   = document.getElementById('ins-audit-log');
    if (!el) return;
    el.innerHTML = logs.slice(0, 5).map(a => {
      const diff = Date.now() - new Date(a.createdAt).getTime();
      const ago  = diff < 3600000 ? `${Math.round(diff/60000)}m ago` : `${Math.round(diff/3600000)}h ago`;
      return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;color:var(--muted);border-bottom:1px solid rgba(255,255,255,.04)">
        <span style="color:${a.color}">${a.actor}</span>
        <span>${a.action.slice(0, 40)}${a.action.length > 40 ? '…' : ''}</span>
        <span style="opacity:.5">${ago}</span>
      </div>`;
    }).join('');
  } catch(_) {}
}

// ── SSE step renderer ─────────────────────────────────────────────────────────
function renderInsSteps(active, done) {
  const steps = [
    { label:'Access Request Sent',    sub:'Encrypted via AES-256 channel',     icon:'⬡' },
    { label:'Blockchain Verification',sub:'Smart contract validating policy',   icon:'◈' },
    { label:'Patient Notified',       sub:'Consent request dispatched',         icon:'◎' },
    { label:'Patient Approved',       sub:'Access granted for 24 hours',        icon:'✓' },
    { label:'Insights Generated',     sub:'Federated model processed request',  icon:'⬢' },
  ];
  const el = document.getElementById('ins-status-steps');
  if (!el) return;
  el.innerHTML = steps.map((s, i) => `
    <div class="ins-step ${done.includes(i)?'done':i===active?'active':''}">
      <div class="ins-step-icon">${done.includes(i)?'✓':s.icon}</div>
      <div>
        <div style="font-size:13px;font-weight:500">${s.label}</div>
        <div style="font-size:11px;color:var(--muted)">${s.sub}</div>
      </div>
      ${done.includes(i)
        ? `<div class="badge badge-success" style="margin-left:auto">done</div>`
        : i===active
          ? `<div class="badge badge-info" style="margin-left:auto">active</div>`
          : ''}
    </div>`).join('');
}

// ── Start access flow ─────────────────────────────────────────────────────────
async function startInsFlow() {
  const btn = document.getElementById('ins-btn');
  if (!btn || btn.disabled) return;

  const patDisplayId = insMode === 'patient' ? selectedPatientId : null;
  if (insMode === 'patient' && !patDisplayId) return showToast('Select a patient ID first', 'error');

  btn.textContent = 'Processing…'; btn.disabled = true;

  try {
    const { requestId } = await apiFetch('/insurance/request', {
      method: 'POST',
      body: JSON.stringify({ patientDisplayId: patDisplayId }),
    });
    if (sseConn) sseConn.close();
    sseConn = apiSSE(`/insurance/steps/${requestId}`);

    sseConn.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      if (data.complete) {
        sseConn.close(); sseConn = null;
        renderInsSteps(-1, [0,1,2,3,4]);
        showToast('Access granted — viewing derived insights', 'success');
        await showInsights(patDisplayId);
        loadAuditLog();
      } else {
        renderInsSteps(data.step, data.done);
      }
    };
    sseConn.onerror = () => { sseConn?.close(); showToast('Connection error', 'error'); btn.textContent = '⬡ Send Access Request'; btn.disabled = false; };
  } catch(e) {
    showToast(e.message, 'error');
    btn.textContent = '⬡ Send Access Request'; btn.disabled = false;
  }
}

// ── Show derived insights (NEVER raw records) ─────────────────────────────────
async function showInsights(patDisplayId) {
  const panel = document.getElementById('insights-panel');
  const cont  = document.getElementById('insights-content');
  const area  = document.getElementById('ins-action-area');
  if (panel) panel.style.display = 'block';
  if (area) area.innerHTML = `<div class="badge badge-success" style="width:100%;justify-content:center;padding:10px;border-radius:8px"><div class="badge-dot"></div>ACCESS ACTIVE · Expires 24:00:00</div>`;

  try {
    const url = patDisplayId
      ? `/insurance/insights?mode=patient&patientDisplayId=${encodeURIComponent(patDisplayId)}`
      : `/insurance/insights?mode=population`;
    const data = await apiFetch(url);

    if (data.type === 'population') {
      renderPopulationInsights(cont, data);
    } else {
      renderPatientInsights(cont, data);
    }
  } catch(e) {
    if (cont) cont.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:20px">Could not load insights: ${e.message}</div>`;
  }
}

function renderPatientInsights(el, d) {
  const riskColor = d.riskProfile === 'high' ? '#f87171' : d.riskProfile === 'medium' ? '#fbbf24' : '#34d399';
  el.innerHTML = `
    <div class="grid4" style="margin-bottom:16px">
      <div class="glass stat-card glow-border">
        <div class="section-title">Eligibility Score</div>
        <div class="stat-val neon-text">${d.eligibilityScore}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${d.eligibilityScore}%;background:linear-gradient(90deg,var(--neon),#0099cc)"></div></div>
      </div>
      <div class="glass stat-card" style="border-color:${riskColor}30">
        <div class="section-title">Risk Profile</div>
        <div class="stat-val" style="color:${riskColor};text-transform:uppercase">${d.riskProfile}</div>
        <div class="stat-label">Federated assessment</div>
      </div>
      <div class="glass stat-card glass-amber">
        <div class="section-title">Claim Likelihood</div>
        <div class="stat-val amber-text">${d.claimLikelihood}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${d.claimLikelihood}%;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div></div>
      </div>
      <div class="glass stat-card glass-green">
        <div class="section-title">Fed Confidence</div>
        <div class="stat-val green-text">${d.federatedConfidence}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${d.federatedConfidence}%;background:linear-gradient(90deg,#10b981,#34d399)"></div></div>
      </div>
    </div>
    <div class="grid2" style="gap:14px">
      <div class="glass" style="padding:16px">
        <div style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:10px">ANONYMIZED INDICATORS</div>
        ${Object.entries(d.anonymizedMetrics || {}).map(([k,v]) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px">
            <span style="color:var(--muted)">${k.replace(/([A-Z])/g,' $1').trim()}</span>
            <span style="color:var(--text)">${v}</span>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px">
          <span style="color:var(--muted)">Data Points</span>
          <span style="color:var(--neon)">${d.dataPoints}</span>
        </div>
      </div>
      <div class="glass" style="padding:16px">
        <div style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:10px">RISK SIGNALS</div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px">
          <span style="color:var(--muted)">Anomaly Score</span>
          <span style="color:${d.anomalyScore > 50 ? '#f87171' : '#34d399'}">${d.anomalyScore} / 100</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px">
          <span style="color:var(--muted)">Fraud Indicator</span>
          <span style="color:${d.fraudIndicator ? '#f87171' : '#34d399'}">${d.fraudIndicator ? '⚠ FLAGGED' : '✓ CLEAR'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px">
          <span style="color:var(--muted)">Patient ID</span>
          <span style="color:var(--neon);font-family:'JetBrains Mono',monospace">${d.patientDisplayId}</span>
        </div>
        <div style="margin-top:12px;padding:10px;background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.1);border-radius:8px;font-size:10px;color:var(--muted)">
          🔒 Raw records, prescriptions and patient names are NOT accessible to insurers.
          All insights are federated-derived metrics only.
        </div>
      </div>
    </div>`;
}

function renderPopulationInsights(el, d) {
  el.innerHTML = `
    <div class="grid4" style="margin-bottom:16px">
      <div class="glass stat-card glow-border"><div class="section-title">Total Enrolled</div><div class="stat-val neon-text">${d.totalEnrolled}</div></div>
      <div class="glass stat-card glass-green"><div class="section-title">Avg Eligibility</div><div class="stat-val green-text">${d.avgEligibilityScore}%</div></div>
      <div class="glass stat-card glass-amber"><div class="section-title">Claim Rate</div><div class="stat-val amber-text">${d.claimRate}%</div></div>
      <div class="glass stat-card"><div class="section-title">Fraud Alerts</div><div class="stat-val" style="color:#f87171">${d.fraudAlerts}</div></div>
    </div>
    <div class="grid3">
      <div class="glass glass-green" style="padding:16px">
        <div class="section-title">Low Risk</div>
        <div class="stat-val green-text">${d.lowRiskCount}</div>
        <div class="stat-label">members</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(d.lowRiskCount/d.totalEnrolled*100)||0}%;background:linear-gradient(90deg,#10b981,#34d399)"></div></div>
      </div>
      <div class="glass glass-amber" style="padding:16px">
        <div class="section-title">Medium Risk</div>
        <div class="stat-val amber-text">${d.mediumRiskCount}</div>
        <div class="stat-label">members</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(d.mediumRiskCount/d.totalEnrolled*100)||0}%;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div></div>
      </div>
      <div class="glass" style="padding:16px;border-color:rgba(239,68,68,.2)">
        <div class="section-title">High Risk</div>
        <div class="stat-val" style="color:#f87171">${d.highRiskCount}</div>
        <div class="stat-label">members</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(d.highRiskCount/d.totalEnrolled*100)||0}%;background:linear-gradient(90deg,#ef4444,#f87171)"></div></div>
      </div>
    </div>
    <div style="margin-top:12px;padding:12px;background:rgba(0,245,255,.04);border:1px solid rgba(0,245,255,.1);border-radius:8px;font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace">
      🔒 All metrics are federated aggregates. No individual patient data is exposed.
      Federated confidence: ${d.federatedConfidence}% · Records processed: ${d.totalRecordsProcessed}
    </div>`;
}
