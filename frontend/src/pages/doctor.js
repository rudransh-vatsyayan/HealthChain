import { apiFetch }                          from '../api/client.js';
import { showToast }                         from '../components/toast.js';
import { renderEncryptedId, initEncryptedIdHandlers } from '../components/encryptedId.js';

let uploadInterval = null;
let selectedPatient = null;
let patientMode = 'all'; // 'all' | 'assigned'

export function mountDoctor(container) {
  initEncryptedIdHandlers();

  container.innerHTML = `
    <div style="max-width:1140px;margin:0 auto">

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <div class="section-title">Doctor Portal</div>
          <h1 style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700">
            <span class="purple-text" id="doc-name">Loading…</span>
          </h1>
          <p style="font-size:13px;color:var(--muted)" id="doc-meta">—</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="badge badge-purple"><div class="badge-dot"></div>Secure Session</div>
          <div class="enc-privacy-badge">🔒 HE Mode</div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid3" style="margin-bottom:16px">
        <div class="glass stat-card glass-purple">
          <div class="section-title">Total Patients</div>
          <div class="stat-val purple-text" id="doc-pt-count">—</div>
          <div class="stat-label" id="doc-mode-label">All patients</div>
        </div>
        <div class="glass stat-card glass-green">
          <div class="section-title">Reports Uploaded</div>
          <div class="stat-val green-text" id="report-count">—</div>
          <div class="stat-label">This session</div>
        </div>
        <div class="glass stat-card glass-amber">
          <div class="section-title">High Risk Patients</div>
          <div class="stat-val amber-text" id="high-risk-count">—</div>
          <div class="stat-label">Require review</div>
        </div>
      </div>

      <!-- Patient list + detail -->
      <div class="grid2" style="margin-bottom:16px">

        <!-- Patient Queue -->
        <div class="glass glow-purple" style="padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div class="card-title purple-text">Patient Queue</div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-purple" id="btn-mode-all"      style="font-size:11px;padding:5px 12px" onclick="window._setPtMode('all')">All</button>
              <button class="btn" id="btn-mode-assigned" style="font-size:11px;padding:5px 12px;color:var(--muted);border:1px solid var(--border)" onclick="window._setPtMode('assigned')">Assigned</button>
            </div>
          </div>
          <div id="doctor-patients"><div class="loader"><div class="spinner"></div></div></div>
        </div>

        <!-- Patient Detail -->
        <div class="glass glow-border" style="padding:20px" id="patient-detail-panel">
          <div class="section-title">Selected Patient</div>
          <div id="patient-detail-content">
            <div style="text-align:center;padding:40px;color:var(--muted)">
              <div style="font-size:48px;margin-bottom:12px;opacity:.3">◯</div>
              <p style="font-size:13px">Select a patient to view their encrypted record</p>
              <p style="font-size:11px;margin-top:6px;font-family:'JetBrains Mono',monospace;opacity:.4">Homomorphic encryption layer active</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Update Patient Clinical Data -->
      <div class="glass glass-purple" style="padding:20px;margin-bottom:16px" id="update-panel" style="display:none">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="card-title purple-text">✏️ Update Clinical Record</div>
          <div class="badge badge-purple" id="update-patient-label">Select a patient first</div>
        </div>
        <div class="grid2" style="gap:14px;margin-bottom:14px">
          <div class="form-group">
            <label>Primary Diagnosis</label>
            <textarea id="upd-diagnosis" class="form-input" rows="3" placeholder="Enter diagnosis / clinical assessment…" style="resize:vertical"></textarea>
          </div>
          <div class="form-group">
            <label>Risk Annotations</label>
            <textarea id="upd-risk"      class="form-input" rows="3" placeholder="Risk notes, flags, recommendations…" style="resize:vertical"></textarea>
          </div>
        </div>
        <div class="grid2" style="gap:14px;margin-bottom:14px">
          <div class="form-group">
            <label>Condition Label</label>
            <input type="text" id="upd-condition" class="form-input" placeholder="e.g. Type 2 Diabetes, Hypertension…">
          </div>
          <div class="form-group">
            <label>Risk Score (0–100)</label>
            <input type="number" id="upd-riskScore" class="form-input" placeholder="0–100" min="0" max="100">
          </div>
        </div>

        <!-- Vitals update -->
        <div style="margin-bottom:14px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-family:'JetBrains Mono',monospace;letter-spacing:.5px">UPDATE VITALS</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
            <div class="form-group"><label>Heart Rate</label><input type="number" id="upd-hr" class="form-input" placeholder="72"></div>
            <div class="form-group"><label>SpO₂ (%)</label> <input type="number" id="upd-sp" class="form-input" placeholder="98"></div>
            <div class="form-group"><label>BP (mmHg)</label> <input type="number" id="upd-bp" class="form-input" placeholder="120"></div>
            <div class="form-group"><label>Glucose</label>   <input type="number" id="upd-gl" class="form-input" placeholder="95"></div>
          </div>
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn btn-purple" style="flex:1;justify-content:center" onclick="window._submitPatientUpdate()">
            ◈ Commit Clinical Update
          </button>
          <div id="transfer-indicator" style="display:none;align-items:center;gap:8px;font-size:11px;color:#a78bfa;font-family:'JetBrains Mono',monospace">
            <div class="data-packet-anim"></div>
            TRANSMITTING…
          </div>
        </div>
      </div>

      <!-- Upload + New Record -->
      <div class="grid2" style="gap:16px">
        <div class="glass glass-purple" style="padding:20px">
          <div class="card-title purple-text" style="margin-bottom:14px">⬆ Upload Clinical Report</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-family:'JetBrains Mono',monospace">
            Target: <span id="upload-patient-name" style="color:#a78bfa">No patient selected</span>
          </div>
          <div class="upload-zone" id="upload-zone" onclick="window._simulateUpload()">
            <div style="font-size:28px;margin-bottom:8px">⬡</div>
            <p style="font-size:13px;color:var(--muted)" id="upload-text">Drop files or click to upload</p>
          </div>
          <div id="upload-progress" style="display:none;margin-top:12px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px">
              <span class="mono" style="color:var(--muted)" id="upload-filename"></span>
              <span class="mono green-text" id="upload-pct">0%</span>
            </div>
            <div class="progress-bar" style="height:4px"><div class="progress-fill" id="upload-bar" style="width:0%;background:linear-gradient(90deg,#7c3aed,var(--neon))"></div></div>
          </div>
        </div>

        <div class="glass glass-purple" style="padding:20px">
          <div class="card-title purple-text" style="margin-bottom:14px">📝 New Clinical Record</div>
          <div class="grid2" style="gap:10px;margin-bottom:10px">
            <div class="form-group"><label>Record Type</label><input type="text" id="new-rec-type" class="form-input" placeholder="e.g. ECG Report"></div>
            <div class="form-group"><label>Icon (Emoji)</label><input type="text" id="new-rec-icon" class="form-input" placeholder="📄"></div>
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label>Notes / Assessment</label>
            <textarea id="new-rec-notes" class="form-input" rows="2" placeholder="Clinical findings…"></textarea>
          </div>
          <button class="btn btn-purple" style="width:100%;justify-content:center" onclick="window._submitNewRecord()">
            ◈ Create Record
          </button>
        </div>
      </div>

      <!-- Recent Uploads / Records -->
      <div class="glass" style="padding:20px;margin-top:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Recent System-wide Uploads</div>
        <div id="upload-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  // Wire handlers
  window._simulateUpload      = simulateUpload;
  window._selectPatient       = selectPatient;
  window._setPtMode           = setPtMode;
  window._submitPatientUpdate = submitPatientUpdate;
  window._submitNewRecord     = submitNewRecord;

  loadDoctorData();
}

async function submitNewRecord() {
  if (!selectedPatient) return showToast('Select a patient first', 'error');
  const type = document.getElementById('new-rec-type').value.trim();
  const icon = document.getElementById('new-rec-icon').value.trim() || '📄';
  const notes = document.getElementById('new-rec-notes').value.trim();

  if (!type) return showToast('Record type is required', 'error');

  try {
    await apiFetch('/records', {
      method: 'POST',
      body: JSON.stringify({
        patientRef: selectedPatient._id,
        patientName: selectedPatient.name,
        type,
        icon,
        notes,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        doctorName: (await apiFetch('/doctor/me')).name,
        status: 'normal',
        encrypted: true
      })
    });
    showToast(`Record created for ${selectedPatient.name}`, 'success');
    ['new-rec-type', 'new-rec-icon', 'new-rec-notes'].forEach(id => document.getElementById(id).value = '');
    loadDoctorData();
  } catch(e) { showToast('Failed to create record', 'error'); }
}

export function unmountDoctor() {
  if (uploadInterval) { clearInterval(uploadInterval); uploadInterval = null; }
  selectedPatient = null;
}

// ── Data loaders ─────────────────────────────────────────────────────────────

async function loadDoctorData() {
  try {
    // Load doctor profile from API
    const [doc, patients, uploads] = await Promise.all([
      apiFetch('/doctor/me'),
      apiFetch(`/doctor/patients?mode=${patientMode}`),
      apiFetch('/doctor/uploads'),
    ]);

    const nameEl = document.getElementById('doc-name');
    const metaEl = document.getElementById('doc-meta');
    if (nameEl) nameEl.textContent = doc.name?.replace('Dr. ', '') || doc.name || '—';
    if (metaEl) metaEl.textContent = `${doc.specialty || 'General'} · ${doc.hospital || 'Apollo Hospitals'} · License: ${doc.licenseNo || 'N/A'}`;

    const ptCount = document.getElementById('doc-pt-count');
    if (ptCount) ptCount.textContent = patients.length;

    const rc = document.getElementById('report-count');
    if (rc) rc.textContent = uploads.length;

    const highRisk = patients.filter(p => (p.riskScore || 0) > 60).length;
    const hrEl = document.getElementById('high-risk-count');
    if (hrEl) hrEl.textContent = highRisk;

    renderPatientQueue(patients);
    renderUploadList(uploads);
  } catch(e) { showToast('Could not load doctor data', 'error'); }
}

function setPtMode(mode) {
  patientMode = mode;
  const btnAll  = document.getElementById('btn-mode-all');
  const btnAsgn = document.getElementById('btn-mode-assigned');
  const lbl     = document.getElementById('doc-mode-label');
  if (btnAll)  btnAll.className  = mode === 'all'      ? 'btn btn-purple' : 'btn';
  if (btnAsgn) btnAsgn.className = mode === 'assigned' ? 'btn btn-purple' : 'btn';
  if (btnAll  && mode !== 'all')      { btnAll.style.cssText  = 'font-size:11px;padding:5px 12px;color:var(--muted);border:1px solid var(--border)'; }
  if (btnAsgn && mode !== 'assigned') { btnAsgn.style.cssText = 'font-size:11px;padding:5px 12px;color:var(--muted);border:1px solid var(--border)'; }
  if (lbl) lbl.textContent = mode === 'assigned' ? 'Assigned to me' : 'All patients';
  loadDoctorData();
}

// ── Patient queue with encrypted ID visualization ─────────────────────────────

function renderPatientQueue(patients) {
  const el = document.getElementById('doctor-patients');
  if (!el) return;

  if (!patients.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:20px;text-align:center">No patients found.</div>`;
    return;
  }

  el.innerHTML = patients.map((p, i) => {
    const risk  = (p.riskScore || 0) > 60 ? 'high' : (p.riskScore || 0) > 30 ? 'medium' : 'low';
    const rCol  = risk === 'high' ? '#f87171' : risk === 'medium' ? '#fbbf24' : '#34d399';
    const encId = renderEncryptedId(p.patientId || 'HC-????', { size: '11px', color: '#34d399' });
    const data  = encodeURIComponent(JSON.stringify({ ...p, urgency: risk }));
    return `
      <div class="patient-item" id="pitem-${i}" onclick="window._selectPatient(${i}, '${data}')">
        <div class="avatar" style="background:${rCol}18;color:${rCol}">${p.avatar || p.name?.slice(0, 2) || '??'}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${p.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${p.age || '—'}y · ${encId}</div>
          ${p.condition ? `<div style="font-size:10px;color:${rCol};margin-top:2px;font-family:'JetBrains Mono',monospace">${p.condition}</div>` : ''}
        </div>
        <div class="badge" style="color:${rCol};border-color:${rCol}40;background:${rCol}12;font-size:10px">${risk.toUpperCase()}</div>
      </div>`;
  }).join('');
}

