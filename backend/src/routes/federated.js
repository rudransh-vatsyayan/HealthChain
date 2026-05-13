import express from 'express';
import auth from '../middleware/auth.js';
import Record from '../models/Record.js';
import FederatedRound from '../models/FederatedRound.js';
import * as demoStore from '../data/demoStore.js';

const router = express.Router();

const HOSPITALS = [
  { name: 'Apollo Hospitals', x: 0.15, y: 0.30, color: '#00f5ff' },
  { name: 'AIIMS Delhi',      x: 0.45, y: 0.12, color: '#a78bfa' },
  { name: 'Fortis Hospital',  x: 0.75, y: 0.30, color: '#34d399' },
  { name: 'Manipal Health',   x: 0.80, y: 0.65, color: '#fbbf24' },
  { name: 'NIMHANS',          x: 0.45, y: 0.82, color: '#f87171' },
  { name: 'Medanta Node',     x: 0.15, y: 0.65, color: '#60a5fa' },
];

let isTraining = false;

async function getLiveHospitalData() {
  if (demoStore.isMemory()) {
    return HOSPITALS.map(h => ({ ...h, pts: Math.floor(Math.random() * 5000 + 5000) }));
  }

  return await Promise.all(HOSPITALS.map(async (h) => {
    // Real count from DB + base mock for visualization
    const count = await Record.countDocuments({ hospital: { $regex: h.name.split(' ')[0], $options: 'i' } });
    return { ...h, pts: count + 5000 }; // 5000 is the 'pre-trained' base
  }));
}

// GET /api/federated/status
router.get('/status', auth, async (_req, res) => {
  try {
    let round = 0;
    let accuracy = 71.2;

    if (!demoStore.isMemory()) {
      const lastRound = await FederatedRound.findOne().sort({ round: -1 });
      if (lastRound) {
        round = lastRound.round;
        accuracy = lastRound.accuracy;
      }
    }

    const nodes = await getLiveHospitalData();

    res.json({
      round,
      maxRounds: 5,
      accuracy,
      nodeCount: nodes.length,
      nodes,
      privacy:   100,
      isTraining,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function startTraining(req, res) {
  if (isTraining) return res.status(409).json({ error: 'Training already in progress' });

  try {
    let round = 0;
    let accuracy = 71.2;

    if (!demoStore.isMemory()) {
      const lastRound = await FederatedRound.findOne().sort({ round: -1 });
      if (lastRound) {
        round = lastRound.round;
        accuracy = lastRound.accuracy;
      }
    }

    const nodes = await getLiveHospitalData();
    const totalRecords = nodes.reduce((sum, n) => sum + n.pts, 0);

    if (round >= 5) {
      round = 0;
      accuracy = 71.2;
      if (!demoStore.isMemory()) await FederatedRound.deleteMany({});
    }

    isTraining = true;
    const nextRound = round + 1;
    const roundId = `ROUND-${Date.now()}`;
    res.json({ roundId, round: nextRound });

    setTimeout(async () => {
      // Accuracy improvement scales with total data points
      const dataBonus = (totalRecords / 50000) * 2; 
      const newAccuracy = Math.min(98.5, accuracy + 3.5 + dataBonus + Math.random());
      isTraining = false;

      if (!demoStore.isMemory()) {
        try {
          await FederatedRound.create({
            roundId,
            round: nextRound,
            accuracy: newAccuracy,
            maxRounds: 5,
            nodeStatus: nodes.map(h => ({ ...h, progress: 1 })),
            isTraining: false,
            completedAt: new Date(),
          });
        } catch (err) {
          console.error('FederatedRound persist:', err.message);
        }
      }
    }, 6000);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/federated/start  — trigger a training round
router.post('/start', auth, startTraining);

// POST /api/federated/start-round  — alias
router.post('/start-round', auth, startTraining);

// GET /api/federated/stream/:roundId  — SSE progress packets
router.get('/stream/:roundId', auth, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  let progress = 0;
  const iv = setInterval(() => {
    progress = Math.min(1, progress + 0.07);
    const nodes = HOSPITALS.map(h => ({ ...h, progress }));
    res.write(`data: ${JSON.stringify({ progress, nodes, done: progress >= 1 })}\n\n`);
    if (progress >= 1) { clearInterval(iv); res.end(); }
  }, 300);

  req.on('close', () => clearInterval(iv));
});

export default router;
