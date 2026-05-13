import express from 'express';
import auth from '../middleware/auth.js';
import Vital from '../models/Vital.js';
import Patient from '../models/Patient.js';
import Record from '../models/Record.js';
import * as analytics from '../services/analytics.js';
import * as demoStore from '../data/demoStore.js';

const router = express.Router();

const DEFAULT_BASE = [
  { label: 'Heart Rate',     val: 72,  max: 120, unit: 'bpm',   color: '#f87171' },
  { label: 'SpO₂',           val: 98,  max: 100, unit: '%',     color: '#34d399' },
  { label: 'Blood Pressure', val: 120, max: 180, unit: 'mmHg',  color: '#60a5fa' },
  { label: 'Glucose',        val: 95,  max: 200, unit: 'mg/dL', color: '#fbbf24' },
];

async function getLatestVitals(userId) {
  if (demoStore.isMemory()) {
    return DEFAULT_BASE.map(v => {
      const val = Math.round(v.val + (Math.random() - 0.5) * 5);
      return { ...v, val, pct: Math.round((val / v.max) * 100) };
    });
  }

  // Find latest for each label
  const vitals = await Promise.all(DEFAULT_BASE.map(async (v) => {
    const latest = await Vital.findOne({ userId, label: v.label }).sort({ createdAt: -1 });
    const baseline = latest ? latest.val : v.val;
    const current = Math.round(baseline + (Math.random() - 0.5) * 5);
    return { ...v, val: current, pct: Math.round((current / v.max) * 100) };
  }));

  return vitals;
}

// GET /api/vitals  — snapshot
router.get('/', auth, async (req, res) => {
  try {
    const vitals = await getLatestVitals(req.user.id);
    res.json(vitals);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vitals  — save and process
router.post('/', auth, async (req, res) => {
  try {
    const { hr, sp, bp, gl } = req.body;
    const userId = req.user.id;

    // 1. Save new vitals to DB
    const tasks = [];
    if (hr) tasks.push(Vital.create({ userId, label: 'Heart Rate', val: hr, unit: 'bpm', color: '#f87171' }));
    if (sp) tasks.push(Vital.create({ userId, label: 'SpO₂', val: sp, unit: '%', color: '#34d399' }));
    if (bp) tasks.push(Vital.create({ userId, label: 'Blood Pressure', val: bp, unit: 'mmHg', color: '#60a5fa' }));
    if (gl) tasks.push(Vital.create({ userId, label: 'Glucose', val: gl, unit: 'mg/dL', color: '#fbbf24' }));
    await Promise.all(tasks);

    // 2. Re-calculate Health Score using Algorithm
    const patient = await Patient.findOne({ userId });
    if (!patient) return res.json({ status: 'ok', message: 'Vitals saved (no patient profile)' });

    const [latestVitals, records] = await Promise.all([
      getLatestVitals(userId),
      Record.find({ patientRef: patient._id }),
    ]);

    const newScore = analytics.calculateHealthScore(latestVitals, records);
    patient.healthScore = newScore;
    await patient.save();

    res.json({ status: 'ok', message: 'Vitals processed', newScore });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vitals/stream  — SSE real-time feed
router.get('/stream', auth, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const iv = setInterval(async () => {
    try {
      const vitals = await getLatestVitals(req.user.id);
      res.write(`data: ${JSON.stringify(vitals)}\n\n`);
    } catch (_) {}
  }, 2000);

  req.on('close', () => clearInterval(iv));
});

export default router;
