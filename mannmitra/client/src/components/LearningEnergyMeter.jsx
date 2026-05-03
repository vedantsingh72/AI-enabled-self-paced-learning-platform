import { useAdaptiveLearning } from "../context/AdaptiveLearningContext";

function levelColor(level) {
  if (level === "Burnout") return "from-rose-500 to-amber-600";
  if (level === "Struggling") return "from-amber-400 to-yellow-500";
  return "from-emerald-400 to-teal-500";
}

/** “Battery” visualization for cognitive / burnout risk (0–10). */
export function LearningEnergyMeter({ compact = false }) {
  const { risk } = useAdaptiveLearning();
  const pct = Math.min(100, Math.max(0, (Number(risk.finalScore) / 10) * 100));

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}
      title="Learning energy reflects combined behavioral and wellbeing signals (metadata only)."
    >
      <span className="hidden font-medium text-slate-600 sm:inline">
        Energy
      </span>
      <div
        className={`relative h-2 overflow-hidden rounded-full bg-slate-200/90 ${compact ? "w-16" : "w-28"}`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${levelColor(risk.riskLevel)}`}
          style={{ width: `${100 - pct}%` }}
        />
      </div>
      <span className="font-semibold text-slate-800">
        {risk.riskLevel === "Normal" ? "OK" : risk.riskLevel}
      </span>
    </div>
  );
}
