import mongoose from "mongoose";

const PeerVolunteerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    institute: { type: String, required: true, index: true },
    skills: [{ type: String }],
    status: {
      type: String,
      enum: ["pending-training", "active", "inactive"],
      default: "pending-training",
    },
  },
  { timestamps: true },
);

PeerVolunteerSchema.index({ userId: 1, institute: 1 }, { unique: true });

export default mongoose.model("PeerVolunteer", PeerVolunteerSchema);
