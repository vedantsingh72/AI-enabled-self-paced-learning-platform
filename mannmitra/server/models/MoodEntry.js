import mongoose from "mongoose";
const MoodEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mood: { type: String, enum: ["Happy", "Neutral", "Sad", "Stressed"] },
    note: String,
    date: String,
  },
  { timestamps: true },
);
export default mongoose.model("MoodEntry", MoodEntrySchema);
