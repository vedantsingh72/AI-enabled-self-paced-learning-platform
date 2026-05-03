import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

function levelBadgeClass(level) {
  switch (level) {
    case "LOW":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case "MODERATE":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "HIGH":
      return "bg-orange-100 text-orange-900 ring-orange-200";
    case "CRITICAL":
      return "bg-red-100 text-red-900 ring-red-200";
    default:
      return "bg-stone-100 text-stone-800 ring-stone-200";
  }
}

function learningRiskBadgeClass(level) {
  switch (level) {
    case "Normal":
      return "bg-emerald-100/90 text-emerald-900 ring-emerald-200";
    case "Struggling":
      return "bg-amber-100 text-amber-950 ring-amber-200";
    case "Burnout":
      return "bg-rose-100 text-rose-900 ring-rose-200";
    default:
      return "bg-stone-100 text-stone-700 ring-stone-200";
  }
}

/**
 * @param {{
 *   endpoint: string,
 *   title?: string,
 *   subtitle?: string,
 *   prefetched?: { students?: unknown[]; generatedAt?: string } | null,
 *   onRiskData?: (body: { students?: unknown[]; generatedAt?: string }) => void,
 *   surface?: "card" | "flat",
 * }} props
 */
export default function RiskDetectionDashboard({
  endpoint,
  title = "Risk detection dashboard",
  subtitle = "Mental screening (PHQ-9 / GAD-7), e-learning behavior scores, counsellor input, and chat signals — combined into one risk view.",
  prefetched = null,
  onRiskData,
  surface = "card",
}) {
  const [data, setData] = useState(
    prefetched?.students != null
      ? {
          students: prefetched.students,
          generatedAt: prefetched.generatedAt,
        }
      : null,
  );
  const [loading, setLoading] = useState(prefetched?.students == null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const { data: body } = await api.get(endpoint);
      setData(body);
      onRiskData?.(body);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Could not load risk data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint, onRiskData]);

  useEffect(() => {
    if (prefetched?.students != null) {
      setData({
        students: prefetched.students,
        generatedAt: prefetched.generatedAt,
      });
      setLoading(false);
      setErr("");
      return;
    }
    load();
  }, [endpoint, prefetched, load]);

  const shell =
    surface === "flat"
      ? "rounded-2xl border-0 bg-transparent p-0 shadow-none"
      : "rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm";

  if (loading) {
    return (
      <section className={`${shell} ${surface === "flat" ? "py-1" : ""}`}>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Loading risk scores…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-red-700">{err}</p>
        <button type="button" onClick={load} className="mm-btn-secondary mt-3 text-sm">
          Retry
        </button>
      </section>
    );
  }

  const students = data?.students || [];

  return (
    <section className={shell}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-stone-100/90 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          {data?.generatedAt ? (
            <p className="mt-1 text-xs text-slate-400">
              Generated {new Date(data.generatedAt).toLocaleString()} · {students.length}{" "}
              student{students.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={load} className="mm-btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {!students.length ? (
        <p className="text-sm text-slate-500">No students in scope yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200/90 bg-white shadow-sm">
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead className="bg-wellness-paper text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Student</th>
                <th className="px-3 py-2.5 text-right">PHQ-9</th>
                <th className="px-3 py-2.5 text-right">GAD-7</th>
                <th className="px-3 py-2.5 text-right">Behavior</th>
                <th className="px-3 py-2.5 text-center">Study risk</th>
                <th className="px-3 py-2.5 text-right">Peer chat</th>
                <th className="px-3 py-2.5 text-right">Talk mate</th>
                <th className="px-3 py-2.5 text-right">PCM tutor</th>
                <th className="px-3 py-2.5 text-right">Counsellor</th>
                <th className="px-3 py-2.5 text-right font-bold text-slate-900">Total</th>
                <th className="px-3 py-2.5">Level</th>
                <th className="px-3 py-2.5">Suggested action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.map((row) => {
                const c = row.components || {};
                return (
                  <tr key={row.userId} className="bg-white hover:bg-wellness-paper/40">
                    <td className="px-3 py-2.5 align-top">
                      <p className="font-medium text-slate-900">{row.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {row.username ? `@${row.username}` : row.institute || "—"}
                      </p>
                      <p className="text-xs text-slate-400">{row.college}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      {c.phq9_raw != null ? (
                        <>
                          <span className="text-slate-900">{c.phq9_raw}</span>
                          <span className="text-slate-400"> → </span>
                          <span className="font-semibold text-wellness-sage">
                            +{c.phq9_points}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {row.mental_screening?.phq9?.severity ? (
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {row.mental_screening.phq9.severity}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      {c.gad7_raw != null ? (
                        <>
                          <span className="text-slate-900">{c.gad7_raw}</span>
                          <span className="text-slate-400"> → </span>
                          <span className="font-semibold text-wellness-sage">
                            +{c.gad7_points}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {row.mental_screening?.gad7?.severity ? (
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {row.mental_screening.gad7.severity}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      {row.elearning?.behavioralScore != null ? (
                        <>
                          <span className="font-semibold text-wellness-sage">
                            {Number(row.elearning.behavioralScore).toFixed(1)}
                          </span>
                          <span className="text-slate-400"> /10</span>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Metadata: pointer, idle, tabs, typing rate, scroll
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {row.elearning?.riskLevel ? (
                        <>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${learningRiskBadgeClass(row.elearning.riskLevel)}`}
                          >
                            {row.elearning.riskLevel}
                          </span>
                          {row.elearning.computedAt ? (
                            <p className="mt-1 text-[10px] text-slate-400">
                              {new Date(row.elearning.computedAt).toLocaleDateString()}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      <span className="font-semibold text-slate-900">
                        +{c.peer_chat_points ?? 0}
                      </span>
                      {c.peer_chat_detail ? (
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                          n={c.peer_chat_detail.messagesAnalyzed}
                          {c.peer_chat_detail.flaggedCount
                            ? ` · ${c.peer_chat_detail.flaggedCount} flagged`
                            : ""}
                          {c.peer_chat_detail.keywordAlert ? " · keyword" : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      <span className="font-semibold text-slate-900">
                        +{c.ai_chatbot_points ?? 0}
                      </span>
                      {c.ai_chatbot_detail ? (
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                          {c.ai_chatbot_detail.latestRiskLevel || "—"}
                          {c.ai_chatbot_detail.uses_huggingface
                            ? ` · HF ${c.ai_chatbot_detail.hf_scored_messages ?? 0} msg`
                            : ""}
                          {c.ai_chatbot_detail.negativeUserMessages
                            ? ` · ${c.ai_chatbot_detail.negativeUserMessages} neg`
                            : ""}
                          {c.ai_chatbot_detail.hf_dominant_emotion &&
                          c.ai_chatbot_detail.hf_dominant_emotion !== "—"
                            ? ` · ${c.ai_chatbot_detail.hf_dominant_emotion}`
                            : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      <span className="font-semibold text-slate-500">—</span>
                      {c.pcm_doubt_detail ? (
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                          {c.pcm_doubt_detail.total_turns
                            ? `${c.pcm_doubt_detail.total_turns} turn(s)`
                            : "no turns"}
                          {c.pcm_doubt_detail.uses_huggingface
                            ? ` · HF ${c.pcm_doubt_detail.hf_scored_messages ?? 0} scored`
                            : ""}
                          {c.pcm_doubt_detail.hf_dominant_emotion &&
                          c.pcm_doubt_detail.hf_dominant_emotion !== "—"
                            ? ` · ${c.pcm_doubt_detail.hf_dominant_emotion}`
                            : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      <span className="text-slate-600">{c.counsellor_rating_used}/10</span>
                      <span className="text-slate-400"> → </span>
                      <span className="font-semibold text-wellness-sage">
                        +{c.counsellor_points}
                      </span>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {c.counsellor_rating_label}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right align-top tabular-nums">
                      <span className="text-lg font-bold text-slate-900">{row.final_score}</span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${levelBadgeClass(row.risk_level)}`}
                      >
                        {row.risk_level}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5 align-top text-xs text-slate-600">
                      {row.action}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        <strong>Mental screening:</strong> PHQ-9 and GAD-7 raw scores and severity labels;
        dashboard points follow clinical bands (0–8 / 0–6).{" "}
        <strong>Behavior / Study risk:</strong> from the learning module — rolling
        behavioral score (interaction metadata only, no keystroke content) fused with
        screening-derived wellbeing score; Normal / Struggling / Burnout matches the
        student app. Counsellor points map from saved session feedback. Peer chat and
        Talk mate use the same HF emotion + suicidality models as the Python{" "}
        <code className="rounded bg-stone-100 px-1">mental_health_risk_api</code>{" "}
        service when <code className="rounded bg-stone-100 px-1">HF_TOKEN</code> is set.
        PCM tutor shows separate Hugging Face aggregates from Physics/Chemistry/Maths
        doubt messages (not added to the total risk score).
      </p>
    </section>
  );
}
