/**
 * Final fusion: behavioral + mental health → risk level for adaptive learning.
 */

const BEHAVIOR_WEIGHT = 0.6;
const MENTAL_WEIGHT = 0.4;

/**
 * @param {number} behavioralScore 0–10
 * @param {number} mentalHealthScore 0–10
 */
export function computeFinalScore(behavioralScore, mentalHealthScore) {
  const b = Math.min(10, Math.max(0, Number(behavioralScore) || 0));
  const m = Math.min(10, Math.max(0, Number(mentalHealthScore) || 0));
  const final =
    BEHAVIOR_WEIGHT * b + MENTAL_WEIGHT * m;
  return Math.round(final * 100) / 100;
}

/**
 * @param {number} finalScore 0–10
 * @returns {"Normal"|"Struggling"|"Burnout"}
 */
export function riskLevelFromFinalScore(finalScore) {
  const f = Math.min(10, Math.max(0, Number(finalScore) || 0));
  if (f < 4) return "Normal";
  if (f < 7) return "Struggling";
  return "Burnout";
}

export const scoringWeights = { BEHAVIOR_WEIGHT, MENTAL_WEIGHT };
