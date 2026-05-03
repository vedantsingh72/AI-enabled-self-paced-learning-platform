import mongoose from "mongoose";

/** Latest computed burnout / cognitive risk for adaptive UI (per user). */
const LearningRiskSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    behavioralScore: { type: Number, min: 0, max: 10 },
    mentalHealthScore: { type: Number, min: 0, max: 10 },
    finalScore: { type: Number, min: 0, max: 10 },
    riskLevel: {
      type: String,
      enum: ["Normal", "Struggling", "Burnout"],
      default: "Normal",
    },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model("LearningRiskSnapshot", LearningRiskSnapshotSchema);
