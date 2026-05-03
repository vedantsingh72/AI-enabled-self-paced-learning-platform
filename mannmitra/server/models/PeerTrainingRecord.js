import mongoose from "mongoose";

const PeerTrainingRecordSchema = new mongoose.Schema(
  {
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PeerVolunteer",
      required: true,
    },
    modules: [{ type: String }],
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    certificateIssued: { type: Boolean, default: false },
    badge: { type: String, default: "" },
  },
  { timestamps: true },
);

PeerTrainingRecordSchema.index({ volunteerId: 1 }, { unique: true });

export default mongoose.model("PeerTrainingRecord", PeerTrainingRecordSchema);
