import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { notifyAuthChange } from "../hooks/useAuthSnapshot";
import RiskDetectionDashboard from "../components/RiskDetectionDashboard";

const PANELS = [
  { id: "insights", label: "Student insights" },
  { id: "study_squad", label: "Study squad" },
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "Session history" },
];

function insightChips(insight) {
  if (!insight) return null;
  const ms = insight.mental_screening;
  const el = insight.elearning;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {ms?.phq9?.score != null ? (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80">
          PHQ-9: {ms.phq9.score}
          {ms.phq9.severity ? ` · ${ms.phq9.severity}` : ""}
        </span>
      ) : (
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-slate-500">
          No PHQ-9 yet
        </span>
      )}
      {ms?.gad7?.score != null ? (
        <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 ring-1 ring-sky-200/80">
          GAD-7: {ms.gad7.score}
          {ms.gad7.severity ? ` · ${ms.gad7.severity}` : ""}
        </span>
      ) : (
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-slate-500">
          No GAD-7 yet
        </span>
      )}
      {el?.behavioralScore != null ? (
        <span className="inline-flex items-center rounded-full bg-wellness-sage/10 px-2.5 py-1 text-xs font-medium text-wellness-sage ring-1 ring-wellness-sage/25">
          Behavior: {Number(el.behavioralScore).toFixed(1)}/10
        </span>
      ) : (
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-slate-500">
          No e-learning behavior yet
        </span>
      )}
      {el?.riskLevel ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/80">
          Study: {el.riskLevel}
        </span>
      ) : null}
    </div>
  );
}

