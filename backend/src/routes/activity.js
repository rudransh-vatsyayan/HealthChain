import express from 'express';
import auth      from '../middleware/auth.js';
import AccessLog from '../models/AccessLog.js';
import * as demoStore from '../data/demoStore.js';

const router = express.Router();

// ── GET /api/activity  — scoped activity log ─────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) return res.json(await demoStore.listLogs());

    // All roles see their relevant logs
    const logs = await AccessLog.find()
      .sort({ createdAt: -1 })
      .limit(25);
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/activity  — create log entry ────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) return res.status(201).json(await demoStore.createLog(req.body));
    const log = await AccessLog.create({
      ...req.body,
      role: req.user.role,
    });
    res.status(201).json(log);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
