"""
FastAPI application: mental health risk assessment via Hugging Face Inference.

Run locally:
    export HF_TOKEN=hf_...
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8080

Notes:
    - If you see "ASGI 'lifespan' protocol appears unsupported" (INFO) but
      "Application startup complete" follows, the app still started; it is
      often from uvicorn's lifespan=auto probe or the reload parent process.
      Use: uvicorn app.main:app --host 0.0.0.0 --port 8080 --lifespan on
    - Random 404s (/HNAP1/, /loginMsg.js, /cgi/...) are usually LAN/internet
      scanners, not your API clients.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.hf_client import get_http_client, infer_emotion, infer_suicide
from app.risk_engine import assess_risk, score_message_signals
from app.schemas import RiskAssessmentRequest, RiskAssessmentResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Module-level client (created on startup, closed on shutdown)
_http_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _http_client
    settings = get_settings()
    _http_client = get_http_client(settings)
    yield
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


app = FastAPI(
    title="Mental Health Risk Assessment",
    description=(
        "Combines chat text (HF classifiers), PHQ-9, GAD-7, and counsellor rating "
        "into a structured risk score. Requires HF_TOKEN in the environment."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


def client_dep() -> httpx.AsyncClient:
    if _http_client is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialized")
    return _http_client


def settings_dep() -> Settings:
    return get_settings()


def _truncate(text: str, max_chars: int) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3] + "..."


async def _analyze_single_message(
    raw_text: str,
    client: httpx.AsyncClient,
    settings: Settings,
) -> dict[str, Any]:
    """
    Run suicide + emotion models for one message.
    On failure, returns a dict with error set (caller aggregates without crashing).
    """
    text = _truncate(raw_text, settings.max_message_chars)
    if not text:
        return {"skipped": True}

    try:
        suicide_preds = await infer_suicide(client, text, settings)
        emotion_preds = await infer_emotion(client, text, settings)
    except Exception as e:
        logger.warning("HF inference failed for a message: %s", e)
        return {
            "error": str(e),
            "risk_delta": 0,
            "suicidal": False,
            "sadness_fear_hit": False,
            "top_emotion": "unknown",
            "conf_suicide": 0.0,
            "conf_emotion": 0.0,
        }

    signals = score_message_signals(suicide_preds, emotion_preds)
    return signals


@app.get("/")
async def root() -> dict[str, str]:
    """Avoid noisy 404s from browsers and health probes; points callers to real routes."""
    return {
        "service": "mental_health_risk_api",
        "health": "/health",
        "assess": "POST /assess",
        "docs": "/docs",
    }


@app.get("/health")
async def health(settings: Settings = Depends(settings_dep)) -> dict[str, str]:
    """Liveness; does not call Hugging Face."""
    token_ok = bool(settings.hf_token)
    return {
        "status": "ok",
        "hf_token_configured": "yes" if token_ok else "no",
    }


@app.post("/assess", response_model=RiskAssessmentResponse)
async def assess(
    body: RiskAssessmentRequest,
    client: httpx.AsyncClient = Depends(client_dep),
    settings: Settings = Depends(settings_dep),
) -> RiskAssessmentResponse:
    """
    Assess risk from combined chat logs, screening scores, and counsellor rating.

    Chat messages are analyzed with HF suicide + emotion models (with retries and
    10s timeout per request). If HF_TOKEN is missing, returns 503.
    """
    if not settings.hf_token:
        raise HTTPException(
            status_code=503,
            detail="HF_TOKEN is not configured; cannot call Hugging Face Inference.",
        )

    # Step 1: combine chatbot + peer messages (order preserved)
    all_messages: list[str] = [
        *body.chatbot_messages,
        *body.peer_messages,
    ]

    message_results: list[dict[str, Any]] = []
    for msg in all_messages:
        result = await _analyze_single_message(msg, client, settings)
        message_results.append(result)

    return await assess_risk(body, message_results)


@app.post("/assess/demo")
async def assess_demo() -> JSONResponse:
    """
    Example JSON shape (no HF call). Useful for contract tests without a token.
    """
    sample = {
        "risk_score": 8,
        "risk_level": "MODERATE",
        "summary": {
            "suicidal_messages": 0,
            "dominant_emotion": "sadness",
            "phq9": 10,
            "gad7": 8,
            "counsellor_score": 5,
            "sadness_fear_messages": 2,
            "average_confidence": 0.8123,
        },
        "action": "Suggest peer support and moderated community check-ins.",
    }
    return JSONResponse(sample)
