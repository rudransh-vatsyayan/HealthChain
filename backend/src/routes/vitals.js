import express from 'express';
import auth from '../middleware/auth.js';

const router = express.Router();

const BASE = [
  { label: 'Heart Rate',     val: 72,  max: 120, unit: 'bpm',   color: '#f87171' },
  { label: 'SpO₂',           val: 98,  max: 100, unit: '%',     color: '#34d399' },
  { label: 'Blood Pressure', val: 120, max: 180, unit: 'mmHg',  color: '#60a5fa' },
  { label: 'Glucose',        val: 95,  max: 200, unit: 'mg/dL', color: '#fbbf24' },
];

function liveVitals() {
  return BASE.map(v => {
    const val = Math.round(v.val + (Math.random() - 0.5) * 5);
    return { ...v, val, pct: Math.round((val / v.max) * 100) };
  });
}

// GET /api/vitals  — snapshot
router.get('/', auth, (_req, res) => res.json(liveVitals()));

// GET /api/vitals/stream  — SSE real-time feed
router.get('/stream', auth, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const iv = setInterval(() => {
    res.write(`data: ${JSON.stringify(liveVitals())}\n\n`);
  }, 2000);

  req.on('close', () => clearInterval(iv));
});

export default router;