function selectPatient(i, dataEncoded) {
  const p = JSON.parse(decodeURIComponent(dataEncoded));
  selectedPatient = p;

  // Highlight selected row
  document.querySelectorAll('.patient-item').forEach((el, j) =>
    el.classList.toggle('selected', j === i)
  );

  // Update upload label
  const uplName = document.getElementById('upload-patient-name');
  if (uplName) uplName.textContent = p.name;

  // Update update-panel label
  const updLabel = document.getElementById('update-patient-label');
  if (updLabel) updLabel.textContent = p.name;

  // Show update panel
  const updPanel = document.getElementById('update-panel');
  if (updPanel) updPanel.style.display = 'block';

  // Pre-fill update form from patient data
  if (p.diagnosis)       (document.getElementById('upd-diagnosis') || {}).value = p.diagnosis;
  if (p.riskAnnotations) (document.getElementById('upd-risk')      || {}).value = p.riskAnnotations;
  if (p.condition)       (document.getElementById('upd-condition')  || {}).value = p.condition;
  if (p.riskScore != null) (document.getElementById('upd-riskScore') || {}).value = p.riskScore;

  // Render encrypted detail panel
  renderPatientDetail(p);
}

function renderPatientDetail(p) {
  const risk  = p.urgency || ((p.riskScore || 0) > 60 ? 'high' : (p.riskScore || 0) > 30 ? 'medium' : 'low');
  const rCol  = risk === 'high' ? '#f87171' : risk === 'medium' ? '#fbbf24' : '#34d399';
  const encId = renderEncryptedId(p.patientId || 'HC-????', { size: '12px', color: '#34d399', showLock: true });

  document.getElementById('patient-detail-content').innerHTML = `
    <div style="animation:fadeUp .4s ease">

      <!-- Identity block with encryption overlay -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div class="avatar" style="width:48px;height:48px;font-size:18px;background:${rCol}18;color:${rCol}">${p.avatar || p.name?.slice(0,2)}</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:600">${p.name}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${encId}</div>
        </div>
        <div class="badge" style="color:${rCol};border-color:${rCol}40;background:${rCol}12">${risk.toUpperCase()} RISK</div>
      </div>

      <!-- Vitals summary -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        ${[['Blood Type', p.bloodType || '—'], ['Insurance', p.insurance || '—'], ['Health Score', `${p.healthScore ?? '—'} / 100`], ['Age', p.age ? `${p.age} years` : '—']].map(([l,v]) => `
          <div style="padding:10px 12px;background:rgba(0,245,255,.04);border:1px solid rgba(0,245,255,.1);border-radius:8px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">${l}</div>
            <div style="font-size:13px;margin-top:3px;font-weight:500">${v}</div>
          </div>`).join('')}
      </div>

      <!-- Diagnosis -->
      ${p.diagnosis ? `
        <div style="margin-bottom:12px;padding:12px;background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.18);border-radius:8px">
          <div style="font-size:10px;color:#a78bfa;letter-spacing:1px;margin-bottom:4px">DIAGNOSIS</div>
          <div style="font-size:12px;color:var(--text);line-height:1.6">${p.diagnosis}</div>
        </div>` : ''}

      <!-- Risk annotations -->
      ${p.riskAnnotations ? `
        <div style="margin-bottom:12px;padding:12px;background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.15);border-radius:8px">
          <div style="font-size:10px;color:#f87171;letter-spacing:1px;margin-bottom:4px">⚠ RISK NOTES</div>
          <div style="font-size:12px;color:var(--text);font-family:'JetBrains Mono',monospace;line-height:1.5">${p.riskAnnotations}</div>
        </div>` : ''}

      <!-- Prescriptions -->
      ${p.prescriptions?.length ? `
        <div style="margin-bottom:12px">
          <div style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-bottom:6px">PRESCRIPTIONS (${p.prescriptions.length})</div>
          ${p.prescriptions.slice(0,3).map(rx => `
            <div style="display:flex;gap:8px;align-items:center;padding:6px 10px;margin-bottom:4px;background:rgba(124,58,237,.06);border-radius:6px;font-size:11px">
              <span style="color:#c4b5fd">💊 ${rx.medication}</span>
              <span style="color:var(--muted)">${rx.dosage}</span>
              <span style="color:var(--muted);margin-left:auto">${rx.frequency}</span>
            </div>`).join('')}
        </div>` : ''}

      <!-- Last update -->
      ${p.lastUpdatedByDoctor ? `
        <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-top:8px">
          Last updated by ${p.lastUpdatedByDoctor}
        </div>` : ''}

      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-purple" style="flex:1;justify-content:center;font-size:12px" onclick="window._simulateUpload()">⬡ Upload Report</button>
      </div>
    </div>`;
}

