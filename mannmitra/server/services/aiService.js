import OpenAI from "openai";

/**
 * Lazy Groq client — must not run at module load before dotenv (see server.js).
 * @type {import("openai").default | null | undefined}
 */
let groqClientCache;

function getGroqClient() {
  if (groqClientCache !== undefined) return groqClientCache;
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    groqClientCache = null;
    return null;
  }
  const baseURL =
    process.env.GROQ_API_URL?.trim() || "https://api.groq.com/openai/v1";
  groqClientCache = new OpenAI({ apiKey: key, baseURL });
  return groqClientCache;
}

const FALLBACK_REPLY =
  "I hear you. You are not alone, and I am here with you. Would you like to try a short breathing exercise together?";

function fastApiBaseUrl() {
  const u = process.env.MHH_CHATBOT_URL;
  if (!u || !String(u).trim()) return null;
  return String(u).replace(/\/$/, "");
}

export const analyzeSentiment = (text = "") => {
  const t = text.toLowerCase();
  if (/(suicide|self harm|hopeless|worthless|kill myself)/i.test(t))
    return "negative";
  if (/(grateful|calm|better|good)/i.test(t)) return "positive";
  return "neutral";
};

/**
 * @param {string} message
 * @param {{ userId?: string }} [opts] Mongo user id for per-user session with FastAPI
 */
export const generateSupportiveReply = async (message, opts = {}) => {
  const base = fastApiBaseUrl();
  const userId = opts.userId != null ? String(opts.userId) : null;

  if (base && userId) {
    try {
      const res = await fetch(`${base}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: `${userId}:express-main-chat`,
          query: String(message),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.response && String(data.response).trim()) {
        return String(data.response).trim();
      }
      console.error(
        "FastAPI /chat error",
        res.status,
        data?.detail || data?.message || data,
      );
    } catch (e) {
      console.error("FastAPI /chat request failed", e);
    }
  }

  const groq = getGroqClient();
  if (groq) {
    const model =
      process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are an empathetic student mental health assistant. Keep responses concise, supportive, and safety-first.",
        },
        { role: "user", content: message },
      ],
    });
    return (
      completion.choices?.[0]?.message?.content ||
      "I am listening. Tell me more."
    );
  }

  return FALLBACK_REPLY;
};

const PCM_SUBJECTS = new Set(["Physics", "Chemistry", "Maths"]);

/**
 * JEE-style Physics / Chemistry / Maths doubt helper (Groq). Separate from mental-health chat.
 * @param {{ subject: string; userMessage: string; history?: { role: string; content: string }[] }} params
 */
export async function generatePcmDoubtReply({
  subject,
  userMessage,
  history = [],
}) {
  const groq = getGroqClient();
  if (!groq) {
    const err = new Error("GROQ_NOT_CONFIGURED");
    err.code = "GROQ_NOT_CONFIGURED";
    throw err;
  }
  if (!PCM_SUBJECTS.has(subject)) {
    const err = new Error("INVALID_SUBJECT");
    err.code = "INVALID_SUBJECT";
    throw err;
  }

  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  const system = `You are an expert tutor for Indian JEE (Joint Entrance Examination) preparation.
The student selected the subject: ${subject}.
Help with clear, step-by-step explanations for Physics, Chemistry, and Mathematics at the high school / JEE level.
Stay strictly within academic STEM content. If a question is unrelated (e.g. general knowledge, other subjects, personal advice), briefly say you only handle PCM doubts and invite a relevant question.
Do not give medical or mental-health counselling. Do not encourage self-harm; if you see a crisis message, say to reach a trusted adult or emergency services.
Prefer concise answers; use plain text and simple notation (unicode fractions, ^ for powers) unless LaTeX-style is clearly needed.`;

  const prior = (Array.isArray(history) ? history : [])
    .slice(-12)
    .map((m) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      return {
        role,
        content: String(m.content || "").slice(0, 4000),
      };
    })
    .filter((m) => m.content);

  const msgs = [
    { role: "system", content: system },
    ...prior,
    { role: "user", content: String(userMessage).slice(0, 8000) },
  ];

  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: 2048,
    messages: msgs,
  });

  const out =
    completion.choices?.[0]?.message?.content?.trim() ||
    "I could not generate a reply. Please try again.";
  return out;
}
