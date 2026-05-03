import mongoose from "mongoose";

const EscalationAlertSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "PeerGroup" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "PeerMessage" },
    source: {
      type: String,
      enum: ["ai", "volunteer", "manual"],
      default: "ai",
    },
    severity: {
      type: String,
      enum: ["MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
    },
  },
  { timestamps: true },
);

export default mongoose.model("EscalationAlert", EscalationAlertSchema);
