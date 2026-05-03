/**
 * Mental health risk scoring for institute/counsellor dashboards.
 *
 * PHQ-9, GAD-7, and counsellor (1–10) bands match the FastAPI risk service spec.
 * AI chat: per-message Hugging Face signals stored on Chat (when HF_TOKEN is set);
 * older messages fall back to sentiment + latestRiskLevel heuristics.
 */

import Screening from "../models/Screening.js";
import Booking from "../models/Booking.js";
import PeerMessage from "../models/PeerMessage.js";
import Chat from "../models/Chat.js";
import PcmDoubtTurn from "../models/PcmDoubtTurn.js";
import LearningRiskSnapshot from "../models/LearningRiskSnapshot.js";

/** @param {number|null|undefined} score */
export function phq9RiskPoints(score) {
  if (score == null || Number.isNaN(score)) return 0;
  const s = Number(score);
  if (s <= 4) return 0;
  if (s <= 9) return 2;
  if (s <= 14) return 4;
  if (s <= 19) return 6;
  return 8;
}

/** @param {number|null|undefined} score */
export function gad7RiskPoints(score) {
  if (score == null || Number.isNaN(score)) return 0;
  const s = Number(score);
  if (s <= 4) return 0;
  if (s <= 9) return 2;
  if (s <= 14) return 4;
  return 6;
}

/**
 * Counsellor concern on 1–10 scale → risk points (spec).
 * @param {number} ratingOneToTen
 */
export function counsellorRiskPointsFromRating(ratingOneToTen) {
  const r = Math.min(10, Math.max(1, Math.round(Number(ratingOneToTen)) || 3));
  if (r <= 3) return 1;
  if (r <= 6) return 3;
  return 6;
}

/**
 * Map saved counsellor feedback to a 1–10-style input for the formula.
 * @param {import("mongoose").LeanDocument<any>|null|undefined} feedback
 */
export function mapCounsellorFeedbackToRating(feedback) {
  if (!feedback) return { rating: 3, label: "No assessment yet" };

  const rl = feedback.riskLevel;
  if (rl === "HIGH") return { rating: 9, label: "Risk: HIGH" };
  if (rl === "MEDIUM") return { rating: 5, label: "Risk: MEDIUM" };
  if (rl === "LOW") return { rating: 3, label: "Risk: LOW" };

  const cl = feedback.conditionLevel;
  if (cl === "high_concern") return { rating: 8, label: "Condition: high concern" };
  if (cl === "moderate_concern") return { rating: 6, label: "Condition: moderate concern" };
  if (cl === "mild_concern") return { rating: 4, label: "Condition: mild concern" };
  return { rating: 3, label: "Condition: stable" };
}

const CRISIS_RE =
  /suicid|kill\s+myself|end\s+my\s+life|want\s+to\s+die|no\s+reason\s+to\s+live|hurt\s+myself|self[\s-]*harm/i;

/**
 * Heuristic risk from peer-visible messages (plaintext in DB).
 * @param {Array<{ text?: string, flagged?: boolean }>} messages
 */
export function peerMessagesHeuristicPoints(messages) {
  let pts = 0;
  let flaggedCount = 0;
  let keywordAlert = false;
  for (const m of messages || []) {
    const text = (m.text || "").slice(0, 2000);
    if (m.flagged) {
      pts += 6;
      flaggedCount += 1;
    }
    if (CRISIS_RE.test(text)) keywordAlert = true;
  }
  if (keywordAlert) pts += 12;
  return {
    points: Math.min(pts, 45),
    messagesAnalyzed: (messages || []).length,
    flaggedCount,
    keywordAlert,
  };
}

/**
 * Points from one stored HF snapshot (matches Python risk service message rules).
 * @param {Record<string, unknown>|null|undefined} hf
 */
export function hfPointsForStoredSignals(hf) {
  if (!hf || hf.error) return 0;
  let p = 0;
  const topSui = String(hf.suicideTopLabel || "").toUpperCase();
  if (topSui === "LABEL_1") {
    p += 10;
    const highSc = Math.max(
      Number(hf.label1Score) || 0,
      Number(hf.suicideTopScore) || 0,
    );
    if (highSc > 0.9) p += 5;
  }
  const emo = String(hf.emotionTopLabel || "").toLowerCase();
  if (emo === "sadness") p += 3;
  else if (emo === "fear") p += 2;
  else if (emo === "anger") p += 2;
  return p;
}

function hasUsableHfSignals(m) {
  const hf = m.hfSignals;
  if (!hf || hf.error) return false;
  return (
    hf.suicideTopLabel != null ||
    hf.emotionTopLabel != null ||
    hf.suicideTopScore != null
  );
}

/**
 * AI chat column: sum HF per user message + legacy sentiment; level bump.
 * @param {import("mongoose").LeanDocument<any>|null} chat
 */
