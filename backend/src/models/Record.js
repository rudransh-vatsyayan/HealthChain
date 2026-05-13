import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  recordId:   { type: String, unique: true },
  patientRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  type:       { type: String, required: true },
  date:       { type: String },
  doctorName: { type: String },
  status:     { type: String, enum: ['normal', 'flagged', 'active'], default: 'normal' },
  icon:       { type: String, default: '⬡' },
  filename:   { type: String },
  fileSize:   { type: String },
  fileType:   { type: String },
  encrypted:  { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Record', recordSchema);
