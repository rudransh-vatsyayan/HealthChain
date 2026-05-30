import { login, register, getToken, getUser } from './api/client.js';
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
// ── Auth Logic ───────────────────────────────────────────────────────────────
let authMode = 'login';

function initAuth() {
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('reg-btn').addEventListener('click', doRegister);
  document.getElementById('toggle-auth').addEventListener('click', e => {
    e.preventDefault();
    authMode = authMode === 'login' ? 'register' : 'login';
    const isLogin = authMode === 'login';

    document.getElementById('login-fields').style.display   = isLogin ? 'block' : 'none';
    document.getElementById('login-btn').style.display      = isLogin ? 'flex'  : 'none';
    document.getElementById('demo-hints').style.display      = isLogin ? 'flex'  : 'none';
    document.getElementById('register-fields').style.display = isLogin ? 'none'  : 'block';
    document.getElementById('reg-btn').style.display         = isLogin ? 'none'  : 'flex';
    document.getElementById('toggle-auth').textContent       = isLogin ? 'Need an account? Register here' : 'Already have an account? Sign in';
    document.getElementById('login-error').style.display     = 'none';
  });

  ['login-password', 'reg-password'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') authMode === 'login' ? doLogin() : doRegister();
    });
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

async function doRegister() {
  const btn   = document.getElementById('reg-btn');
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  const role  = document.getElementById('reg-role').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  if (!name || !email || !pass) {
    errEl.textContent = 'All fields are required.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Creating account…'; btn.disabled = true;
  try {
    await register({ name, email, password: pass, role });
    bootApp();
  } catch(e) {
    errEl.textContent = e.message || 'Registration failed';
    errEl.style.display = 'block';
    btn.textContent = '◈ Create Account'; btn.disabled = false;
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
initAuth();

// If already logged in, skip login screen
if (getToken()) {
  bootApp();
} else {
  // Pre-fill demo hint
  document.getElementById('login-email').value    = 'patient@healthchain.io';
  document.getElementById('login-password').value = 'health123';
}
