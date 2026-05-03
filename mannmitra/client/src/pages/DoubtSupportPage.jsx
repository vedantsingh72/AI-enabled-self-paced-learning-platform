import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import SectionTabs from "../components/SectionTabs";
import SessionFeedbackModal, {
  FEEDBACK_PROMPT_STORAGE_PREFIX,
} from "../components/SessionFeedbackModal";

const UPCOMING_STATUSES = new Set([
  "pending",
  "accepted",
  "room-shared",
  "scheduled",
]);
const HISTORY_STATUSES = new Set(["completed", "rejected"]);

const categoryShell = {
  book: "border-l-[6px] border-l-wellness-teal bg-white shadow-sm",
  active:
    "border-l-[6px] border-l-wellness-sage bg-gradient-to-br from-white to-wellness-sage/[0.04] shadow-sm",
  archive: "border-l-[6px] border-l-stone-300 bg-wellness-paper/50 shadow-sm",
  updates:
    "border-l-[6px] border-l-wellness-coral/80 bg-white shadow-sm",
};

const categoryEyebrow = {
  book: "text-wellness-teal",
  active: "text-wellness-sage",
  archive: "text-slate-500",
  updates: "text-wellness-coralDeep",
};

function CategorySection({
  variant,
  eyebrow,
  title,
  subtitle,
  children,
  tabsId,
  sectionId,
}) {
  return (
    <section
      role="tabpanel"
      id={`${tabsId}-panel-${sectionId}`}
      aria-labelledby={`${tabsId}-${sectionId}`}
      className={`overflow-hidden rounded-2xl border border-stone-200/90 ${categoryShell[variant]}`}
    >
      <header className="border-b border-stone-100/90 bg-white/60 px-5 py-4 backdrop-blur-sm sm:px-6">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${categoryEyebrow[variant]}`}
        >
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/** Student — video doubt sessions (parallel to counselling /booking). */
export default function DoubtSupportPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState("book");
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [feedbackPromptGate, setFeedbackPromptGate] = useState(0);
  /** Monthly cap from server (behavioral + mental → risk tier). */
  const [quota, setQuota] = useState(null);

  const loadQuota = async () => {
    try {
      const { data } = await api.get("/booking/doubt-support-quota");
      setQuota(data);
    } catch {
      setQuota(null);
    }
  };

  const loadMyData = async () => {
    const [bookingsRes, notifRes] = await Promise.all([
      api.get("/booking/my"),
      api.get("/notifications"),
    ]);
    setMyBookings(bookingsRes.data);
    setNotifications(notifRes.data);
  };

  useEffect(() => {
    api.get("/booking/slots").then(({ data }) => setSlots(data.slots));
    api
      .get("/booking/doubt-teachers")
      .then(({ data }) => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => {
        setTeachers([]);
        setError(
          "Could not load doubt teachers. Check that the API server is running.",
        );
      });
    loadMyData().catch(() => {});
    loadQuota();
  }, []);

  const doubtBookings = useMemo(
    () => myBookings.filter((b) => b.sessionKind === "doubt_support"),
    [myBookings],
  );

  const { upcoming, history } = useMemo(() => {
    const up = [];
    const hist = [];
    for (const b of doubtBookings) {
      if (HISTORY_STATUSES.has(b.status)) {
        hist.push(b);
      } else if (UPCOMING_STATUSES.has(b.status)) {
        up.push(b);
      } else {
        up.push(b);
      }
    }
    return { upcoming: up, history: hist };
  }, [doubtBookings]);

  const feedbackPromptBooking = useMemo(() => {
    for (const b of doubtBookings) {
      if (b.status !== "completed") continue;
      if (b.studentFeedback?.submittedAt) continue;
      if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(FEEDBACK_PROMPT_STORAGE_PREFIX + b._id)
      ) {
        continue;
      }
      return b;
    }
    return null;
  }, [doubtBookings, feedbackPromptGate]);

  const insightCount = upcoming.length;
  const historyCount = history.length;
  const notifCount = notifications.length;

  const book = async () => {
    if (!date || !slot || !teacherId) {
      setError("Please select date, doubt teacher, and slot.");
      setMsg("");
      return;
    }
    try {
      setBookingLoading(true);
      setError("");
      setMsg("");
      await api.post("/booking/create", {
        date,
        slot,
        counsellorId: teacherId,
        sessionKind: "doubt_support",
      });
      setMsg("Doubt session request sent.");
      await loadMyData();
      await loadQuota();
    } catch (e) {
      const body = e?.response?.data;
      setError(body?.message || "Unable to book a session right now.");
      if (body?.quota) setQuota(body.quota);
      else loadQuota();
    } finally {
      setBookingLoading(false);
    }
  };

  const submitFeedback = async (bookingId) => {
    const draft = feedbackDrafts[bookingId] || {};
    if (!draft.rating) {
      setError("Please select a rating before submitting feedback.");
      return;
    }
    try {
      setError("");
      setMsg("");
      await api.patch(`/booking/${bookingId}/student-feedback`, {
        rating: Number(draft.rating),
        comment: draft.comment || "",
      });
      setMsg("Feedback submitted.");
      await loadMyData();
    } catch (e) {
      setError(e?.response?.data?.message || "Unable to submit feedback.");
    }
  };

  const renderBookingCard = (b) => (
    <div
      key={b._id}
      className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-slate-700 shadow-sm"
    >
      <div className="border-b border-stone-100 pb-3">
        <p className="font-medium text-slate-900">
          {b.date} · {b.slot}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
          Status: <span className="font-semibold text-slate-700">{b.status}</span>
        </p>
        <p className="mt-2 text-slate-700">
          <span className="text-slate-500">Doubt teacher:</span>{" "}
          {b.counsellorId?.name || b.counsellorId?.displayName || "TBD"}
        </p>
        {(b.roomCode || b.meetingCode) && !HISTORY_STATUSES.has(b.status) ? (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/video?room=${encodeURIComponent(b.roomCode || b.meetingCode)}`,
              )
            }
            className="mm-btn-primary mt-3 text-xs"
          >
            Join video ({b.roomCode || b.meetingCode})
          </button>
        ) : null}
      </div>

      {b.status === "completed" ? (
        <div className="rounded-xl border border-wellness-teal/20 bg-wellness-teal/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-wellness-teal">
            Your feedback
          </p>
          {b.studentFeedback?.submittedAt ? (
            <p className="mt-2 text-slate-700">
              Submitted: {b.studentFeedback.rating}/5 —{" "}
              {b.studentFeedback.comment || "No comment"}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <select
                value={feedbackDrafts[b._id]?.rating || ""}
                onChange={(e) =>
                  setFeedbackDrafts((prev) => ({
                    ...prev,
                    [b._id]: {
                      ...(prev[b._id] || {}),
                      rating: e.target.value,
                    },
                  }))
                }
                className="mm-input w-full"
              >
                <option value="">Rate this session</option>
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Okay</option>
                <option value="2">2 - Needs improvement</option>
                <option value="1">1 - Poor</option>
              </select>
              <textarea
                value={feedbackDrafts[b._id]?.comment || ""}
                onChange={(e) =>
                  setFeedbackDrafts((prev) => ({
                    ...prev,
                    [b._id]: {
                      ...(prev[b._id] || {}),
                      comment: e.target.value,
                    },
                  }))
                }
                placeholder="Optional comment"
                className="mm-input w-full"
              />
              <button
                type="button"
                onClick={() => submitFeedback(b._id)}
                className="mm-btn-success text-xs"
              >
                Submit feedback
              </button>
            </div>
          )}
        </div>
      ) : null}

      {b.counsellorFeedback?.submittedAt ? (
        <div className="rounded-xl border border-wellness-sage/20 bg-wellness-paper/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-wellness-sage">
            Teacher notes
          </p>
          <p className="mt-2">
            <span className="text-slate-500">Summary:</span>{" "}
            {b.counsellorFeedback.mentalHealthSummary || "—"}
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Follow-up:</span>{" "}
            {b.counsellorFeedback.recommendations || "—"}
          </p>
        </div>
      ) : null}
    </div>
  );

  const tabItems = [
    { id: "book", label: "New request" },
    { id: "upcoming", label: "Upcoming", badge: insightCount },
    { id: "history", label: "History", badge: historyCount },
    { id: "notifications", label: "Updates", badge: notifCount },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-teal">
          Doubt support
        </p>
        <h1 className="mt-2 mm-heading md:text-3xl">Video call doubt help</h1>
        <p className="mt-2 mm-subtle">
          Book a live video slot with a doubt teacher for subject questions —
          same flow as counselling, separate from mental-health sessions.
        </p>
      </div>

      {quota ? (
        <div className="rounded-xl border border-wellness-teal/35 bg-wellness-teal/[0.07] px-4 py-3 text-sm text-slate-800">
          <p className="font-semibold text-slate-900">
            This month ({quota.month}): {quota.used} / {quota.limit} doubt
            sessions used · {quota.remaining} remaining
          </p>
          <p className="mt-1.5 text-slate-600">
            Your limit follows your{" "}
            <strong className="text-slate-800">learning risk</strong> from
            behavioral + mental scores (courses with privacy consent):{" "}
            <strong>{quota.riskLevel}</strong>
            {quota.finalScore != null && Number.isFinite(Number(quota.finalScore))
              ? ` · blended score ${Number(quota.finalScore).toFixed(1)}/10`
              : ""}
            .
            {quota.behavioralScore != null || quota.mentalHealthScore != null ? (
              <>
                {" "}
                Behavior ~{" "}
                {quota.behavioralScore != null
                  ? Number(quota.behavioralScore).toFixed(1)
                  : "—"}
                /10, mental ~{" "}
                {quota.mentalHealthScore != null
                  ? Number(quota.mentalHealthScore).toFixed(1)
                  : "—"}
                /10.
              </>
            ) : (
              <>
                {" "}
                Use courses with tracking enabled to personalize your cap (higher
                strain → more doubt slots).
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Normal: fewer sessions/month · Struggling: more · Burnout: most. Resets
            each calendar month; improving scores can raise your tier.
          </p>
        </div>
      ) : null}

      {msg && <p className="text-sm text-wellness-teal">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <SectionTabs
        id="doubt-support-tabs"
        label="Doubt support sections"
        tabs={tabItems}
        activeId={section}
        onChange={setSection}
      />

      {section === "book" ? (
        <CategorySection
          tabsId="doubt-support-tabs"
          sectionId="book"
          variant="book"
          eyebrow="Schedule"
          title="Book a doubt session"
          subtitle="Pick a date, educator, and slot. Sessions are for academic doubts over video."
        >
          <div className="space-y-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mm-input w-full"
            />
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="mm-input w-full"
              disabled={teachers.length === 0}
            >
              <option value="">
                {teachers.length === 0
                  ? "No doubt teachers available yet"
                  : "Choose doubt teacher"}
              </option>
              {teachers.map((c) => (
                <option key={c._id} value={c._id}>
                  {(c.name || c.displayName) +
                    " | Rating: " +
                    (c.rating || 0).toFixed(1)}{" "}
                  {c.isPaidCounsellor ? "(Paid)" : "(Institute)"}
                </option>
              ))}
            </select>
            {teachers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-wellness-teal/40 bg-wellness-teal/5 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">
                  No educators in the list yet
                </p>
                <p className="mt-1 text-slate-600">
                  At least one account with the{" "}
                  <strong>Doubt teacher</strong> role must exist. You can{" "}
                  <Link
                    to="/auth?type=doubt_teacher"
                    className="font-medium text-wellness-teal underline"
                  >
                    register as a doubt teacher
                  </Link>{" "}
                  (separate login) or ask your school to add educators. After
                  signup, refresh this page — teachers are no longer hidden by
                  institute name.
                </p>
              </div>
            ) : null}
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="mm-input w-full"
            >
              <option value="">Choose slot</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={book}
              disabled={
                bookingLoading ||
                (quota != null && quota.remaining <= 0) ||
                teachers.length === 0
              }
              className="mm-btn-primary disabled:opacity-60"
            >
              {bookingLoading
                ? "Booking…"
                : quota != null && quota.remaining <= 0
                  ? "Monthly limit reached"
                  : "Book doubt session"}
            </button>
            {quota != null && quota.remaining <= 0 ? (
              <p className="text-sm text-amber-800">
                You have used all doubt sessions for this month at your current
                profile limit. Try again next month, or improve your learning
                signals for a higher tier.
              </p>
            ) : null}
          </div>
        </CategorySection>
      ) : null}

      {section === "upcoming" ? (
        <CategorySection
          tabsId="doubt-support-tabs"
          sectionId="upcoming"
          variant="active"
          eyebrow="In progress"
          title="Upcoming doubt sessions"
          subtitle="Join video when your teacher shares a meeting code."
        >
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming sessions.</p>
          ) : (
            <div className="space-y-4">{upcoming.map(renderBookingCard)}</div>
          )}
        </CategorySection>
      ) : null}

      {section === "history" ? (
        <CategorySection
          tabsId="doubt-support-tabs"
          sectionId="history"
          variant="archive"
          eyebrow="Archive"
          title="Past doubt sessions"
          subtitle="Completed calls and teacher notes."
        >
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No past sessions yet.</p>
          ) : (
            <div className="space-y-4">{history.map(renderBookingCard)}</div>
          )}
        </CategorySection>
      ) : null}

      {section === "notifications" ? (
        <CategorySection
          tabsId="doubt-support-tabs"
          sectionId="notifications"
          variant="updates"
          eyebrow="Inbox"
          title="Updates & reminders"
          subtitle="Platform messages about your bookings."
        >
          <div className="space-y-2 text-sm">
            {notifications.length === 0 ? (
              <p className="text-slate-500">No notifications.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className="rounded-xl border border-stone-100 bg-wellness-paper/60 p-3 text-slate-700"
                >
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="mt-1">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </CategorySection>
      ) : null}

      <SessionFeedbackModal
        booking={feedbackPromptBooking}
        open={!!feedbackPromptBooking}
        onClose={() => setFeedbackPromptGate((g) => g + 1)}
        onSubmitted={async () => {
          await loadMyData();
          setFeedbackPromptGate((g) => g + 1);
        }}
        variant="doubt"
        labelCounsellor="doubt teacher"
      />
    </div>
  );
}
