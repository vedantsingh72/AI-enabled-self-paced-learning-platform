import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    /** e.g. "JEE" — used to group syllabus-style catalogs */
    track: { type: String, default: "", trim: true },
    /** e.g. "Physics", "Chemistry", "Maths" */
    subject: { type: String, default: "", trim: true },
    /** e.g. "Mechanics", "Organic" — chapter/unit within the subject */
    unitLabel: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    /** Short summary shown in "Struggling" adaptive mode (no PII) */
    summaryText: { type: String, default: "" },
    videoUrl: { type: String, required: true },
    durationSeconds: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Course", CourseSchema);
