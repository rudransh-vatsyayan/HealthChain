import express from 'express';
import auth from '../middleware/auth.js';
import Patient from '../models/Patient.js';
import * as demoStore from '../data/demoStore.js';

const router = express.Router();

// GET /api/patients  — all patients (doctor view)
router.get('/', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) return res.json(await demoStore.listPatients());
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/patients/me  — own profile (patient view)
router.get('/me', auth, async (req, res) => {
  try {
    const patient = demoStore.isMemory()
      ? await demoStore.findPatientByUserId(req.user.id)
      : await Patient.findOne({ userId: req.user.id });
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
    res.json(patient);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
