const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:        { type: String, required: true },
  patientId:   { type: String, unique: true },
  bloodType:   { type: String, default: 'B+' },
  healthScore: { type: Number, default: 92 },
  age:         { type: Number },
  insurance:   { type: String, default: 'MediShield' },
  isVerified:  { type: Boolean, default: true },
  avatar:      { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
