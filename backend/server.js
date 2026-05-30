import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';

const PORT = process.env.PORT || 3001;

async function start() {
  app.listen(PORT, () =>
    console.log(`HealthChain API -> http://localhost:${PORT}`)
  );
}

const __filename = fileURLToPath(import.meta.url);
const entryResolved = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isMainModule =
  Boolean(entryResolved) &&
  path.normalize(__filename) === path.normalize(entryResolved);

if (isMainModule) {
  start().catch((err) => {
    console.error('Failed to start HealthChain API:', err);
    process.exit(1);
  });
}
