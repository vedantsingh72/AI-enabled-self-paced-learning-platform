import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const SUBJECTS = ["Physics", "Chemistry", "Maths"];

/**
 * Groq-backed PCM doubt tutor for the student Courses page (Physics / Chemistry / Maths).
 */
export default function PcmDoubtChatbot() {
  const [subject, setSubject] = useState("Physics");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setError("");
  }, [subject]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async () => {
    const t = text.trim();
    if (!t || typing) return;
    setText("");
    setError("");
    const userMsg = { id: crypto.randomUUID(), sender: "user", text: t };
    setMessages((p) => [...p, userMsg]);
    setTyping(true);

    const history = messages.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    try {
      const { data } = await api.post("/learning/pcm-doubt", {
        subject,
        message: t,
        history,
      });
      setMessages((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: data.reply || "—",
        },
      ]);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        "Could not reach the tutor. Check that GROQ_API_KEY is set on the server.";
      setError(msg);
      setMessages((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: "Something went wrong. Please try again in a moment.",
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

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/90 border-l-[6px] border-l-wellness-teal bg-white shadow-sm">
      <div className="border-b border-stone-100 bg-gradient-to-r from-wellness-teal/10 to-wellness-sage/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-teal">
          PCM doubt tutor
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          Ask Physics, Chemistry &amp; Maths
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Pick a subject, then type a JEE-style question. This is separate from{" "}
          <span className="font-medium text-slate-800">Talk mate</span> (wellbeing).
        </p>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Subject for doubt tutor"
        >
          {SUBJECTS.map((s) => {
            const active = subject === s;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubject(s)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wellness-teal focus-visible:ring-offset-2 ${
                  active
                    ? "bg-wellness-teal text-white shadow-sm"
                    : "bg-white/90 text-slate-700 ring-1 ring-stone-200 hover:bg-wellness-teal/10"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <div className="flex max-h-[min(420px,55vh)] flex-col overflow-hidden">
        <div className="min-h-[160px] flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !typing ? (
            <p className="text-center text-sm text-slate-500">
              Example: “Derive the equations of motion from constant acceleration”
              (Physics) or “Explain SN2 vs SN1” (Chemistry).
            </p>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
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
                <span className="h-2 w-2 animate-bounce rounded-full bg-wellness-teal [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-wellness-teal [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-wellness-teal" />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-stone-100 bg-wellness-paper/50 p-4">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              disabled={typing}
              className="mm-input max-h-40 min-h-[52px] flex-1 resize-y disabled:opacity-60"
              placeholder={`Ask a ${subject} doubt…`}
              aria-label="Your doubt message"
            />
            <button
              type="button"
              onClick={send}
              disabled={typing || !text.trim()}
              className="mm-btn-primary h-fit shrink-0 self-end px-5 py-2.5"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
