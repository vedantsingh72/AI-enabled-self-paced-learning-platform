import { useEffect, useState } from "react";
import api from "../services/api";
import { notifyAuthChange } from "../hooks/useAuthSnapshot";

export default function MainAdminDashboardPage() {
  const [data, setData] = useState(null);
  const [learning, setLearning] = useState(null);
  const [studentInsights, setStudentInsights] = useState(null);
  const [newCourse, setNewCourse] = useState({
    title: "",
    videoUrl: "",
    description: "",
    summaryText: "",
  });
  const [paidCounsellorAccount, setPaidCounsellorAccount] = useState({
    name: "",
    email: "",
    password: "",
    institute: "",
    speciality: "",
  });
  const [doubtTeacherAccount, setDoubtTeacherAccount] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    institute: "",
    speciality: "",
  });

  useEffect(() => {
    if (localStorage.getItem("authRole") === "institute") {
      window.location.href = "/institute";
      return;
    }
    api
      .get("/admin/analytics")
      .then((res) => setData(res.data))
      .catch(() => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("authRole");
        notifyAuthChange();
        window.location.href = "/auth";
      });
    const role = localStorage.getItem("authRole");
    if (role === "main_admin" || role === "admin") {
      api
        .get("/learning/admin/analytics")
        .then((res) => setLearning(res.data))
        .catch(() => setLearning(null));
      api
        .get("/learning/admin/students-insights?days=30")
        .then((res) => setStudentInsights(res.data))
        .catch(() => setStudentInsights(null));
    }
  }, []);

  const registerPaidCounsellor = async () => {
    await api.post("/admin/register-paid-counsellor", paidCounsellorAccount);
    setPaidCounsellorAccount({
      name: "",
      email: "",
      password: "",
      institute: "",
      speciality: "",
    });
  };

  const registerDoubtTeacher = async () => {
    await api.post("/admin/register-doubt-teacher", doubtTeacherAccount);
    setDoubtTeacherAccount({
      name: "",
      username: "",
      email: "",
      password: "",
      institute: "",
      speciality: "",
    });
  };

  const createPublishedCourse = async () => {
    if (!newCourse.title?.trim() || !newCourse.videoUrl?.trim()) return;
    await api.post("/learning/admin/courses", newCourse);
    setNewCourse({
      title: "",
      videoUrl: "",
      description: "",
      summaryText: "",
    });
    const [{ data: ln }, { data: ins }] = await Promise.all([
      api.get("/learning/admin/analytics"),
      api.get("/learning/admin/students-insights?days=30"),
    ]);
    setLearning(ln);
    setStudentInsights(ins);
  };

  if (!data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-slate-400">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p>Loading main admin dashboard…</p>
      </div>
    );
  }
  const s = (data.screenings || []).reduce((a, c) => a + c.count, 0);
  const b = (data.bookings || []).reduce((a, c) => a + c.count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
        Platform admin
      </p>
      <h2 className="mt-2 mm-heading md:text-3xl">Control center</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Platform-wide screening and booking metrics, adaptive learning and
        per-student insights, then staff onboarding (paid counsellors and
        academic doubt tutors).
      </p>
      <div
        id="admin-analytics-overview"
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="mm-card border-amber-200 text-slate-800">
          Active Platform Users:{" "}
          <span className="text-slate-900">{data.activeUsers}</span>
        </div>
        <div className="mm-card border-amber-200 text-slate-800">
          High Risk Alerts:{" "}
          <span className="text-slate-900">{data.highRiskUsers}</span>
        </div>
        <div className="mm-card border-amber-200 text-slate-800">
          Screenings: <span className="text-slate-900">{s}</span>
        </div>
        <div className="mm-card border-amber-200 text-slate-800">
          Bookings: <span className="text-slate-900">{b}</span>
        </div>
      </div>

      {learning ? (
        <div
          id="learning-analytics"
          className="mt-8 grid gap-4 lg:grid-cols-2"
        >
          <div className="mm-card border-emerald-200/80 lg:col-span-2">
            <h3 className="mb-2 font-semibold text-slate-900">
              Adaptive learning — aggregated analytics
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              {learning.privacyNote}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-stone-200 bg-wellness-paper p-3 text-sm">
                <p className="text-slate-500">Avg. fused risk (0–10)</p>
                <p className="text-lg font-semibold text-slate-900">
                  {learning.averageFinalRiskScore != null
                    ? Number(learning.averageFinalRiskScore).toFixed(2)
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-wellness-paper p-3 text-sm">
                <p className="text-slate-500">Snapshots</p>
                <p className="text-lg font-semibold text-slate-900">
                  {learning.snapshotCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-wellness-paper p-3 text-sm">
                <p className="text-slate-500">Opt-in (behavior)</p>
                <p className="text-lg font-semibold text-slate-900">
                  {learning.usersWithBehaviorOptIn ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-wellness-paper p-3 text-sm">
                <p className="text-slate-500">Avg. progress %</p>
                <p className="text-lg font-semibold text-slate-900">
                  {learning.enrollments?.averageProgressPercent != null
                    ? learning.enrollments.averageProgressPercent.toFixed(1)
                    : "—"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {(learning.riskDistribution || []).map((row) => (
                <span
                  key={row.level || "x"}
                  className="rounded-full bg-slate-100 px-3 py-1 text-slate-800"
                >
                  {row.level}: {row.count}
                </span>
              ))}
            </div>
          </div>
          <div className="mm-card border-emerald-500/15 lg:col-span-2">
            <h3 className="mb-3 font-semibold text-slate-900">
              Publish a course
            </h3>
            <input
              value={newCourse.title}
              onChange={(e) =>
                setNewCourse((p) => ({ ...p, title: e.target.value }))
              }
              className="mm-input mb-2 w-full"
              placeholder="Title"
            />
            <input
              value={newCourse.videoUrl}
              onChange={(e) =>
                setNewCourse((p) => ({ ...p, videoUrl: e.target.value }))
              }
              className="mm-input mb-2 w-full"
              placeholder="Video URL (HTTPS, direct file)"
            />
            <textarea
              value={newCourse.description}
              onChange={(e) =>
                setNewCourse((p) => ({ ...p, description: e.target.value }))
              }
              className="mm-input mb-2 min-h-[72px] w-full"
              placeholder="Description"
            />
            <textarea
              value={newCourse.summaryText}
              onChange={(e) =>
                setNewCourse((p) => ({ ...p, summaryText: e.target.value }))
              }
              className="mm-input mb-2 min-h-[72px] w-full"
              placeholder="Short summary (shown in Struggling / Burnout light mode)"
            />
            <button
              type="button"
              onClick={createPublishedCourse}
              className="mm-btn-primary"
            >
              Create course
            </button>
          </div>
        </div>
      ) : null}

      {studentInsights ? (
        <div
          id="student-learning-insights"
          className="mt-8 mm-card border-slate-300/80 lg:col-span-2"
        >
          <h3 className="font-semibold text-slate-900">
            Per-student analytics — behavior, screening &amp; HF chat
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {studentInsights.meta?.description} Window: last{" "}
            {studentInsights.meta?.behavioralWindowDays ?? 30} days (behavior
            batches). Hugging Face: suicidality + emotion models on chat
            metadata only (no message text here).
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[1400px] border-collapse text-left text-[11px] text-slate-800">
              <thead>
                <tr className="border-b border-stone-200 bg-wellness-paper">
                  <th className="sticky left-0 z-10 bg-wellness-paper px-2 py-2 font-semibold">
                    Student
                  </th>
                  <th className="px-2 py-2 font-semibold">Institute</th>
                  <th className="px-2 py-2 font-semibold">PHQ-9</th>
                  <th className="px-2 py-2 font-semibold">GAD-7</th>
                  <th className="px-2 py-2 font-semibold">HF emotion</th>
                  <th className="px-2 py-2 font-semibold">HF suicide label</th>
                  <th className="px-2 py-2 font-semibold">HF lines</th>
                  <th className="px-2 py-2 font-semibold">Chat risk</th>
                  <th className="px-2 py-2 font-semibold">Fused risk</th>
                  <th className="px-2 py-2 font-semibold">Beh. Σ</th>
                  <th className="px-2 py-2 font-semibold">Mouse Ø</th>
                  <th className="px-2 py-2 font-semibold">Idle Ø</th>
                  <th className="px-2 py-2 font-semibold">Tabs Ø</th>
                  <th className="px-2 py-2 font-semibold">WPM Ø</th>
                  <th className="px-2 py-2 font-semibold">Scroll Ø</th>
                  <th className="px-2 py-2 font-semibold">Scroll Δ Ø</th>
                  <th className="px-2 py-2 font-semibold">Video ⏸</th>
                  <th className="px-2 py-2 font-semibold">Video ↺</th>
                  <th className="px-2 py-2 font-semibold">Batches</th>
                </tr>
              </thead>
              <tbody>
                {(studentInsights.students || []).map((s) => {
                  const b = s.behavioral;
                  const lf = s.learningFusion;
                  const hf = s.chatbotHf || {};
                  const phq = s.screening?.phq9;
                  const gad = s.screening?.gad7;
                  const dash = (v) =>
                    v == null || v === "" ? "—" : String(v);
                  return (
                    <tr
                      key={s.userId}
                      className="border-b border-stone-100 odd:bg-white even:bg-wellness-paper/50"
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-2 py-1.5 font-medium">
                        <span className="block max-w-[140px] truncate">
                          {s.displayName || "—"}
                        </span>
                        <span className="block text-[10px] font-normal text-slate-500">
                          {s.username
                            ? `@${s.username}`
                            : s.name || s.userId?.slice(-8)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">{dash(s.institute)}</td>
                      <td className="px-2 py-1.5">
                        {phq ? `${phq.score} (${phq.severity || phq.riskLevel || ""})` : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {gad ? `${gad.score} (${gad.severity || gad.riskLevel || ""})` : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {dash(hf.lastEmotionTopLabel)}
                      </td>
                      <td className="px-2 py-1.5">
                        {dash(hf.lastSuicideModelLabel)}
                      </td>
                      <td className="px-2 py-1.5">{hf.hfScoredUserLines ?? 0}</td>
                      <td className="px-2 py-1.5">
                        {dash(hf.chatLatestRiskLevel)}
                      </td>
                      <td className="px-2 py-1.5">
                        {lf
                          ? `${lf.riskLevel} (${Number(lf.finalScore).toFixed(1)})`
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {lf != null ? dash(lf.behavioralScore) : "—"}
                      </td>
                      <td className="px-2 py-1.5">{dash(b?.avgMouseSpeedPxPerSec)}</td>
                      <td className="px-2 py-1.5">{dash(b?.avgIdleMsPerBatch)}</td>
                      <td className="px-2 py-1.5">{dash(b?.avgTabSwitchCount)}</td>
                      <td className="px-2 py-1.5">{dash(b?.avgTypingWpmEstimate)}</td>
                      <td className="px-2 py-1.5">
                        {dash(b?.avgScrollEventsPerBatch)}
                      </td>
                      <td className="px-2 py-1.5">
                        {dash(b?.avgScrollDeltaSumPerBatch)}
                      </td>
                      <td className="px-2 py-1.5">{dash(b?.totalVideoPauses)}</td>
                      <td className="px-2 py-1.5">{dash(b?.totalVideoReplays)}</td>
                      <td className="px-2 py-1.5">{dash(b?.batchesInWindow)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div
        id="admin-registrations"
        className="mt-6 grid gap-4 lg:grid-cols-2"
      >
        <div className="mm-card border-amber-500/15">
          <h3 className="mb-3 font-semibold text-slate-900">Register Paid Counsellor</h3>
          <input
            value={paidCounsellorAccount.name}
            onChange={(e) =>
              setPaidCounsellorAccount((p) => ({ ...p, name: e.target.value }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Name"
          />
          <input
            value={paidCounsellorAccount.email}
            onChange={(e) =>
              setPaidCounsellorAccount((p) => ({ ...p, email: e.target.value }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Email"
          />
          <input
            type="password"
            value={paidCounsellorAccount.password}
            onChange={(e) =>
              setPaidCounsellorAccount((p) => ({
                ...p,
                password: e.target.value,
              }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Password"
          />
          <input
            value={paidCounsellorAccount.institute}
            onChange={(e) =>
              setPaidCounsellorAccount((p) => ({
                ...p,
                institute: e.target.value,
              }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Institute"
          />
          <input
            value={paidCounsellorAccount.speciality}
            onChange={(e) =>
              setPaidCounsellorAccount((p) => ({
                ...p,
                speciality: e.target.value,
              }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Speciality"
          />
          <button
            type="button"
            onClick={registerPaidCounsellor}
            className="mm-btn-secondary mt-1"
          >
            Create Paid Counsellor
          </button>
        </div>

        <div
          id="register-doubt-tutor"
          className="mm-card border-amber-500/15"
        >
          <h3 className="mb-3 font-semibold text-slate-900">
            Register doubt tutor
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Academic video support role (PCM / doubt sessions). They sign in
            with username and password like on the public signup flow.
          </p>
          <input
            value={doubtTeacherAccount.name}
            onChange={(e) =>
              setDoubtTeacherAccount((p) => ({ ...p, name: e.target.value }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Display name"
          />
          <input
            value={doubtTeacherAccount.username}
            onChange={(e) =>
              setDoubtTeacherAccount((p) => ({
                ...p,
                username: e.target.value,
              }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Username (login)"
            autoComplete="off"
          />
          <input
            value={doubtTeacherAccount.email}
            onChange={(e) =>
              setDoubtTeacherAccount((p) => ({ ...p, email: e.target.value }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Email"
          />
          <input
            type="password"
            value={doubtTeacherAccount.password}
            onChange={(e) =>
              setDoubtTeacherAccount((p) => ({
                ...p,
                password: e.target.value,
              }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Password"
          />
          <input
            value={doubtTeacherAccount.institute}
            onChange={(e) =>
              setDoubtTeacherAccount((p) => ({
                ...p,
                institute: e.target.value,
              }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Institute"
          />
          <input
            value={doubtTeacherAccount.speciality}
            onChange={(e) =>
              setDoubtTeacherAccount((p) => ({
                ...p,
                speciality: e.target.value,
              }))
            }
            className="mm-input mb-2 w-full"
            placeholder="Subjects / speciality (optional)"
          />
          <button
            type="button"
            onClick={registerDoubtTeacher}
            className="mm-btn-secondary mt-1"
          >
            Create doubt tutor account
          </button>
        </div>
      </div>
    </div>
  );
}
