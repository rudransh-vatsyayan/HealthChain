const router    = require('express').Router();
const auth      = require('../middleware/auth');
const Patient   = require('../models/Patient');
const Record    = require('../models/Record');
const AccessLog = require('../models/AccessLog');
const demoStore = require('../data/demoStore');

// GET /api/doctor/patients
router.get('/patients', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) return res.json((await demoStore.listPatients()).slice(0, 10));
    const patients = await Patient.find().limit(10).sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/doctor/uploads
router.get('/uploads', auth, async (req, res) => {
  try {
    if (demoStore.isMemory()) return res.json(await demoStore.listUploads());
    const uploads = await Record.find({ doctorName: { $exists: true } })
      .sort({ createdAt: -1 }).limit(10);
    res.json(uploads);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/doctor/uploads  — simulate file upload
router.post('/uploads', auth, async (req, res) => {
  try {
    const { filename, fileSize, fileType, patientId } = req.body;
    const recordId = `RPT-${Date.now().toString().slice(-5)}`;
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
      });
      await demoStore.createLog({
        actor: req.user.name,
        action: `Uploaded ${filename || 'report'}`,
        color: '#a78bfa',
      });
      return res.status(201).json(record);
    }

    const record = await Record.create({
      recordId,
      type:       fileType || 'Report',
      date:       new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      doctorName: req.user.name,
      status:     'normal',
      icon:       '⬡',
      filename,
      fileSize,
      patientRef: patientId || null,
    });
    await AccessLog.create({
      actor:  req.user.name,
      action: `Uploaded ${filename || 'report'}`,
      color:  '#a78bfa',
    });
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
