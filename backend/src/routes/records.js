import express from 'express';
import auth        from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import Record      from '../models/Record.js';
import Patient     from '../models/Patient.js';
import AccessLog   from '../models/AccessLog.js';
import * as demoStore from '../data/demoStore.js';

const router = express.Router();

// ── GET /api/records  — role-scoped record retrieval ────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) {
      const all = await demoStore.listRecords();
      if (req.user.role === 'patient') {
        const patient = await demoStore.findPatientByUserId(req.user.id);
        if (!patient) return res.json([]);
        return res.json(all.filter(r => r.patientRef === patient._id));
      }
      if (req.user.role === 'doctor') return res.json(all);
      return res.status(403).json({ error: 'Access denied' });
    }

    // ── Patient: own records only ────────────────────────────────────────
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) return res.json([]);
      const records = await Record.find({ patientRef: patient._id }).sort({ createdAt: -1 });
      return res.json(records);
    }

    // ── Doctor: all records or filter by patientRef ──────────────────────
    if (req.user.role === 'doctor') {
      const { patientRef } = req.query;
      const query = patientRef ? { patientRef } : {};
      const records = await Record.find(query).sort({ createdAt: -1 });
      return res.json(records);
    }

    // ── Insurer: no direct record access ─────────────────────────────────
    return res.status(403).json({ error: 'Insurers cannot access raw records. Use /api/insurance/insights' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/records  — create record (doctor only) ────────────────────────
router.post('/', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { patientRef, type, notes, prescription, ...rest } = req.body;
    if (!patientRef) return res.status(400).json({ error: 'patientRef is required' });

    if (demoStore.isMemory()) {
      const record = await demoStore.createRecord({ ...req.body, doctorName: req.user.name });
      await demoStore.createLog({ actor: req.user.name, action: `Uploaded ${type || 'record'}`, color: '#a78bfa' });
      return res.status(201).json(record);
    }

    const patient = await Patient.findById(patientRef);
    const record  = await Record.create({
      ...rest,
      patientRef,
      patientName: patient?.name,
      type,
      notes,
      prescription,
      doctorName: req.user.name,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      recordId: `RPT-${Date.now().toString().slice(-6)}`,
      encrypted: true,
    });
    await AccessLog.create({
      actor: req.user.name,
      action: `Uploaded ${type || 'record'} for ${patient?.name || 'patient'}`,
      color: '#a78bfa',
      patientRef,
      role: 'doctor',
    });
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
