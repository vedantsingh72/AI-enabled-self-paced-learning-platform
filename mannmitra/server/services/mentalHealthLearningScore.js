/**
 * Maps existing mental-health signals to a 0–10 distress score for learning fusion.
 * Higher = worse (aligns with behavioral risk direction).
 */

import Screening from "../models/Screening.js";
import Chat from "../models/Chat.js";
import { aiChatMetadataPoints } from "./riskScoreService.js";

/** PHQ-9 raw 0–27 → ~0–10 */
function phq9ToTen(raw) {
  if (raw == null || Number.isNaN(Number(raw))) return null;
  return Math.min(10, (Number(raw) / 27) * 10);
}

/** GAD-7 raw 0–21 → ~0–10 */
function gad7ToTen(raw) {
  if (raw == null || Number.isNaN(Number(raw))) return null;
  return Math.min(10, (Number(raw) / 21) * 10);
}

/**
 * Chatbot column: convert existing risk helpers to 0–10 (higher = more concern).
 * @param {import("mongoose").LeanDocument<any>|null} chat
 */
function chatbotDistressTen(chat) {
  if (!chat) return null;
  const ai = aiChatMetadataPoints(chat);
  const pts = Math.min(55, Number(ai.points) || 0);
  const fromPoints = (pts / 55) * 10;

  const lvl = String(chat.latestRiskLevel || "LOW").toUpperCase();
  let levelBump = 0;
  if (lvl === "HIGH") levelBump = 2.5;
  else if (lvl === "MEDIUM") levelBump = 1.2;

  return Math.min(10, fromPoints + levelBump * 0.35);
}

/**
 * @param {import("mongoose").Types.ObjectId} userId
 * @returns {Promise<{ score: number, components: Record<string, number|null> }>}
 */
export async function computeMentalHealthScore10(userId) {
  const [phq, gad, chat] = await Promise.all([
    Screening.findOne({ userId, type: "PHQ9" }).sort({ createdAt: -1 }).lean(),
    Screening.findOne({ userId, type: "GAD7" }).sort({ createdAt: -1 }).lean(),
    Chat.findOne({ userId }).lean(),
  ]);

  const phqTen = phq9ToTen(phq?.score);
  const gadTen = gad7ToTen(gad?.score);
  const chatTen = chatbotDistressTen(chat);

  const parts = [];
  if (phqTen != null) parts.push(phqTen);
  if (gadTen != null) parts.push(gadTen);
  if (chatTen != null) parts.push(chatTen);

  let score = 2.5;
  if (parts.length) {
    score = parts.reduce((a, b) => a + b, 0) / parts.length;
  }

  score = Math.round(Math.min(10, Math.max(0, score)) * 10) / 10;

  return {
    score,
    components: {
      phq9_ten: phqTen,
      gad7_ten: gadTen,
      chatbot_distress_ten: chatTen,
    },
  };
}
