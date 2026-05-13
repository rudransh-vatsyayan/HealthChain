#!/usr/bin/env node
/**
 * Minimal API smoke check. Start the backend first (default http://127.0.0.1:3001).
 *
 *   node scripts/smoke-api.mjs
 *   $env:SMOKE_API_URL="http://127.0.0.1:3001"; node scripts/smoke-api.mjs
 */

const base = (process.env.SMOKE_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

try {
  const res = await fetch(`${base}/api/health`);
  if (!res.ok) {
    console.error(`FAIL: HTTP ${res.status} from ${base}/api/health`);
    process.exit(1);
  }
  const body = await res.json();
  if (body.status !== 'ok') {
    console.error('FAIL: unexpected JSON', body);
    process.exit(1);
  }
  console.log(`OK: ${base}/api/health`, body);
} catch (err) {
  console.error('FAIL:', err.message);
  console.error('Is the API running? Try: cd backend && node server.js');
  process.exit(1);
}
