import mongoose from 'mongoose';

const vitalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  label:  { type: String, required: true },
  val:    { type: Number, required: true },
  max:    { type: Number },
  unit:   { type: String },
  color:  { type: String },
}, { timestamps: true });

export default mongoose.model('Vital', vitalSchema);
