import Booking from "../models/Booking.js";
import LearningRiskSnapshot from "../models/LearningRiskSnapshot.js";
import { riskLevelFromFinalScore } from "./finalScoringEngine.js";

/**
 * Monthly doubt-support session caps by adaptive learning risk tier.
 * Higher behavioral + mental strain → more allowed sessions.
 */
export const DOUBT_QUOTA_BY_RISK = {
  Burnout: 10,
  Struggling: 6,
  Normal: 3,
};

function monthRangeLocal() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return {
    start,
    end,
    label: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  };
}

/**
 * @returns {Promise<{
 *   limit: number,
 *   used: number,
 *   remaining: number,
 *   riskLevel: string,
 *   behavioralScore: number|null,
 *   mentalHealthScore: number|null,
 *   finalScore: number|null,
 *   month: string,
 * }>}
 */
export async function getDoubtSupportQuotaStatus(userId) {
  const snap = await LearningRiskSnapshot.findOne({ userId }).lean();

  let riskLevel = "Normal";
  let behavioralScore = null;
  let mentalHealthScore = null;
  let finalScore = null;

  if (snap) {
    behavioralScore =
      snap.behavioralScore != null ? Number(snap.behavioralScore) : null;
    mentalHealthScore =
      snap.mentalHealthScore != null ? Number(snap.mentalHealthScore) : null;
    finalScore = snap.finalScore != null ? Number(snap.finalScore) : null;
    if (snap.riskLevel && DOUBT_QUOTA_BY_RISK[snap.riskLevel] != null) {
      riskLevel = snap.riskLevel;
    } else if (finalScore != null && Number.isFinite(finalScore)) {
      riskLevel = riskLevelFromFinalScore(finalScore);
    }
  }

  const limit = DOUBT_QUOTA_BY_RISK[riskLevel] ?? DOUBT_QUOTA_BY_RISK.Normal;

  const { start, end, label } = monthRangeLocal();

  const used = await Booking.countDocuments({
    userId,
    sessionKind: "doubt_support",
    createdAt: { $gte: start, $lte: end },
    status: { $ne: "rejected" },
  });

  const remaining = Math.max(0, limit - used);

  return {
    limit,
    used,
    remaining,
    riskLevel,
    behavioralScore,
    mentalHealthScore,
    finalScore,
    month: label,
  };
}
