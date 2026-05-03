import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { useAdaptiveLearning } from "../context/AdaptiveLearningContext";
import { useBehaviorTracking } from "../hooks/useBehaviorTracking";
import SectionTabs from "../components/SectionTabs";

/** Cloudinary embed player page — use iframe (not valid as HTML5 video src). */
function isCloudinaryEmbedUrl(url) {
  return typeof url === "string" && url.includes("player.cloudinary.com/embed");
}

function sessionId() {
  if (typeof sessionStorage === "undefined") return "sess";
  let s = sessionStorage.getItem("mmLearnSession");
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem("mmLearnSession", s);
  }
  return s;
}

/** Rolling behavioral score (0–10) from /learning/behavior — crosses → rest prompt */
const REST_BEHAVIOR_THRESHOLD = 6.2;
/** Min time between rest popups after dismiss (ms) */
const REST_PROMPT_COOLDOWN_MS = 3 * 60 * 1000;
/** Only nudge during the main part of the lecture (not start/end) */
const REST_PROGRESS_MIN_PCT = 4;
const REST_PROGRESS_MAX_PCT = 96;

export default function CoursePlayerPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [showRestModal, setShowRestModal] = useState(false);
  /** One panel at a time — same pattern as student counselling tabs. */
  const [lessonTab, setLessonTab] = useState("watch");
  const videoRef = useRef(null);
  const lastLevel = useRef(null);
  const lastVideoTime = useRef(0);
  const seekFromTime = useRef(0);
  const lectureProgressRef = useRef(0);
  const embedPlaybackRef = useRef(false);
  const prevBehavioralRef = useRef(null);
  const lastRestPromptAtRef = useRef(0);

  const { risk, setRisk, setLecturePlan, hasConsent, refreshRisk, lecturePlan } =
    useAdaptiveLearning();

  const sid = useMemo(() => sessionId(), []);

  const onRiskUpdate = useCallback(
    (data) => {
      setRisk({
        riskLevel: data.riskLevel || "Normal",
        finalScore: Number(data.finalScore) || 0,
        behavioralScore: Number(data.behavioralScore) || 0,
        mentalHealthScore: Number(data.mentalHealthScore) || 0,
      });
      if (data.lecturePlan) setLecturePlan(data.lecturePlan);

      const b = Number(data.behavioralScore);
      if (!Number.isFinite(b) || !hasConsent) {
        prevBehavioralRef.current = b;
        return;
      }

      const pct = lectureProgressRef.current;
      const inMidLecture = embedPlaybackRef.current
        ? true
        : pct >= REST_PROGRESS_MIN_PCT && pct <= REST_PROGRESS_MAX_PCT;
      const crossedUp =
        b >= REST_BEHAVIOR_THRESHOLD &&
        (prevBehavioralRef.current == null ||
          prevBehavioralRef.current < REST_BEHAVIOR_THRESHOLD);
      const cooledDown =
        Date.now() - lastRestPromptAtRef.current >= REST_PROMPT_COOLDOWN_MS;

      if (inMidLecture && crossedUp && cooledDown) {
        setShowRestModal(true);
        lastRestPromptAtRef.current = Date.now();
        const v = videoRef.current;
        if (v) v.pause();
      }

      prevBehavioralRef.current = b;
    },
    [setRisk, setLecturePlan, hasConsent],
  );

  const { recordVideoPause, recordVideoReplay } = useBehaviorTracking({
    enabled: hasConsent,
    sessionId: sid,
    onRiskUpdate,
  });

  useEffect(() => {
    api
      .get(`/learning/courses/${id}`)
      .then((r) => {
        setCourse(r.data);
        embedPlaybackRef.current = isCloudinaryEmbedUrl(r.data?.videoUrl);
        if (r.data?._id) {
          api.post(`/learning/enroll/${r.data._id}`).catch(() => {});
        }
      })
      .catch(() => setLoadError("Course not found."));
  }, [id]);

  useEffect(() => {
    refreshRisk();
  }, [refreshRisk]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onPause = () => recordVideoPause();
    const onTimeUpdate = () => {
      lastVideoTime.current = v.currentTime;
    };
    const onSeeking = () => {
      seekFromTime.current = lastVideoTime.current;
    };
    const onSeeked = () => {
      const from = seekFromTime.current;
      const jumpedBack = v.currentTime < from - 1.5;
      const restartedEarly = v.currentTime < 2 && from > 5;
      if (jumpedBack || restartedEarly) recordVideoReplay();
    };
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [course, recordVideoPause, recordVideoReplay]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (risk.riskLevel === "Struggling") v.playbackRate = 0.85;
    else if (risk.riskLevel === "Normal") v.playbackRate = 1;
    else if (risk.riskLevel === "Burnout") v.playbackRate = 0.75;
  }, [risk.riskLevel, course]);

  useEffect(() => {
    const v = videoRef.current;
    const prev = lastLevel.current;
    if (prev === risk.riskLevel) return;
    lastLevel.current = risk.riskLevel;

    if (risk.riskLevel === "Burnout") {
      if (v) v.pause();
      setToast(
        "Heavy media paused. Counselling and peer support are one tap away—you can resume gently when ready.",
      );
    } else if (risk.riskLevel === "Struggling") {
      setToast("Summary mode: key points highlighted; pace slightly reduced.");
    } else {
      setToast("");
    }
  }, [risk.riskLevel]);

  const progressTick = () => {
    const v = videoRef.current;
    if (!v || !course?._id) return;
    const pct = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    lectureProgressRef.current = pct;
    api
      .patch("/learning/progress", {
        courseId: course._id,
        progressPercent: Math.min(100, pct),
        lastPositionSec: v.currentTime,
      })
      .catch(() => {});
  };

  const extraUnitNote = useMemo(() => {
    if (!course?._id || !lecturePlan?.bySubject?.length) return "";
    const subj = (course.subject || "").trim() || null;
    const row = lecturePlan.bySubject.find(
      (r) => r.subject === subj || (r.subject == null && subj == null),
    );
    if (!row || row.targetUnits >= row.totalUnits) return "";
    if (row.courseIdsInTarget?.includes(String(course._id))) return "";
    return "This unit is outside your current adaptive target for this subject—you can still study it anytime.";
  }, [course, lecturePlan]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-slate-600">
        {loadError}{" "}
        <Link className="text-wellness-sage underline" to="/learn">
          Back to courses
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Loading lesson…
      </div>
    );
  }

  const showSummary =
    risk.riskLevel === "Struggling" || risk.riskLevel === "Burnout";
  const lightMode = risk.riskLevel === "Burnout";
  const embedMode = isCloudinaryEmbedUrl(course.videoUrl);

  const lessonTabs = [
    { id: "watch", label: "Watch" },
    { id: "content", label: "Lesson content" },
    { id: "wellbeing", label: "Support & privacy" },
  ];

  const dismissRestModal = () => {
    setShowRestModal(false);
    lastRestPromptAtRef.current = Date.now();
    const v = videoRef.current;
    if (v) v.play().catch(() => {});
  };

  return (
    <div
      className={`mx-auto max-w-3xl px-4 py-8 ${lightMode ? "bg-wellness-paper/50" : ""}`}
    >
      {showRestModal ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rest-modal-title"
        >
          <div className="mm-card max-h-[90vh] w-full max-w-md overflow-y-auto border-wellness-sage/30 p-6 shadow-xl">
            <h2
              id="rest-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Take a rest
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Your recent study patterns crossed a strain threshold — for example
              longer pauses away from the lesson, more tab switches, faster or
              choppier scrolling, idle stretches, or a higher typing pace (we only
              measure speed, not what you type). Consider a short break, look away
              from the screen, and stretch before continuing.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="mm-btn-primary"
                onClick={dismissRestModal}
              >
                Continue lesson
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className="mb-4 rounded-xl border border-wellness-sage/30 bg-wellness-sage/10 px-4 py-3 text-sm text-slate-800"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <SectionTabs
        id="lesson-tabs"
        label="Lesson sections"
        tabs={lessonTabs}
        activeId={lessonTab}
        onChange={setLessonTab}
        className="mb-6"
      />

      {lessonTab === "watch" ? (
        <section
          role="tabpanel"
          id="lesson-tabs-panel-watch"
          aria-labelledby="lesson-tabs-watch"
          className="space-y-6"
        >
          {course.track || course.subject ? (
            <nav className="text-sm text-slate-500" aria-label="Course path">
              <Link className="font-medium text-wellness-sage hover:underline" to="/learn">
                Courses
              </Link>
              {course.track ? (
                <>
                  <span className="mx-1.5 text-slate-300">/</span>
                  <span>{course.track}</span>
                </>
              ) : null}
              {course.subject ? (
                <>
                  <span className="mx-1.5 text-slate-300">/</span>
                  <span>{course.subject}</span>
                </>
              ) : null}
              {course.unitLabel ? (
                <>
                  <span className="mx-1.5 text-slate-300">/</span>
                  <span className="text-slate-700">{course.unitLabel}</span>
                </>
              ) : null}
            </nav>
          ) : null}

          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>

          {extraUnitNote ? (
            <p
              className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950"
              role="note"
            >
              {extraUnitNote}
            </p>
          ) : null}

          <div className="aspect-video overflow-hidden rounded-2xl border border-stone-200 bg-black shadow-lg">
            {embedMode ? (
              <iframe
                title={course.title}
                src={course.videoUrl}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
                src={course.videoUrl}
                controls
                onTimeUpdate={progressTick}
                playsInline
              />
            )}
          </div>
        </section>
      ) : null}

      {lessonTab === "content" ? (
        <section
          role="tabpanel"
          id="lesson-tabs-panel-content"
          aria-labelledby="lesson-tabs-content"
          className="space-y-6 rounded-2xl border border-stone-200/90 border-l-[6px] border-l-wellness-sage bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900">Lesson content</h2>
          {showSummary && course.summaryText ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-slate-800">
              <p className="font-semibold text-amber-900">Summary</p>
              <p className="mt-2 whitespace-pre-wrap">{course.summaryText}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {showSummary
                ? "No summary text for this lesson."
                : "Summary highlights appear here when you’re in summary mode (Struggling / Burnout)."}
            </p>
          )}
          {!lightMode ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                {course.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Dense description is hidden in burnout-friendly mode — switch back
              when you feel ready, or use Support &amp; privacy for help.
            </p>
          )}
        </section>
      ) : null}

      {lessonTab === "wellbeing" ? (
        <section
          role="tabpanel"
          id="lesson-tabs-panel-wellbeing"
          aria-labelledby="lesson-tabs-wellbeing"
          className="space-y-6 rounded-2xl border border-stone-200/90 border-l-[6px] border-l-wellness-teal bg-gradient-to-br from-white to-wellness-sage/[0.04] p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Support &amp; privacy
          </h2>
          {risk.riskLevel === "Struggling" ? (
            <p className="text-sm text-slate-600">
              Need a nudge?{" "}
              <Link className="font-medium text-wellness-sage" to="/chat">
                Open Talk mate
              </Link>
              .
            </p>
          ) : null}

          {risk.riskLevel === "Burnout" ? (
            <div className="space-y-3 rounded-xl border border-rose-200/80 bg-rose-50/90 p-4 text-sm text-slate-800">
              <p className="font-semibold text-rose-900">Support</p>
              <p>
                This mode hides dense material. Consider a break, speak with a
                counsellor, or use Study squad when you feel ready.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link className="mm-btn-primary" to="/booking">
                  Counselling
                </Link>
                <Link className="mm-btn-secondary" to="/forum">
                  Study squad
                </Link>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-wellness-sage underline"
                onClick={() => videoRef.current?.play()}
              >
                Resume video gently
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              For <strong>Physics, Chemistry, or Maths</strong> doubts, use the{" "}
              <Link
                className="font-medium text-wellness-teal underline"
                to="/learn#pcm-doubt"
              >
                PCM doubt tutor
              </Link>{" "}
              on Courses. Talk mate, counselling, and Study squad are here when
              you need them.
            </p>
          )}

          <div className="rounded-xl border border-stone-200/90 bg-wellness-paper/80 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <p className="font-medium text-slate-800">How your score is built</p>
            <p className="mt-1.5">
              While you watch, we derive a <strong>behavioral score</strong> from
              pointer speed, idle time, tab switches, typing rhythm (not your
              text), scroll/wheel activity, and video pauses or replays. That is
              combined with your optional{" "}
              <Link className="font-medium text-wellness-sage underline" to="/screening">
                PHQ-9 / GAD-7 screening
              </Link>{" "}
              so lesson pacing and prompts match both study strain and wellbeing.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
