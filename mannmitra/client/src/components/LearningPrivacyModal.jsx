import { Link } from "react-router-dom";
import { useAdaptiveLearning } from "../context/AdaptiveLearningContext";

export default function LearningPrivacyModal() {
  const { hasConsent, consentLoading, acceptConsent } = useAdaptiveLearning();

  if (consentLoading || hasConsent) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        className="mm-card max-h-[90vh] w-full max-w-lg overflow-y-auto border-wellness-sage/30 p-6 shadow-xl"
        role="dialog"
        aria-labelledby="learn-privacy-title"
      >
        <h2
          id="learn-privacy-title"
          className="text-lg font-semibold text-slate-900"
        >
          How adaptive e-learning works
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          To estimate study strain and tune lessons, we collect{" "}
          <strong>interaction metadata only</strong> while you watch course
          videos. We <strong>never</strong> store what you type, use camera or
          mic, or capture page text.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-800">
          Signals used for your behavioral score (each ~30s batch):
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-600">
          <li>Mouse movement speed (pointer pace)</li>
          <li>Pause / idle time away from the lesson</li>
          <li>Tab switching (leaving the page)</li>
          <li>Typing speed estimate — not the characters you type</li>
          <li>Scroll / wheel movement pattern (aggregated)</li>
          <li>Video interactions — pauses, seeks / replay-like jumps</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your <strong>behavioral score</strong> is combined with the{" "}
          <strong>optional wellbeing screening</strong> you can already take (
          <Link to="/screening" className="font-medium text-wellness-sage underline">
            PHQ-9 / GAD-7
          </Link>
          ) so pacing and prompts stay aligned with how you are doing.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Admins only see aggregated analytics — not your messages or notes.</li>
          <li>You can decline; tracking stays off until you accept.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="mm-btn-primary"
            onClick={() => acceptConsent()}
          >
            I understand — enable adaptive learning
          </button>
          <button
            type="button"
            className="mm-btn-secondary"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
