import mongoose from "mongoose";

const EmergencyDisclosureLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: { type: String, default: "admin" },
    reason: { type: String, required: true },
    approved: { type: Boolean, default: false },
    approvedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model(
  "EmergencyDisclosureLog",
  EmergencyDisclosureLogSchema,
);