export function aiChatMetadataPoints(chat) {
  if (!chat) {
    return {
      points: 0,
      latestRiskLevel: null,
      negativeUserMessages: 0,
      totalUserMessagesSampled: 0,
      hfScoredMessages: 0,
      hfFailedOrMissing: 0,
      hfDominantEmotion: "—",
      usesHuggingFace: false,
    };
  }
  const msgs = chat.messages || [];
  const lvl = chat.latestRiskLevel || "LOW";
  let hfSum = 0;
  let hfScored = 0;
  let hfFailed = 0;
  let fallbackSentiment = 0;
  let neg = 0;
  let userCount = 0;
  const emotionCounts = {};

  for (const m of msgs) {
    if (m.sender !== "user") continue;
    userCount += 1;
    if (m.hfSignals?.error && !hasUsableHfSignals(m)) hfFailed += 1;
    if (hasUsableHfSignals(m)) {
      hfSum += hfPointsForStoredSignals(m.hfSignals);
      hfScored += 1;
      const el = String(m.hfSignals.emotionTopLabel || "").toLowerCase();
      if (el) emotionCounts[el] = (emotionCounts[el] || 0) + 1;
    } else if (m.sentiment === "negative") {
      fallbackSentiment += 4;
      neg += 1;
    }
  }

  let levelBonus = 0;
  if (hfScored > 0) {
    if (lvl === "HIGH") levelBonus = 6;
    else if (lvl === "MEDIUM") levelBonus = 3;
  } else {
    if (lvl === "HIGH") levelBonus = 12;
    else if (lvl === "MEDIUM") levelBonus = 6;
  }

  const points = Math.min(hfSum + fallbackSentiment + levelBonus, 55);
  let dominant = "—";
  let best = 0;
  for (const [k, v] of Object.entries(emotionCounts)) {
    if (v > best) {
      best = v;
      dominant = k;
    }
  }

  return {
    points,
    latestRiskLevel: lvl,
    negativeUserMessages: neg,
    totalUserMessagesSampled: userCount,
    hfScoredMessages: hfScored,
    hfFailedOrMissing: hfFailed,
    hfDominantEmotion: dominant,
    usesHuggingFace: hfScored > 0,
  };
}

function hasUsableHfOnPcmTurn(hf) {
  if (!hf || hf.error) return false;
  return (
    hf.suicideTopLabel != null ||
    hf.emotionTopLabel != null ||
    hf.suicideTopScore != null
  );
}

/**
 * HF emotion + suicidality aggregates for PCM doubt tutor only (separate from Talk mate Chat).
 * Same per-message classifiers as mental_health_risk_api; not added to clinical total_score.
 */
export function pcmDoubtHfSummary(turns) {
  if (!turns?.length) {
    return {
      totalTurns: 0,
      hfScoredMessages: 0,
      hfFailedOrMissing: 0,
      hfDominantEmotion: "—",
      usesHuggingFace: false,
    };
  }
  let hfScored = 0;
  let hfFailed = 0;
  const emotionCounts = {};
  for (const t of turns) {
    const hf = t.userMessage?.hfSignals;
    if (!hf) {
      hfFailed += 1;
      continue;
    }
    if (hf.error && !hasUsableHfOnPcmTurn(hf)) {
      hfFailed += 1;
      continue;
    }
    if (hasUsableHfOnPcmTurn(hf)) {
      hfScored += 1;
      const el = String(hf.emotionTopLabel || "").toLowerCase();
      if (el) emotionCounts[el] = (emotionCounts[el] || 0) + 1;
    } else {
      hfFailed += 1;
    }
  }
  let dominant = "—";
  let best = 0;
  for (const [k, v] of Object.entries(emotionCounts)) {
    if (v > best) {
      best = v;
      dominant = k;
    }
  }
  return {
    totalTurns: turns.length,
    hfScoredMessages: hfScored,
    hfFailedOrMissing: hfFailed,
    hfDominantEmotion: dominant,
    usesHuggingFace: hfScored > 0,
  };
}

/** @param {number} total */
export function riskLevelFromTotalScore(total) {
  if (total <= 5) return "LOW";
  if (total <= 12) return "MODERATE";
  if (total <= 20) return "HIGH";
  return "CRITICAL";
}

/** @param {string} level */
export function actionForRiskLevel(level) {
  switch (level) {
    case "LOW":
      return "Show wellness tips and general self-care resources.";
    case "MODERATE":
      return "Suggest peer support and moderated community check-ins.";
    case "HIGH":
      return "Suggest scheduling a counsellor meeting as soon as possible.";
    default:
      return "Trigger emergency alert system and immediate human escalation.";
  }
}

/**
 * Build one dashboard row for a student user document.
 * @param {import("mongoose").Document|{ _id: import("mongoose").Types.ObjectId, displayName?: string, username?: string, college?: string, institute?: string }} user
 */
