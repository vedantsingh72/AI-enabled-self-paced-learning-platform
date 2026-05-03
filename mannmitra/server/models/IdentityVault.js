import mongoose from "mongoose";

const IdentityVaultSchema = new mongoose.Schema(
  {
    publicAnonymousId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    encryptedPayload: { type: String, default: "" },
    iv: { type: String, default: "" },
    authTag: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("IdentityVault", IdentityVaultSchema);
