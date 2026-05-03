import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
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
  book: "border-l-[6px] border-l-wellness-sage bg-white shadow-sm",
  active:
    "border-l-[6px] border-l-wellness-teal bg-gradient-to-br from-white to-wellness-sage/[0.04] shadow-sm",
  archive: "border-l-[6px] border-l-stone-300 bg-wellness-paper/50 shadow-sm",
  updates:
    "border-l-[6px] border-l-wellness-coral/80 bg-white shadow-sm",
};

const categoryEyebrow = {
  book: "text-wellness-sage",
  active: "text-wellness-teal",
  archive: "text-slate-500",
  updates: "text-wellness-coralDeep",
};

/** One visible panel — header + body for the active counselling category. */
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

export default function BookingPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState("book");
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [counsellors, setCounsellors] = useState([]);
  const [counsellorId, setCounsellorId] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  /** Bumps when modal dismiss/submit so we re-read sessionStorage for the next prompt. */
  const [feedbackPromptGate, setFeedbackPromptGate] = useState(0);

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
    api.get("/booking/counsellors").then(({ data }) => setCounsellors(data));
    loadMyData().catch(() => {});
  }, []);

  const counsellingBookings = useMemo(
    () =>
      myBookings.filter(
        (b) => !b.sessionKind || b.sessionKind === "counselling",
      ),
    [myBookings],
  );

  const { upcoming, history } = useMemo(() => {
    const up = [];
    const hist = [];
    for (const b of counsellingBookings) {
      if (HISTORY_STATUSES.has(b.status)) {
        hist.push(b);
      } else if (UPCOMING_STATUSES.has(b.status)) {
        up.push(b);
      } else {
        up.push(b);
      }
    }
    return { upcoming: up, history: hist };
  }, [counsellingBookings]);

  const feedbackPromptBooking = useMemo(() => {
    for (const b of counsellingBookings) {
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
  }, [counsellingBookings, feedbackPromptGate]);

  const insightCount = upcoming.length;
  const historyCount = history.length;
  const notifCount = notifications.length;

  const book = async () => {
    if (!date || !slot || !counsellorId) {
      setError("Please select date, counsellor and slot.");
      setMsg("");
      return;
    }
    try {
      setBookingLoading(true);
      setError("");
      setMsg("");
      await api.post("/booking/create", { date, slot, counsellorId });
      setMsg("Booking request sent successfully.");
      await loadMyData();
    } catch (e) {
      setError(
        e?.response?.data?.message || "Unable to book session right now.",
      );
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
      setMsg("Feedback submitted successfully.");
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
          <span className="text-slate-500">Counsellor:</span>{" "}
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
        <div className="rounded-xl border border-wellness-sage/15 bg-wellness-sage/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-wellness-sage">
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
                <option value="">Rate counsellor</option>
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
            Counsellor notes
          </p>
          <p className="mt-2">
            <span className="text-slate-500">Condition:</span>{" "}
            {b.counsellorFeedback.conditionLevel}
          </p>
          <p>
            <span className="text-slate-500">Risk:</span>{" "}
            {b.counsellorFeedback.riskLevel}
          </p>
          <p className="mt-2">
            <span className="text-slate-500">Summary:</span>{" "}
            {b.counsellorFeedback.mentalHealthSummary || "No summary"}
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Recommendation:</span>{" "}
            {b.counsellorFeedback.recommendations || "No recommendation"}
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
          Counselling
        </p>
        <h1 className="mt-2 mm-heading md:text-3xl">Sessions &amp; support</h1>
        <p className="mt-2 mm-subtle">
          Pick a tab — only one area is shown at a time so you can focus on
          booking, upcoming visits, history, or messages.
        </p>
      </div>

      {msg && <p className="text-sm text-wellness-teal">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <SectionTabs
        id="counselling-tabs"
        label="Counselling sections"
        tabs={tabItems}
        activeId={section}
        onChange={setSection}
      />

      {section === "book" ? (
        <CategorySection
          tabsId="counselling-tabs"
          sectionId="book"
          variant="book"
          eyebrow="Schedule"
          title="Book a session"
          subtitle="Choose a date, counsellor, and time. Your request is tied to your signed-in account."
        >
          <div className="space-y-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mm-input w-full"
            />
            <select
              value={counsellorId}
              onChange={(e) => setCounsellorId(e.target.value)}
              className="mm-input w-full"
            >
              <option value="">Choose counsellor</option>
              {counsellors.map((c) => (
                <option key={c._id} value={c._id}>
                  {(c.name || c.displayName) +
                    " | Rating: " +
                    (c.rating || 0).toFixed(1)}{" "}
                  {c.isPaidCounsellor ? "(Paid)" : "(Institute)"}
                </option>
              ))}
            </select>
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
              disabled={bookingLoading}
              className="mm-btn-primary disabled:opacity-60"
            >
              {bookingLoading ? "Booking…" : "Book session"}
            </button>
          </div>
        </CategorySection>
      ) : null}

      {section === "upcoming" ? (
        <CategorySection
          tabsId="counselling-tabs"
          sectionId="upcoming"
          variant="active"
          eyebrow="In progress"
          title="Upcoming sessions"
          subtitle="Requests and meetings that are not finished yet — join video when a room code is shared."
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
          tabsId="counselling-tabs"
          sectionId="history"
          variant="archive"
          eyebrow="Archive"
          title="Past sessions"
          subtitle="Completed or closed requests. Leave feedback and read counsellor notes when available."
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
          tabsId="counselling-tabs"
          sectionId="notifications"
          variant="updates"
          eyebrow="Inbox"
          title="Updates & reminders"
          subtitle="Messages from the platform about your counselling activity."
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
        variant="counselling"
        labelCounsellor="counsellor"
      />
    </div>
  );
}
