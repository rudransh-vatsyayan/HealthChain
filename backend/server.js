require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const { seedDemoData } = require('./src/seed/bootstrap');

const authRoutes      = require('./src/routes/auth');
const patientRoutes   = require('./src/routes/patients');
const recordRoutes    = require('./src/routes/records');
const vitalsRoutes    = require('./src/routes/vitals');
const doctorRoutes    = require('./src/routes/doctor');
const insuranceRoutes = require('./src/routes/insurance');
const federatedRoutes = require('./src/routes/federated');
const activityRoutes  = require('./src/routes/activity');

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

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/patients',  patientRoutes);
app.use('/api/records',   recordRoutes);
app.use('/api/vitals',    vitalsRoutes);
app.use('/api/doctor',    doctorRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/federated', federatedRoutes);
app.use('/api/activity',  activityRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'HealthChain API', timestamp: new Date() })
);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await connectDB();
  if (process.env.AUTO_SEED !== 'false') {
    const seeded = await seedDemoData();
    if (seeded) console.log('Demo data seeded. Login with patient@healthchain.io / health123');
  }

  app.listen(PORT, () =>
    console.log(`HealthChain API -> http://localhost:${PORT}`)
  );
}

start().catch((err) => {
  console.error('Failed to start HealthChain API:', err);
  process.exit(1);
});

module.exports = app;
