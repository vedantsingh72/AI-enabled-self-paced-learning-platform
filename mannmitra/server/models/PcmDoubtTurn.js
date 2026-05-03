import mongoose from "mongoose";

/** Same HF snapshot shape as Chat.messages[].hfSignals — models match mental_health_risk_api / hf_client.py */
const hfSignalsSchema = new mongoose.Schema(
  {
    suicideTopLabel: String,
    suicideTopScore: Number,
    label1Score: Number,
    emotionTopLabel: String,
    emotionTopScore: Number,
    modelAt: { type: Date, default: Date.now },
    error: String,
    partialError: String,
  },
  { _id: false },
);

const encBlobSchema = new mongoose.Schema(
  {
    cipherText: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false },
);

const userMessageSchema = new mongoose.Schema(
  {
    cipherText: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
    hfSignals: { type: hfSignalsSchema, required: false },
  },
  { _id: false },
);

/** One Groq PCM exchange per document; user line gets HF emotion + suicidality (HF_TOKEN) like Talk mate. */
const PcmDoubtTurnSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      enum: ["Physics", "Chemistry", "Maths"],
      required: true,
    },
    userMessage: { type: userMessageSchema, required: true },
    aiMessage: { type: encBlobSchema, required: true },
  },
  { timestamps: true },
);

PcmDoubtTurnSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("PcmDoubtTurn", PcmDoubtTurnSchema);
