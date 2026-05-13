import express from 'express';
import auth from '../middleware/auth.js';
import Record from '../models/Record.js';
import AccessLog from '../models/AccessLog.js';
import * as demoStore from '../data/demoStore.js';

const router = express.Router();

// GET /api/records
router.get('/', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) return res.json(await demoStore.listRecords());
    const records = await Record.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/records
router.post('/', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) {
      const record = await demoStore.createRecord(req.body);
      await demoStore.createLog({
        actor: req.user.name,
        action: `Uploaded ${req.body.type || 'record'}`,
        color: '#a78bfa',
      });
      return res.status(201).json(record);
    }

    const record = await Record.create(req.body);
    await AccessLog.create({
      actor: req.user.name,
      action: `Uploaded ${req.body.type || 'record'}`,
      color: '#a78bfa',
    });
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
