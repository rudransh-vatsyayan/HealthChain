import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  medication:    { type: String, required: true },
  dosage:        { type: String },
  frequency:     { type: String },
  startDate:     { type: String },
  endDate:       { type: String },
  prescribedBy:  { type: String },
  active:        { type: Boolean, default: true },
}, { timestamps: true });

const historySchema = new mongoose.Schema({
  condition:    { type: String, required: true },
  diagnosedDate:{ type: String },
  status:       { type: String, enum: ['active', 'resolved', 'chronic'], default: 'active' },
  notes:        { type: String },
  recordedBy:   { type: String },
}, { timestamps: true });

const patientSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedDoctorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  name:               { type: String, required: true },
  patientId:          { type: String, unique: true },
  bloodType:          { type: String, default: 'B+' },
  healthScore:        { type: Number, default: 92 },
  riskScore:          { type: Number, default: 0, min: 0, max: 100 },
  age:                { type: Number },
  insurance:          { type: String, default: 'MediShield' },
  isVerified:         { type: Boolean, default: true },
  avatar:             { type: String },
  condition:          { type: String },           // Primary condition label
  diagnosis:          { type: String },           // Doctor's latest diagnosis text
  riskAnnotations:    { type: String },           // Doctor's risk notes
  lastUpdatedByDoctor:{ type: String },
  lastDoctorUpdateAt: { type: Date },
  prescriptions:      [prescriptionSchema],
  medicalHistory:     [historySchema],
}, { timestamps: true });

export default mongoose.model('Patient', patientSchema);
