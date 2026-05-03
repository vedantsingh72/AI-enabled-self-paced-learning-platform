import mongoose from "mongoose";

const PeerMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PeerGroup",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["student", "volunteer", "moderator"],
      default: "student",
    },
    text: { type: String, required: true },
    flagged: { type: Boolean, default: false },
    flagReason: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("PeerMessage", PeerMessageSchema);
