import mongoose from "mongoose";

const MentorInviteTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    institute: { type: String, required: true, index: true },
    roleType: {
      type: String,
      enum: ["peer_mentor", "counsellor"],
      required: true,
    },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isUsed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("MentorInviteToken", MentorInviteTokenSchema);
