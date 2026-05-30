import express from 'express';
import auth        from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import Doctor      from '../models/Doctor.js';
import Patient     from '../models/Patient.js';
import Record      from '../models/Record.js';
import Vital       from '../models/Vital.js';
import AccessLog   from '../models/AccessLog.js';
import * as analytics from '../services/analytics.js';
import * as demoStore  from '../data/demoStore.js';

const router = express.Router();

// ── GET /api/doctor/me  — fetch doctor profile from DB ──────────────────────
router.get('/me', auth, requireRole('doctor'), async (req, res) => {
  try {
    if (demoStore.isMemory()) {
      const doc = demoStore.getDoctors().find(d => d.userId === req.user.id);
      return res.json(doc || { name: req.user.name, specialty: 'General', hospital: 'Apollo Hospitals', licenseNo: 'N/A' });
    }
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
    res.json(doctor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/doctor/patients  — list patients ────────────────────────────────
// ?mode=assigned → only assignedDoctorId matches; ?mode=all → all patients
router.get('/patients', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { mode } = req.query;
    if (demoStore.isMemory()) return res.json(await demoStore.listPatients());

    let query = {};
    if (mode === 'assigned') {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (doctor) query.assignedDoctorId = doctor._id;
    }
    const patients = await Patient.find(query).sort({ createdAt: -1 }).limit(30);
    res.json(patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/doctor/uploads  — recent uploaded records ──────────────────────
router.get('/uploads', auth, requireRole('doctor'), async (req, res) => {
  try {
    if (demoStore.isMemory()) return res.json(await demoStore.listUploads());
    const uploads = await Record.find({ doctorName: req.user.name })
      .sort({ createdAt: -1 }).limit(15);
    res.json(uploads);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/doctor/uploads  — simulate file upload (linked to patient) ─────
router.post('/uploads', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { filename, fileSize, fileType, patientId, notes } = req.body;
    const recordId = `RPT-${Date.now().toString().slice(-6)}`;

    if (demoStore.isMemory()) {
      const record = await demoStore.createRecord({
        recordId,
        type: fileType || 'Report',
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        doctorName: req.user.name,
        status: 'normal',
        icon: 'DOC',
        filename,
        fileSize,
        patientRef: patientId || null,
        notes: notes || '',
      });
      await demoStore.createLog({ actor: req.user.name, action: `Uploaded ${filename || 'report'}`, color: '#a78bfa' });
      return res.status(201).json(record);
    }

    const doctor      = await Doctor.findOne({ userId: req.user.id });
    const hospitalName = doctor?.hospital || 'Apollo Hospitals';
    const patient     = patientId ? await Patient.findById(patientId) : null;

    const record = await Record.create({
      recordId,
      type:        fileType || 'Report',
      date:        new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      doctorName:  req.user.name,
      hospital:    hospitalName,
      status:      'normal',
      icon:        '⬡',
      filename,
      fileSize,
      patientRef:  patientId || null,
      patientName: patient?.name || null,
      notes:       notes || '',
      encrypted:   true,
    });

    await AccessLog.create({
      actor:      req.user.name,
      action:     `Uploaded ${filename || 'report'}${patient ? ` for ${patient.name}` : ''}`,
      color:      '#a78bfa',
      patientRef: patientId || null,
      role:       'doctor',
    });
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/doctor/patients/:id/update  — update patient clinical data ────
router.patch('/patients/:id/update', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { diagnosis, riskAnnotations, riskScore, prescriptions, medicalHistory, condition } = req.body;

    if (demoStore.isMemory()) {
      // In-memory: find patient and merge fields
      const patients = demoStore.getState().patients;
      const idx = patients.findIndex(p => p._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Patient not found' });
      Object.assign(patients[idx], {
        diagnosis, riskAnnotations, riskScore, prescriptions, medicalHistory, condition,
        lastUpdatedByDoctor: req.user.name,
        lastDoctorUpdateAt: new Date().toISOString(),
      });
      await demoStore.createLog({ actor: req.user.name, action: `Updated record for ${patients[idx].name}`, color: '#a78bfa' });
      return res.json({ status: 'ok', patient: patients[idx] });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (diagnosis        !== undefined) patient.diagnosis        = diagnosis;
    if (riskAnnotations  !== undefined) patient.riskAnnotations  = riskAnnotations;
    if (riskScore        !== undefined) patient.riskScore        = riskScore;
    if (condition        !== undefined) patient.condition        = condition;
    if (prescriptions    !== undefined) patient.prescriptions    = prescriptions;
    if (medicalHistory   !== undefined) patient.medicalHistory   = medicalHistory;

    patient.lastUpdatedByDoctor = req.user.name;
    patient.lastDoctorUpdateAt  = new Date();

    // Recalculate health score
    const [latestVitals, records] = await Promise.all([
      Vital.find({ userId: patient.userId }).sort({ createdAt: -1 }).limit(4),
      Record.find({ patientRef: patient._id }),
    ]);
    patient.healthScore = analytics.calculateHealthScore(latestVitals, records);

    await patient.save();

    await AccessLog.create({
      actor:      req.user.name,
      action:     `Updated clinical record for ${patient.name}`,
      color:      '#a78bfa',
      patientRef: patient._id,
      role:       'doctor',
    });

    res.json({ status: 'ok', patient });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/doctor/patients/:id/vitals  — update a patient's vitals ────────
router.post('/patients/:id/vitals', auth, requireRole('doctor'), async (req, res) => {
  try {
    const { hr, sp, bp, gl } = req.body;

    if (demoStore.isMemory()) {
      const patients = demoStore.getState().patients;
      const patient = patients.find((p) => p._id === req.params.id);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      await demoStore.createLog({
        actor: req.user.name,
        action: `Updated vitals for ${patient.name}`,
        color: '#34d399',
        role: 'doctor',
      });
      return res.json({ status: 'ok', newHealthScore: patient.healthScore, message: 'Vitals saved (memory mode)' });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const tasks = [];
    const uid   = patient.userId;
    if (hr) tasks.push(Vital.create({ userId: uid, label: 'Heart Rate',     val: Number(hr), unit: 'bpm',   color: '#f87171' }));
    if (sp) tasks.push(Vital.create({ userId: uid, label: 'SpO₂',           val: Number(sp), unit: '%',     color: '#34d399' }));
    if (bp) tasks.push(Vital.create({ userId: uid, label: 'Blood Pressure', val: Number(bp), unit: 'mmHg',  color: '#60a5fa' }));
    if (gl) tasks.push(Vital.create({ userId: uid, label: 'Glucose',        val: Number(gl), unit: 'mg/dL', color: '#fbbf24' }));
    await Promise.all(tasks);

    // Recalculate health score
    const [vitals, records] = await Promise.all([
      Vital.find({ userId: uid }).sort({ createdAt: -1 }).limit(4),
      Record.find({ patientRef: patient._id }),
    ]);
    patient.healthScore = analytics.calculateHealthScore(vitals, records);
    await patient.save();

    await AccessLog.create({
      actor: req.user.name, action: `Updated vitals for ${patient.name}`,
      color: '#34d399', patientRef: patient._id, role: 'doctor',
    });

    res.json({ status: 'ok', newHealthScore: patient.healthScore });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
