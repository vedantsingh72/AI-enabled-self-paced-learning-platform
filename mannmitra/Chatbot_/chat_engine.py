from groq_client import groq_chat_completion

SYSTEM_PROMPT = """You are ManMitra, a warm mental health support companion. Offer emotional support, validation, and gentle coping ideas.

Rules:
- Be supportive, non-judgmental, and calm. Use short paragraphs and plain language.
- Never diagnose medical or psychiatric conditions; do not prescribe medication.
- If someone may be in danger, encourage emergency services or a trusted professional.
- You are not a licensed therapist; you complement professional care.
- Listen first; ask open questions when helpful."""

session_messages: dict[str, list[dict[str, str]]] = {}


def get_response(session_id: str, query: str) -> str:
    if session_id not in session_messages:
        session_messages[session_id] = [{"role": "system", "content": SYSTEM_PROMPT}]

    msgs = session_messages[session_id]
    msgs.append({"role": "user", "content": query})
    reply = groq_chat_completion(msgs)
    msgs.append({"role": "assistant", "content": reply})
    return reply
