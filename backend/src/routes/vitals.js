import express from 'express';
import auth        from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import Vital       from '../models/Vital.js';
import Patient     from '../models/Patient.js';
import Record      from '../models/Record.js';
import * as analytics from '../services/analytics.js';
import * as demoStore  from '../data/demoStore.js';

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
  return Promise.all(DEFAULT_BASE.map(async v => {
    const latest  = await Vital.findOne({ userId, label: v.label }).sort({ createdAt: -1 });
    const current = latest ? latest.val : v.val;
    return { ...v, val: current, pct: Math.round((current / v.max) * 100) };
  }));
}

// ── GET /api/vitals  — patient's own vitals snapshot ────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const vitals = await getLatestVitals(req.user.id);
    res.json(vitals);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/vitals/patient/:patientId  — doctor reads a patient's vitals ────
router.get('/patient/:patientId', auth, requireRole('doctor'), async (req, res) => {
  try {
    if (demoStore.isMemory()) {
      const patient = (await demoStore.listPatients()).find((p) => p._id === req.params.patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      return res.json(await getLatestVitals(patient.userId));
    }

    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const vitals = await getLatestVitals(patient.userId);
    res.json(vitals);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/vitals  — patient logs own vitals ──────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { hr, sp, bp, gl } = req.body;
    const userId = req.user.id;

    if (demoStore.isMemory()) {
      return res.json({ status: 'ok', message: 'Vitals saved (memory mode)' });
    }

    const tasks = [];
    if (hr) tasks.push(Vital.create({ userId, label: 'Heart Rate',     val: Number(hr), unit: 'bpm',   color: '#f87171' }));
    if (sp) tasks.push(Vital.create({ userId, label: 'SpO₂',           val: Number(sp), unit: '%',     color: '#34d399' }));
    if (bp) tasks.push(Vital.create({ userId, label: 'Blood Pressure', val: Number(bp), unit: 'mmHg',  color: '#60a5fa' }));
    if (gl) tasks.push(Vital.create({ userId, label: 'Glucose',        val: Number(gl), unit: 'mg/dL', color: '#fbbf24' }));
    await Promise.all(tasks);

    const patient = await Patient.findOne({ userId });
    if (patient) {
      const [latestVitals, records] = await Promise.all([
        getLatestVitals(userId),
        Record.find({ patientRef: patient._id }),
      ]);
      patient.healthScore = analytics.calculateHealthScore(latestVitals, records);
      await patient.save();
    }

    res.json({ status: 'ok', message: 'Vitals processed & health score updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/vitals/stream  — SSE real-time vitals feed ─────────────────────
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
