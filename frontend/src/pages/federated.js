import { apiFetch, apiSSE } from '../api/client.js';
import { showToast }        from '../components/toast.js';

let fedRunning = false;
let sseConn    = null;
let hospitals  = [];
let animPoints = [];

const AGGREGATOR = { x: 0.45, y: 0.47 };

export function mountFederated(container) {
  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">
      <div style="margin-bottom:20px">
        <div class="section-title">Federated Learning Network</div>
        <h1 style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700">
          <span class="green-text">Privacy-Preserving AI</span>
        </h1>
        <p style="font-size:13px;color:var(--muted)">
          Data stays local · Only encrypted gradients travel · No patient data leaves hospital premises
        </p>
      </div>

      <!-- Network canvas -->
      <div class="glass glass-green glow-border" style="padding:20px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title green-text">Live Network Visualization</div>
          <div style="display:flex;gap:10px;align-items:center">
            <button class="btn btn-green" id="fed-btn" onclick="window._toggleFed()">▶ Start Training Round</button>
            <div class="badge badge-info" id="fed-round">Round 0 / 5</div>
            <div class="badge" id="fed-status-badge" style="color:var(--muted);border-color:var(--border)">IDLE</div>
          </div>
        </div>
        <canvas id="fed-canvas" height="280" style="width:100%"></canvas>
        <div style="display:flex;gap:24px;margin-top:14px;justify-content:center;flex-wrap:wrap" id="fed-legend"></div>
      </div>

      <!-- Stats row -->
      <div class="grid3" style="margin-bottom:16px">
        <div class="glass glass-green" style="padding:18px">
          <div class="section-title">Model Accuracy</div>
          <div class="stat-val green-text" id="fed-accuracy">—</div>
          <div class="progress-bar"><div class="progress-fill" id="acc-bar" style="width:0%;background:linear-gradient(90deg,#10b981,#34d399)"></div></div>
          <p style="font-size:11px;color:var(--muted);margin-top:6px">Cardiac disease detection model</p>
        </div>
        <div class="glass glow-border" style="padding:18px">
          <div class="section-title">Data Privacy</div>
          <div class="stat-val neon-text">100%</div>
          <div class="progress-bar"><div class="progress-fill" style="width:100%;background:linear-gradient(90deg,var(--neon),#0099cc)"></div></div>
          <p style="font-size:11px;color:var(--muted);margin-top:6px">Zero raw records shared</p>
        </div>
        <div class="glass glass-amber" style="padding:18px">
          <div class="section-title">Active Nodes</div>
          <div class="stat-val amber-text" id="fed-nodes">—</div>
          <div class="progress-bar"><div class="progress-fill" style="width:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div></div>
          <p style="font-size:11px;color:var(--muted);margin-top:6px">Hospital nodes online</p>
        </div>
      </div>

      <!-- Node activity + training log -->
      <div class="grid2">
        <div class="glass" style="padding:18px">
          <div class="card-title neon-text" style="margin-bottom:14px">Node Status</div>
          <div id="node-status-list"></div>
        </div>
        <div class="glass glass-green" style="padding:18px">
          <div class="card-title green-text" style="margin-bottom:14px">Training Log</div>
          <div id="training-log" style="max-height:200px;overflow-y:auto"></div>
        </div>
      </div>
    </div>`;

  window._toggleFed = toggleFederated;
  loadFederatedStatus();
}

export function unmountFederated() {
  fedRunning = false;
  if (sseConn) { sseConn.close(); sseConn = null; }
}

async function loadFederatedStatus() {
  try {
    const data = await apiFetch('/federated/status');
    hospitals = data.nodes;

    const acc = data.accuracy.toFixed(1);
    document.getElementById('fed-accuracy').textContent = `${acc}%`;
    document.getElementById('acc-bar').style.width       = `${data.accuracy}%`;
    document.getElementById('fed-round').textContent     = `Round ${data.round} / ${data.maxRounds}`;
    document.getElementById('fed-nodes').textContent     = data.nodeCount;

    initCanvas([]);
    renderNodeStatus(hospitals, {});
    appendTrainingLog(`Status loaded — Round ${data.round}, Accuracy ${acc}%`, '#00f5ff');
  } catch(e) { showToast('Could not load federated status', 'error'); }
}

function renderNodeStatus(nodes, progressMap) {
  const el = document.getElementById('node-status-list');
  if (!el) return;
  el.innerHTML = nodes.map(h => {
    const prog = progressMap[h.name] || 0;
    const pct  = Math.round(prog * 100);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="width:8px;height:8px;border-radius:50%;background:${h.color};${prog > 0 ? `box-shadow:0 0 8px ${h.color}` : ''}"></div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500">${h.name}</div>
          <div class="progress-bar" style="margin-top:4px">
            <div class="progress-fill" style="width:${pct}%;background:${h.color};transition:width .3s ease"></div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;min-width:60px;text-align:right">
          ${h.pts?.toLocaleString() || '—'} rec
        </div>
        <div class="badge" style="font-size:9px;color:${h.color};border-color:${h.color}40;background:${h.color}12">
          ${pct > 0 ? `${pct}%` : 'IDLE'}
        </div>
      </div>`;
  }).join('');
}

