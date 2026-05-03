import mongoose from "mongoose";
const ChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [
      {
        sender: { type: String, enum: ["user", "ai"] },
        cipherText: { type: String, required: true },
        iv: { type: String, required: true },
        authTag: { type: String, required: true },
        sentiment: {
          type: String,
          enum: ["positive", "neutral", "negative"],
          default: "neutral",
        },
        createdAt: { type: Date, default: Date.now },
        /** HF router inference on user plaintext at save time (no raw text stored). */
        hfSignals: {
          type: new mongoose.Schema(
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
          ),
          required: false,
        },
      },
    ],
    latestRiskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
  },
  { timestamps: true },
);
export default mongoose.model("Chat", ChatSchema);
