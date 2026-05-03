"""
Answer questions using text files in ./data via Groq.
"""
from pathlib import Path

from groq_client import groq_chat_completion


def _load_data_context(max_chars: int = 32000) -> str:
    data_dir = Path(__file__).resolve().parent / "data"
    parts: list[str] = []
    if data_dir.is_dir():
        for p in sorted(data_dir.glob("*.txt")):
            try:
                parts.append(p.read_text(encoding="utf-8"))
            except OSError:
                continue
    raw = "\n\n---\n\n".join(parts).strip()
    if not raw:
        return "(No reference documents in data/.)"
    return raw[:max_chars]


def query_documents(query: str) -> str:
    context = _load_data_context()
    system = (
        "You are ManMitra's document assistant. Answer using ONLY the reference text below. "
        "If the answer is not contained there, say clearly that it is not in the documents.\n\n"
        f"Reference:\n{context}"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": query},
    ]
    return groq_chat_completion(messages, temperature=0.5, max_tokens=1024)
