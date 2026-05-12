const bcrypt = require('bcryptjs');

const state = {
  users: [],
  patients: [],
  doctors: [],
  records: [],
  logs: [],
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const stamp = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

async function reset() {
  state.users = [];
  state.patients = [];
  state.doctors = [];
  state.records = [];
  state.logs = [];
}

async function createUser({ email, password, name, role = 'patient' }) {
  const now = stamp();
  const user = {
    _id: id('usr'),
    email: email.toLowerCase().trim(),
    password: await bcrypt.hash(password, 10),
    name,
    role,
    createdAt: now,
    updatedAt: now,
  };
  state.users.push(user);
  return clone(user);
}

async function comparePassword(user, password) {
  return bcrypt.compare(password, user.password);
}

async function seed({ reset: shouldReset = false } = {}) {
  if (shouldReset) await reset();
  if (state.users.length > 0) return false;

  const patientUser = await createUser({ email: 'patient@healthchain.io', password: 'health123', name: 'Priya Nair', role: 'patient' });
  const doctorUser = await createUser({ email: 'doctor@healthchain.io', password: 'health123', name: 'Dr. Arjun Sharma', role: 'doctor' });
  await createUser({ email: 'insurer@healthchain.io', password: 'health123', name: 'MediShield', role: 'insurer' });

  const now = stamp();
  const patient = {
    _id: id('pat'),
    userId: patientUser._id,
    name: 'Priya Nair',
    patientId: 'HC-2024-8821',
    bloodType: 'B+',
    healthScore: 92,
    age: 34,
    insurance: 'MediShield',
    isVerified: true,
    avatar: 'PN',
    createdAt: now,
    updatedAt: now,
  };

  state.patients.push(patient);
  state.patients.push(
    { _id: id('pat'), name: 'Raj Kumar', patientId: 'HC-2024-0022', bloodType: 'O+', healthScore: 78, age: 58, insurance: 'StarHealth', isVerified: true, avatar: 'RK', createdAt: now, updatedAt: now },
    { _id: id('pat'), name: 'Anita Singh', patientId: 'HC-2024-0145', bloodType: 'A-', healthScore: 85, age: 45, insurance: 'HDFC Ergo', isVerified: true, avatar: 'AS', createdAt: now, updatedAt: now },
    { _id: id('pat'), name: 'Vivek Menon', patientId: 'HC-2024-0287', bloodType: 'B-', healthScore: 61, age: 62, insurance: 'MediShield', isVerified: true, avatar: 'VM', createdAt: now, updatedAt: now },
    { _id: id('pat'), name: 'Deepa Ghosh', patientId: 'HC-2024-0391', bloodType: 'AB+', healthScore: 91, age: 39, insurance: 'Bajaj', isVerified: true, avatar: 'DG', createdAt: now, updatedAt: now },
  );

  state.doctors.push({
    _id: id('doc'),
    userId: doctorUser._id,
    name: 'Dr. Arjun Sharma',
    specialty: 'Cardiologist',
    hospital: 'Apollo Hospitals',
    licenseNo: 'MCI-KA-20341',
    createdAt: now,
    updatedAt: now,
  });

  state.records.push(
    { _id: id('rec'), recordId: 'RPT-001', patientRef: patient._id, type: 'ECG Report', date: 'Apr 12, 2024', doctorName: 'Dr. Sharma', status: 'normal', icon: 'ECG', encrypted: true, createdAt: now, updatedAt: now },
    { _id: id('rec'), recordId: 'RPT-002', patientRef: patient._id, type: 'Blood Panel', date: 'Mar 28, 2024', doctorName: 'Dr. Meera', status: 'flagged', icon: 'LAB', encrypted: true, createdAt: now, updatedAt: now },
    { _id: id('rec'), recordId: 'RPT-003', patientRef: patient._id, type: 'Chest X-Ray', date: 'Mar 10, 2024', doctorName: 'Dr. Sharma', status: 'normal', icon: 'XRAY', encrypted: true, createdAt: now, updatedAt: now },
    { _id: id('rec'), recordId: 'RPT-004', patientRef: patient._id, type: 'MRI Brain', date: 'Feb 5, 2024', doctorName: 'Dr. Iyer', status: 'normal', icon: 'MRI', encrypted: true, createdAt: now, updatedAt: now },
    { _id: id('rec'), recordId: 'RPT-005', patientRef: patient._id, type: 'Prescription', date: 'Jan 18, 2024', doctorName: 'Dr. Meera', status: 'active', icon: 'RX', encrypted: true, createdAt: now, updatedAt: now },
  );

  state.logs.push(
    { _id: id('log'), actor: 'Dr. Sharma', action: 'Uploaded ECG Report', color: '#a78bfa', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { _id: id('log'), actor: 'MediShield', action: 'Requested record access', color: '#fbbf24', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { _id: id('log'), actor: 'System', action: 'QR token generated', color: '#00f5ff', createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { _id: id('log'), actor: 'Dr. Meera', action: 'Viewed Blood Panel', color: '#a78bfa', createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
  );

  return true;
}

const isMemory = () => process.env.USE_MEMORY_DB === 'true';
const countUsers = async () => state.users.length;
const findUserByEmail = async (email) => clone(state.users.find(user => user.email === email.toLowerCase().trim()) || null);
const listPatients = async () => clone([...state.patients].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
const findPatientByUserId = async (userId) => clone(state.patients.find(patient => patient.userId === userId) || null);
const listRecords = async () => clone([...state.records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
const listUploads = async () => clone(state.records.filter(record => record.doctorName).slice(0, 10));
const listLogs = async () => clone([...state.logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20));

async function createRecord(input) {
  const now = stamp();
  const record = {
    _id: id('rec'),
    recordId: input.recordId || `RPT-${Date.now().toString().slice(-5)}`,
    status: 'normal',
    icon: 'DOC',
    encrypted: true,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  state.records.unshift(record);
  return clone(record);
}

async function createLog(input) {
  const log = { _id: id('log'), color: '#00f5ff', ...input, createdAt: stamp() };
  state.logs.unshift(log);
  return clone(log);
}

module.exports = {
  isMemory,
  seed,
  countUsers,
  createUser,
  comparePassword,
  findUserByEmail,
  listPatients,
  findPatientByUserId,
  listRecords,
  listUploads,
  createRecord,
  listLogs,
  createLog,
};
