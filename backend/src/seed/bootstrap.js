import User             from '../models/User.js';
import Patient          from '../models/Patient.js';
import Doctor           from '../models/Doctor.js';
import Record           from '../models/Record.js';
import AccessLog        from '../models/AccessLog.js';
import InsuranceRequest from '../models/InsuranceRequest.js';
import FederatedRound   from '../models/FederatedRound.js';
import Vital            from '../models/Vital.js';
import * as demoStore   from '../data/demoStore.js';

/* ─────────────────────────────────────────────────────────────────────────────
   SEED DATA — 6 users with real names and full clinical profiles
   ─────────────────────────────────────────────────────────────────────────────

   LOGIN CREDENTIALS:
   ──────────────────────────────────────────────────────────────────
   DOCTORS
     rudransh@healthchain.io  / health123  →  Dr. Rudransh Vatsyayan
     doctor@healthchain.io    / health123  →  Dr. Arjun Sharma

   PATIENTS
     sinchana@healthchain.io  / health123  →  Sinchana
     patient@healthchain.io   / health123  →  Priya Nair

   INSURERS
     sathwik@healthchain.io   / health123  →  Sathwik
     insurer@healthchain.io   / health123  →  MediShield Corp

   ─────────────────────────────────────────────────────────────────────────── */

