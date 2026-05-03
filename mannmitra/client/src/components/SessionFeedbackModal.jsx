import { useEffect, useState } from "react";
import api from "../services/api";

export const FEEDBACK_PROMPT_STORAGE_PREFIX = "mm-feedback-prompt-dismissed-";

/**
 * One-time prompt after a counselling or doubt session is completed — opens once
 * per booking until feedback is submitted or dismissed.
 */
export default function SessionFeedbackModal({
  booking,
  open,
  onClose,
  onSubmitted,
  variant = "counselling",
  labelCounsellor = "counsellor",
}) {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && booking?._id) {
      setRating("");
      setComment("");
      setErr("");
    }
  }, [open, booking?._id]);

  if (!open || !booking?._id) return null;

  const dismiss = () => {
    if (booking._id) {
      sessionStorage.setItem(FEEDBACK_PROMPT_STORAGE_PREFIX + booking._id, "1");
    }
    onClose();
  };

  const submit = async () => {
    if (!rating) {
      setErr("Please choose a rating.");
      return;
    }
    try {
      setSaving(true);
      setErr("");
      await api.patch(`/booking/${booking._id}/student-feedback`, {
        rating: Number(rating),
        comment: comment || "",
      });
      sessionStorage.setItem(FEEDBACK_PROMPT_STORAGE_PREFIX + booking._id, "1");
      onSubmitted?.();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || "Could not submit feedback.");
    } finally {
      setSaving(false);
    }
  };

  const accent =
    variant === "doubt"
      ? "border-wellness-teal/40 bg-white"
      : "border-wellness-sage/40 bg-white";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-feedback-title"
    >
      <div className={`mm-card max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl ${accent}`}>
        <h2
          id="session-feedback-title"
          className="text-lg font-semibold text-slate-900"
        >
          How was your session?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your {labelCounsellor} marked this visit complete. Rate the session
          once — you can add details below.
        </p>
        <div className="mt-4 space-y-3">
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="mm-input w-full"
          >
            <option value="">Choose a rating</option>
            <option value="5">5 — Excellent</option>
            <option value="4">4 — Good</option>
            <option value="3">3 — Okay</option>
            <option value="2">2 — Needs improvement</option>
            <option value="1">1 — Poor</option>
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mm-input w-full"
            placeholder="Optional comment"
            rows={3}
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="mm-btn-primary"
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Sending…" : "Submit feedback"}
          </button>
          <button
            type="button"
            className="mm-btn-secondary"
            disabled={saving}
            onClick={dismiss}
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
