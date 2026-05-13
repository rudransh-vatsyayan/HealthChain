import mongoose from 'mongoose';

const nodeSnapshotSchema = new mongoose.Schema({
  name:     { type: String },
  x:        { type: Number },
  y:        { type: Number },
  color:    { type: String },
  pts:      { type: Number },
  progress: { type: Number },
}, { _id: false });

const federatedRoundSchema = new mongoose.Schema({
  roundId:     { type: String, required: true, index: true },
  round:       { type: Number },
  accuracy:    { type: Number },
  maxRounds:   { type: Number, default: 5 },
  nodeStatus:  [nodeSnapshotSchema],
  isTraining:  { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('FederatedRound', federatedRoundSchema);
