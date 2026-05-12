const router  = require('express').Router();
const auth    = require('../middleware/auth');
const Patient = require('../models/Patient');
const demoStore = require('../data/demoStore');

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

module.exports = router;
