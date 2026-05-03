import mongoose from "mongoose";
const RiskAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      enum: ["chat", "screening", "manual"],
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
    },
    reason: String,
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export default mongoose.model("RiskAlert", RiskAlertSchema);
