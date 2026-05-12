import { login, getToken, getUser } from './api/client.js';
import { initStarfield }            from './components/starfield.js';
import { renderNav }                from './components/nav.js';
import { showToast }                from './components/toast.js';
import { mountPatient, unmountPatient }     from './pages/patient.js';
import { mountDoctor, unmountDoctor }       from './pages/doctor.js';
import { mountInsurance, unmountInsurance } from './pages/insurance.js';
import { mountFederated, unmountFederated } from './pages/federated.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const PANELS = {
  patient:   { mount: mountPatient,   unmount: unmountPatient   },
  doctor:    { mount: mountDoctor,    unmount: unmountDoctor    },
  insurance: { mount: mountInsurance, unmount: unmountInsurance },
  federated: { mount: mountFederated, unmount: unmountFederated },
};

let activePanel = null;

function buildPanelShell() {
  const wrap = document.getElementById('panels');
  wrap.innerHTML = Object.keys(PANELS).map(id => `
    <div class="panel" id="panel-${id}"></div>
  `).join('');
}

function showPanel(id) {
  // Unmount previous
  if (activePanel && PANELS[activePanel]) PANELS[activePanel].unmount();

  // Hide all, show target
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`panel-${id}`);
  if (!target) return;
  target.classList.add('active');

  // Mount page
  PANELS[id]?.mount(target);
  activePanel = id;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function initLogin() {
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
}

window.fillDemo = (role) => {
  const emails = { patient:'patient@healthchain.io', doctor:'doctor@healthchain.io', insurer:'insurer@healthchain.io' };
  document.getElementById('login-email').value    = emails[role];
  document.getElementById('login-password').value = 'health123';
};

async function doLogin() {
  const btn   = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  if (!email || !pass) {
    errEl.textContent = 'Please enter email and password.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    await login(email, pass);
    bootApp();
  } catch(e) {
    errEl.textContent = e.message || 'Login failed';
    errEl.style.display = 'block';
    btn.textContent = '⬡ Sign In'; btn.disabled = false;
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function bootApp() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  initStarfield();
  buildPanelShell();
  renderNav(showPanel);

  // Greet user
  const user = getUser();
  if (user) showToast(`Welcome back, ${user.name} 👋`, 'success');
}

// ── Init ──────────────────────────────────────────────────────────────────────
initLogin();

// If already logged in, skip login screen
if (getToken()) {
  bootApp();
} else {
  // Pre-fill demo hint
  document.getElementById('login-email').value    = 'patient@healthchain.io';
  document.getElementById('login-password').value = 'health123';
}