async function submitPatientUpdate() {
  if (!selectedPatient) return showToast('Select a patient first', 'error');

  const diagnosis       = document.getElementById('upd-diagnosis')?.value?.trim();
  const riskAnnotations = document.getElementById('upd-risk')?.value?.trim();
  const condition       = document.getElementById('upd-condition')?.value?.trim();
  const riskScore       = document.getElementById('upd-riskScore')?.value;
  const hr = document.getElementById('upd-hr')?.value;
  const sp = document.getElementById('upd-sp')?.value;
  const bp = document.getElementById('upd-bp')?.value;
  const gl = document.getElementById('upd-gl')?.value;

  // Show transfer animation
  const indicator = document.getElementById('transfer-indicator');
  if (indicator) indicator.style.display = 'flex';

  try {
    // Update clinical data
    await apiFetch(`/doctor/patients/${selectedPatient._id}/update`, {
      method: 'PATCH',
      body: JSON.stringify({ diagnosis, riskAnnotations, condition, riskScore: riskScore ? Number(riskScore) : undefined }),
    });

    // Update vitals if provided
    if (hr || sp || bp || gl) {
      await apiFetch(`/doctor/patients/${selectedPatient._id}/vitals`, {
        method: 'POST',
        body: JSON.stringify({ hr, sp, bp, gl }),
      });
    }

    showToast(`✓ Record updated for ${selectedPatient.name}`, 'success');

    // Refresh patient queue
    const patients = await apiFetch(`/doctor/patients?mode=${patientMode}`);
    renderPatientQueue(patients);

    // Update selected patient in memory
    selectedPatient = { ...selectedPatient, diagnosis, riskAnnotations, condition, riskScore: Number(riskScore) };
    renderPatientDetail(selectedPatient);

    // Clear vitals inputs
    ['upd-hr','upd-sp','upd-bp','upd-gl'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  } catch(e) {
    showToast(`Update failed: ${e.message}`, 'error');
  } finally {
    if (indicator) indicator.style.display = 'none';
  }
}

function renderUploadList(uploads) {
  const el = document.getElementById('upload-list');
  if (!el) return;
  if (!uploads.length) { el.innerHTML = `<div style="color:var(--muted);font-size:12px">No uploads yet.</div>`; return; }
  el.innerHTML = uploads.slice(0, 8).map(u => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:6px;border-radius:8px;background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.15)">
      <div class="badge badge-purple" style="padding:2px 7px;font-size:10px">${u.fileType || u.type || 'PDF'}</div>
      <div style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">${u.filename || u.type}</div>
      ${u.patientName ? `<div style="font-size:10px;color:#a78bfa;font-family:'JetBrains Mono',monospace">${u.patientName}</div>` : ''}
      <div style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">${u.fileSize || '—'}</div>
    </div>`).join('');
}

function simulateUpload() {
  const zone  = document.getElementById('upload-zone');
  const prog  = document.getElementById('upload-progress');
  const bar   = document.getElementById('upload-bar');
  const pct   = document.getElementById('upload-pct');
  const fname = document.getElementById('upload-filename');
  const files = ['ECG_Report_New.pdf','LabResults_Apr23.pdf','Echocardiogram.dcm','MRI_Brain_Scan.dcm','BloodPanel_Full.pdf'];
  const fn    = files[Math.floor(Math.random() * files.length)];
  fname.textContent = fn;
  prog.style.display = 'block';
  let p = 0;
  if (uploadInterval) clearInterval(uploadInterval);
  uploadInterval = setInterval(async () => {
    p += Math.random() * 15 + 3;
    if (p >= 100) {
      p = 100;
      clearInterval(uploadInterval);
      zone.classList.add('uploaded');
      document.getElementById('upload-text').textContent = '✓ Upload successful!';
      showToast(`${fn} uploaded${selectedPatient ? ` for ${selectedPatient.name}` : ''}`, 'success');
      try {
        await apiFetch('/doctor/uploads', {
          method: 'POST',
          body: JSON.stringify({
            filename: fn,
            fileSize: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
            fileType: fn.endsWith('.dcm') ? 'IMG' : 'PDF',
            patientId: selectedPatient?._id || null,
          }),
        });
        const rc = document.getElementById('report-count');
        if (rc) rc.textContent = parseInt(rc.textContent || 0) + 1;
        const uploads = await apiFetch('/doctor/uploads');
        renderUploadList(uploads);
      } catch(e) {}
      setTimeout(() => {
        zone.classList.remove('uploaded');
        document.getElementById('upload-text').textContent = 'Drop files or click to upload';
        prog.style.display = 'none';
        bar.style.width = '0%';
      }, 3000);
    }
    bar.style.width = p + '%';
    pct.textContent = Math.floor(p) + '%';
  }, 100);
}
