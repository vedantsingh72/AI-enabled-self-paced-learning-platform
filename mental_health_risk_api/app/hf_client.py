"""
Hugging Face Inference API client (router.huggingface.co).

Uses Bearer token from settings only — never logs or returns the token.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

# Endpoints specified for this product integration
SUICIDE_MODEL_URL = (
    "https://router.huggingface.co/hf-inference/models/sentinet/suicidality"
)
EMOTION_MODEL_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "bhadresh-savani/bert-base-uncased-emotion"
)

# Status codes that are worth retrying (transient)
RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}


def _normalize_classification_payload(data: Any) -> list[dict[str, Any]]:
    """
    HF text-classification responses vary: [[{label, score}, ...]] or [{...}].
    Normalize to a flat list of dicts with string 'label' and float 'score'.
    """
    if data is None:
        return []
    if isinstance(data, dict) and "error" in data:
        return []
    if isinstance(data, list) and len(data) > 0:
        first = data[0]
        if isinstance(first, list):
            inner = first
        elif isinstance(first, dict):
            inner = data
        else:
            return []
        out: list[dict[str, Any]] = []
        for item in inner:
            if isinstance(item, dict) and "label" in item and "score" in item:
                try:
                    out.append(
                        {
                            "label": str(item["label"]),
                            "score": float(item["score"]),
                        }
                    )
                except (TypeError, ValueError):
                    continue
        return out
    return []


async def _post_with_retries(
    client: httpx.AsyncClient,
    url: str,
    text: str,
    token: str,
    max_retries: int,
) -> list[dict[str, Any]]:
    """
    POST {"inputs": text} with Authorization Bearer.

    Retries up to `max_retries` times after the first attempt (total attempts =
    max_retries + 1). Waits briefly between retries.
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {"inputs": text}
    for attempt in range(max_retries + 1):
        try:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code in RETRYABLE_STATUS and attempt < max_retries:
                wait_s = 0.5 * (2**attempt)
                logger.warning(
                    "HF inference %s returned %s; retry %s/%s after %.1fs",
                    url,
                    response.status_code,
                    attempt + 1,
                    max_retries,
                    wait_s,
                )
                await asyncio.sleep(wait_s)
                continue
            response.raise_for_status()
            parsed = response.json()
            return _normalize_classification_payload(parsed)
        except httpx.TimeoutException:
            if attempt < max_retries:
                wait_s = 0.5 * (2**attempt)
                logger.warning("HF timeout; retry %s/%s", attempt + 1, max_retries)
                await asyncio.sleep(wait_s)
                continue
            logger.exception("HF request timed out after retries")
            raise
        except httpx.HTTPStatusError as e:
            if (
                e.response is not None
                and e.response.status_code in RETRYABLE_STATUS
                and attempt < max_retries
            ):
                wait_s = 0.5 * (2**attempt)
                logger.warning(
                    "HF HTTP error %s; retry %s/%s",
                    e.response.status_code,
                    attempt + 1,
                    max_retries,
                )
                await asyncio.sleep(wait_s)
                continue
            logger.exception("HF HTTP error (no more retries)")
            raise
        except Exception:
            logger.exception("HF inference failed")
            raise

    return []


async def infer_suicide(
    client: httpx.AsyncClient,
    text: str,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    """Run suicidality classifier; returns list of {label, score}."""
    s = settings or get_settings()
    if not s.hf_token:
        raise RuntimeError("HF_TOKEN is not configured")
    return await _post_with_retries(
        client,
        SUICIDE_MODEL_URL,
        text,
        s.hf_token,
        s.hf_max_retries,
    )


async def infer_emotion(
    client: httpx.AsyncClient,
    text: str,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    """Run emotion classifier; returns list of {label, score}."""
    s = settings or get_settings()
    if not s.hf_token:
        raise RuntimeError("HF_TOKEN is not configured")
    return await _post_with_retries(
        client,
        EMOTION_MODEL_URL,
        text,
        s.hf_token,
        s.hf_max_retries,
    )


def get_http_client(settings: Settings | None = None) -> httpx.AsyncClient:
    """Shared async client with 10s timeout (configurable)."""
    s = settings or get_settings()
    return httpx.AsyncClient(timeout=s.hf_timeout_seconds)
