const router = require('express').Router();
const auth   = require('../middleware/auth');

const STEPS = [
  { label: 'Access Request Sent',   sub: 'Encrypted via AES-256 channel',   icon: '⬡' },
  { label: 'Blockchain Verification', sub: 'Smart contract validating policy', icon: '◈' },
  { label: 'Patient Notified',      sub: 'Priya Nair reviewing request',     icon: '◎' },
  { label: 'Patient Approved',      sub: 'Access granted for 24 hours',      icon: '✓' },
  { label: 'Records Decrypted',     sub: 'Authorized read access active',    icon: '⬢' },
];

// POST /api/insurance/request  — initiate flow, returns requestId
router.post('/request', auth, (req, res) => {
  const requestId = `INS-${Date.now()}`;
  res.json({ requestId });
});

// GET /api/insurance/steps/:id  — SSE step-by-step progress
router.get('/steps/:id', auth, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  let step = 0;
  const done = [];

  const iv = setInterval(() => {
    if (step < STEPS.length) {
      res.write(`data: ${JSON.stringify({ step, done: [...done], steps: STEPS, complete: false })}\n\n`);
      done.push(step);
      step++;
    } else {
      res.write(`data: ${JSON.stringify({ complete: true, steps: STEPS })}\n\n`);
      clearInterval(iv);
      res.end();
    }
  }, 1600);

  req.on('close', () => clearInterval(iv));
});

module.exports = router;
