import { useEffect, useState } from "react";
import api from "../services/api";

export default function ForumPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Exam Stress Support");
  const [language, setLanguage] = useState("English");
  const [error, setError] = useState("");

  const loadGroups = async () => {
    const { data } = await api.get("/peer/groups");
    setGroups(data);
  };

  const loadMessages = async (groupId) => {
    const { data } = await api.get(`/peer/groups/${groupId}/messages`);
    setMessages(data);
  };

  useEffect(() => {
    loadGroups().catch(() => {});
  }, []);

  const joinGroup = async (group) => {
    await api.post(`/peer/groups/${group._id}/join`);
    setSelectedGroup(group);
    await loadMessages(group._id);
  };

  const sendMessage = async () => {
    if (!selectedGroup || !text.trim()) return;
    try {
      setError("");
      await api.post(`/peer/groups/${selectedGroup._id}/messages`, { text });
      setText("");
      await loadMessages(selectedGroup._id);
    } catch (e) {
      setError(e?.response?.data?.message || "Unable to send message");
    }
  };

  const matchListener = async () => {
    try {
      setError("");
      const { data } = await api.post("/peer/match-listener", {
        category,
        language,
      });
      await joinGroup(data);
    } catch (e) {
      setError(e?.response?.data?.message || "No listener match found");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
        Community
      </p>
      <h2 className="mt-2 mm-heading md:text-3xl">Study squad</h2>
      <div className="mt-4 mm-card">
        <h3 className="font-semibold text-slate-900">One-to-One Peer Listener Match</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mm-input"
            placeholder="Issue category"
          />
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mm-input"
            placeholder="Language preference"
          />
          <button type="button" onClick={matchListener} className="mm-btn-primary">
            Match Listener
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="mm-card">
          <h3 className="font-semibold text-slate-900">Support Rooms</h3>
          <div className="mt-3 space-y-2">
            {groups.map((g) => (
              <button
                type="button"
                key={g._id}
                onClick={() => joinGroup(g)}
                className="w-full rounded-xl border border-stone-200 bg-wellness-paper p-3 text-left text-slate-800 transition hover:border-wellness-sage/30 hover:bg-white"
              >
                <p className="font-medium text-slate-900">{g.name}</p>
                <p className="text-xs text-slate-500">
                  {g.category} | {g.language} | {g.type}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="mm-card">
          <h3 className="font-semibold text-slate-900">
            {selectedGroup ? selectedGroup.name : "Select a room"}
          </h3>
          <div className="mt-3 h-72 space-y-2 overflow-auto rounded-xl border border-stone-200 bg-wellness-paper p-2">
            {messages.map((m) => (
              <div
                key={m._id}
                className="rounded-lg border border-stone-100 bg-white p-2 text-sm text-slate-700"
              >
                <p className="font-medium text-slate-900">
                  {m.senderId?.displayName || "Member"}
                </p>
                <p>{m.text}</p>
                {m.flagged ? (
                  <p className="text-xs text-red-400">Flagged: {m.flagReason}</p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mm-input flex-1"
              placeholder="Share with peers..."
            />
            <button type="button" onClick={sendMessage} className="mm-btn-success">
              Send
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
