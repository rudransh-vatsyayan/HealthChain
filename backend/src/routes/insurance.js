import express from 'express';
import auth        from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import Patient            from '../models/Patient.js';
import Record             from '../models/Record.js';
import Vital              from '../models/Vital.js';
import InsuranceRequest   from '../models/InsuranceRequest.js';
import AccessLog          from '../models/AccessLog.js';
import * as demoStore     from '../data/demoStore.js';
import { generateInsuranceInsights, generatePopulationInsights } from '../services/insightService.js';

const router = express.Router();

const STEPS = [
  { label: 'Access Request Sent',    sub: 'Encrypted via AES-256 channel',        icon: '⬡' },
  { label: 'Blockchain Verification',sub: 'Smart contract validating policy',      icon: '◈' },
  { label: 'Patient Notified',       sub: 'Consent request dispatched',            icon: '◎' },
  { label: 'Patient Approved',       sub: 'Access granted for 24 hours',           icon: '✓' },
  { label: 'Insights Generated',     sub: 'Federated model processed request',     icon: '⬢' },
];

// ── POST /api/insurance/request  — initiate access flow ─────────────────────
router.post('/request', auth, requireRole('insurer'), async (req, res) => {
  try {
    const { patientDisplayId } = req.body;
    const requestId = `INS-${Date.now()}`;

    let patientId = null;
    if (patientDisplayId) {
      if (demoStore.isMemory()) {
        const p = (await demoStore.listPatients()).find((row) => row.patientId === patientDisplayId);
        if (p) patientId = p._id;
      } else {
        const p = await Patient.findOne({ patientId: patientDisplayId });
        if (p) patientId = p._id;
      }
    }

    if (demoStore.isMemory()) {
      await demoStore.createLog({
        actor: req.user.name,
        action: `Insurance access request initiated${patientId ? ` for patient ${patientDisplayId}` : ''}`,
        color: '#fbbf24',
        role: 'insurer',
      });
      return res.json({ requestId });
    }

    await InsuranceRequest.create({
      requestId,
      insurerId: req.user.id,
      patientId: patientId || undefined,
      status: 'pending',
    });

    await AccessLog.create({
      actor:  req.user.name,
      action: `Insurance access request initiated${patientId ? ` for patient ${patientDisplayId}` : ''}`,
      color:  '#fbbf24',
      patientRef: patientId || undefined,
      role: 'insurer',
    });

    res.json({ requestId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/insurance/steps/:id  — SSE step-by-step progress ────────────────
router.get('/steps/:id', auth, requireRole('insurer'), async (req, res) => {
  const { id } = req.params;

  if (!demoStore.isMemory()) {
    try {
      await InsuranceRequest.findOneAndUpdate({ requestId: id }, { status: 'in_progress' });
    } catch (_) { /* non-fatal */ }
  }

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
      let insights = null;
      try {
        if (demoStore.isMemory()) {
          const patients = await demoStore.listPatients();
          const patient = patients[0] || null;
          if (patient) {
            const records = (await demoStore.listRecords()).filter((r) => r.patientRef === patient._id);
            insights = generateInsuranceInsights(patient, [], records);
          }
        } else {
          const insReq  = await InsuranceRequest.findOne({ requestId: id });
          const patient = insReq?.patientId ? await Patient.findById(insReq.patientId) : null;
          if (patient) {
            const [vitals, records] = await Promise.all([
              Vital.find({ userId: patient.userId }).sort({ createdAt: -1 }).limit(10),
              Record.find({ patientRef: patient._id }),
            ]);
            insights = generateInsuranceInsights(patient, vitals, records);
            await InsuranceRequest.findOneAndUpdate(
              { requestId: id },
              {
                status: 'completed',
                steps: STEPS.map(s => ({ label: s.label, completedAt: new Date() })),
                insights,
              }
            );
          } else {
            await InsuranceRequest.findOneAndUpdate(
              { requestId: id },
              { status: 'completed', steps: STEPS.map(s => ({ label: s.label, completedAt: new Date() })) }
            );
          }
        }
      } catch (e) { console.error('Insight generation failed:', e.message); }

      res.write(`data: ${JSON.stringify({ complete: true, steps: STEPS, insights })}\n\n`);
      clearInterval(iv);
      res.end();
    }
  }, 1600);

  req.on('close', () => clearInterval(iv));
});

// ── GET /api/insurance/insights  — derived metrics only (NO raw records) ─────
router.get('/insights', auth, requireRole('insurer'), async (req, res) => {
  try {
    const { mode, patientDisplayId } = req.query;

    if (demoStore.isMemory()) {
      const patients = await demoStore.listPatients();
      const records = await demoStore.listRecords();

      if (mode === 'population' || !patientDisplayId) {
        return res.json(generatePopulationInsights(patients, records, []));
      }

      const patient = patients.find((p) => p.patientId === patientDisplayId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      const patientRecords = records.filter((r) => r.patientRef === patient._id);
      const insights = generateInsuranceInsights(patient, [], patientRecords);

      await demoStore.createLog({
        actor: req.user.name,
        action: `Viewed derived insights for patient ${patientDisplayId}`,
        color: '#fbbf24',
        role: 'insurer',
      });

      return res.json({
        type: 'patient',
        patientDisplayId: patient.patientId,
        ...insights,
      });
    }

    // ── Population mode ────────────────────────────────────────────────────
    if (mode === 'population' || !patientDisplayId) {
      const [patients, records] = await Promise.all([
        Patient.find(),
        Record.find(),
      ]);
      const vitals = await Vital.find();
      const summary = generatePopulationInsights(patients, records, vitals);
      return res.json(summary);
    }

    // ── Patient-specific mode ──────────────────────────────────────────────
    const patient = await Patient.findOne({ patientId: patientDisplayId });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const [vitals, records] = await Promise.all([
      Vital.find({ userId: patient.userId }).sort({ createdAt: -1 }).limit(10),
      Record.find({ patientRef: patient._id }),
    ]);

    const insights = generateInsuranceInsights(patient, vitals, records);

    await AccessLog.create({
      actor:  req.user.name,
      action: `Viewed derived insights for patient ${patientDisplayId}`,
      color:  '#fbbf24',
      patientRef: patient._id,
      role: 'insurer',
    });

    res.json({
      type: 'patient',
      patientDisplayId: patient.patientId,    // Only anonymized ID, never name
      ...insights,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/insurance/patients  — anonymized patient list for insurer ────────
// Returns ONLY patientId and age-group — never names, never records
router.get('/patients', auth, requireRole('insurer'), async (req, res) => {
  try {
    const patients = demoStore.isMemory()
      ? await demoStore.listPatients()
      : await Patient.find({}, 'patientId age insurance isVerified healthScore').lean();

    const anonymized = patients.map(p => ({
      patientDisplayId: p.patientId,
      ageGroup: !p.age ? 'Unknown' : p.age < 30 ? '18–30' : p.age < 50 ? '30–50' : '50+',
      coverageTier: p.insurance,
      enrolled: p.isVerified,
      riskBand: p.healthScore >= 85 ? 'low' : p.healthScore >= 65 ? 'medium' : 'high',
    }));
    res.json(anonymized);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