function appendTrainingLog(msg, color = '#00f5ff') {
  const el  = document.getElementById('training-log');
  if (!el)   return;
  const now  = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const item = document.createElement('div');
  item.style.cssText = `font-size:11px;color:var(--muted);padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-family:'JetBrains Mono',monospace`;
  item.innerHTML = `<span style="color:${color}">[${now}]</span> ${msg}`;
  el.insertBefore(item, el.firstChild);
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function initCanvas(pts) {
  const canvas = document.getElementById('fed-canvas');
  if (!canvas) return;
  const W = canvas.offsetWidth || 900;
  canvas.width = W;
  canvas.height = 280;
  drawStatic(canvas, pts);

  const legend = document.getElementById('fed-legend');
  if (legend && hospitals.length) {
    legend.innerHTML = hospitals.map(h => `
      <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace">
        <div style="width:8px;height:8px;border-radius:50%;background:${h.color}"></div>
        ${h.name} <span style="opacity:.5">${h.pts?.toLocaleString()} records</span>
      </div>`).join('');
  }
  window.addEventListener('resize', () => {
    if (document.getElementById('fed-canvas')) initCanvas(animPoints);
  });
}

function drawStatic(canvas, pts) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const ag = { x: AGGREGATOR.x * W, y: AGGREGATOR.y * H };

  hospitals.forEach(h => {
    const hc = { x: h.x * W, y: h.y * H };
    ctx.beginPath(); ctx.moveTo(hc.x, hc.y); ctx.lineTo(ag.x, ag.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
  });

  if (pts?.length) pts.forEach(pt => {
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 8);
    g.addColorStop(0, pt.color); g.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  });

  hospitals.forEach(h => {
    const hc = { x: h.x * W, y: h.y * H };
    ctx.beginPath(); ctx.arc(hc.x, hc.y, 28, 0, Math.PI * 2); ctx.fillStyle = h.color + '18'; ctx.fill();
    ctx.beginPath(); ctx.arc(hc.x, hc.y, 20, 0, Math.PI * 2); ctx.fillStyle = 'rgba(13,17,23,.9)'; ctx.fill();
    ctx.beginPath(); ctx.arc(hc.x, hc.y, 20, 0, Math.PI * 2); ctx.strokeStyle = h.color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = h.color; ctx.font = 'bold 9px Rajdhani,sans-serif'; ctx.textAlign = 'center';
    const words = h.name.split(' ');
    ctx.fillText(words[0], hc.x, hc.y + (words.length > 1 ? 1 : 4));
    if (words[1]) ctx.fillText(words[1], hc.x, hc.y + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '8px JetBrains Mono,monospace';
    ctx.fillText('LOCAL', hc.x, hc.y + 34);
  });

  ctx.beginPath(); ctx.arc(ag.x, ag.y, 26, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,245,255,0.08)'; ctx.fill();
  ctx.beginPath(); ctx.arc(ag.x, ag.y, 22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(13,17,23,.9)'; ctx.fill();
  ctx.beginPath(); ctx.arc(ag.x, ag.y, 22, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,245,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(0,245,255,1)'; ctx.font = 'bold 9px Rajdhani,sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('GLOBAL', ag.x, ag.y - 2); ctx.fillText('MODEL', ag.x, ag.y + 10);
}

// ── Training toggle ───────────────────────────────────────────────────────────
async function toggleFederated() {
  if (fedRunning) {
    fedRunning = false;
    if (sseConn) { sseConn.close(); sseConn = null; }
    document.getElementById('fed-btn').textContent = '▶ Start Training Round';
    document.getElementById('fed-status-badge').textContent = 'STOPPED';
    return;
  }
  try {
    const { roundId, round } = await apiFetch('/federated/start', { method: 'POST', body: '{}' });
    fedRunning = true;
    document.getElementById('fed-btn').textContent = '⏹ Stop Training';
    document.getElementById('fed-round').textContent = `Round ${round} / 5`;
    document.getElementById('fed-status-badge').textContent = 'TRAINING';
    document.getElementById('fed-status-badge').style.cssText = 'color:#34d399;border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.08)';
    showToast(`Training round ${round} started`, 'info');
    appendTrainingLog(`Round ${round} initiated — aggregating from ${hospitals.length} nodes`, '#34d399');

    sseConn = apiSSE(`/federated/stream/${roundId}`);
    sseConn.onmessage = (e) => {
      const { progress, nodes, done } = JSON.parse(e.data);
      const canvas = document.getElementById('fed-canvas');
      if (!canvas) return;
      const W = canvas.width, H = canvas.height, ag = { x: AGGREGATOR.x * W, y: AGGREGATOR.y * H };
      animPoints = (nodes || hospitals).map(h => ({
        x: h.x * W + (ag.x - h.x * W) * progress,
        y: h.y * H + (ag.y - h.y * H) * progress,
        color: h.color,
      }));
      drawStatic(canvas, animPoints);

      // Update node status
      const progressMap = {};
      (nodes || hospitals).forEach(h => { progressMap[h.name] = h.progress || progress; });
      renderNodeStatus(hospitals, progressMap);

      if (done) {
        sseConn.close(); sseConn = null; fedRunning = false;
        document.getElementById('fed-btn').textContent = '▶ Start Training Round';
        document.getElementById('fed-status-badge').textContent = 'COMPLETE';
        loadFederatedStatus();
        appendTrainingLog(`Round ${round} complete — model updated`, '#34d399');
        showToast('Training round complete!', 'success');
      }
    };
    sseConn.onerror = () => {
      sseConn?.close(); fedRunning = false;
      document.getElementById('fed-btn').textContent = '▶ Start Training Round';
    };
  } catch(e) { showToast(e.message, 'error'); }
}
