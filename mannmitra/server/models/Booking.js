import mongoose from "mongoose";
const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    counsellorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** counselling = mental-health sessions; doubt_support = academic doubt video calls */
    sessionKind: {
      type: String,
      enum: ["counselling", "doubt_support"],
      default: "counselling",
    },
    counsellorProposedAt: { type: Date },
    date: String,
    slot: String,
    roomCode: { type: String, default: "" }, // legacy field
    meetingCode: { type: String, default: "", index: true },
    meetingStatus: {
      type: String,
      enum: ["pending", "scheduled", "active", "completed"],
      default: "pending",
    },
    institute: { type: String, default: "Unspecified" },
    notified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "room-shared",
        "scheduled",
        "completed",
      ],
      default: "pending",
    },
    studentFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: "" },
      submittedAt: { type: Date },
    },
    counsellorFeedback: {
      mentalHealthSummary: { type: String, default: "" },
      conditionLevel: {
        type: String,
        enum: ["stable", "mild_concern", "moderate_concern", "high_concern"],
        default: "stable",
      },
      riskLevel: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "LOW",
      },
      recommendations: { type: String, default: "" },
      submittedAt: { type: Date },
    },
  },
  { timestamps: true },
);
export default mongoose.model("Booking", BookingSchema);
