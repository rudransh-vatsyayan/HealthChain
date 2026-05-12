import { apiFetch } from '../api/client.js';
import { showToast } from '../components/toast.js';

let uploadInterval = null;

export function mountDoctor(container) {
  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">
      <div style="margin-bottom:20px">
        <div class="section-title">Doctor Portal</div>
        <h1 style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700">
          Dr. <span class="purple-text" id="doc-name">Loading…</span>
        </h1>
        <p style="font-size:13px;color:var(--muted)" id="doc-meta">—</p>
      </div>

      <div class="grid3" style="margin-bottom:16px">
        <div class="glass stat-card glass-purple">
          <div class="section-title">Patients Today</div>
          <div class="stat-val purple-text" id="doc-pt-count">—</div>
        </div>
        <div class="glass stat-card glass-green">
          <div class="section-title">Reports Uploaded</div>
          <div class="stat-val green-text" id="report-count">—</div>
        </div>
        <div class="glass stat-card glass-amber">
          <div class="section-title">Pending Reviews</div>
          <div class="stat-val amber-text">2</div>
        </div>
      </div>

      <div class="grid2" style="margin-bottom:16px">
        <div class="glass glow-purple" style="padding:20px">
          <div class="card-title purple-text" style="margin-bottom:14px">Patient Queue</div>
          <div id="doctor-patients"><div class="loader"><div class="spinner"></div></div></div>
        </div>
        <div class="glass glow-border" style="padding:20px" id="patient-detail-panel">
          <div class="section-title">Selected Patient</div>
          <div id="patient-detail-content">
            <div style="text-align:center;padding:40px;color:var(--muted)">
              <div style="font-size:32px;margin-bottom:8px">◯</div>
              <p style="font-size:13px">Select a patient to view details</p>
            </div>
          </div>
        </div>
      </div>

      <div class="glass glass-purple" style="padding:20px">
        <div class="card-title purple-text" style="margin-bottom:14px">Upload Clinical Report</div>
        <div class="grid2" style="gap:16px">
          <div>
            <div class="upload-zone" id="upload-zone" onclick="window._simulateUpload()">
              <div style="font-size:28px;margin-bottom:8px">⬆</div>
              <p style="font-size:13px;color:var(--muted)" id="upload-text">Drop files or click to upload</p>
              <p style="font-size:11px;color:var(--muted);margin-top:6px">PDF, DICOM, JPG — Max 50MB</p>
            </div>
            <div id="upload-progress" style="display:none;margin-top:12px">
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px">
                <span class="mono" style="color:var(--muted)" id="upload-filename"></span>
                <span class="mono green-text" id="upload-pct">0%</span>
              </div>
              <div class="progress-bar" style="height:4px">
                <div class="progress-fill" id="upload-bar" style="width:0%;background:linear-gradient(90deg,#7c3aed,var(--neon))"></div>
              </div>
            </div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Recent Uploads</div>
            <div id="upload-list"><div class="loader"><div class="spinner"></div></div></div>
          </div>
        </div>
      </div>
    </div>`;

  window._simulateUpload = simulateUpload;
  loadDoctorData();
}

export function unmountDoctor() {
  if (uploadInterval) { clearInterval(uploadInterval); uploadInterval = null; }
}

async function loadDoctorData() {
  try {
    // Doctor name from local user
    const user = JSON.parse(localStorage.getItem('hc_user') || '{}');
    const nameEl = document.getElementById('doc-name');
    if (nameEl) nameEl.textContent = user.name?.replace('Dr. ','') || user.name || '—';

    const [patients, uploads] = await Promise.all([
      apiFetch('/doctor/patients'),
      apiFetch('/doctor/uploads'),
    ]);

    const ptCountEl = document.getElementById('doc-pt-count');
    if (ptCountEl) ptCountEl.textContent = patients.length;

    const rcEl = document.getElementById('report-count');
    if (rcEl) rcEl.textContent = uploads.length;

    renderPatientQueue(patients);
    renderUploadList(uploads);
  } catch(e) { showToast('Could not load doctor data', 'error'); }
}

function renderPatientQueue(patients) {
  const el = document.getElementById('doctor-patients');
  if (!el) return;
  const urgency = ['normal','high','normal','high','low'];
  el.innerHTML = patients.map((p, i) => {
    const urg = urgency[i % urgency.length];
    return `
    <div class="patient-item" onclick="window._selectPatient(${i}, ${JSON.stringify(JSON.stringify({...p, urgency:urg}))})">
      <div class="avatar" style="background:${urg==='high'?'rgba(239,68,68,.12)':'rgba(124,58,237,.12)'};color:${urg==='high'?'#f87171':'#a78bfa'}">${p.avatar||p.name.slice(0,2)}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${p.name}</div>
        <div style="font-size:11px;color:var(--muted)">${p.age||'—'}y · ${p.patientId}</div>
      </div>
      <div class="badge ${urg==='high'?'badge-danger':urg==='low'?'badge-success':'badge-purple'}">${urg}</div>
    </div>`;
  }).join('');
  window._selectPatient = selectPatient;
}

function selectPatient(i, pJson) {
  const p = JSON.parse(pJson);
  document.querySelectorAll('.patient-item').forEach((el, j) => el.classList.toggle('selected', j === i));
  const urg = p.urgency || 'normal';
  const urgColor = urg==='high'?'#f87171':urg==='low'?'#34d399':'#a78bfa';
  document.getElementById('patient-detail-content').innerHTML = `
    <div style="animation:fadeUp .4s ease">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div class="avatar" style="width:48px;height:48px;font-size:18px;background:rgba(124,58,237,.15);color:#a78bfa">${p.avatar||p.name.slice(0,2)}</div>
        <div>
          <div style="font-size:16px;font-weight:600">${p.name}</div>
          <div style="font-size:12px;color:var(--muted)">${p.patientId} · Age ${p.age||'—'}</div>
        </div>
        <div class="badge" style="margin-left:auto;color:${urgColor};border-color:${urgColor}40;background:${urgColor}15">${urg.toUpperCase()}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        ${[['Blood Type',p.bloodType||'—'],['Insurance',p.insurance||'—'],['Health Score',p.healthScore||'—'],['Patient ID',p.patientId]].map(([l,v])=>`
          <div style="padding:10px 12px;background:rgba(0,245,255,.04);border:1px solid rgba(0,245,255,.1);border-radius:8px">
            <div style="font-size:10px;color:var(--muted)">${l}</div>
            <div style="font-size:12px;margin-top:2px">${v}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-purple" style="flex:1;justify-content:center;font-size:12px">View Records</button>
        <button class="btn btn-neon" style="flex:1;justify-content:center;font-size:12px" onclick="window._simulateUpload()">Upload Report</button>
      </div>
    </div>`;
}

function renderUploadList(uploads) {
  const el = document.getElementById('upload-list');
  if (!el) return;
  if (!uploads.length) { el.innerHTML = `<div style="color:var(--muted);font-size:12px">No uploads yet.</div>`; return; }
  el.innerHTML = uploads.map(u => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:6px;border-radius:8px;background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.15)">
      <div class="badge badge-purple" style="padding:2px 7px;font-size:10px">${u.fileType||u.type||'PDF'}</div>
      <div style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">${u.filename||u.type}</div>
      <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">${u.fileSize||'—'}</div>
    </div>`).join('');
}

function simulateUpload() {
  const zone = document.getElementById('upload-zone');
  const prog = document.getElementById('upload-progress');
  const bar  = document.getElementById('upload-bar');
  const pct  = document.getElementById('upload-pct');
  const fname= document.getElementById('upload-filename');
  const files= ['ECG_Report_New.pdf','LabResults_Apr23.pdf','Echocardiogram.dcm'];
  const fn   = files[Math.floor(Math.random()*files.length)];
  fname.textContent = fn; prog.style.display = 'block';
  let p = 0;
  if (uploadInterval) clearInterval(uploadInterval);
  uploadInterval = setInterval(async () => {
    p += Math.random()*15+3;
    if (p >= 100) {
      p = 100; clearInterval(uploadInterval);
      zone.classList.add('uploaded');
      document.getElementById('upload-text').textContent = '✓ Upload successful!';
      showToast(`${fn} uploaded`, 'success');
      try {
        const record = await apiFetch('/doctor/uploads', {
          method: 'POST',
          body: JSON.stringify({ filename: fn, fileSize: (Math.random()*10+1).toFixed(1)+' MB', fileType: fn.endsWith('.dcm')?'IMG':'PDF' }),
        });
        const rc = document.getElementById('report-count');
        if (rc) rc.textContent = parseInt(rc.textContent||0) + 1;
        const uploads = await apiFetch('/doctor/uploads');
        renderUploadList(uploads);
      } catch(e) {}
      setTimeout(() => {
        zone.classList.remove('uploaded');
        document.getElementById('upload-text').textContent = 'Drop files or click to upload';
        prog.style.display = 'none'; bar.style.width = '0%';
      }, 3000);
    }
    bar.style.width = p+'%'; pct.textContent = Math.floor(p)+'%';
  }, 120);
}
