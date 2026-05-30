import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  recordId:    { type: String, unique: true },
  patientRef:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName: { type: String },                // Denormalized for display
  type:        { type: String, required: true },
  date:        { type: String },
  doctorName:  { type: String },
  hospital:    { type: String },
  status:      { type: String, enum: ['normal', 'flagged', 'active'], default: 'normal' },
  icon:        { type: String, default: '⬡' },
  filename:    { type: String },
  fileSize:    { type: String },
  fileType:    { type: String },
  notes:       { type: String },                // Doctor's clinical notes
  prescription:{ type: String },               // Prescription linked to this record
  encrypted:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Record', recordSchema);
