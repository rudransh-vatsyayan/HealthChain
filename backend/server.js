import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import connectDB from './src/config/db.js';
import { seedDemoData } from './src/seed/bootstrap.js';

import authRoutes from './src/routes/auth.js';
import patientRoutes from './src/routes/patients.js';
import recordRoutes from './src/routes/records.js';
import vitalsRoutes from './src/routes/vitals.js';
import doctorRoutes from './src/routes/doctor.js';
import insuranceRoutes from './src/routes/insurance.js';
import federatedRoutes from './src/routes/federated.js';
import activityRoutes from './src/routes/activity.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

if (process.env.USE_MEMORY_DB !== 'true') {
  await connectDB();
}

if (process.env.AUTO_SEED !== 'false') {
  const seeded = await seedDemoData();
  if (seeded) console.log('Demo data seeded. Login with patient@healthchain.io / health123');
}


// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/federated', federatedRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/activity-log', activityRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'HealthChain API', timestamp: new Date() })
);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

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
