import mongoose from "mongoose";
const ScreeningSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: ["PHQ9", "GAD7"], required: true },
    answers: [{ type: Number, min: 0, max: 3 }],
    score: Number,
    severity: String,
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
  },
  { timestamps: true },
);
export default mongoose.model("Screening", ScreeningSchema);
