import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const phq9 = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading or watching television",
  "Moving or speaking so slowly that other people could have noticed. Or being so fidgety or restless that you move around more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];
const gad7 = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

export default function ScreeningPage() {
  const [type, setType] = useState("PHQ9");
  const [answers, setAnswers] = useState(Array(9).fill(0));
  /** intro: choose instrument | active: one question at a time */
  const [step, setStep] = useState("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [followUpBanner, setFollowUpBanner] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError("");
      const { data } = await api.get("/screening/my");
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistoryError("Could not load screening history.");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const q = type === "PHQ9" ? phq9 : gad7;
  const total = q.length;

  const progressPct = useMemo(() => {
    if (step !== "active") return 0;
    return Math.round(((questionIndex + 1) / total) * 100);
  }, [step, questionIndex, total]);

  const beginScreening = () => {
    setAnswers(Array(9).fill(0));
    setQuestionIndex(0);
    setResult(null);
    setError("");
    setStep("active");
  };

  const changeType = (nextType) => {
    setType(nextType);
    setAnswers(Array(9).fill(0));
    setQuestionIndex(0);
    setResult(null);
    setStep("intro");
    setError("");
  };

  const setAnswerAt = (idx, value) => {
    setAnswers((p) => p.map((a, i) => (i === idx ? Number(value) : a)));
  };

  const goNext = () => {
    if (questionIndex < total - 1) {
      setQuestionIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      setError("");
      const { data } = await api.post("/screening/submit", {
        type,
        answers: answers.slice(0, total),
      });
      setResult(data.screening);
      setStep("intro");
      await loadHistory();
      if (data.emergencyEscalation) setFollowUpBanner(true);
    } catch (_e) {
      setError("Unable to submit screening right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setResult(null);
    setAnswers(Array(9).fill(0));
    setQuestionIndex(0);
    setStep("intro");
    setError("");
  };

  const currentText = step === "active" ? q[questionIndex] : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {followUpBanner ? (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-slate-800"
          role="status"
        >
          <p className="font-medium text-amber-950">
            Your answers suggest speaking with someone soon
          </p>
          <p className="mt-2">
            Please reach out to your institute counsellor or another trusted
            professional.{" "}
            <Link className="font-semibold text-wellness-sage underline" to="/booking">
              Book counselling
            </Link>
            .
          </p>
          <button
            type="button"
            className="mt-3 text-xs font-medium text-slate-600 underline"
            onClick={() => setFollowUpBanner(false)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
        Screening
      </p>
      <h2 className="mt-2 mm-heading md:text-3xl">PHQ-9 / GAD-7</h2>
      <p className="mt-2 mm-subtle">
        Over the last 2 weeks, how often have you been bothered by the
        following problems?
      </p>

      {result && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
          <p className="font-medium text-emerald-900">Your result</p>
          <p className="mt-2 text-sm">
            Score: {result.score} | Severity: {result.severity} | Risk:{" "}
            {result.riskLevel}
          </p>
          <button
            type="button"
            onClick={startOver}
            className="mm-btn-secondary mt-4"
          >
            New screening
          </button>
        </div>
      )}

      {step === "intro" && !result && (
        <div className="mt-6 mm-card">
          <label className="text-sm font-medium text-slate-700">
            Instrument
          </label>
          <select
            value={type}
            onChange={(e) => changeType(e.target.value)}
            className="mm-input mt-2 w-full"
          >
            <option value="PHQ9">PHQ-9 (9 questions)</option>
            <option value="GAD7">GAD-7 (7 questions)</option>
          </select>
          <p className="mt-4 text-sm text-slate-500">
            You will answer one question at a time. You can go back to change an
            answer before submitting.
          </p>
          <button
            type="button"
            onClick={beginScreening}
            className="mm-btn-primary mt-4 w-full"
          >
            Begin
          </button>
        </div>
      )}

      {step === "active" && (
        <div className="mt-6 mm-card">
          <div className="mb-4 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Question {questionIndex + 1} of {total}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            className="mb-6 h-1.5 overflow-hidden rounded-full bg-stone-200"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-wellness-sage to-wellness-teal transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="text-base leading-relaxed text-slate-800">
            {currentText}
          </p>

          <label className="mt-6 block text-sm font-medium text-slate-600">
            Your response
          </label>
          <select
            value={answers[questionIndex]}
            onChange={(e) => setAnswerAt(questionIndex, e.target.value)}
            className="mm-input mt-2 w-full"
          >
            <option value={0}>0 - Not at all</option>
            <option value={1}>1 - Several days</option>
            <option value={2}>2 - More than half the days</option>
            <option value={3}>3 - Nearly every day</option>
          </select>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={questionIndex === 0}
              className="mm-btn-secondary disabled:opacity-40"
            >
              Back
            </button>
            {questionIndex < total - 1 ? (
              <button type="button" onClick={goNext} className="mm-btn-primary">
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="mm-btn-primary disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit screening"}
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-10 mm-card">
        <h3 className="text-lg font-semibold text-slate-900">Screening history</h3>
        <p className="mt-1 text-sm text-slate-500">
          Past PHQ-9 and GAD-7 results for your account (newest first).
        </p>
        {historyLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading history…</p>
        ) : historyError ? (
          <p className="mt-4 text-sm text-red-600">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No screenings yet. Complete one above to see it here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-wellness-paper text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Test</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {history.map((row) => (
                  <tr
                    key={row._id}
                    className="bg-white text-slate-700 hover:bg-wellness-paper/80"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {row.type === "PHQ9" ? "PHQ-9" : "GAD-7"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.score}</td>
                    <td className="px-3 py-2">{row.severity}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.riskLevel === "HIGH"
                            ? "text-red-400"
                            : row.riskLevel === "MEDIUM"
                              ? "text-amber-400"
                              : "text-teal-400/90"
                        }
                      >
                        {row.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
