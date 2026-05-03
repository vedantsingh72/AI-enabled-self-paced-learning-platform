import mongoose from "mongoose";

const PeerGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    language: { type: String, default: "English", index: true },
    institute: { type: String, default: "shared", index: true },
    type: {
      type: String,
      enum: ["group-chat", "one-to-one", "scheduled-circle"],
      default: "group-chat",
    },
    scheduledAt: { type: Date },
    moderatorVolunteerIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "PeerVolunteer" },
    ],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("PeerGroup", PeerGroupSchema);
