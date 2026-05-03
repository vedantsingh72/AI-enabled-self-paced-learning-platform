/**
 * Hugging Face Inference API (router) — same endpoints and models as
 * `mental_health_risk_api/app/hf_client.py` (SUICIDE_MODEL_URL / EMOTION_MODEL_URL).
 * Used for Talk mate (via chatPersistence) and PCM doubt tutor (via pcmDoubtPersistence).
 * Requires HF_TOKEN in the environment (never logged).
 *
 * Models:
 * - sentinet/suicidality
 * - bhadresh-savani/bert-base-uncased-emotion
 */

const SUICIDE_URL =
  "https://router.huggingface.co/hf-inference/models/sentinet/suicidality";
const EMOTION_URL =
  "https://router.huggingface.co/hf-inference/models/bhadresh-savani/bert-base-uncased-emotion";

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/**
 * @param {unknown} data
 * @returns {Array<{ label: string, score: number }>}
 */
function normalizeClassificationPayload(data) {
  if (data == null || typeof data !== "object") return [];
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const inner = Array.isArray(first) ? first : data;
    const out = [];
    for (const item of inner) {
      if (item && typeof item === "object" && "label" in item && "score" in item) {
        try {
          out.push({
            label: String(item.label),
            score: Number(item.score),
          });
        } catch {
          /* skip */
        }
      }
    }
    return out;
  }
  return [];
}

function topPrediction(preds) {
  if (!preds.length) return { label: null, score: 0 };
  return preds.reduce((a, b) => (b.score > a.score ? b : a));
}

function scoreForLabel(preds, targetUpper) {
  const p = preds.find((x) => String(x.label).toUpperCase() === targetUpper);
  return p ? Number(p.score) : 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} url
 * @param {string} text
 * @param {string} token
 */
async function hfPostOnce(url, text, token) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
      signal: ac.signal,
    });
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw || "Invalid JSON" };
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

async function hfPostWithRetries(url, text, token) {
  let lastErr = "Unknown error";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const { ok, status, data } = await hfPostOnce(url, text, token);
      if (!ok) {
        lastErr =
          data?.error || data?.message || `HTTP ${status}`;
        if (RETRYABLE.has(status) && attempt < MAX_RETRIES) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        return { error: lastErr, preds: [] };
      }
      return { preds: normalizeClassificationPayload(data) };
    } catch (e) {
      lastErr = e?.name === "AbortError" ? "Timeout" : String(e?.message || e);
      if (attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return { error: lastErr, preds: [] };
    }
  }
  return { error: lastErr, preds: [] };
}

/**
 * Run both classifiers on plaintext (e.g. one user chat line).
 * @param {string} text
 * @returns {Promise<null | {
 *   suicideTopLabel: string|null,
 *   suicideTopScore: number,
 *   label1Score: number,
 *   emotionTopLabel: string|null,
 *   emotionTopScore: number,
 *   error?: string
 * }>}
 */
export async function inferHfForUserMessage(text) {
  const token = process.env.HF_TOKEN?.trim();
  if (!token) return null;

  const input = String(text || "").trim().slice(0, 2000);
  if (!input) return null;

  const [suicideRes, emotionRes] = await Promise.all([
    hfPostWithRetries(SUICIDE_URL, input, token),
    hfPostWithRetries(EMOTION_URL, input, token),
  ]);

  const sPreds = suicideRes.preds || [];
  const ePreds = emotionRes.preds || [];
  const sTop = topPrediction(sPreds);
  const eTop = topPrediction(ePreds);

  const errors = [suicideRes.error, emotionRes.error].filter(Boolean);
  const out = {
    suicideTopLabel: sTop.label,
    suicideTopScore: sTop.score,
    label1Score: scoreForLabel(sPreds, "LABEL_1"),
    emotionTopLabel: eTop.label,
    emotionTopScore: eTop.score,
  };
  if (errors.length && !sPreds.length && !ePreds.length) {
    out.error = errors.join("; ");
  } else if (errors.length) {
    out.partialError = errors.join("; ");
  }
  return out;
}
