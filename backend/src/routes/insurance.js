import express from 'express';
import auth from '../middleware/auth.js';
import InsuranceRequest from '../models/InsuranceRequest.js';

const router = express.Router();

const STEPS = [
  { label: 'Access Request Sent',   sub: 'Encrypted via AES-256 channel',   icon: '⬡' },
  { label: 'Blockchain Verification', sub: 'Smart contract validating policy', icon: '◈' },
  { label: 'Patient Notified',      sub: 'Priya Nair reviewing request',     icon: '◎' },
  { label: 'Patient Approved',      sub: 'Access granted for 24 hours',      icon: '✓' },
  { label: 'Records Decrypted',     sub: 'Authorized read access active',    icon: '⬢' },
];

// POST /api/insurance/request  — initiate flow, returns requestId
router.post('/request', auth, async (req, res) => {
  try {
    const requestId = `INS-${Date.now()}`;
    await InsuranceRequest.create({
      requestId,
      insurerId: req.user.id,
      status: 'pending',
    });
    res.json({ requestId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insurance/steps/:id  — SSE step-by-step progress
router.get('/steps/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    await InsuranceRequest.findOneAndUpdate(
      { requestId: id },
      { status: 'in_progress' },
    );
  } catch (_) { /* non-fatal */ }

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  let step = 0;
  const done = [];

  const iv = setInterval(async () => {
    if (step < STEPS.length) {
      res.write(`data: ${JSON.stringify({ step, done: [...done], steps: STEPS, complete: false })}\n\n`);
      done.push(step);
      step++;
    } else {
      res.write(`data: ${JSON.stringify({ complete: true, steps: STEPS })}\n\n`);
      clearInterval(iv);
      try {
        await InsuranceRequest.findOneAndUpdate(
          { requestId: id },
          {
            status: 'completed',
            steps: STEPS.map(s => ({ label: s.label, completedAt: new Date() })),
          },
        );
      } catch (_) { /* non-fatal */ }
      res.end();
    }
  }, 1600);

  req.on('close', () => clearInterval(iv));
});

export default router;
