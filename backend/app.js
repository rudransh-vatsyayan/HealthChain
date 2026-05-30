import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './src/config/db.js';
import { resolveRuntimeEnv, getCorsOrigins } from './src/config/env.js';
import { seedDemoData } from './src/seed/bootstrap.js';

import authRoutes from './src/routes/auth.js';
import patientRoutes from './src/routes/patients.js';
import recordRoutes from './src/routes/records.js';
import vitalsRoutes from './src/routes/vitals.js';
import doctorRoutes from './src/routes/doctor.js';
import insuranceRoutes from './src/routes/insurance.js';
import federatedRoutes from './src/routes/federated.js';
import activityRoutes from './src/routes/activity.js';

resolveRuntimeEnv();

const app = express();
const corsOrigins = getCorsOrigins();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, corsOrigins[0]);
  },
  credentials: true,
}));
app.use(morgan(process.env.VERCEL ? 'combined' : 'dev'));
app.use(express.json());

let readyPromise = null;

function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (process.env.USE_MEMORY_DB !== 'true') {
        await connectDB();
      }

      if (process.env.AUTO_SEED !== 'false') {
        const seeded = await seedDemoData({ reset: process.env.SEED_RESET === 'true' });
        if (seeded) {
          console.log([
            'HealthChain demo data seeded.',
            '   DOCTORS:  rudransh@healthchain.io | doctor@healthchain.io     / health123',
            '   PATIENTS: sinchana@healthchain.io | patient@healthchain.io    / health123',
            '   INSURERS: sathwik@healthchain.io  | insurer@healthchain.io    / health123',
          ].join('\n'));
        }
      }
    })();
  }
  return readyPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    next(err);
  }
});

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
  res.json({
    status: 'ok',
    service: 'HealthChain API',
    mode: process.env.USE_MEMORY_DB === 'true' ? 'memory' : 'mongo',
    timestamp: new Date(),
  })
);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
