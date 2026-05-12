const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:      { type: String, required: true },
  specialty: { type: String, default: 'General' },
  hospital:  { type: String, default: 'Apollo Hospitals' },
  licenseNo: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
