import { randomUUID } from "node:crypto";
import { persistEncryptedChatRound } from "../services/chatPersistence.js";

const fastApiChatbotBase = () =>
  process.env.MHH_CHATBOT_URL || "http://127.0.0.1:8000";

function scopedSessionId(userId, clientSessionId) {
  return `${userId}:${clientSessionId}`;
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || "Upstream error" };
  }
}

/** FastAPI has no separate start call; we only issue a client session id. */
export const mhhChatbotSessionStart = async (req, res, next) => {
  try {
    const sessionId = randomUUID();
    return res.json({
      sessionId,
      userId: req.user._id.toString(),
    });
  } catch (e) {
    return next(e);
  }
};

export const mhhChatbotMessage = async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message || !String(message).trim()) {
      return res
        .status(400)
        .json({ message: "sessionId and message are required" });
    }
    const userId = req.user._id.toString();
    const base = fastApiChatbotBase();
    const r = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: scopedSessionId(userId, sessionId),
        query: String(message).trim(),
      }),
    });
    const data = await readJson(r);
    if (!r.ok) {
      return res.status(r.status).json(data);
    }
    const reply = data.response ?? data.reply ?? "";
    const userPlain = String(message).trim();
    const aiPlain = String(reply || "").trim() || "(no reply)";

    // Mirror /api/chat: write encrypted turns + sentiment + latestRiskLevel so
    // institute/counsellor risk dashboards (and alerts) see MHH usage.
    try {
      await persistEncryptedChatRound(req.user._id, userPlain, aiPlain);
    } catch (persistErr) {
      console.error("MHH chat persistence failed (reply still returned)", persistErr);
    }

    return res.json({
      reply,
      sessionId,
      messageCount: null,
    });
  } catch (e) {
    return next(e);
  }
};

/** FastAPI service does not persist history; return an empty shape for the client. */
export const mhhChatbotHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json({ userId, sessions: [] });
  } catch (e) {
    return next(e);
  }
};
