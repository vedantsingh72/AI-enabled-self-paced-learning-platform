import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAdaptiveLearning } from "../context/AdaptiveLearningContext";
import PcmDoubtChatbot from "../components/PcmDoubtChatbot";

const SUBJECT_ORDER = ["Physics", "Chemistry", "Maths"];

/** Whether this unit is in the adaptive target set for its subject (by fused risk). */
function unitPlanBadge(course, lecturePlan) {
  if (!lecturePlan?.bySubject?.length) return null;
  const subj = (course.subject || "").trim() || null;
  const row = lecturePlan.bySubject.find(
    (r) => r.subject === subj || (r.subject == null && subj == null),
  );
  if (!row || row.totalUnits <= 0) return null;
  if (row.targetUnits >= row.totalUnits) {
    return { kind: "full", label: "Full track" };
  }
  const id = String(course._id);
  if (row.courseIdsInTarget?.includes(id)) {
    return { kind: "target", label: "In your target load" };
  }
  return { kind: "extra", label: "Extra practice" };
}

function groupBySubject(courses) {
  const withSubject = courses.filter((c) => c.subject);
  const withoutSubject = courses.filter((c) => !c.subject);
  const map = new Map();
  for (const c of withSubject) {
    const s = c.subject;
    if (!map.has(s)) map.set(s, []);
    map.get(s).push(c);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const sections = [];
  for (const s of SUBJECT_ORDER) {
    if (map.has(s)) {
      sections.push({ subject: s, courses: map.get(s) });
      map.delete(s);
    }
  }
  for (const [subject, list] of map) {
    sections.push({ subject, courses: list });
  }
  return { sections, withoutSubject };
}

function CourseCard({
  c,
  hasConsent,
  consentLoading,
  enroll,
  hideSubjectMeta = false,
  planBadge = null,
}) {
  return (
    <div className="mm-card flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-900">
          {c.unitLabel || c.title}
        </h2>
        {planBadge ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              planBadge.kind === "target"
                ? "bg-wellness-sage/20 text-wellness-sage"
                : planBadge.kind === "full"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-amber-100/90 text-amber-900"
            }`}
            title="Based on your wellbeing + study signal score"
          >
            {planBadge.label}
          </span>
        ) : null}
      </div>
      {c.unitLabel && !hideSubjectMeta ? (
        <p className="mt-1 text-xs text-slate-500">
          {[c.track, c.subject].filter(Boolean).join(" · ") || c.title}
        </p>
      ) : null}
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">
        {c.description || "Video lessons — open to watch."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="mm-btn-primary"
          disabled={consentLoading || !hasConsent}
          onClick={() => enroll(c._id)}
        >
          {hasConsent ? "Watch lessons" : "Accept privacy to start"}
        </button>
        <Link
          to={`/learn/course/${c._id}`}
          className="mm-btn-secondary inline-flex items-center justify-center"
        >
          Open player
        </Link>
      </div>
    </div>
  );
}

export default function LearnCoursesPage() {
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  /** Which JEE subject is expanded for step 2 (units). */
  const [selectedSubject, setSelectedSubject] = useState(null);
  const { refreshRisk, hasConsent, consentLoading, lecturePlan, risk } =
    useAdaptiveLearning();

  const { sections, withoutSubject } = useMemo(
    () => groupBySubject(courses),
    [courses],
  );
  const hasJeeStructure = sections.length > 0;

  useEffect(() => {
    if (!sections.length) {
      setSelectedSubject(null);
      return;
    }
    setSelectedSubject((prev) => {
      if (prev && sections.some((s) => s.subject === prev)) return prev;
      return sections[0].subject;
    });
  }, [sections]);

  useEffect(() => {
    api
      .get("/learning/courses")
      .then((r) => setCourses(r.data || []))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    refreshRisk();
  }, [refreshRisk]);

  useEffect(() => {
    if (location.hash !== "#pcm-doubt") return;
    const el = document.getElementById("pcm-doubt");
    if (el) {
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, [location.hash, location.pathname]);

  const enroll = async (id) => {
    await api.post(`/learning/enroll/${id}`);
    window.location.href = `/learn/course/${id}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
        E-learning
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        {hasJeeStructure
          ? "JEE — Physics, Chemistry, Maths"
          : "Courses — open a track, watch videos"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {hasJeeStructure ? (
          <>
            <strong>Step 1:</strong> pick a subject. <strong>Step 2:</strong> open
            a unit under that subject. In this demo, every unit uses the same
            sample video until your institute adds real lessons. With consent, we
            measure <strong>how</strong> you study to adapt pacing; that can join
            your{" "}
            <Link className="font-medium text-wellness-sage underline" to="/screening">
              optional wellbeing screening
            </Link>{" "}
            (PHQ-9 / GAD-7).
          </>
        ) : (
          <>
            Pick a module and watch in the player. With your consent, we measure{" "}
            <strong>how</strong> you study—movement, idle time, tab switches,
            typing rhythm (not what you type), scrolling, and video
            pauses/replays—to compute a <strong>behavioral score</strong>. That
            joins your existing{" "}
            <Link className="font-medium text-wellness-sage underline" to="/screening">
              optional wellbeing screening
            </Link>{" "}
            (PHQ-9 / GAD-7) so the app can adapt when strain shows up.
          </>
        )}
      </p>

      {lecturePlan?.bySubject?.length ? (
        <div
          className="mt-6 rounded-2xl border border-wellness-sage/25 bg-wellness-sage/5 px-4 py-3 text-sm text-slate-700"
          role="status"
        >
          <p className="font-semibold text-slate-900">
            Your adaptive lecture targets
            <span className="ml-2 font-normal text-slate-500">
              (score band: {risk.riskLevel})
            </span>
          </p>
          <p className="mt-1 text-slate-600">{lecturePlan.note}</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-slate-700">
            {lecturePlan.bySubject.map((row) => (
              <li key={row.subject ?? "general"}>
                {row.subject ?? "General"}{" "}
                <strong>
                  {row.targetUnits}/{row.totalUnits}
                </strong>{" "}
                {row.totalUnits === 1 ? "lecture" : "lectures"} in your current
                target
              </li>
            ))}
          </ul>
          {lecturePlan.totals &&
          lecturePlan.totals.targetUnits < lecturePlan.totals.totalUnits ? (
            <p className="mt-2 text-xs text-slate-500">
              Units marked “Extra practice” stay open—finish your target set
              first when you need a lighter week.
            </p>
          ) : null}
        </div>
      ) : null}

      <section
        id="pcm-doubt"
        aria-labelledby="pcm-doubt-heading"
        className="mt-10 scroll-mt-24"
      >
        <h2 id="pcm-doubt-heading" className="sr-only">
          Physics, Chemistry, and Maths doubt chatbot
        </h2>
        <PcmDoubtChatbot />
      </section>

      {hasJeeStructure ? (
        <div className="mt-10 space-y-10">
          <section aria-labelledby="subjects-heading">
            <p
              id="subjects-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
              1 · Subject
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Choose <strong>Physics</strong>, <strong>Chemistry</strong>, or{" "}
              <strong>Maths</strong> — then select a unit in the next section.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {sections.map(({ subject, courses: subCourses }) => {
                const active = selectedSubject === subject;
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setSelectedSubject(subject)}
                    className={`rounded-2xl border-2 p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wellness-sage focus-visible:ring-offset-2 ${
                      active
                        ? "border-wellness-sage bg-wellness-sage/10 shadow-sm"
                        : "border-stone-200 bg-white hover:border-wellness-sage/35"
                    }`}
                  >
                    <span className="text-lg font-bold text-slate-900">
                      {subject}
                    </span>
                    <p className="mt-1.5 text-sm text-slate-600">
                      {subCourses.length}{" "}
                      {subCourses.length === 1 ? "unit" : "units"}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedSubject ? (
            <section
              aria-labelledby="units-heading"
              className="scroll-mt-24 border-t border-stone-200 pt-10"
            >
              <p
                id="units-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
              >
                2 · Units — {selectedSubject}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Topics in {selectedSubject}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(sections.find((s) => s.subject === selectedSubject)?.courses ||
                  []
                ).map((c) => (
                  <CourseCard
                    key={c._id}
                    c={c}
                    hasConsent={hasConsent}
                    consentLoading={consentLoading}
                    enroll={enroll}
                    hideSubjectMeta
                    planBadge={unitPlanBadge(c, lecturePlan)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!hasJeeStructure ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <CourseCard
              key={c._id}
              c={c}
              hasConsent={hasConsent}
              consentLoading={consentLoading}
              enroll={enroll}
              planBadge={unitPlanBadge(c, lecturePlan)}
            />
          ))}
        </div>
      ) : null}

      {hasJeeStructure && withoutSubject.length ? (
        <div className="mt-10">
          <h2 className="border-b border-stone-200 pb-2 text-lg font-semibold text-slate-900">
            Other courses
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {withoutSubject.map((c) => (
              <CourseCard
                key={c._id}
                c={c}
                hasConsent={hasConsent}
                consentLoading={consentLoading}
                enroll={enroll}
                planBadge={unitPlanBadge(c, lecturePlan)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!courses.length ? (
        <div className="mt-10 rounded-xl border border-dashed border-stone-300 bg-wellness-paper/80 p-6 text-center text-sm text-slate-600">
          <p className="font-medium text-slate-800">No courses published yet</p>
          <p className="mt-2">
            Admins can add JEE-style modules (Physics, Chemistry, Maths units) from
            the control center. Restart the server once to load the default JEE
            catalog if seeding is enabled. After you accept the privacy prompt,
            open any unit to watch.
          </p>
        </div>
      ) : null}
    </div>
  );
}
