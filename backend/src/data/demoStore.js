import bcrypt from 'bcryptjs';

const state = {
  users:    [],
  patients: [],
  doctors:  [],
  records:  [],
  logs:     [],
};

const clone  = (v) => JSON.parse(JSON.stringify(v));
const stamp  = () => new Date().toISOString();
const uid    = (p) => `${p}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function reset() {
  state.users = []; state.patients = []; state.doctors = [];
  state.records = []; state.logs = [];
}

async function createUser({ email, password, name, role = 'patient' }) {
  const now  = stamp();
  const user = { _id: uid('usr'), email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 10), name, role, createdAt: now, updatedAt: now };
  state.users.push(user);
  return clone(user);
}

async function comparePassword(user, password) { return bcrypt.compare(password, user.password); }

async function seed({ reset: shouldReset = false } = {}) {
  if (shouldReset) await reset();
  if (state.users.length > 0) return false;

  const rudransh  = await createUser({ email: 'rudransh@healthchain.io', password: 'health123', name: 'Dr. Rudransh Vatsyayan', role: 'doctor'  });
  const arjun     = await createUser({ email: 'doctor@healthchain.io',   password: 'health123', name: 'Dr. Arjun Sharma',       role: 'doctor'  });
  const sinchana  = await createUser({ email: 'sinchana@healthchain.io', password: 'health123', name: 'Sinchana',               role: 'patient' });
  const priya     = await createUser({ email: 'patient@healthchain.io',  password: 'health123', name: 'Priya Nair',             role: 'patient' });
  const sathwik   = await createUser({ email: 'sathwik@healthchain.io',  password: 'health123', name: 'Sathwik',                role: 'insurer' });
  await createUser({ email: 'insurer@healthchain.io', password: 'health123', name: 'MediShield Corp', role: 'insurer' });

  const now = stamp();
  const docRudransh = { _id: uid('doc'), userId: rudransh._id, name: 'Dr. Rudransh Vatsyayan', specialty: 'Neurologist',  hospital: 'AIIMS Delhi',     licenseNo: 'MCI-DL-29847', createdAt: now };
  const docArjun    = { _id: uid('doc'), userId: arjun._id,    name: 'Dr. Arjun Sharma',       specialty: 'Cardiologist', hospital: 'Apollo Hospitals', licenseNo: 'MCI-KA-20341', createdAt: now };
  state.doctors.push(docRudransh, docArjun);

  const sc = {
    _id: uid('pat'), userId: sinchana._id, assignedDoctorId: docRudransh._id,
    name: 'Sinchana', patientId: 'HC-2024-3301', bloodType: 'A+', healthScore: 88, riskScore: 15,
    age: 24, insurance: 'StarHealth', isVerified: true, avatar: 'SC', condition: 'Mild Asthma',
    diagnosis: 'Controlled mild persistent asthma. Spirometry FEV1 82%.',
    riskAnnotations: 'Low risk. Continue current inhaler regimen.',
    lastUpdatedByDoctor: 'Dr. Rudransh Vatsyayan',
    prescriptions: [
      { _id: uid('rx'), medication: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed', startDate: 'Jan 10, 2024', prescribedBy: 'Dr. Rudransh', active: true },
      { _id: uid('rx'), medication: 'Budesonide',         dosage: '200mcg', frequency: 'Twice daily', startDate: 'Jan 10, 2024', prescribedBy: 'Dr. Rudransh', active: true },
    ],
    medicalHistory: [
      { _id: uid('mh'), condition: 'Mild Persistent Asthma', diagnosedDate: 'Jan 2024', status: 'active',   notes: 'Well-controlled on current regimen.',  recordedBy: 'Dr. Rudransh' },
      { _id: uid('mh'), condition: 'Vitamin D Deficiency',   diagnosedDate: 'Nov 2023', status: 'resolved', notes: 'Supplemented. Levels normalized.',       recordedBy: 'Dr. Rudransh' },
    ],
    createdAt: now,
  };

  const pn = {
    _id: uid('pat'), userId: priya._id, assignedDoctorId: docArjun._id,
    name: 'Priya Nair', patientId: 'HC-2024-8821', bloodType: 'B+', healthScore: 92, riskScore: 8,
    age: 34, insurance: 'MediShield', isVerified: true, avatar: 'PN', condition: 'Healthy',
    diagnosis: 'Excellent cardiac health. ECG normal sinus rhythm.',
    riskAnnotations: 'Very low risk. Annual cardiac screening recommended.',
    lastUpdatedByDoctor: 'Dr. Arjun Sharma',
    prescriptions: [
      { _id: uid('rx'), medication: 'Vitamin D3', dosage: '60,000 IU', frequency: 'Once weekly', startDate: 'Feb 2024', prescribedBy: 'Dr. Arjun', active: true },
      { _id: uid('rx'), medication: 'Omega-3',    dosage: '1000mg',    frequency: 'Once daily',   startDate: 'Feb 2024', prescribedBy: 'Dr. Arjun', active: true },
    ],
    medicalHistory: [
      { _id: uid('mh'), condition: 'Mild Hypertension',         diagnosedDate: 'Mar 2023', status: 'resolved', notes: 'Lifestyle changes effective.',   recordedBy: 'Dr. Arjun' },
      { _id: uid('mh'), condition: 'Seasonal Allergic Rhinitis', diagnosedDate: 'Apr 2022', status: 'chronic',  notes: 'Managed with antihistamines.',   recordedBy: 'Dr. Arjun' },
    ],
    createdAt: now,
  };

  state.patients.push(sc, pn,
    { _id: uid('pat'), name: 'Raj Kumar',   patientId: 'HC-2024-0022', bloodType: 'O+', healthScore: 71, riskScore: 45, age: 58, insurance: 'StarHealth',    avatar: 'RK', condition: 'Type 2 Diabetes', isVerified: true, prescriptions: [], medicalHistory: [], createdAt: now },
    { _id: uid('pat'), name: 'Anita Singh', patientId: 'HC-2024-0145', bloodType: 'A-', healthScore: 85, riskScore: 22, age: 45, insurance: 'HDFC Ergo',     avatar: 'AS', condition: 'Migraine',       isVerified: true, prescriptions: [], medicalHistory: [], createdAt: now },
    { _id: uid('pat'), name: 'Vivek Menon', patientId: 'HC-2024-0287', bloodType: 'B-', healthScore: 61, riskScore: 62, age: 62, insurance: 'MediShield',    avatar: 'VM', condition: 'CAD',            isVerified: true, prescriptions: [], medicalHistory: [], createdAt: now },
    { _id: uid('pat'), name: 'Deepa Ghosh', patientId: 'HC-2024-0391', bloodType: 'AB+',healthScore: 91, riskScore:  5, age: 39, insurance: 'Bajaj Allianz', avatar: 'DG', condition: 'Healthy',        isVerified: true, prescriptions: [], medicalHistory: [], createdAt: now },
  );

  state.records.push(
    { _id: uid('rec'), recordId: 'RPT-SC-001', patientRef: sc._id, patientName: 'Sinchana',   type: 'Spirometry Report', date: 'Apr 10, 2024', doctorName: 'Dr. Rudransh', status: 'normal',  icon: '📄', encrypted: true, notes: 'FEV1: 82%. Mild obstruction pattern.', createdAt: now },
    { _id: uid('rec'), recordId: 'RPT-SC-002', patientRef: sc._id, patientName: 'Sinchana',   type: 'Blood Panel',       date: 'Mar 15, 2024', doctorName: 'Dr. Rudransh', status: 'normal',  icon: '🔬', encrypted: true, notes: 'CBC within normal limits.', createdAt: now },
    { _id: uid('rec'), recordId: 'RPT-PN-001', patientRef: pn._id, patientName: 'Priya Nair', type: 'ECG Report',        date: 'Apr 12, 2024', doctorName: 'Dr. Arjun',    status: 'normal',  icon: '❤️', encrypted: true, notes: 'Normal sinus rhythm. No ST changes.', createdAt: now },
    { _id: uid('rec'), recordId: 'RPT-PN-002', patientRef: pn._id, patientName: 'Priya Nair', type: 'Blood Panel',       date: 'Mar 28, 2024', doctorName: 'Dr. Arjun',    status: 'flagged', icon: '⚠️', encrypted: true, notes: 'Cholesterol borderline high (215 mg/dL).', createdAt: now },
    { _id: uid('rec'), recordId: 'RPT-PN-003', patientRef: pn._id, patientName: 'Priya Nair', type: 'Prescription',      date: 'Feb 5, 2024',  doctorName: 'Dr. Arjun',    status: 'active',  icon: '💊', encrypted: true, prescription: 'Vitamin D3 60,000 IU weekly. Omega-3 1g OD.', createdAt: now },
  );

  state.logs.push(
    { _id: uid('log'), actor: 'Dr. Rudransh Vatsyayan', action: 'Uploaded Spirometry Report',        color: '#a78bfa', role: 'doctor',  createdAt: new Date(Date.now() - 1 * 3600000).toISOString() },
    { _id: uid('log'), actor: 'Sathwik',                 action: 'Insurance access request initiated', color: '#fbbf24', role: 'insurer', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { _id: uid('log'), actor: 'System',                  action: 'Federated round 4 completed',        color: '#00f5ff', role: 'system',  createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { _id: uid('log'), actor: 'Dr. Arjun Sharma',        action: 'Updated clinical record for Priya',  color: '#a78bfa', role: 'doctor',  createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
  );

  return true;
}

const isMemory            = () => process.env.USE_MEMORY_DB === 'true';
const getState            = () => state;
const getDoctors          = () => clone(state.doctors);
const countUsers          = async () => state.users.length;
const findUserByEmail     = async (email) => clone(state.users.find(u => u.email === email.toLowerCase().trim()) || null);
const listPatients        = async () => clone([...state.patients].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
const findPatientByUserId = async (userId) => clone(state.patients.find(p => p.userId === userId) || null);
const listRecords         = async () => clone([...state.records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
const listUploads         = async () => clone(state.records.filter(r => r.doctorName).slice(0, 15));
const listLogs            = async () => clone([...state.logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 25));

async function createRecord(input) {
  const now    = stamp();
  const record = { _id: uid('rec'), recordId: input.recordId || `RPT-${Date.now().toString().slice(-5)}`, status: 'normal', icon: '📄', encrypted: true, ...input, createdAt: now, updatedAt: now };
  state.records.unshift(record);
  return clone(record);
}

async function createLog(input) {
  const log = { _id: uid('log'), color: '#00f5ff', ...input, createdAt: stamp() };
  state.logs.unshift(log);
  return clone(log);
}

async function createUser_exported(input) { return createUser(input); }

export {
  isMemory, seed, getState, getDoctors,
  countUsers, createUser as createUser, comparePassword,
  findUserByEmail, listPatients, findPatientByUserId,
  listRecords, listUploads, createRecord,
  listLogs, createLog,
};
