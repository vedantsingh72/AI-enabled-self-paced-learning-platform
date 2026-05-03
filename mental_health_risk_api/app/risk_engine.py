"""
Risk scoring, aggregation, and action mapping.

Implements the rules from the product spec (suicide / emotion / screenings / counsellor).
"""

from __future__ import annotations

import logging
from collections import Counter
from typing import Any

from app.schemas import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    RiskLevel,
    RiskSummary,
)

logger = logging.getLogger(__name__)

# Suicide model: spec says LABEL_1 = high risk
SUICIDE_HIGH_RISK_LABEL = "LABEL_1"

# Emotion labels (bert-base-uncased-emotion style — normalized to lowercase)
EMOTION_SADNESS = "sadness"
EMOTION_FEAR = "fear"
EMOTION_ANGER = "anger"


def phq9_risk_points(score: int) -> int:
    if score <= 4:
        return 0
    if score <= 9:
        return 2
    if score <= 14:
        return 4
    if score <= 19:
        return 6
    return 8


def gad7_risk_points(score: int) -> int:
    if score <= 4:
        return 0
    if score <= 9:
        return 2
    if score <= 14:
        return 4
    return 6


def counsellor_risk_points(rating: int) -> int:
    """Counsellor rating 1–10 → risk contribution."""
    if rating <= 3:
        return 1
    if rating <= 6:
        return 3
    return 6


def risk_level_from_score(score: int) -> RiskLevel:
    if score <= 5:
        return "LOW"
    if score <= 12:
        return "MODERATE"
    if score <= 20:
        return "HIGH"
    return "CRITICAL"


def action_for_level(level: RiskLevel) -> str:
    if level == "LOW":
        return "Show wellness tips and general self-care resources."
    if level == "MODERATE":
        return "Suggest peer support and moderated community check-ins."
    if level == "HIGH":
        return "Suggest scheduling a counsellor meeting as soon as possible."
    return "Trigger emergency alert system and immediate human escalation."


def _top_prediction(predictions: list[dict[str, Any]]) -> tuple[str | None, float]:
    if not predictions:
        return None, 0.0
    best = max(predictions, key=lambda x: x.get("score", 0.0))
    label = str(best.get("label", "")).strip()
    score = float(best.get("score", 0.0))
    return label or None, score


def _normalize_emotion_label(label: str) -> str:
    return label.lower().replace("label_", "").strip()


def score_message_signals(
    suicide_preds: list[dict[str, Any]],
    emotion_preds: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Per-message scoring from classifier outputs.

    Returns dict with: risk_delta, suicidal, sadness_fear_hit, top_emotion, confidences.
    """
    risk_delta = 0
    suicidal = False
    sadness_fear_hit = False

    # --- Suicide ---
    label_s, conf_s = _top_prediction(suicide_preds)
    label_1_score = next(
        (
            float(p["score"])
            for p in suicide_preds
            if str(p.get("label", "")).upper() == SUICIDE_HIGH_RISK_LABEL
        ),
        0.0,
    )
    # Spec: LABEL_1 = high risk — treat message as suicidal if top label is LABEL_1
    if (label_s or "").upper() == SUICIDE_HIGH_RISK_LABEL:
        suicidal = True
        risk_delta += 10
        high_conf = label_1_score if label_1_score else conf_s
        if high_conf > 0.9:
            risk_delta += 5

    # --- Emotion ---
    label_e, conf_e = _top_prediction(emotion_preds)
    emo = _normalize_emotion_label(label_e or "")

    if emo == EMOTION_SADNESS:
        risk_delta += 3
        sadness_fear_hit = True
    elif emo == EMOTION_FEAR:
        risk_delta += 2
        sadness_fear_hit = True
    elif emo == EMOTION_ANGER:
        risk_delta += 2

    return {
        "risk_delta": risk_delta,
        "suicidal": suicidal,
        "sadness_fear_hit": sadness_fear_hit,
        "top_emotion": emo or "unknown",
        "conf_suicide": conf_s,
        "conf_emotion": conf_e,
    }


def aggregate_dominant_emotion(emotions: list[str]) -> str:
    if not emotions:
        return "unknown"
    counts = Counter(e for e in emotions if e and e != "unknown")
    if not counts:
        return "unknown"
    return counts.most_common(1)[0][0]


async def assess_risk(
    payload: RiskAssessmentRequest,
    message_results: list[dict[str, Any]],
) -> RiskAssessmentResponse:
    """
    Build final response from request + per-message HF results.

    `message_results` entries should include keys from score_message_signals plus
    optional error flags.
    """
    risk_score = 0
    suicidal_count = 0
    sadness_fear_count = 0
    emotions: list[str] = []
    confidences: list[float] = []

    for r in message_results:
        if r.get("skipped"):
            continue
        if r.get("error"):
            logger.debug("Skipping errored message in aggregation: %s", r.get("error"))
            continue
        risk_score += int(r.get("risk_delta", 0))
        if r.get("suicidal"):
            suicidal_count += 1
        if r.get("sadness_fear_hit"):
            sadness_fear_count += 1
        emotions.append(str(r.get("top_emotion", "unknown")))
        cs = float(r.get("conf_suicide", 0.0))
        ce = float(r.get("conf_emotion", 0.0))
        confidences.append((cs + ce) / 2.0)

    risk_score += phq9_risk_points(payload.phq9_score)
    risk_score += gad7_risk_points(payload.gad7_score)
    risk_score += counsellor_risk_points(payload.counsellor_rating)

    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    dominant = aggregate_dominant_emotion(emotions)

    level = risk_level_from_score(risk_score)
    action = action_for_level(level)

    summary = RiskSummary(
        suicidal_messages=suicidal_count,
        dominant_emotion=dominant,
        phq9=payload.phq9_score,
        gad7=payload.gad7_score,
        counsellor_score=payload.counsellor_rating,
        sadness_fear_messages=sadness_fear_count,
        average_confidence=round(avg_conf, 4),
    )

    return RiskAssessmentResponse(
        risk_score=risk_score,
        risk_level=level,
        summary=summary,
        action=action,
    )
