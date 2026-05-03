import mongoose from "mongoose";

/**
 * Aggregated interaction metadata only (no typed content, no page text).
 * sessionId is an opaque client-generated UUID per study session.
 */
const BehaviorBatchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true, index: true },
    windowMs: { type: Number, default: 30000 },
    mouseAvgSpeedPxPerSec: { type: Number, default: 0 },
    mouseSampleCount: { type: Number, default: 0 },
    idleMs: { type: Number, default: 0 },
    tabSwitchCount: { type: Number, default: 0 },
    /** Words per minute estimate — not raw keystrokes */
    typingWpmEstimate: { type: Number, default: 0 },
    typingSampleCount: { type: Number, default: 0 },
    scrollEvents: { type: Number, default: 0 },
    scrollDeltaSum: { type: Number, default: 0 },
    videoPauseCount: { type: Number, default: 0 },
    videoReplayCount: { type: Number, default: 0 },
    behavioralScore: { type: Number, min: 0, max: 10 },
  },
  { timestamps: true },
);

BehaviorBatchSchema.index({ createdAt: -1 });

export default mongoose.model("BehaviorBatch", BehaviorBatchSchema);
