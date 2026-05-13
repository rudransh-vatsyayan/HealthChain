import express from 'express';
import auth from '../middleware/auth.js';
import FederatedRound from '../models/FederatedRound.js';

const router = express.Router();

const HOSPITALS = [
  { name: 'Apollo',   x: 0.15, y: 0.30, color: '#00f5ff', pts: 12840 },
  { name: 'AIIMS',    x: 0.45, y: 0.12, color: '#a78bfa', pts: 9200  },
  { name: 'Fortis',   x: 0.75, y: 0.30, color: '#34d399', pts: 7500  },
  { name: 'Manipal',  x: 0.80, y: 0.65, color: '#fbbf24', pts: 8900  },
  { name: 'NIMHANS',  x: 0.45, y: 0.82, color: '#f87171', pts: 6100  },
  { name: 'Medanta',  x: 0.15, y: 0.65, color: '#60a5fa', pts: 10200 },
];

// Mutable state (simulation; completed rounds are persisted to FederatedRound)
let currentRound    = 0;
let currentAccuracy = 71.2;
let isTraining      = false;

// GET /api/federated/status
router.get('/status', auth, (_req, res) => {
  res.json({
    round:     currentRound,
    maxRounds: 5,
    accuracy:  currentAccuracy,
    nodeCount: HOSPITALS.length,
    nodes:     HOSPITALS,
    privacy:   100,
    isTraining,
  });
});

function startTraining(req, res) {
  if (isTraining) return res.status(409).json({ error: 'Training already in progress' });
  if (currentRound >= 5) {
    currentRound = 0;
    currentAccuracy = 71.2;
  }
  isTraining = true;
  const roundId = `ROUND-${Date.now()}`;
  res.json({ roundId, round: currentRound + 1 });

  setTimeout(async () => {
    currentRound    = Math.min(currentRound + 1, 5);
    currentAccuracy = Math.min(97, 71.2 + currentRound * 4.3 + Math.random() * 1.5);
    isTraining      = false;

    try {
      await FederatedRound.create({
        roundId,
        round: currentRound,
        accuracy: currentAccuracy,
        maxRounds: 5,
        nodeStatus: HOSPITALS.map(h => ({
          name: h.name, x: h.x, y: h.y, color: h.color, pts: h.pts, progress: 1,
        })),
        isTraining: false,
        completedAt: new Date(),
      });
    } catch (err) {
      console.error('FederatedRound persist:', err.message);
    }
  }, 6000);
}

// POST /api/federated/start  — trigger a training round
router.post('/start', auth, startTraining);

// POST /api/federated/start-round  — alias (implementation plan naming)
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
