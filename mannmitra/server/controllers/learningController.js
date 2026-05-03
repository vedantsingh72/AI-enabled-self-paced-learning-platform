import mongoose from "mongoose";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import BehaviorBatch from "../models/BehaviorBatch.js";
import LearningRiskSnapshot from "../models/LearningRiskSnapshot.js";
import User from "../models/User.js";
import { computeBehavioralScore } from "../services/behaviorAnalysisEngine.js";
import { computeMentalHealthScore10 } from "../services/mentalHealthLearningScore.js";
import {
  computeFinalScore,
  riskLevelFromFinalScore,
} from "../services/finalScoringEngine.js";
import { generatePcmDoubtReply } from "../services/aiService.js";
import { persistPcmDoubtTurn } from "../services/pcmDoubtPersistence.js";
import { buildLecturePlan } from "../services/lecturePlanService.js";

async function averageRecentBehavioral(userId) {
  const rows = await BehaviorBatch.find({ userId })
    .sort({ createdAt: -1 })
    .limit(8)
    .select("behavioralScore")
    .lean();
  if (!rows.length) return 0;
  const sum = rows.reduce((a, r) => a + (Number(r.behavioralScore) || 0), 0);
  return Math.round((sum / rows.length) * 10) / 10;
}

export const postConsent = async (req, res, next) => {
  try {
    const { accepted } = req.body || {};
    if (!accepted) {
      return res.status(400).json({ message: "Consent is required to continue." });
    }
    const now = new Date();
    await User.findByIdAndUpdate(req.user._id, {
      learningConsentAt: now,
      behaviorTrackingOptIn: true,
    });
    res.json({ ok: true, learningConsentAt: now.toISOString() });
  } catch (e) {
    next(e);
  }
};

export const getConsentStatus = async (req, res, next) => {
  try {
    const u = await User.findById(req.user._id)
      .select("learningConsentAt behaviorTrackingOptIn")
      .lean();
    res.json({
      hasConsent: !!(u?.learningConsentAt && u?.behaviorTrackingOptIn),
      learningConsentAt: u?.learningConsentAt || null,
    });
  } catch (e) {
    next(e);
  }
};

export const listPublishedCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .sort({ order: 1, createdAt: -1 })
      .select(
        "title slug track subject unitLabel description summaryText videoUrl durationSeconds order",
      )
      .lean();
    res.json(courses);
  } catch (e) {
    next(e);
  }
};

export const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let course = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findOne({ _id: id, isPublished: true })
        .select(
          "title slug track subject unitLabel description summaryText videoUrl durationSeconds",
        )
        .lean();
    }
    if (!course) {
      course = await Course.findOne({ slug: id, isPublished: true })
        .select(
          "title slug track subject unitLabel description summaryText videoUrl durationSeconds",
        )
        .lean();
    }
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (e) {
    next(e);
  }
};

export const enroll = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid course id" });
    }
    const course = await Course.findOne({ _id: courseId, isPublished: true });
    if (!course) return res.status(404).json({ message: "Course not found" });
    const en = await Enrollment.findOneAndUpdate(
      { userId: req.user._id, courseId },
      { $setOnInsert: { userId: req.user._id, courseId } },
      { upsert: true, new: true },
    );
    res.status(201).json(en);
  } catch (e) {
    next(e);
  }
};

