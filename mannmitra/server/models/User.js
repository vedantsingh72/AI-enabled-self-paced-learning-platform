import mongoose from "mongoose";
const UserSchema = new mongoose.Schema(
  {
    anonymousId: { type: String, required: true, unique: true },
    name: { type: String, default: "Anonymous Student" },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },
    passwordHash: { type: String, default: "" },
    institute: { type: String, default: "Unspecified" },
    college: { type: String, default: "Unspecified" },
    publicAnonymousId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    displayName: { type: String, default: "Anonymous Student" },
    invisibleMode: { type: Boolean, default: false },
    role: {
      type: String,
      enum: [
        "main_admin",
        "admin",
        "institute",
        "student",
        "peer_mentor",
        "counsellor",
        "doubt_teacher",
      ],
      default: "student",
    },
    /** Learning module: consent timestamp for behavioral metadata collection */
    learningConsentAt: { type: Date, default: null },
    behaviorTrackingOptIn: { type: Boolean, default: false },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 1, min: 0 },
    isPaidCounsellor: { type: Boolean, default: false },
    speciality: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export default mongoose.model("User", UserSchema);
