import { clearToken, getUser } from '../api/client.js';

// Tabs visible per role
const ROLE_TABS = {
  patient:  [{ id: 'patient',   label: '⬡ My Dashboard', sub: 'Patient' }],
  doctor:   [{ id: 'doctor',    label: '◈ Doctor Portal', sub: 'Doctor' },
             { id: 'federated', label: '⬢ Federated AI',  sub: 'Research' }],
  insurer:  [{ id: 'insurance', label: '◎ Insurance Hub', sub: 'Insurer' }],
};

const ROLE_COLORS = { patient: '#00f5ff', doctor: '#a78bfa', insurer: '#fbbf24' };
const ROLE_LABELS = { patient: 'PATIENT', doctor: 'DOCTOR', insurer: 'INSURER' };

let clockInterval;

export function renderNav(onTabSwitch) {
  const user = getUser();
  const role = user?.role || 'patient';
  const tabs = ROLE_TABS[role] || ROLE_TABS.patient;
  const color = ROLE_COLORS[role];
  const roleLabel = ROLE_LABELS[role];

  const nav = document.getElementById('main-nav');
  nav.innerHTML = `
    <div class="nav-logo">HealthChain</div>

    <div class="nav-tabs" id="nav-tabs">
      ${tabs.map(t => `
        <button class="nav-tab" data-panel="${t.id}" id="tab-${t.id}" role="${role}">
          ${t.label}
        </button>
      `).join('')}
    </div>

    <div class="nav-right">
      <div class="nav-user-info">
        <div class="nav-username">${user?.name || '—'}</div>
        <div class="nav-role-badge" style="color:${color};border-color:${color}40;background:${color}12">
          <span class="role-dot" style="background:${color}"></span>
          ${roleLabel}
        </div>
      </div>
      <div class="nav-status">
        <div class="status-dot"></div>
        <span>LIVE</span>
        <span style="margin-left:6px;opacity:.4">|</span>
        <span style="margin-left:6px" id="nav-clock"></span>
      </div>
      <button id="logout-btn" class="nav-logout-btn" title="Sign out">LOGOUT</button>
    </div>
  `;

  // Tab clicks
  nav.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.panel);
      onTabSwitch(btn.dataset.panel);
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearToken();
    window.location.reload();
  });

  // Clock
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(updateClock, 1000);
  updateClock();

  // Auto-select first available tab for role
  const defaultTab = tabs[0].id;
  setActiveTab(defaultTab);
  onTabSwitch(defaultTab);
}

export function setActiveTab(panelId) {
  document.querySelectorAll('.nav-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.panel === panelId)
  );
}

function updateClock() {
  const el = document.getElementById('nav-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}
