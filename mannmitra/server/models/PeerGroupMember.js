import mongoose from "mongoose";

const PeerGroupMemberSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PeerGroup",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: { type: String, enum: ["member", "moderator"], default: "member" },
  },
  { timestamps: true },
);

PeerGroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export default mongoose.model("PeerGroupMember", PeerGroupMemberSchema);