export const myEnrollments = async (req, res, next) => {
  try {
    const rows = await Enrollment.find({ userId: req.user._id })
      .populate(
        "courseId",
        "title slug track subject unitLabel description summaryText videoUrl durationSeconds",
      )
      .sort({ updatedAt: -1 })
      .lean();
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const patchProgress = async (req, res, next) => {
  try {
    const { courseId, progressPercent, lastPositionSec } = req.body || {};
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Valid courseId required" });
    }
    const pct = Math.min(100, Math.max(0, Number(progressPercent) || 0));
    const en = await Enrollment.findOneAndUpdate(
      { userId: req.user._id, courseId },
      {
        progressPercent: pct,
        lastPositionSec: Math.max(0, Number(lastPositionSec) || 0),
        ...(pct >= 99 ? { completedAt: new Date() } : {}),
      },
      { new: true },
    );
    if (!en) return res.status(404).json({ message: "Not enrolled" });
    res.json(en);
  } catch (e) {
    next(e);
  }
};

export const postBehaviorBatch = async (req, res, next) => {
  try {
    const u = await User.findById(req.user._id).select(
      "behaviorTrackingOptIn learningConsentAt",
    );
    if (!u?.behaviorTrackingOptIn || !u?.learningConsentAt) {
      return res.status(403).json({
        message: "Behavioral tracking requires learning consent.",
      });
    }

    const payload = req.body || {};
    const behavioralScore = computeBehavioralScore(payload);

    await BehaviorBatch.create({
      userId: req.user._id,
      sessionId: String(payload.sessionId || "unknown").slice(0, 80),
      windowMs: Number(payload.windowMs) || 30000,
      mouseAvgSpeedPxPerSec: Number(payload.mouseAvgSpeedPxPerSec) || 0,
      mouseSampleCount: Number(payload.mouseSampleCount) || 0,
      idleMs: Number(payload.idleMs) || 0,
      tabSwitchCount: Number(payload.tabSwitchCount) || 0,
      typingWpmEstimate: Number(payload.typingWpmEstimate) || 0,
      typingSampleCount: Number(payload.typingSampleCount) || 0,
      scrollEvents: Number(payload.scrollEvents) || 0,
      scrollDeltaSum: Number(payload.scrollDeltaSum) || 0,
      videoPauseCount: Number(payload.videoPauseCount) || 0,
      videoReplayCount: Number(payload.videoReplayCount) || 0,
      behavioralScore,
    });

    const behavioralRolling = await averageRecentBehavioral(req.user._id);
    const mh = await computeMentalHealthScore10(req.user._id);
    const finalScore = computeFinalScore(behavioralRolling, mh.score);
    const riskLevel = riskLevelFromFinalScore(finalScore);

    await LearningRiskSnapshot.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          behavioralScore: behavioralRolling,
          mentalHealthScore: mh.score,
          finalScore,
          riskLevel,
          computedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    const lecturePlan = await buildLecturePlan(riskLevel);

    res.json({
      behavioralScore: behavioralRolling,
      mentalHealthScore: mh.score,
      finalScore,
      riskLevel,
      lecturePlan,
    });
  } catch (e) {
    next(e);
  }
};

export const getRiskSnapshot = async (req, res, next) => {
  try {
    const snap = await LearningRiskSnapshot.findOne({
      userId: req.user._id,
    }).lean();
    if (!snap) {
      const mh = await computeMentalHealthScore10(req.user._id);
      const behavioralRolling = await averageRecentBehavioral(req.user._id);
      const finalScore = computeFinalScore(behavioralRolling, mh.score);
      const riskLevel = riskLevelFromFinalScore(finalScore);
      const lecturePlan = await buildLecturePlan(riskLevel);
      return res.json({
        behavioralScore: behavioralRolling,
        mentalHealthScore: mh.score,
        finalScore,
        riskLevel,
        computedAt: null,
        lecturePlan,
      });
    }
    const lecturePlan = await buildLecturePlan(snap.riskLevel || "Normal");
    res.json({ ...snap, lecturePlan });
  } catch (e) {
    next(e);
  }
};

const PCM_ALLOWED = ["Physics", "Chemistry", "Maths"];

/** Groq-backed PCM (Physics / Chemistry / Maths) doubt chat — separate from Talk mate / MHH. */
export const postPcmDoubtChat = async (req, res, next) => {
  try {
    const { subject, message, history } = req.body || {};
    if (!PCM_ALLOWED.includes(subject)) {
      return res.status(400).json({
        message: "subject must be Physics, Chemistry, or Maths",
      });
    }
    const text = String(message || "").trim();
    if (!text) {
      return res.status(400).json({ message: "message is required" });
    }

    let historyNorm = [];
    if (Array.isArray(history)) {
      historyNorm = history
        .slice(-16)
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").trim(),
        }))
        .filter((m) => m.content);
    }

    const reply = await generatePcmDoubtReply({
      subject,
      userMessage: text,
      history: historyNorm,
    });

    try {
      await persistPcmDoubtTurn(req.user._id, subject, text, reply);
    } catch (persistErr) {
      console.error("PCM doubt persist failed (reply still returned)", persistErr);
    }

    return res.json({ reply });
  } catch (e) {
    if (e?.code === "GROQ_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "PCM doubt tutor is not available (set GROQ_API_KEY on the server).",
      });
    }
    if (e?.code === "INVALID_SUBJECT") {
      return res.status(400).json({
        message: "subject must be Physics, Chemistry, or Maths",
      });
    }
    next(e);
  }
};
