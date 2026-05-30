import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema({
  actor:      { type: String, required: true },
  action:     { type: String, required: true },
  color:      { type: String, default: '#00f5ff' },
  patientRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }, // Optional target patient
  role:       { type: String },
}, { timestamps: true });

export default mongoose.model('AccessLog', accessLogSchema);
