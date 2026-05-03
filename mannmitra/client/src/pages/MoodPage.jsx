import { useEffect, useState } from "react";
import api from "../services/api";
const moods = ["Happy", "Neutral", "Sad", "Stressed"];
export default function MoodPage() {
  const [selected, setSelected] = useState("Happy");
  const [history, setHistory] = useState([]);
  const load = async () => {
    const { data } = await api.get("/mood/history");
    setHistory(data);
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    const date = new Date().toISOString().split("T")[0];
    await api.post("/mood/add", { mood: selected, date });
    load();
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
        Wellness
      </p>
      <h2 className="mt-2 mm-heading md:text-3xl">Mood tracker</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {moods.map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setSelected(m)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selected === m
                ? "bg-wellness-sage text-white shadow-sm"
                : "border border-stone-200 bg-white text-slate-700 hover:border-wellness-sage/30"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <button type="button" onClick={save} className="mm-btn-primary mt-6">
        Log Today&apos;s Mood
      </button>
      <div className="mt-5 mm-card">
        {history.map((h) => (
          <div
            key={h._id}
            className="flex justify-between rounded-lg border border-stone-100 bg-wellness-paper px-3 py-2 text-slate-700"
          >
            <span>{h.date}</span>
            <span className="text-wellness-sage">{h.mood}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
