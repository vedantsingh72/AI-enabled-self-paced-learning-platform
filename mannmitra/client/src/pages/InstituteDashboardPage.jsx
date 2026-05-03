import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { notifyAuthChange } from "../hooks/useAuthSnapshot";
import RiskDetectionDashboard from "../components/RiskDetectionDashboard";

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-wellness-sage/25">
      <p className="text-xs font-semibold uppercase tracking-wider text-wellness-sage">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-600">{sub}</p> : null}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4 border-b border-stone-100 pb-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function InstituteDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [college, setCollege] = useState("");
  const [users, setUsers] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [groupForm, setGroupForm] = useState({
    name: "",
    category: "Exam Stress Support",
    language: "English",
    type: "group-chat",
  });
  const [newCounsellor, setNewCounsellor] = useState({
    displayName: "",
    college: "",
    speciality: "",
  });
  const [studentCounsellorAccount, setStudentCounsellorAccount] = useState({
    name: "",
    email: "",
    password: "",
  });
  const instituteLabel =
    typeof window !== "undefined"
      ? localStorage.getItem("instituteName") || "Your institute"
      : "Your institute";

  const loadCore = useCallback(async () => {
    const [analytics, counsellorRows, bookingsRes, escalationRes] =
      await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/counsellors"),
        api.get("/booking/admin"),
        api.get("/peer/escalations"),
      ]);
    setData(analytics.data);
    setCounsellors(counsellorRows.data);
    setBookings(bookingsRes.data);
    setEscalations(escalationRes.data);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("authRole") === "main_admin") {
      navigate("/main-admin", { replace: true });
      return;
    }
    const run = async () => {
      try {
        await loadCore();
      } catch {
        localStorage.removeItem("adminToken");
        notifyAuthChange();
        navigate("/auth", { replace: true });
      }
    };
    run();
  }, [loadCore, navigate]);

  useEffect(() => {
    const loadUsers = async () => {
      const query = college ? `?college=${encodeURIComponent(college)}` : "";
      const { data: rows } = await api.get(`/admin/users${query}`);
      setUsers(rows);
    };
    if (localStorage.getItem("adminToken")) loadUsers();
  }, [college]);

  const screeningsTotal = useMemo(
    () => (data?.screenings || []).reduce((a, c) => a + c.count, 0),
    [data],
  );
  const bookingsTotal = useMemo(
    () => (data?.bookings || []).reduce((a, c) => a + c.count, 0),
    [data],
  );
  const engagedStudents = useMemo(
    () => users.filter((u) => u.counsellingSessions > 0).length,
    [users],
  );

  const createCounsellor = async () => {
    await api.post("/admin/counsellors", newCounsellor);
    setNewCounsellor({ displayName: "", college: "", speciality: "" });
    const { data: rows } = await api.get("/admin/counsellors");
    setCounsellors(rows);
  };

  const recruitVolunteer = async () => {
    if (!volunteerEmail.trim()) return;
    await api.post("/peer/volunteers/recruit", {
      email: volunteerEmail.trim(),
      skills: ["empathy", "active-listening"],
    });
    setVolunteerEmail("");
  };

  const createPeerGroup = async () => {
    await api.post("/peer/groups", {
      ...groupForm,
      instituteScope: "institute",
    });
    setGroupForm((p) => ({ ...p, name: "" }));
  };

  const registerStudentCounsellor = async () => {
    await api.post(
      "/admin/register-student-counsellor",
      studentCounsellorAccount,
    );
    setStudentCounsellorAccount({ name: "", email: "", password: "" });
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("authRole");
    localStorage.removeItem("instituteName");
    notifyAuthChange();
    navigate("/auth");
  };

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wellness-cream text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-wellness-sage border-t-transparent" />
          <p className="text-sm tracking-wide">Loading institute analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800">
      <header className="sticky top-0 z-20 border-b border-stone-200/90 bg-wellness-cream/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
              Mannmitra · Institute
            </p>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {instituteLabel}
            </h1>
            <p className="text-sm text-slate-600">
              Student wellbeing analytics &amp; institute-scoped peer support
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mm-btn-secondary"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Active users" value={data.activeUsers} />
          <StatCard label="Open high-risk alerts" value={data.highRiskUsers} />
          <StatCard label="Screenings logged" value={screeningsTotal} />
          <StatCard label="Consultancy requests" value={bookingsTotal} />
          <StatCard
            label="Students with sessions"
            value={engagedStudents}
            sub="Booked at least one consultancy"
          />
        </div>

        <RiskDetectionDashboard
          endpoint="/admin/risk-dashboard?limit=120"
          title="Risk detection dashboard"
          subtitle="Per-student breakdown: screening scores, peer-chat signals, AI chat metadata, counsellor assessment, and composite risk level."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Section
            title="Screening mix"
            subtitle="PHQ-9 / GAD-7 volume and average scores"
          >
            <ul className="space-y-2 text-sm">
              {(data.screenings || []).map((s) => (
                <li
                  key={s._id}
                  className="flex justify-between rounded-lg bg-zinc-800/60 px-3 py-2"
                >
                  <span className="text-zinc-300">{s._id}</span>
                  <span className="font-mono text-violet-700">
                    n={s.count}
                    {s.avgScore != null
                      ? ` · avg ${Number(s.avgScore).toFixed(1)}`
                      : ""}
                  </span>
                </li>
              ))}
              {!data.screenings?.length ? (
                <p className="text-zinc-500">No screening data yet.</p>
              ) : null}
            </ul>
          </Section>

          <Section
            title="Consultancy pipeline"
            subtitle="Counts by booking status for your institute"
          >
            <ul className="space-y-2 text-sm">
              {(data.bookings || []).map((b) => (
                <li
                  key={b._id}
                  className="flex justify-between rounded-lg bg-zinc-800/60 px-3 py-2"
                >
                  <span className="capitalize text-zinc-300">{b._id}</span>
                  <span className="font-mono text-fuchsia-300">{b.count}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Mood check-ins"
            subtitle="Aggregated student mood tags"
          >
            <ul className="space-y-2 text-sm">
              {(data.moodTrends || []).map((m) => (
                <li
                  key={m._id}
                  className="flex justify-between rounded-lg bg-zinc-800/60 px-3 py-2"
                >
                  <span className="text-zinc-300">{m._id}</span>
                  <span className="font-mono text-violet-700">{m.count}</span>
                </li>
              ))}
              {!data.moodTrends?.length ? (
                <p className="text-zinc-500">No mood entries yet.</p>
              ) : null}
            </ul>
          </Section>
        </div>

        <Section
          title="Risk pattern signals"
          subtitle="Top anonymised reasons tied to alerts from your students"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {(data.topRiskPatterns || []).map((p, idx) => (
              <div
                key={`${p._id}-${idx}`}
                className="rounded-xl border border-violet-200 bg-violet-50/80 p-4"
              >
                <p className="text-sm font-medium text-violet-900">
                  {p._id || "Unspecified"}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{p.count}</p>
                <p className="text-xs text-zinc-500">Occurrences</p>
              </div>
            ))}
          </div>
          {!data.topRiskPatterns?.length ? (
            <p className="text-zinc-500">No pattern data yet.</p>
          ) : null}
        </Section>

        <Section
          title="Consultancy history"
          subtitle="Who requested support and when — view only (no meeting codes or approvals here)"
        >
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-zinc-900/90 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Date &amp; slot</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Meeting</th>
                  <th className="px-4 py-3">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {bookings.map((b) => (
                  <tr
                    key={b._id}
                    className="bg-zinc-950/40 hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {b.userId?.name || b.userId?.displayName || "Student"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {b.userId?.username
                          ? `@${b.userId.username}`
                          : b.userId?.institute || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {b.date || "—"} {b.slot ? `· ${b.slot}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-900">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {b.meetingStatus || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!bookings.length ? (
            <p className="mt-4 text-zinc-500">No consultancy requests yet.</p>
          ) : null}
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title="Counsellors"
            subtitle="Scoped to your institute"
          >
            <div className="space-y-3">
              <input
                value={newCounsellor.displayName}
                onChange={(e) =>
                  setNewCounsellor((p) => ({ ...p, displayName: e.target.value }))
                }
                className="mm-input w-full"
                placeholder="Display name"
              />
              <input
                value={newCounsellor.college}
                onChange={(e) =>
                  setNewCounsellor((p) => ({ ...p, college: e.target.value }))
                }
                className="mm-input w-full"
                placeholder="College / unit (optional)"
              />
              <input
                value={newCounsellor.speciality}
                onChange={(e) =>
                  setNewCounsellor((p) => ({ ...p, speciality: e.target.value }))
                }
                className="mm-input w-full"
                placeholder="Speciality"
              />
              <button
                type="button"
                onClick={createCounsellor}
                className="mm-btn-primary w-full py-2.5"
              >
                Add counsellor profile
              </button>
            </div>
            <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm text-zinc-300">
              {counsellors.map((c) => (
                <li
                  key={c._id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                >
                  {c.displayName} · {c.college}{" "}
                  <span className="text-zinc-500">
                    ({c.speciality || "General"})
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Student analytics"
            subtitle="Filter by college; risk and engagement metrics"
          >
            <input
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="mm-input mb-3 w-full"
              placeholder="Filter by college (optional)"
            />
            <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {users.map((u) => (
                <div
                  key={u._id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <p className="font-medium text-slate-900">{u.college}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <span>Risk: {u.latestRisk}</span>
                    <span>Score: {u.riskMeterScore}/100</span>
                    <span>Screenings: {u.screeningCount}</span>
                    <span>Sessions: {u.counsellingSessions}</span>
                    <span className="col-span-2">
                      Completed: {u.completedSessions}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title="Peer volunteer recruitment"
            subtitle="Invite mentors tied to your institute"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={volunteerEmail}
                onChange={(e) => setVolunteerEmail(e.target.value)}
                className="mm-input flex-1"
                placeholder="Volunteer email"
              />
              <button
                type="button"
                onClick={recruitVolunteer}
                className="mm-btn-primary px-4 py-2"
              >
                Recruit
              </button>
            </div>
          </Section>

          <Section
            title="Create peer support room"
            subtitle="Rooms are always limited to your institute only"
          >
            <div className="space-y-2">
              <input
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, name: e.target.value }))
                }
                className="mm-input w-full"
                placeholder="Room name"
              />
              <input
                value={groupForm.category}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, category: e.target.value }))
                }
                className="mm-input w-full"
                placeholder="Category"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={groupForm.language}
                  onChange={(e) =>
                    setGroupForm((p) => ({ ...p, language: e.target.value }))
                  }
                  className="mm-input"
                  placeholder="Language"
                />
                <select
                  value={groupForm.type}
                  onChange={(e) =>
                    setGroupForm((p) => ({ ...p, type: e.target.value }))
                  }
                  className="mm-input"
                >
                  <option value="group-chat">Group chat</option>
                  <option value="one-to-one">One-to-one</option>
                  <option value="scheduled-circle">Scheduled circle</option>
                </select>
              </div>
              <button
                type="button"
                onClick={createPeerGroup}
                className="mm-btn-primary w-full py-2.5"
              >
                Create institute room
              </button>
            </div>
          </Section>
        </div>

        <Section
          title="Student counsellor accounts"
          subtitle="Provision institute counsellor logins"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={studentCounsellorAccount.name}
              onChange={(e) =>
                setStudentCounsellorAccount((p) => ({
                  ...p,
                  name: e.target.value,
                }))
              }
              className="mm-input"
              placeholder="Name"
            />
            <input
              value={studentCounsellorAccount.email}
              onChange={(e) =>
                setStudentCounsellorAccount((p) => ({
                  ...p,
                  email: e.target.value,
                }))
              }
              className="mm-input"
              placeholder="Email"
            />
            <input
              type="password"
              value={studentCounsellorAccount.password}
              onChange={(e) =>
                setStudentCounsellorAccount((p) => ({
                  ...p,
                  password: e.target.value,
                }))
              }
              className="mm-input"
              placeholder="Password"
            />
          </div>
          <button
            type="button"
            onClick={registerStudentCounsellor}
            className="mm-btn-secondary mt-3 px-4 py-2 text-sm"
          >
            Register student counsellor
          </button>
        </Section>

        <Section
          title="Escalation alerts"
          subtitle="High-priority flags for your cohort"
        >
          <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {escalations.map((e) => (
              <div
                key={e._id}
                className="rounded-xl border border-red-500/20 bg-red-950/20 p-3"
              >
                <p className="font-medium text-red-200">
                  {e.severity} · {e.source}
                </p>
                <p className="text-zinc-300">{e.reason}</p>
                <p className="text-xs text-zinc-500">Status: {e.status}</p>
              </div>
            ))}
            {!escalations.length ? (
              <p className="text-zinc-500">No open escalations.</p>
            ) : null}
          </div>
        </Section>
      </main>
    </div>
  );
}
