import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { notifyAuthChange } from "../hooks/useAuthSnapshot";

const PANELS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "Session history" },
];

function DoubtHistoryCard({ b }) {
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
            Your session notes
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Topics / summary:</span>{" "}
            {cf.mentalHealthSummary || "—"}
          </p>
          <p className="mt-2">
            <span className="text-slate-500">Follow-up:</span>{" "}
            {cf.recommendations || "—"}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No notes saved for this session.</p>
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

export default function DoubtTeacherDashboardPage() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [assessment, setAssessment] = useState({});
  const [pageLoading, setPageLoading] = useState(true);

  const generateMeetingCode = () =>
    `MM-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;

  const load = async () => {
    const { data } = await api.get("/booking/counsellor/my");
    setBookings(data);
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

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status !== "completed"),
    [bookings],
  );

  const historyBookings = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings],
  );

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

  const tabBadge = (id) => {
    if (id === "upcoming") return upcomingBookings.length;
    if (id === "history") return historyBookings.length;
    return 0;
  };

  return (
    <div className="min-h-screen bg-wellness-cream text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-8 shadow-sm">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-wellness-teal/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-1/4 h-40 w-72 rounded-full bg-wellness-sage/10 blur-3xl"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-teal">
            Doubt teacher
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Video doubt sessions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Manage scheduled academic doubt calls: share meeting codes, join video,
            and save short session notes for students.
          </p>
        </header>

        <div
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          role="tablist"
          aria-label="Doubt teacher sections"
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
                id={`doubt-tab-${t.id}`}
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
          aria-labelledby={`doubt-tab-${panel}`}
        >
          {pageLoading ? (
            <p className="text-center text-sm text-slate-500">Loading…</p>
          ) : (
            <>
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
                      When students book a doubt slot, schedule the video room and
                      share the code.
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
                    {upcomingBookings.map((b) => (
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
                                  `/doubt-teacher/video?room=${encodeURIComponent(b.meetingCode)}`,
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
                            Mark session complete
                          </button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-wellness-sage/20 bg-wellness-paper/60 p-4">
                          <p className="font-medium text-slate-900">
                            Session notes (visible to student)
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
                            placeholder="What you covered, concepts clarified…"
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
                              <option value="stable">On track</option>
                              <option value="mild_concern">Needs practice</option>
                              <option value="moderate_concern">Struggling</option>
                              <option value="high_concern">Needs follow-up</option>
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
                            placeholder="Suggested practice / next steps"
                          />
                          <button
                            type="button"
                            onClick={() => submitAssessment(b._id)}
                            className="mm-btn-primary mt-3 text-sm"
                          >
                            Save notes
                          </button>
                          {b.counsellorFeedback?.submittedAt ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Last saved.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!upcomingBookings.length ? (
                    <p className="rounded-xl border border-dashed border-stone-300 bg-wellness-paper/50 p-8 text-center text-sm text-slate-600">
                      No upcoming doubt sessions. Students book from Doubt support
                      in their dashboard.
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
                      Completed doubt calls and saved notes.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {historyBookings.map((b) => (
                      <DoubtHistoryCard key={b._id} b={b} />
                    ))}
                  </div>
                  {!historyBookings.length ? (
                    <p className="rounded-xl border border-dashed border-stone-300 bg-wellness-paper/50 p-8 text-center text-sm text-slate-600">
                      No completed sessions yet.
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
