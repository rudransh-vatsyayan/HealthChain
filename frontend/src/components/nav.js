import { clearToken, getUser } from '../api/client.js';

const TABS = [
  { id: 'patient',   label: 'Patient'      },
  { id: 'doctor',    label: 'Doctor'       },
  { id: 'insurance', label: 'Insurance'    },
  { id: 'federated', label: 'Federated AI' },
];

let clockInterval;

export function renderNav(onTabSwitch) {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = `
    <div class="nav-logo">HealthChain</div>
    <div class="nav-tabs" id="nav-tabs">
      ${TABS.map(t => `
        <button class="nav-tab" data-panel="${t.id}" id="tab-${t.id}">${t.label}</button>
      `).join('')}
    </div>
    <div class="nav-status">
      <div class="status-dot"></div>
      <span>SYSTEM LIVE</span>
      <span style="margin-left:8px;opacity:.5">|</span>
      <span style="margin-left:8px" id="nav-clock"></span>
      <span style="margin-left:12px;opacity:.4">|</span>
      <button id="logout-btn" style="margin-left:10px;background:transparent;border:none;color:var(--muted);font-size:11px;cursor:pointer;font-family:'JetBrains Mono',monospace;letter-spacing:.5px" title="Sign out">LOGOUT</button>
    </div>
  `;

  // Tab click
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

  // Auto-select tab for user role
  const user = getUser();
  const defaultTab = user?.role === 'doctor' ? 'doctor'
    : user?.role === 'insurer' ? 'insurance'
    : 'patient';
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