function HistorySessionCard({ b }) {
  const cf = b.counsellorFeedback;
  const sf = b.studentFeedback;
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">
            {b.userId?.name || b.userId?.displayName || "Student"}
            {b.userId?.username ? (
              <span className="font-normal text-slate-500">
                {" "}
                · @{b.userId.username}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {b.date || "—"} {b.slot ? `· ${b.slot}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200">
          Completed
        </span>
      </div>
      {cf?.submittedAt ? (
        <div className="mt-4 rounded-xl border border-wellness-sage/20 bg-wellness-paper/70 p-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-wellness-sage">
            Your assessment
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Condition:</span>{" "}
            {cf.conditionLevel?.replace(/_/g, " ") ?? "—"} ·{" "}
            <span className="text-slate-500">Risk:</span> {cf.riskLevel ?? "—"}
          </p>
          {cf.mentalHealthSummary ? (
            <p className="mt-2 line-clamp-3 text-slate-600">{cf.mentalHealthSummary}</p>
          ) : null}
          {cf.recommendations ? (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Next steps:</span>{" "}
              {cf.recommendations}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No counsellor notes saved for this session.</p>
      )}
      {sf?.submittedAt ? (
        <p className="mt-3 text-xs text-slate-500">
          Student rating: {sf.rating}/5
          {sf.comment ? ` — ${sf.comment}` : ""}
        </p>
      ) : null}
    </div>
  );
}

export default function CounsellorDashboardPage() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState("insights");
  const [bookings, setBookings] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [assessment, setAssessment] = useState({});
  const [groups, setGroups] = useState([]);
  const [wellnessNote, setWellnessNote] = useState({});
  const [riskPrefetched, setRiskPrefetched] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  const generateMeetingCode = () =>
    `MM-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;

  const load = async () => {
    const [bookingRes, groupRes, riskRes] = await Promise.all([
      api.get("/booking/counsellor/my"),
      api.get("/peer/groups"),
      api.get("/booking/counsellor/risk-dashboard"),
    ]);
    setBookings(bookingRes.data);
    setGroups(groupRes.data);
    setRiskPrefetched({
      students: riskRes.data.students || [],
      generatedAt: riskRes.data.generatedAt,
    });
  };

  useEffect(() => {
    setPageLoading(true);
    load()
      .catch(() => {
        localStorage.removeItem("userToken");
        localStorage.removeItem("authRole");
        notifyAuthChange();
        window.location.href = "/auth";
      })
      .finally(() => setPageLoading(false));
  }, []);

  const insightByUserId = useMemo(() => {
    const m = {};
    for (const row of riskPrefetched?.students || []) {
      m[row.userId] = row;
    }
    return m;
  }, [riskPrefetched]);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status !== "completed"),
    [bookings],
  );

  const historyBookings = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings],
  );

  const insightCount = riskPrefetched?.students?.length ?? 0;

  const setMeeting = async (id) => {
    const payload = schedule[id] || {};
    if (!payload.date || !payload.slot || !payload.meetingCode) return;
    await api.patch(`/booking/${id}/schedule`, payload);
    load();
  };

  const complete = async (id) => {
    await api.patch(`/booking/${id}/complete`);
    load();
  };

  const submitAssessment = async (id) => {
    const payload = assessment[id] || {};
    await api.patch(`/booking/${id}/counsellor-feedback`, {
      mentalHealthSummary: payload.mentalHealthSummary || "",
      conditionLevel: payload.conditionLevel || "stable",
      riskLevel: payload.riskLevel || "LOW",
      recommendations: payload.recommendations || "",
    });
    load();
  };

  const shareWellnessProgram = async (groupId) => {
    const text = (wellnessNote[groupId] || "").trim();
    if (!text) return;
    await api.post(`/peer/groups/${groupId}/messages`, {
      text: `Wellness Program Update (Counsellor): ${text}`,
    });
    setWellnessNote((p) => ({ ...p, [groupId]: "" }));
  };

  const refreshInsights = async () => {
    try {
      const { data } = await api.get("/booking/counsellor/risk-dashboard");
      setRiskPrefetched({
        students: data.students || [],
        generatedAt: data.generatedAt,
      });
    } catch {
      /* ignore */
    }
  };

  const handleRiskTableUpdate = useCallback((body) => {
    setRiskPrefetched({
      students: body?.students || [],
      generatedAt: body?.generatedAt,
    });
  }, []);

  const tabBadge = (id) => {
    if (id === "insights") return insightCount;
    if (id === "study_squad") return groups.length;
    if (id === "upcoming") return upcomingBookings.length;
    if (id === "history") return historyBookings.length;
    return 0;
  };

  return (
    <div className="min-h-screen bg-wellness-cream text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-8 shadow-sm">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-wellness-coral/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-1/4 h-40 w-72 rounded-full bg-wellness-sage/10 blur-3xl"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
            Counsellor workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Open a section below to review screening &amp; behavior, manage upcoming
            sessions, or browse past meetings.
          </p>
        </header>

        <div
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          role="tablist"
          aria-label="Dashboard sections"
        >
          {PANELS.map((t) => {
            const active = panel === t.id;
            const n = tabBadge(t.id);
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`counsellor-tab-${t.id}`}
                onClick={() => setPanel(t.id)}
                className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wellness-sage focus-visible:ring-offset-2 focus-visible:ring-offset-wellness-cream sm:min-w-[10rem] sm:flex-none ${
                  active
                    ? "border-wellness-sage bg-wellness-sage text-white shadow-md"
                    : "border-stone-200 bg-white text-slate-700 shadow-sm hover:border-wellness-sage/35 hover:bg-wellness-sage/10"
                }`}
              >
                <span>{t.label}</span>
                {n > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-wellness-sage/15 text-wellness-sage ring-1 ring-wellness-sage/25"
                    }`}
                  >
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          className="mt-8 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8"
          role="tabpanel"
          aria-labelledby={`counsellor-tab-${panel}`}
        >
          {pageLoading ? (
            <p className="text-center text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              {panel === "insights" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-100/90 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
                        Overview
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">
                        Student insights
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Mental screening (PHQ-9, GAD-7) and e-learning behavior
                        alongside composite risk.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        refreshInsights();
                        load();
                      }}
                      className="mm-btn-secondary text-sm"
                    >
                      Refresh data
                    </button>
                  </div>
                  {!riskPrefetched ? (
                    <p className="text-sm text-slate-500">Loading insights…</p>
                  ) : (
                    <RiskDetectionDashboard
                      endpoint="/booking/counsellor/risk-dashboard"
                      prefetched={riskPrefetched}
                      onRiskData={handleRiskTableUpdate}
                      surface="flat"
                      title="Screening & behavior overview"
                      subtitle="PHQ-9 / GAD-7 scores and severity; Behavior / Study risk from the learning app. Peer and AI columns follow platform signals."
                    />
                  )}

                  <div className="mt-10 border-t border-stone-200/90 pt-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
                      Community
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      Study squad
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Join peer groups and share wellness updates for students.
                    </p>
                    <div className="mt-4 space-y-3">
                      {groups.map((g) => (
                        <div
                          key={g._id}
                          className="rounded-xl border border-stone-200 bg-wellness-paper/50 p-4"
                        >
                          <p className="font-medium text-slate-900">{g.name}</p>
                          <p className="text-xs text-slate-500">
                            {g.category} | {g.language} | {g.type}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => api.post(`/peer/groups/${g._id}/join`)}
                              className="mm-btn-secondary text-xs"
                            >
                              Join group
                            </button>
                            <input
                              value={wellnessNote[g._id] || ""}
                              onChange={(e) =>
                                setWellnessNote((p) => ({
                                  ...p,
                                  [g._id]: e.target.value,
                                }))
                              }
                              className="mm-input min-w-[12rem] flex-1"
                              placeholder="Wellness note to share"
                            />
                            <button
                              type="button"
                              onClick={() => shareWellnessProgram(g._id)}
                              className="mm-btn-primary text-xs"
                            >
                              Share
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!groups.length ? (
                      <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-wellness-paper/50 p-6 text-center text-sm text-slate-600">
                        No groups available yet.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {panel === "upcoming" && (
                <div className="space-y-6">
                  <div className="border-b border-stone-100/90 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
                      Schedule
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      Upcoming sessions
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Schedule rooms, join video, and save session notes. Insight
                      chips show the latest screening and behavior snapshot.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => load()}
                    className="mm-btn-secondary text-sm"
                  >
                    Refresh list
                  </button>
                  <div className="space-y-5">
                    {upcomingBookings.map((b) => {
                      const uid = String(b.userId?._id || b.userId || "");
                      const insight = insightByUserId[uid];
                      return (
                        <div
                          key={b._id}
                          className="rounded-2xl border border-stone-200/90 bg-wellness-paper/30 p-6 shadow-sm transition hover:border-wellness-sage/35"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-4">
                            <div>
                              <p className="text-lg font-semibold text-slate-900">
                                {b.userId?.name || b.userId?.displayName || "Student"}
                                {b.userId?.username ? (
                                  <span className="font-normal text-slate-500">
                                    {" "}
                                    · @{b.userId.username}
                                  </span>
                                ) : null}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {b.date} {b.slot} ·{" "}
                                <span className="font-medium text-slate-700">
                                  {b.status}
                                </span>
                              </p>
                            </div>
                          </div>

                          {insightChips(insight)}

                          {b.meetingCode ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                              <span>
                                Code:{" "}
                                <span className="rounded-lg border border-wellness-sage/25 bg-wellness-sage/5 px-2 py-0.5 font-mono text-sm text-slate-800">
                                  {b.meetingCode}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/counsellor/video?room=${encodeURIComponent(b.meetingCode)}`,
                                  )
                                }
                                className="mm-btn-primary text-xs"
                              >
                                Join video
                              </button>
                            </div>
                          ) : null}

                          <div className="mt-4 grid gap-2 md:grid-cols-4">
                            <input
                              type="date"
                              value={schedule[b._id]?.date || ""}
                              onChange={(e) =>
                                setSchedule((p) => ({
                                  ...p,
                                  [b._id]: {
                                    ...(p[b._id] || {}),
                                    date: e.target.value,
                                  },
                                }))
                              }
                              className="mm-input"
                            />
                            <input
                              value={schedule[b._id]?.slot || ""}
                              onChange={(e) =>
                                setSchedule((p) => ({
                                  ...p,
                                  [b._id]: {
                                    ...(p[b._id] || {}),
                                    slot: e.target.value,
                                  },
                                }))
                              }
                              className="mm-input"
                              placeholder="Time slot"
                            />
                            <input
                              value={schedule[b._id]?.meetingCode || ""}
                              onChange={(e) =>
                                setSchedule((p) => ({
                                  ...p,
                                  [b._id]: {
                                    ...(p[b._id] || {}),
                                    meetingCode: e.target.value,
                                  },
                                }))
                              }
                              className="mm-input"
                              placeholder="Meeting code"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setSchedule((p) => ({
                                  ...p,
                                  [b._id]: {
                                    ...(p[b._id] || {}),
                                    meetingCode: generateMeetingCode(),
                                  },
                                }))
                              }
                              className="mm-btn-secondary text-xs"
                            >
                              Generate code
                            </button>
                            <button
                              type="button"
                              onClick={() => setMeeting(b._id)}
                              className="mm-btn-primary md:col-span-4"
                            >
                              Save schedule &amp; notify student
                            </button>
                          </div>
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => complete(b._id)}
                              className="mm-btn-success text-xs"
                            >
                              Mark meeting complete
                            </button>
                          </div>

                          <div className="mt-5 rounded-2xl border border-wellness-sage/20 bg-wellness-paper/60 p-4">
                            <p className="font-medium text-slate-900">
                              Session assessment
                            </p>
                            <textarea
                              value={assessment[b._id]?.mentalHealthSummary || ""}
                              onChange={(e) =>
                                setAssessment((p) => ({
                                  ...p,
                                  [b._id]: {
                                    ...(p[b._id] || {}),
                                    mentalHealthSummary: e.target.value,
                                  },
                                }))
                              }
                              className="mm-input mt-3 w-full"
                              placeholder="Clinical / observational summary"
                            />
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              <select
                                value={assessment[b._id]?.conditionLevel || "stable"}
                                onChange={(e) =>
                                  setAssessment((p) => ({
                                    ...p,
                                    [b._id]: {
                                      ...(p[b._id] || {}),
                                      conditionLevel: e.target.value,
                                    },
                                  }))
                                }
                                className="mm-input"
                              >
                                <option value="stable">Stable</option>
                                <option value="mild_concern">Mild concern</option>
                                <option value="moderate_concern">
                                  Moderate concern
                                </option>
                                <option value="high_concern">High concern</option>
                              </select>
                              <select
                                value={assessment[b._id]?.riskLevel || "LOW"}
                                onChange={(e) =>
                                  setAssessment((p) => ({
                                    ...p,
                                    [b._id]: {
                                      ...(p[b._id] || {}),
                                      riskLevel: e.target.value,
                                    },
                                  }))
                                }
                                className="mm-input"
                              >
                                <option value="LOW">LOW</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="HIGH">HIGH</option>
                              </select>
                            </div>
                            <textarea
                              value={assessment[b._id]?.recommendations || ""}
                              onChange={(e) =>
                                setAssessment((p) => ({
                                  ...p,
                                  [b._id]: {
                                    ...(p[b._id] || {}),
                                    recommendations: e.target.value,
                                  },
                                }))
                              }
                              className="mm-input mt-2 w-full"
                              placeholder="Recommendations / next steps"
                            />
                            <button
                              type="button"
                              onClick={() => submitAssessment(b._id)}
                              className="mm-btn-primary mt-3 text-sm"
                            >
                              Save assessment
                            </button>
                            {b.counsellorFeedback?.submittedAt ? (
                              <p className="mt-2 text-xs text-slate-500">
                                Last saved: {b.counsellorFeedback.conditionLevel} ·{" "}
                                {b.counsellorFeedback.riskLevel}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!upcomingBookings.length ? (
                    <p className="rounded-xl border border-dashed border-stone-300 bg-wellness-paper/50 p-8 text-center text-sm text-slate-600">
                      No upcoming sessions. When students book with you, they will
                      appear here.
                    </p>
                  ) : null}
                </div>
              )}

              {panel === "history" && (
                <div className="space-y-6">
                  <div className="border-b border-stone-100/90 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
                      Archive
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      Session history
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Past completed meetings and saved notes (read-only summary).
                    </p>
                  </div>
                  <div className="space-y-4">
                    {historyBookings.map((b) => (
                      <HistorySessionCard key={b._id} b={b} />
                    ))}
                  </div>
                  {!historyBookings.length ? (
                    <p className="rounded-xl border border-dashed border-stone-300 bg-wellness-paper/50 p-8 text-center text-sm text-slate-600">
                      No completed sessions yet. Mark meetings complete from
                      Upcoming to build history.
                    </p>
                  ) : null}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
