import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { ensureAnonymousSession } from "../utils/session";

/**
 * Public chatbot UI (no auth). Use on landing (`embedded`) or legacy full page (`page`).
 */
export default function MentalHealthChatbot({ variant = "embedded" }) {
  const [sessionId, setSessionId] = useState(null);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const startSession = useCallback(async () => {
    setError("");
    try {
      // MHH routes need JWT or x-anonymous-id. Logged-in students already send Bearer;
      // public landing needs an anonymous session so turns persist to the right user.
      if (!localStorage.getItem("userToken")) {
        await ensureAnonymousSession();
      }
      const { data } = await api.post("/mhh/chatbot/session/start");
      setSessionId(data.sessionId);
    } catch {
      setError(
        "Could not start a session. Start the Chatbot FastAPI app and ensure the Mannmitra API proxy is running.",
      );
    }
  }, []);

  useEffect(() => {
    startSession();
  }, [startSession]);

  const send = async () => {
    if (!text.trim() || !sessionId) return;
    const t = text.trim();
    setText("");
    setError("");
    setMessages((p) => [...p, { id: crypto.randomUUID(), sender: "user", text: t }]);
    setTyping(true);

    try {
      const { data } = await api.post("/mhh/chatbot/message", {
        sessionId,
        message: t,
      });
      setMessages((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: data.reply || "I'm here with you.",
        },
      ]);
    } catch {
      setError(
        "Message could not be sent. Check GROQ_API_KEY, FastAPI on port 8000, and MHH_CHATBOT_URL on the Node server.",
      );
      setMessages((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: "Something went wrong on our side. Please try again in a moment.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const shell =
    variant === "page"
      ? "mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6"
      : "flex w-full max-w-2xl flex-col";

  return (
    <div className={shell}>
      {variant === "page" ? (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
            Learning
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900">
            Talk mate
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ask questions about your courses and study habits — not a substitute
            for professional care.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex max-h-[min(520px,70vh)] flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-md">
        <div className="border-b border-stone-100 bg-wellness-paper px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-wellness-sage">
            {sessionId ? "Session active" : "Connecting…"}
          </p>
        </div>

        <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !typing ? (
            <p className="text-center text-sm text-slate-500">
              Say hello when you are ready. Take your time.
            </p>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.sender === "user"
                    ? "rounded-br-md bg-wellness-teal text-white"
                    : "rounded-bl-md border border-stone-100 bg-stone-50 text-slate-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-stone-100 bg-stone-50 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-wellness-sage [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-wellness-sage [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-wellness-sage" />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-stone-100 p-3">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={!sessionId || typing}
              className="mm-input max-h-32 min-h-[44px] flex-1 resize-y disabled:opacity-60"
              placeholder={sessionId ? "Type a message…" : "Starting session…"}
            />
            <button
              type="button"
              onClick={send}
              disabled={!sessionId || typing || !text.trim()}
              className="mm-btn-primary shrink-0 px-5"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
