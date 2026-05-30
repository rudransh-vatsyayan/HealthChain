import express from 'express';
import auth        from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import Patient     from '../models/Patient.js';
import Record      from '../models/Record.js';
import Vital       from '../models/Vital.js';
import * as demoStore from '../data/demoStore.js';

const router = express.Router();

// ── GET /api/patients/me  — patient's own enriched profile ───────────────────
router.get('/me', auth, requireRole('patient'), async (req, res) => {
  try {
    if (demoStore.isMemory()) {
      const p = await demoStore.findPatientByUserId(req.user.id);
      if (!p) return res.status(404).json({ error: 'Patient profile not found' });
      const records = (await demoStore.listRecords()).filter(r => r.patientRef === p._id);
      return res.json({ ...p, recordCount: records.length });
    }

    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

    const [records, vitals] = await Promise.all([
      Record.find({ patientRef: patient._id }).sort({ createdAt: -1 }),
      Vital.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      ...patient.toObject(),
      recordCount:  records.length,
      recentVitals: vitals.slice(0, 4),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/patients  — all patients (doctor view) ──────────────────────────
router.get('/', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { mode } = req.query; // 'assigned' | 'all' (default: 'all')
    if (demoStore.isMemory()) return res.json(await demoStore.listPatients());

    let query = {};
    if (mode === 'assigned') {
      const { Doctor } = await import('../models/Doctor.js');
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (doctor) query.assignedDoctorId = doctor._id;
    }
    const patients = await Patient.find(query).sort({ createdAt: -1 }).limit(30);
    res.json(patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/patients/:id  — single patient detail (doctor view) ─────────────
router.get('/:id', auth, requireRole('doctor'), async (req, res) => {
  try {
    if (demoStore.isMemory()) {
      const patients = await demoStore.listPatients();
      const p = patients.find(p => p._id === req.params.id);
      return p ? res.json(p) : res.status(404).json({ error: 'Not found' });
    }
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const [records, vitals] = await Promise.all([
      Record.find({ patientRef: patient._id }).sort({ createdAt: -1 }),
      Vital.find({ userId: patient.userId }).sort({ createdAt: -1 }).limit(4),
    ]);

    res.json({ ...patient.toObject(), records, recentVitals: vitals });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/patients/:id/records  — patient records (doctor view) ───────────
router.get('/:id/records', auth, requireRole('doctor'), async (req, res) => {
  try {
    if (demoStore.isMemory()) {
      const all = await demoStore.listRecords();
      return res.json(all.filter(r => r.patientRef === req.params.id));
    }
    const records = await Record.find({ patientRef: req.params.id }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
