import mongoose from 'mongoose';

const connectionTestSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: true,
      trim: true,
      default: 'Atlas Connectivity Verification',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'PENDING', 'FAILED'],
      default: 'SUCCESS',
    },
    cluster: {
      type: String,
      default: 'cluster0.ageb2ld.mongodb.net',
    },
    executedBy: {
      type: String,
      default: 'syedryaaan_db_user',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const ConnectionTest = mongoose.model('ConnectionTest', connectionTestSchema);

export default ConnectionTest;