export async function buildStudentRiskRow(user) {
  const userId = user._id;

  const [phq, gad, latestBooking, peerMsgs, chat, pcmTurns, learningSnap] =
    await Promise.all([
      Screening.findOne({ userId, type: "PHQ9" })
        .sort({ createdAt: -1 })
        .lean(),
      Screening.findOne({ userId, type: "GAD7" })
        .sort({ createdAt: -1 })
        .lean(),
      Booking.findOne({ userId }).sort({ updatedAt: -1 }).lean(),
      PeerMessage.find({ senderId: userId })
        .sort({ createdAt: -1 })
        .limit(150)
        .select("text flagged")
        .lean(),
      Chat.findOne({ userId }).lean(),
      PcmDoubtTurn.find({ userId })
        .sort({ createdAt: -1 })
        .limit(200)
        .select("userMessage.hfSignals")
        .lean(),
      LearningRiskSnapshot.findOne({ userId }).lean(),
    ]);

  const phqRaw = phq?.score ?? null;
  const gadRaw = gad?.score ?? null;
  const phqPts = phq9RiskPoints(phqRaw);
  const gadPts = gad7RiskPoints(gadRaw);

  const { rating: counsellorRating, label: counsellorLabel } =
    mapCounsellorFeedbackToRating(latestBooking?.counsellorFeedback);
  const counsellorPts = counsellorRiskPointsFromRating(counsellorRating);

  const peer = peerMessagesHeuristicPoints(peerMsgs);
  const ai = aiChatMetadataPoints(chat);
  const pcmHf = pcmDoubtHfSummary(pcmTurns);

  const finalScore = phqPts + gadPts + counsellorPts + peer.points + ai.points;
  const riskLevel = riskLevelFromTotalScore(finalScore);
  const action = actionForRiskLevel(riskLevel);

  return {
    userId: String(userId),
    displayName: user.displayName || "Student",
    username: user.username || null,
    college: user.college || "—",
    institute: user.institute || "—",
    mental_screening: {
      phq9: phq
        ? {
            score: phqRaw,
            severity: phq.severity ?? null,
            riskLevel: phq.riskLevel ?? null,
            at: phq.createdAt ?? null,
          }
        : null,
      gad7: gad
        ? {
            score: gadRaw,
            severity: gad.severity ?? null,
            riskLevel: gad.riskLevel ?? null,
            at: gad.createdAt ?? null,
          }
        : null,
    },
    elearning: learningSnap
      ? {
          behavioralScore: learningSnap.behavioralScore ?? null,
          mentalHealthScore: learningSnap.mentalHealthScore ?? null,
          finalScore: learningSnap.finalScore ?? null,
          riskLevel: learningSnap.riskLevel ?? null,
          computedAt: learningSnap.computedAt ?? null,
        }
      : null,
    components: {
      phq9_raw: phqRaw,
      phq9_points: phqPts,
      gad7_raw: gadRaw,
      gad7_points: gadPts,
      counsellor_rating_used: counsellorRating,
      counsellor_rating_label: counsellorLabel,
      counsellor_points: counsellorPts,
      peer_chat_points: peer.points,
      peer_chat_detail: {
        messagesAnalyzed: peer.messagesAnalyzed,
        flaggedCount: peer.flaggedCount,
        keywordAlert: peer.keywordAlert,
      },
      ai_chatbot_points: ai.points,
      ai_chatbot_detail: {
        latestRiskLevel: ai.latestRiskLevel,
        negativeUserMessages: ai.negativeUserMessages,
        userMessagesSampled: ai.totalUserMessagesSampled,
        hf_scored_messages: ai.hfScoredMessages,
        hf_failed_or_missing: ai.hfFailedOrMissing,
        hf_dominant_emotion: ai.hfDominantEmotion,
        uses_huggingface: ai.usesHuggingFace,
      },
      pcm_doubt_points: 0,
      pcm_doubt_detail: {
        total_turns: pcmHf.totalTurns,
        hf_scored_messages: pcmHf.hfScoredMessages,
        hf_failed_or_missing: pcmHf.hfFailedOrMissing,
        hf_dominant_emotion: pcmHf.hfDominantEmotion,
        uses_huggingface: pcmHf.usesHuggingFace,
      },
    },
    final_score: finalScore,
    risk_level: riskLevel,
    action,
    methodology_note:
      "Screening and counsellor bands match the clinical scoring spec. Peer chat uses flags/keywords. Talk mate (AI chat) uses Hugging Face suicidality + emotion on each saved user line when HF_TOKEN is set (same models as mental_health_risk_api). PCM doubt tutor runs the same HF classifiers on each saved student question; PCM aggregates are shown separately and are not added to the clinical total score.",
  };
}
