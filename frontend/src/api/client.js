const BASE = '/api';

export function getToken() {
  return localStorage.getItem('hc_token');
}

export function setToken(token) {
  localStorage.setItem('hc_token', token);
}

export function clearToken() {
  localStorage.removeItem('hc_token');
  localStorage.removeItem('hc_user');
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('hc_user')); }
  catch { return null; }
}

export function setUser(user) {
  localStorage.setItem('hc_user', JSON.stringify(user));
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function apiSSE(path) {
  const token = getToken();
  // SSE doesn't support custom headers natively — pass token as query param
  return new EventSource(`${BASE}${path}?token=${token}`);
}

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  setUser(data.user);
  return data;
}
