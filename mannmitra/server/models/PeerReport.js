import mongoose from "mongoose";

const PeerReportSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PeerGroup",
      required: true,
    },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "PeerMessage" },
    reportedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true },
    status: { type: String, enum: ["open", "reviewed"], default: "open" },
  },
  { timestamps: true },
);

export default mongoose.model("PeerReport", PeerReportSchema);
