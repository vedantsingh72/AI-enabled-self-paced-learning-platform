/**
 * Persist encrypted user + AI messages and update latestRiskLevel for dashboards.
 * Used by legacy /api/chat and MHH chatbot proxy so risk UI sees the same data.
 * Optional: Hugging Face suicidality + emotion on user line (HF_TOKEN).
 */

import Chat from "../models/Chat.js";
import RiskAlert from "../models/RiskAlert.js";
import { analyzeSentiment } from "./aiService.js";
import { calculateRisk } from "./riskEngine.js";
import { encryptText } from "./cryptoService.js";
import { inferHfForUserMessage } from "./hfInferenceService.js";

const RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function mergeRiskLevels(heuristic, hfLevel) {
  const m = Math.max(RANK[heuristic] ?? 0, RANK[hfLevel] ?? 0);
  if (m === 2) return "HIGH";
  if (m === 1) return "MEDIUM";
  return "LOW";
}

/** Derive LOW|MEDIUM|HIGH from HF outputs (best-effort). */
function riskLevelFromHf(hf) {
  if (!hf || hf.error) return "LOW";
  const topSui = (hf.suicideTopLabel || "").toUpperCase();
  if (topSui === "LABEL_1") {
    const sc = Math.max(
      Number(hf.label1Score) || 0,
      Number(hf.suicideTopScore) || 0,
    );
    return sc > 0.85 ? "HIGH" : "MEDIUM";
  }
  const em = String(hf.emotionTopLabel || "").toLowerCase();
  if (
    (em === "sadness" || em === "fear") &&
    (Number(hf.emotionTopScore) || 0) > 0.55
  ) {
    return "MEDIUM";
  }
  return "LOW";
}

export function hfSignalsForDb(hf) {
  if (!hf) return undefined;
  const doc = {
    suicideTopLabel: hf.suicideTopLabel ?? undefined,
    suicideTopScore: hf.suicideTopScore ?? undefined,
    label1Score: hf.label1Score ?? undefined,
    emotionTopLabel: hf.emotionTopLabel ?? undefined,
    emotionTopScore: hf.emotionTopScore ?? undefined,
    modelAt: new Date(),
  };
  if (hf.error) doc.error = hf.error;
  if (hf.partialError) doc.partialError = hf.partialError;
  return doc;
}

/**
 * @param {import("mongoose").Types.ObjectId} userId
 * @param {string} userPlaintext
 * @param {string} aiPlaintext
 */
export async function persistEncryptedChatRound(userId, userPlaintext, aiPlaintext) {
  let hf = null;
  try {
    hf = await inferHfForUserMessage(userPlaintext);
  } catch (e) {
    console.error("HF inference error (chat still saved)", e?.message || e);
  }

  const sentiment = analyzeSentiment(userPlaintext);
  const old = await Chat.findOne({ userId });
  const negativeStreak =
    old?.messages?.slice(-3).filter((m) => m.sentiment === "negative").length ||
    0;
  const risk = calculateRisk({
    text: userPlaintext,
    sentiment,
    negativeStreak,
  });

  const hfLevel = riskLevelFromHf(hf);
  const mergedLevel = mergeRiskLevels(risk.level, hfLevel);

  const encUser = encryptText(userPlaintext);
  const encAi = encryptText(aiPlaintext);

  const userMsg = {
    sender: "user",
    ...encUser,
    sentiment,
  };
  const sig = hfSignalsForDb(hf);
  if (sig) userMsg.hfSignals = sig;

  const chat = await Chat.findOneAndUpdate(
    { userId },
    {
      $set: { latestRiskLevel: mergedLevel },
      $push: {
        messages: [
          userMsg,
          { sender: "ai", ...encAi, sentiment: "neutral" },
        ],
      },
    },
    { upsert: true, new: true },
  );

  if (mergedLevel === "HIGH") {
    const reason =
      hfLevel === "HIGH"
        ? "Heuristic + Hugging Face suicidality signal"
        : risk.reason;
    await RiskAlert.create({
      userId,
      source: "chat",
      riskLevel: "HIGH",
      reason,
    });
  }

  return {
    sentiment,
    riskLevel: mergedLevel,
    emergencyEscalation: mergedLevel === "HIGH",
    chatId: chat._id,
  };
}
