const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  actor:  { type: String, required: true },
  action: { type: String, required: true },
  color:  { type: String, default: '#00f5ff' },
}, { timestamps: true });

module.exports = mongoose.model('AccessLog', accessLogSchema);
