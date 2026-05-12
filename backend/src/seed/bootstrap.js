const User      = require('../models/User');
const Patient   = require('../models/Patient');
const Doctor    = require('../models/Doctor');
const Record    = require('../models/Record');
const AccessLog = require('../models/AccessLog');
const demoStore = require('../data/demoStore');

async function seedDemoData({ reset = false } = {}) {
  if (demoStore.isMemory()) {
    return demoStore.seed({ reset });
  }

  if (reset) {
    await Promise.all([User, Patient, Doctor, Record, AccessLog].map(Model => Model.deleteMany({})));
  } else {
    const existing = await User.countDocuments();
    if (existing > 0) return false;
  }

  const patientUser = await User.create({ email: 'patient@healthchain.io', password: 'health123', name: 'Priya Nair', role: 'patient' });
  const doctorUser  = await User.create({ email: 'doctor@healthchain.io',  password: 'health123', name: 'Dr. Arjun Sharma', role: 'doctor' });
  await User.create({ email: 'insurer@healthchain.io', password: 'health123', name: 'MediShield', role: 'insurer' });

  const patient = await Patient.create({
    userId: patientUser._id,
    name: 'Priya Nair',
    patientId: 'HC-2024-8821',
    bloodType: 'B+',
    healthScore: 92,
    age: 34,
    insurance: 'MediShield',
    avatar: 'PN',
  });

  await Patient.insertMany([
    { name: 'Raj Kumar', patientId: 'HC-2024-0022', bloodType: 'O+', healthScore: 78, age: 58, insurance: 'StarHealth', avatar: 'RK' },
    { name: 'Anita Singh', patientId: 'HC-2024-0145', bloodType: 'A-', healthScore: 85, age: 45, insurance: 'HDFC Ergo', avatar: 'AS' },
    { name: 'Vivek Menon', patientId: 'HC-2024-0287', bloodType: 'B-', healthScore: 61, age: 62, insurance: 'MediShield', avatar: 'VM' },
    { name: 'Deepa Ghosh', patientId: 'HC-2024-0391', bloodType: 'AB+', healthScore: 91, age: 39, insurance: 'Bajaj', avatar: 'DG' },
  ]);

  await Doctor.create({
    userId: doctorUser._id,
    name: 'Dr. Arjun Sharma',
    specialty: 'Cardiologist',
    hospital: 'Apollo Hospitals',
    licenseNo: 'MCI-KA-20341',
  });

  await Record.insertMany([
    { recordId: 'RPT-001', patientRef: patient._id, type: 'ECG Report', date: 'Apr 12, 2024', doctorName: 'Dr. Sharma', status: 'normal', icon: 'HEART' },
    { recordId: 'RPT-002', patientRef: patient._id, type: 'Blood Panel', date: 'Mar 28, 2024', doctorName: 'Dr. Meera', status: 'flagged', icon: 'HEX' },
    { recordId: 'RPT-003', patientRef: patient._id, type: 'Chest X-Ray', date: 'Mar 10, 2024', doctorName: 'Dr. Sharma', status: 'normal', icon: 'DIAMOND' },
    { recordId: 'RPT-004', patientRef: patient._id, type: 'MRI Brain', date: 'Feb 5, 2024', doctorName: 'Dr. Iyer', status: 'normal', icon: 'SCAN' },
    { recordId: 'RPT-005', patientRef: patient._id, type: 'Prescription', date: 'Jan 18, 2024', doctorName: 'Dr. Meera', status: 'active', icon: 'PILL' },
  ]);

  await AccessLog.insertMany([
    { actor: 'Dr. Sharma', action: 'Uploaded ECG Report', color: '#a78bfa', createdAt: new Date(Date.now() - 2 * 3600000) },
    { actor: 'MediShield', action: 'Requested record access', color: '#fbbf24', createdAt: new Date(Date.now() - 5 * 3600000) },
    { actor: 'System', action: 'QR token generated', color: '#00f5ff', createdAt: new Date(Date.now() - 24 * 3600000) },
    { actor: 'Dr. Meera', action: 'Viewed Blood Panel', color: '#a78bfa', createdAt: new Date(Date.now() - 72 * 3600000) },
  ]);

  return true;
}

module.exports = { seedDemoData };
