import Course from "../models/Course.js";

/**
 * Target number of units in a subject for this student, from fused risk.
 * Higher strain → fewer simultaneous units (lighter pacing target).
 *
 * @param {number} total published units in that subject (or general bucket)
 * @param {"Normal"|"Struggling"|"Burnout"} riskLevel
 */
export function targetUnitCount(total, riskLevel) {
  const t = Math.max(0, Math.floor(Number(total) || 0));
  if (t === 0) return 0;
  if (riskLevel === "Normal") return t;
  const ratio = riskLevel === "Struggling" ? 0.55 : 0.35;
  const raw = Math.ceil(t * ratio);
  return Math.max(1, Math.min(t, raw));
}

/**
 * @param {"Normal"|"Struggling"|"Burnout"} riskLevel
 */
export async function buildLecturePlan(riskLevel) {
  const courses = await Course.find({ isPublished: true })
    .select("_id subject order unitLabel title slug track")
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const groups = new Map();
  for (const c of courses) {
    const key = (c.subject || "").trim() || "__general__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  const bySubject = [];
  let totalUnitsAll = 0;
  let targetUnitsAll = 0;

  for (const [subjectKey, list] of groups) {
    const sorted = [...list].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const total = sorted.length;
    const target = targetUnitCount(total, riskLevel);
    totalUnitsAll += total;
    targetUnitsAll += target;
    const inPlan = sorted.slice(0, target).map((c) => String(c._id));
    bySubject.push({
      subject: subjectKey === "__general__" ? null : subjectKey,
      totalUnits: total,
      targetUnits: target,
      courseIdsInTarget: inPlan,
    });
  }

  bySubject.sort((a, b) => {
    if (a.subject == null) return 1;
    if (b.subject == null) return -1;
    return a.subject.localeCompare(b.subject);
  });

  const note =
    riskLevel === "Normal"
      ? "Full catalog is your target pace."
      : riskLevel === "Struggling"
        ? "A reduced unit count per subject keeps the load lighter while you catch up."
        : "Smallest step-through target per subject to protect recovery and focus.";

  return {
    riskLevel,
    bySubject,
    totals: { totalUnits: totalUnitsAll, targetUnits: targetUnitsAll },
    note,
  };
}
