/**
 * Persist PCM (Physics / Chemistry / Maths) doubt turns with encrypted text +
 * Hugging Face signals on the student line — same Inference API models as
 * `mental_health_risk_api/app/hf_client.py` (via hfInferenceService.js).
 * Does not merge into Talk mate Chat document or trigger HIGH risk alerts
 * (academic phrasing can false-positive); institute dashboards read PcmDoubtTurn separately.
 */

import PcmDoubtTurn from "../models/PcmDoubtTurn.js";
import { analyzeSentiment } from "./aiService.js";
import { encryptText } from "./cryptoService.js";
import { inferHfForUserMessage } from "./hfInferenceService.js";
import { hfSignalsForDb } from "./chatPersistence.js";

/**
 * @param {import("mongoose").Types.ObjectId} userId
 * @param {"Physics"|"Chemistry"|"Maths"} subject
 * @param {string} userPlaintext
 * @param {string} aiPlaintext
 */
export async function persistPcmDoubtTurn(
  userId,
  subject,
  userPlaintext,
  aiPlaintext,
) {
  let hf = null;
  try {
    hf = await inferHfForUserMessage(userPlaintext);
  } catch (e) {
    console.error("HF inference error (PCM turn still saved)", e?.message || e);
  }

  const sentiment = analyzeSentiment(userPlaintext);
  const uEnc = encryptText(userPlaintext);
  const aEnc = encryptText(aiPlaintext);
  const sig = hfSignalsForDb(hf);

  await PcmDoubtTurn.create({
    userId,
    subject,
    userMessage: {
      cipherText: uEnc.cipherText,
      iv: uEnc.iv,
      authTag: uEnc.authTag,
      sentiment,
      ...(sig ? { hfSignals: sig } : {}),
    },
    aiMessage: {
      cipherText: aEnc.cipherText,
      iv: aEnc.iv,
      authTag: aEnc.authTag,
    },
  });
}
