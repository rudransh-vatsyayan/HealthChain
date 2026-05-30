import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema({
  label:       { type: String },
  completedAt: { type: Date },
}, { _id: false });

const insightSchema = new mongoose.Schema({
  eligibilityScore:    { type: Number },
  riskProfile:         { type: String },
  claimLikelihood:     { type: Number },
  anomalyScore:        { type: Number },
  fraudIndicator:      { type: Boolean },
  federatedConfidence: { type: Number },
  dataPoints:          { type: Number },
  generatedAt:         { type: Date, default: Date.now },
}, { _id: false });

const insuranceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  insurerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending',
  },
  steps:    [stepSchema],
  insights: insightSchema,  // Stored derived metrics (never raw data)
}, { timestamps: true });

export default mongoose.model('InsuranceRequest', insuranceRequestSchema);
