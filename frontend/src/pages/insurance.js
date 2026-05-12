import { apiFetch } from '../api/client.js';
import { showToast } from '../components/toast.js';

let sseConn = null;

export function mountInsurance(container) {
  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">
      <div style="margin-bottom:20px">
        <div class="section-title">Insurance Portal</div>
        <h1 style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700">
          <span class="amber-text">MediShield</span> Insurers
        </h1>
        <p style="font-size:13px;color:var(--muted)">
          Claims &amp; Authorization · Policy: <span class="mono" style="color:#fbbf24">MS-GRP-4891-2024</span>
        </p>
      </div>

      <div class="grid2" style="margin-bottom:16px;gap:20px">
        <div class="glass glass-amber" style="padding:20px">
          <div class="card-title amber-text" style="margin-bottom:6px">Data Access Request</div>
          <p style="font-size:12px;color:var(--muted);margin-bottom:16px">Request patient record access for claim #CLM-2024-441</p>
          <div style="margin-bottom:16px;padding:14px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:10px">
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Requesting access for:</div>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar" style="background:rgba(0,245,255,.1);color:var(--neon)">PN</div>
              <div>
                <div style="font-size:14px;font-weight:500">Priya Nair</div>
                <div style="font-size:11px;color:var(--muted)">HC-2024-8821 · Cardiac Records</div>
              </div>
            </div>
          </div>
          <div id="ins-status-steps" class="ins-status"></div>
          <div id="ins-action-area" style="margin-top:16px">
            <button class="btn btn-amber" id="ins-btn" style="width:100%;justify-content:center" onclick="window._startInsFlow()">
              ⬡ Send Access Request
            </button>
          </div>
        </div>

        <div class="glass glow-border" style="padding:20px">
          <div class="card-title neon-text" style="margin-bottom:4px">Live Data Flow</div>
          <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Encrypted channel visualization</p>
          <svg id="flow-svg" viewBox="0 0 480 160" style="width:100%;height:160px">
            <defs>
              <marker id="fa"  viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="rgba(0,245,255,0.7)"   stroke-width="1.5" stroke-linecap="round"/></marker>
              <marker id="fa2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="rgba(245,158,11,0.7)" stroke-width="1.5" stroke-linecap="round"/></marker>
            </defs>
            <rect x="10"  y="55" width="100" height="50" rx="8" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" stroke-width="1"/>
            <text x="60"  y="77" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="Rajdhani,sans-serif" font-weight="700" letter-spacing="1">PATIENT</text>
            <text x="60"  y="94" text-anchor="middle" fill="rgba(167,139,250,0.6)" font-size="9" font-family="JetBrains Mono,monospace">HC-2024-8821</text>
            <rect x="190" y="55" width="100" height="50" rx="8" fill="rgba(0,245,255,0.08)"   stroke="rgba(0,245,255,0.3)"   stroke-width="1"/>
            <text x="240" y="77" text-anchor="middle" fill="#00f5ff" font-size="10" font-family="Rajdhani,sans-serif" font-weight="700" letter-spacing="1">CHAIN NODE</text>
            <text x="240" y="94" text-anchor="middle" fill="rgba(0,245,255,0.5)"  font-size="9" font-family="JetBrains Mono,monospace">Encrypted</text>
            <rect x="370" y="55" width="100" height="50" rx="8" fill="rgba(245,158,11,0.1)"  stroke="rgba(245,158,11,0.35)" stroke-width="1"/>
            <text x="420" y="77" text-anchor="middle" fill="#fbbf24" font-size="10" font-family="Rajdhani,sans-serif" font-weight="700" letter-spacing="1">INSURER</text>
            <text x="420" y="94" text-anchor="middle" fill="rgba(251,191,36,0.5)" font-size="9" font-family="JetBrains Mono,monospace">MediShield</text>
            <line x1="110" y1="80" x2="188" y2="80" stroke="rgba(0,245,255,0.3)"   stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#fa)"  class="flow-path"/>
            <line x1="290" y1="80" x2="368" y2="80" stroke="rgba(245,158,11,0.3)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#fa2)" class="flow-path"/>
            <text x="240" y="140" text-anchor="middle" fill="rgba(0,245,255,0.4)"   font-size="10" font-family="JetBrains Mono,monospace">AES-256 · ZK-Proof · IPFS</text>
            <text x="60"  y="140" text-anchor="middle" fill="rgba(167,139,250,0.4)" font-size="9"  font-family="JetBrains Mono,monospace">owns keys</text>
            <text x="420" y="140" text-anchor="middle" fill="rgba(251,191,36,0.4)" font-size="9"  font-family="JetBrains Mono,monospace">read-only</text>
          </svg>
        </div>
      </div>

      <div id="accessed-records" style="display:none">
        <div class="glass glass-green" style="padding:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div class="card-title green-text">✓ Access Granted — Viewing Records</div>
            <div class="badge badge-success"><div class="badge-dot"></div> AUTHORIZED</div>
          </div>
          <div id="accessed-records-list"></div>
        </div>
      </div>
    </div>`;

  renderInsSteps(-1, []);
  window._startInsFlow = startInsFlow;
}

export function unmountInsurance() {
  if (sseConn) { sseConn.close(); sseConn = null; }
}

function renderInsSteps(active, done) {
  const steps = [
    { label:'Access Request Sent',    sub:'Encrypted via AES-256 channel',   icon:'⬡' },
    { label:'Blockchain Verification',sub:'Smart contract validating policy', icon:'◈' },
    { label:'Patient Notified',       sub:'Priya Nair reviewing request',     icon:'◎' },
    { label:'Patient Approved',       sub:'Access granted for 24 hours',      icon:'✓' },
    { label:'Records Decrypted',      sub:'Authorized read access active',    icon:'⬢' },
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

async function startInsFlow() {
  const btn = document.getElementById('ins-btn');
  if (!btn || btn.disabled) return;
  btn.textContent = 'Processing…'; btn.disabled = true;

  try {
    const { requestId } = await apiFetch('/insurance/request', { method:'POST', body:'{}' });
    const token = localStorage.getItem('hc_token');
    if (sseConn) sseConn.close();
    sseConn = new EventSource(`/api/insurance/steps/${requestId}?token=${token}`);

    sseConn.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.complete) {
        sseConn.close(); sseConn = null;
        renderInsSteps(-1, [0,1,2,3,4]);
        showAccessedRecords();
        showToast('Access granted!', 'success');
      } else {
        renderInsSteps(data.step, data.done);
      }
    };
    sseConn.onerror = () => { sseConn?.close(); showToast('Connection error', 'error'); };
  } catch(e) {
    showToast(e.message, 'error');
    btn.textContent = '⬡ Send Access Request'; btn.disabled = false;
  }
}

async function showAccessedRecords() {
  document.getElementById('accessed-records').style.display = 'block';
  document.getElementById('ins-action-area').innerHTML =
    `<div class="badge badge-success" style="justify-content:center;width:100%;padding:10px;font-size:12px;border-radius:8px">
      <div class="badge-dot"></div> ACCESS ACTIVE · Expires in 24:00:00
    </div>`;
  try {
    const records = await apiFetch('/records');
    const list = document.getElementById('accessed-records-list');
    list.innerHTML = records.slice(0,3).map((r,i) => `
      <div id="rec-row-${i}" class="record-row" style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:8px;border-radius:8px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2)">
        <span style="font-size:16px">${r.icon}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${r.type}</div>
          <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">${r.recordId} · ${r.date}</div>
        </div>
        <div class="badge badge-success">authorized</div>
      </div>`).join('');
    [0,1,2].forEach(i => setTimeout(() => {
      document.getElementById(`rec-row-${i}`)?.classList.add('revealed');
    }, i*250+200));
  } catch(e) {}
}
