import RiskAlert from "../models/RiskAlert.js";
import IdentityVault from "../models/IdentityVault.js";
import EmergencyDisclosureLog from "../models/EmergencyDisclosureLog.js";
import { decryptText } from "../services/cryptoService.js";

export const getUserRisks = async (req, res, next) => {
  try {
    const rows = await RiskAlert.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const emergencyIdentityReveal = async (req, res, next) => {
  try {
    const { publicAnonymousId, reason, approvedBy } = req.body || {};
    if (!publicAnonymousId || !reason || !approvedBy) {
      return res.status(400).json({
        message:
          "publicAnonymousId, reason and approvedBy are required for emergency override",
      });
    }

    const vault = await IdentityVault.findOne({ publicAnonymousId });
    if (!vault)
      return res
        .status(404)
        .json({ message: "Identity vault record not found" });

    const decrypted = JSON.parse(
      decryptText({
        cipherText: vault.encryptedPayload,
        iv: vault.iv,
        authTag: vault.authTag,
      }),
    );

    await EmergencyDisclosureLog.create({
      userId: vault.userId,
      requestedBy: req.admin?.username || "admin",
      reason,
      approved: true,
      approvedBy,
    });

    return res.json({
      message: "Emergency override completed under authorization",
      identity: {
        name: decrypted.name,
        email: decrypted.email,
      },
    });
  } catch (e) {
    return next(e);
  }
};
