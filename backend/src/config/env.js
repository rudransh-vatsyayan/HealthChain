/** Resolve runtime flags before routes or demoStore run. */
export function resolveRuntimeEnv() {
  if (!process.env.JWT_SECRET && process.env.VERCEL) {
    process.env.JWT_SECRET = 'healthchain_vercel_demo_secret';
  }

  if (process.env.USE_MEMORY_DB === 'true' || process.env.USE_MEMORY_DB === 'false') {
    return;
  }

  const uri = process.env.MONGO_URI || '';
  const noPersistentDb =
    !uri || /localhost|127\.0\.0\.1|mongo:27017/.test(uri);

  if (process.env.VERCEL && noPersistentDb) {
    process.env.USE_MEMORY_DB = 'true';
  }
}

export function useMemoryDb() {
  return process.env.USE_MEMORY_DB === 'true';
}

export function getCorsOrigins() {
  const origins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  for (const key of ['FRONTEND_URL', 'VERCEL_URL', 'VERCEL_BRANCH_URL']) {
    const value = process.env[key];
    if (!value) continue;
    origins.add(value.startsWith('http') ? value : `https://${value}`);
  }

  return [...origins];
}
