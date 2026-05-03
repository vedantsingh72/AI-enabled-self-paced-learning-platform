import os
from typing import Dict, List

import requests
from dotenv import load_dotenv

load_dotenv()


def groq_chat_completion(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.65,
    max_tokens: int = 1024,
) -> str:
    """Groq OpenAI-compatible chat completions (https://console.groq.com/docs/api)."""
    url = os.getenv(
        "GROQ_API_URL",
        "https://api.groq.com/openai/v1/chat/completions",
    ).strip()
    key = os.getenv("GROQ_API_KEY", "").strip()
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    if not key:
        raise ValueError("GROQ_API_KEY is not configured")

    res = requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        json={
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=120,
    )
    if not res.ok:
        raise RuntimeError(f"Groq API error {res.status_code}: {res.text[:500]}")

    data = res.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not text:
        raise RuntimeError("Empty response from Groq API")
    return str(text).strip()