async function seedDemoData({ reset = false } = {}) {
  if (demoStore.isMemory()) return demoStore.seed({ reset });

  // ── Reset or skip ────────────────────────────────────────────────────────
  if (reset) {
    await Promise.all([
      User, Patient, Doctor, Record, AccessLog,
      InsuranceRequest, FederatedRound, Vital,
    ].map(M => M.deleteMany({})));
  } else {
    const existing = await User.countDocuments();
    if (existing > 0) return false;
  }

  const now = new Date();
  const daysAgo = (n) => new Date(now - n * 86400000);

  // ── USERS ────────────────────────────────────────────────────────────────
  const [rudransh, arjun, sinchana, priya, sathwik, medishield] = await Promise.all([
    User.create({ email: 'rudransh@healthchain.io', password: 'health123', name: 'Dr. Rudransh Vatsyayan', role: 'doctor' }),
    User.create({ email: 'doctor@healthchain.io',   password: 'health123', name: 'Dr. Arjun Sharma',       role: 'doctor' }),
    User.create({ email: 'sinchana@healthchain.io', password: 'health123', name: 'Sinchana',               role: 'patient' }),
    User.create({ email: 'patient@healthchain.io',  password: 'health123', name: 'Priya Nair',             role: 'patient' }),
    User.create({ email: 'sathwik@healthchain.io',  password: 'health123', name: 'Sathwik',                role: 'insurer' }),
    User.create({ email: 'insurer@healthchain.io',  password: 'health123', name: 'MediShield Corp',        role: 'insurer' }),
  ]);

  // ── DOCTORS ──────────────────────────────────────────────────────────────
  const [docRudransh, docArjun] = await Promise.all([
    Doctor.create({
      userId:    rudransh._id,
      name:      'Dr. Rudransh Vatsyayan',
      specialty: 'Neurologist',
      hospital:  'AIIMS Delhi',
      licenseNo: 'MCI-DL-29847',
    }),
    Doctor.create({
      userId:    arjun._id,
      name:      'Dr. Arjun Sharma',
      specialty: 'Cardiologist',
      hospital:  'Apollo Hospitals',
      licenseNo: 'MCI-KA-20341',
    }),
  ]);

  // ── PATIENTS ─────────────────────────────────────────────────────────────
  const [patSinchana, patPriya, patRaj, patAnita, patVivek, patDeepa] = await Promise.all([
    Patient.create({
      userId:           sinchana._id,
      assignedDoctorId: docRudransh._id,
      name:             'Sinchana',
      patientId:        'HC-2024-3301',
      bloodType:        'A+',
      healthScore:      88,
      riskScore:        15,
      age:              24,
      insurance:        'StarHealth',
      isVerified:       true,
      avatar:           'SC',
      condition:        'Mild Asthma',
      diagnosis:        'Controlled mild persistent asthma. Spirometry shows FEV1 at 82%. Responsive to bronchodilators.',
      riskAnnotations:  'Low risk. Continue current inhaler regimen. Annual spirometry recommended.',
      lastUpdatedByDoctor: 'Dr. Rudransh Vatsyayan',
      lastDoctorUpdateAt:  daysAgo(2),
      prescriptions: [
        { medication: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed (max 4x/day)', startDate: 'Jan 10, 2024', prescribedBy: 'Dr. Rudransh', active: true },
        { medication: 'Budesonide', dosage: '200mcg', frequency: 'Twice daily', startDate: 'Jan 10, 2024', prescribedBy: 'Dr. Rudransh', active: true },
        { medication: 'Montelukast', dosage: '10mg', frequency: 'Once daily (evening)', startDate: 'Mar 1, 2024', prescribedBy: 'Dr. Rudransh', active: true },
      ],
      medicalHistory: [
        { condition: 'Mild Persistent Asthma', diagnosedDate: 'Jan 2024', status: 'active', notes: 'Triggered by cold air and exercise. Well-controlled.', recordedBy: 'Dr. Rudransh' },
        { condition: 'Vitamin D Deficiency', diagnosedDate: 'Nov 2023', status: 'resolved', notes: 'Supplemented for 3 months. Levels normalized.', recordedBy: 'Dr. Rudransh' },
      ],
    }),

    Patient.create({
      userId:           priya._id,
      assignedDoctorId: docArjun._id,
      name:             'Priya Nair',
      patientId:        'HC-2024-8821',
      bloodType:        'B+',
      healthScore:      92,
      riskScore:        8,
      age:              34,
      insurance:        'MediShield',
      isVerified:       true,
      avatar:           'PN',
      condition:        'Healthy',
      diagnosis:        'Excellent cardiac health. ECG normal sinus rhythm. BP well controlled. Continue preventive care.',
      riskAnnotations:  'Very low risk. No significant findings. Annual cardiac screening recommended.',
      lastUpdatedByDoctor: 'Dr. Arjun Sharma',
      lastDoctorUpdateAt:  daysAgo(5),
      prescriptions: [
        { medication: 'Vitamin D3', dosage: '60,000 IU', frequency: 'Once weekly', startDate: 'Feb 2024', prescribedBy: 'Dr. Arjun', active: true },
        { medication: 'Omega-3', dosage: '1000mg', frequency: 'Once daily with food', startDate: 'Feb 2024', prescribedBy: 'Dr. Arjun', active: true },
      ],
      medicalHistory: [
        { condition: 'Mild Hypertension', diagnosedDate: 'Mar 2023', status: 'resolved', notes: 'Lifestyle changes effective. BP now normal range.', recordedBy: 'Dr. Arjun' },
        { condition: 'Seasonal Allergic Rhinitis', diagnosedDate: 'Apr 2022', status: 'chronic', notes: 'Managed with antihistamines during season.', recordedBy: 'Dr. Arjun' },
      ],
    }),

    // Additional patients (no login — doctor-managed)
    Patient.create({
      assignedDoctorId: docArjun._id,
      name: 'Raj Kumar', patientId: 'HC-2024-0022', bloodType: 'O+',
      healthScore: 71, riskScore: 45, age: 58, insurance: 'StarHealth', avatar: 'RK',
      condition: 'Type 2 Diabetes', isVerified: true,
      diagnosis: 'T2DM with poor glycemic control. HbA1c 8.2%. Needs medication adjustment.',
      riskAnnotations: 'Medium-high risk. Neuropathy screening needed. Foot care protocol initiated.',
      prescriptions: [
        { medication: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', prescribedBy: 'Dr. Arjun', active: true },
        { medication: 'Glipizide', dosage: '5mg', frequency: 'Once daily before breakfast', prescribedBy: 'Dr. Arjun', active: true },
      ],
      medicalHistory: [
        { condition: 'Type 2 Diabetes Mellitus', diagnosedDate: 'Jun 2019', status: 'chronic', notes: 'Progressive. Dietary non-compliance.', recordedBy: 'Dr. Arjun' },
        { condition: 'Hypertension', diagnosedDate: 'Aug 2020', status: 'active', notes: 'On Amlodipine 5mg.', recordedBy: 'Dr. Arjun' },
      ],
    }),

    Patient.create({
      assignedDoctorId: docRudransh._id,
      name: 'Anita Singh', patientId: 'HC-2024-0145', bloodType: 'A-',
      healthScore: 85, riskScore: 22, age: 45, insurance: 'HDFC Ergo', avatar: 'AS',
      condition: 'Migraine', isVerified: true,
      diagnosis: 'Episodic migraine with aura. 2-3 episodes/month. Triptan-responsive.',
      riskAnnotations: 'Low-medium risk. Trigger diary recommended. MRI clear.',
      prescriptions: [
        { medication: 'Sumatriptan', dosage: '50mg', frequency: 'At onset of migraine', prescribedBy: 'Dr. Rudransh', active: true },
        { medication: 'Propranolol', dosage: '40mg', frequency: 'Twice daily (prophylaxis)', prescribedBy: 'Dr. Rudransh', active: true },
      ],
      medicalHistory: [
        { condition: 'Episodic Migraine with Aura', diagnosedDate: 'Jan 2021', status: 'chronic', notes: 'Well-controlled on prophylaxis.', recordedBy: 'Dr. Rudransh' },
      ],
    }),

    Patient.create({
      assignedDoctorId: docArjun._id,
      name: 'Vivek Menon', patientId: 'HC-2024-0287', bloodType: 'B-',
      healthScore: 61, riskScore: 62, age: 62, insurance: 'MediShield', avatar: 'VM',
      condition: 'CAD', isVerified: true,
      diagnosis: 'Coronary artery disease. Post-stent (2023). EF 45%. On dual antiplatelet therapy.',
      riskAnnotations: 'HIGH RISK. Monthly review mandatory. Treadmill stress test due. No strenuous activity.',
      prescriptions: [
        { medication: 'Aspirin', dosage: '75mg', frequency: 'Once daily', prescribedBy: 'Dr. Arjun', active: true },
        { medication: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', prescribedBy: 'Dr. Arjun', active: true },
        { medication: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily (night)', prescribedBy: 'Dr. Arjun', active: true },
        { medication: 'Ramipril', dosage: '5mg', frequency: 'Once daily', prescribedBy: 'Dr. Arjun', active: true },
      ],
      medicalHistory: [
        { condition: 'Coronary Artery Disease', diagnosedDate: 'Feb 2023', status: 'active', notes: 'Stent placed in LAD. Post-procedure recovery complete.', recordedBy: 'Dr. Arjun' },
        { condition: 'Hyperlipidemia', diagnosedDate: 'Jan 2020', status: 'active', notes: 'On statin therapy. LDL now 95.', recordedBy: 'Dr. Arjun' },
        { condition: 'Hypertension', diagnosedDate: 'Jan 2018', status: 'active', notes: 'Controlled on ACE inhibitor.', recordedBy: 'Dr. Arjun' },
      ],
    }),

    Patient.create({
      assignedDoctorId: docRudransh._id,
      name: 'Deepa Ghosh', patientId: 'HC-2024-0391', bloodType: 'AB+',
      healthScore: 91, riskScore: 5, age: 39, insurance: 'Bajaj Allianz', avatar: 'DG',
      condition: 'Healthy', isVerified: true,
      diagnosis: 'Annual wellness check complete. All parameters within normal range.',
      riskAnnotations: 'Very low risk. Continue annual screening.',
      prescriptions: [],
      medicalHistory: [
        { condition: 'Appendectomy', diagnosedDate: 'Jun 2015', status: 'resolved', notes: 'Laparoscopic. Full recovery.', recordedBy: 'Dr. Rudransh' },
      ],
    }),
  ]);

  // ── RECORDS ──────────────────────────────────────────────────────────────
  await Record.insertMany([
    // Sinchana's records
    { recordId: 'RPT-SC-001', patientRef: patSinchana._id, patientName: 'Sinchana', type: 'Spirometry Report', date: 'Apr 10, 2024', doctorName: 'Dr. Rudransh Vatsyayan', hospital: 'AIIMS Delhi', status: 'normal', icon: '🫁', notes: 'FEV1: 82%. FVC: 91%. FEV1/FVC: 0.78. Mild obstruction pattern consistent with asthma.', encrypted: true },
    { recordId: 'RPT-SC-002', patientRef: patSinchana._id, patientName: 'Sinchana', type: 'Chest X-Ray', date: 'Mar 20, 2024', doctorName: 'Dr. Rudransh Vatsyayan', hospital: 'AIIMS Delhi', status: 'normal', icon: '🩻', notes: 'Clear lung fields. No consolidation or effusion.', encrypted: true },
    { recordId: 'RPT-SC-003', patientRef: patSinchana._id, patientName: 'Sinchana', type: 'Blood Panel', date: 'Mar 15, 2024', doctorName: 'Dr. Rudransh Vatsyayan', hospital: 'AIIMS Delhi', status: 'normal', icon: '🧪', notes: 'CBC, LFT, KFT within normal limits. IgE slightly elevated (120 IU/mL).', encrypted: true },
    { recordId: 'RPT-SC-004', patientRef: patSinchana._id, patientName: 'Sinchana', type: 'Prescription', date: 'Jan 10, 2024', doctorName: 'Dr. Rudransh Vatsyayan', hospital: 'AIIMS Delhi', status: 'active', icon: '💊', prescription: 'Salbutamol 100mcg PRN + Budesonide 200mcg BD + Montelukast 10mg OD', encrypted: true },

    // Priya's records
    { recordId: 'RPT-PN-001', patientRef: patPriya._id, patientName: 'Priya Nair', type: 'ECG Report', date: 'Apr 12, 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'normal', icon: '❤️', notes: 'Normal sinus rhythm. HR 74 bpm. No ST changes. QTc 410ms.', encrypted: true },
    { recordId: 'RPT-PN-002', patientRef: patPriya._id, patientName: 'Priya Nair', type: 'Blood Panel', date: 'Mar 28, 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'flagged', icon: '🔬', notes: 'Cholesterol: 215 mg/dL (borderline high). LDL: 138. Triglycerides: 170. Initiated omega-3 supplementation.', encrypted: true },
    { recordId: 'RPT-PN-003', patientRef: patPriya._id, patientName: 'Priya Nair', type: 'Chest X-Ray', date: 'Mar 10, 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'normal', icon: '🩻', notes: 'Clear. Normal cardiac silhouette.', encrypted: true },
    { recordId: 'RPT-PN-004', patientRef: patPriya._id, patientName: 'Priya Nair', type: 'Echocardiogram', date: 'Feb 5, 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'normal', icon: '📡', notes: 'EF 62%. Normal wall motion. No valvular disease. LVEDD 48mm.', encrypted: true },
    { recordId: 'RPT-PN-005', patientRef: patPriya._id, patientName: 'Priya Nair', type: 'Prescription', date: 'Feb 5, 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'active', icon: '💊', prescription: 'Vitamin D3 60,000 IU weekly × 8 weeks, then 1,000 IU daily maintenance. Omega-3 1g OD with food.', encrypted: true },

    // Raj Kumar's records (flagged)
    { recordId: 'RPT-RK-001', patientRef: patRaj._id, patientName: 'Raj Kumar', type: 'HbA1c Report', date: 'Apr 5, 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'flagged', icon: '📊', notes: 'HbA1c: 8.2% (target < 7%). Fasting glucose 184 mg/dL. Medication escalation required.', encrypted: true },
    { recordId: 'RPT-RK-002', patientRef: patRaj._id, patientName: 'Raj Kumar', type: 'Fundus Examination', date: 'Mar 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'flagged', icon: '👁️', notes: 'Mild non-proliferative diabetic retinopathy. Annual follow-up with ophthalmology.', encrypted: true },

    // Vivek Menon's records (high risk)
    { recordId: 'RPT-VM-001', patientRef: patVivek._id, patientName: 'Vivek Menon', type: 'Cardiac MRI', date: 'Apr 8, 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'flagged', icon: '🫀', notes: 'EF 45% (reduced). Mild anterior hypokinesis. Post-stent fibrosis noted. Continue current therapy.', encrypted: true },
    { recordId: 'RPT-VM-002', patientRef: patVivek._id, patientName: 'Vivek Menon', type: 'Lipid Panel', date: 'Mar 2024', doctorName: 'Dr. Arjun Sharma', hospital: 'Apollo Hospitals', status: 'normal', icon: '🧪', notes: 'LDL 95 mg/dL on statin. Total chol 170. Target achieved.', encrypted: true },
  ]);

  // ── VITALS ───────────────────────────────────────────────────────────────
  await Vital.insertMany([
    // Sinchana
    { userId: sinchana._id, label: 'Heart Rate',     val: 78,  max: 120, unit: 'bpm',   color: '#f87171' },
    { userId: sinchana._id, label: 'SpO₂',           val: 96,  max: 100, unit: '%',     color: '#34d399' },
    { userId: sinchana._id, label: 'Blood Pressure', val: 115, max: 180, unit: 'mmHg',  color: '#60a5fa' },
    { userId: sinchana._id, label: 'Glucose',        val: 88,  max: 200, unit: 'mg/dL', color: '#fbbf24' },
    // Priya
    { userId: priya._id,    label: 'Heart Rate',     val: 72,  max: 120, unit: 'bpm',   color: '#f87171' },
    { userId: priya._id,    label: 'SpO₂',           val: 98,  max: 100, unit: '%',     color: '#34d399' },
    { userId: priya._id,    label: 'Blood Pressure', val: 118, max: 180, unit: 'mmHg',  color: '#60a5fa' },
    { userId: priya._id,    label: 'Glucose',        val: 92,  max: 200, unit: 'mg/dL', color: '#fbbf24' },
  ]);

  // ── ACCESS LOGS ──────────────────────────────────────────────────────────
  await AccessLog.insertMany([
    { actor: 'Dr. Rudransh Vatsyayan', action: 'Uploaded Spirometry Report for Sinchana',  color: '#a78bfa', role: 'doctor',  patientRef: patSinchana._id, createdAt: daysAgo(0) },
    { actor: 'Dr. Arjun Sharma',       action: 'Updated clinical record for Priya Nair',    color: '#a78bfa', role: 'doctor',  patientRef: patPriya._id,    createdAt: daysAgo(0) },
    { actor: 'Sathwik',                action: 'Insurance access request initiated',         color: '#fbbf24', role: 'insurer',                              createdAt: daysAgo(1) },
    { actor: 'System',                 action: 'Federated round completed — accuracy 87.4%', color: '#00f5ff', role: 'system',                              createdAt: daysAgo(2) },
    { actor: 'Dr. Arjun Sharma',       action: 'Updated vitals for Raj Kumar',               color: '#34d399', role: 'doctor',  patientRef: patRaj._id,      createdAt: daysAgo(2) },
    { actor: 'MediShield Corp',        action: 'Viewed derived insights — population mode',  color: '#fbbf24', role: 'insurer',                              createdAt: daysAgo(3) },
    { actor: 'System',                 action: 'QR token generated for Sinchana',            color: '#00f5ff', role: 'system',  patientRef: patSinchana._id, createdAt: daysAgo(5) },
    { actor: 'Dr. Rudransh Vatsyayan', action: 'Updated diagnosis for Anita Singh',          color: '#a78bfa', role: 'doctor',  patientRef: patAnita._id,    createdAt: daysAgo(7) },
  ]);

  // ── FEDERATED ROUNDS ─────────────────────────────────────────────────────
  await FederatedRound.insertMany([
    { roundId: 'ROUND-INIT-1', round: 1, accuracy: 74.8, maxRounds: 5, isTraining: false, completedAt: daysAgo(14) },
    { roundId: 'ROUND-INIT-2', round: 2, accuracy: 79.3, maxRounds: 5, isTraining: false, completedAt: daysAgo(10) },
    { roundId: 'ROUND-INIT-3', round: 3, accuracy: 83.1, maxRounds: 5, isTraining: false, completedAt: daysAgo(6)  },
    { roundId: 'ROUND-INIT-4', round: 4, accuracy: 87.4, maxRounds: 5, isTraining: false, completedAt: daysAgo(2)  },
  ]);

  console.log('✅ HealthChain seed complete — 6 users, 6 patients, 12 records');
  return true;
}

export { seedDemoData };
