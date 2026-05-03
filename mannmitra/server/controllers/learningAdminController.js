import mongoose from "mongoose";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import LearningRiskSnapshot from "../models/LearningRiskSnapshot.js";
import BehaviorBatch from "../models/BehaviorBatch.js";
import User from "../models/User.js";
import Screening from "../models/Screening.js";
import Chat from "../models/Chat.js";

function round2(x) {
  if (x == null || Number.isNaN(Number(x))) return null;
  return Math.round(Number(x) * 100) / 100;
}

/**
 * Per-student learning + behavior + screening + HF chat summaries (platform admin).
 * Behavioral columns are aggregates from metadata batches (no typed content).
 */
export const getStudentLearningInsights = async (req, res, next) => {
  try {
    const windowDays = Math.min(
      90,
      Math.max(7, Number(req.query.days) || 30),
    );
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const users = await User.find({
      role: { $in: ["student", "peer_mentor"] },
    })
      .sort({ createdAt: -1 })
      .limit(400)
      .select("displayName name username institute college createdAt")
      .lean();

    const userIds = users.map((u) => u._id);

    const [
      behaviorAgg,
      snapshots,
      phqRows,
      gadRows,
      chatProjected,
    ] = await Promise.all([
      BehaviorBatch.aggregate([
        { $match: { userId: { $in: userIds }, createdAt: { $gte: since } } },
        {
          $group: {
            _id: "$userId",
            batches: { $sum: 1 },
            avgMouseSpeedPxPerSec: { $avg: "$mouseAvgSpeedPxPerSec" },
            avgIdleMs: { $avg: "$idleMs" },
            avgTabSwitchCount: { $avg: "$tabSwitchCount" },
            avgTypingWpm: { $avg: "$typingWpmEstimate" },
            avgScrollEvents: { $avg: "$scrollEvents" },
            avgScrollDeltaSum: { $avg: "$scrollDeltaSum" },
            totalVideoPauses: { $sum: "$videoPauseCount" },
            totalVideoReplays: { $sum: "$videoReplayCount" },
            lastBatchAt: { $max: "$createdAt" },
          },
        },
      ]),
      LearningRiskSnapshot.find({ userId: { $in: userIds } }).lean(),
      Screening.aggregate([
        { $match: { userId: { $in: userIds }, type: "PHQ9" } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$userId",
            score: { $first: "$score" },
            severity: { $first: "$severity" },
            riskLevel: { $first: "$riskLevel" },
            takenAt: { $first: "$createdAt" },
          },
        },
      ]),
      Screening.aggregate([
        { $match: { userId: { $in: userIds }, type: "GAD7" } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$userId",
            score: { $first: "$score" },
            severity: { $first: "$severity" },
            riskLevel: { $first: "$riskLevel" },
            takenAt: { $first: "$createdAt" },
          },
        },
      ]),
      Chat.aggregate([
        { $match: { userId: { $in: userIds } } },
        {
          $project: {
            userId: 1,
            latestRiskLevel: 1,
            hfSlice: {
              $map: {
                input: { $slice: ["$messages", -60] },
                as: "m",
                in: {
                  sender: "$$m.sender",
                  hf: "$$m.hfSignals",
                },
              },
            },
          },
        },
      ]),
    ]);

    const snapMap = new Map(snapshots.map((s) => [String(s.userId), s]));
    const behMap = new Map(behaviorAgg.map((b) => [String(b._id), b]));
    const phqMap = new Map(phqRows.map((p) => [String(p._id), p]));
    const gadMap = new Map(gadRows.map((g) => [String(g._id), g]));

    function summarizeHf(doc) {
      const slice = doc.hfSlice || [];
      let scoredLines = 0;
      let lastEmotion = null;
      let lastSuicide = null;
      for (const row of slice) {
        if (row.sender !== "user" || !row.hf || row.hf.error) continue;
        if (row.hf.emotionTopLabel || row.hf.suicideTopLabel) scoredLines += 1;
        if (row.hf.emotionTopLabel) lastEmotion = row.hf.emotionTopLabel;
        if (row.hf.suicideTopLabel) lastSuicide = row.hf.suicideTopLabel;
      }
      return {
        chatLatestRiskLevel: doc.latestRiskLevel || null,
        hfScoredUserLines: scoredLines,
        lastEmotionTopLabel: lastEmotion,
        lastSuicideModelLabel: lastSuicide,
        hfModelsNote:
          "Hugging Face Inference API: suicidality classifier + emotion classifier on chat lines at save time (no message plaintext in this view).",
      };
    }

    const chatMap = new Map(
      chatProjected.map((c) => [String(c.userId), summarizeHf(c)]),
    );

    const rows = users.map((u) => {
      const id = String(u._id);
      const b = behMap.get(id);
      const sn = snapMap.get(id);
      const phq = phqMap.get(id);
      const gad = gadMap.get(id);
      const hf = chatMap.get(id) || {
        chatLatestRiskLevel: null,
        hfScoredUserLines: 0,
        lastEmotionTopLabel: null,
        lastSuicideModelLabel: null,
        hfModelsNote:
          "Hugging Face Inference API: suicidality classifier + emotion classifier on chat lines at save time (no message plaintext in this view).",
      };

      return {
        userId: id,
        displayName: u.displayName,
        name: u.name,
        username: u.username,
        institute: u.institute,
        college: u.college,
        memberSince: u.createdAt,
        behavioralWindowDays: windowDays,
        behavioral: b
          ? {
              batchesInWindow: b.batches,
              avgMouseSpeedPxPerSec: round2(b.avgMouseSpeedPxPerSec),
              avgIdleMsPerBatch: round2(b.avgIdleMs),
              avgTabSwitchCount: round2(b.avgTabSwitchCount),
              avgTypingWpmEstimate: round2(b.avgTypingWpm),
              avgScrollEventsPerBatch: round2(b.avgScrollEvents),
              avgScrollDeltaSumPerBatch: round2(b.avgScrollDeltaSum),
              totalVideoPauses: b.totalVideoPauses,
              totalVideoReplays: b.totalVideoReplays,
              lastBatchAt: b.lastBatchAt,
            }
          : null,
        learningFusion: sn
          ? {
              behavioralScore: sn.behavioralScore,
              mentalHealthScore: sn.mentalHealthScore,
              finalScore: sn.finalScore,
              riskLevel: sn.riskLevel,
              computedAt: sn.computedAt,
            }
          : null,
        screening: {
          phq9: phq
            ? {
                score: phq.score,
                severity: phq.severity,
                riskLevel: phq.riskLevel,
                takenAt: phq.takenAt,
              }
            : null,
          gad7: gad
            ? {
                score: gad.score,
                severity: gad.severity,
                riskLevel: gad.riskLevel,
                takenAt: gad.takenAt,
              }
            : null,
        },
        chatbotHf: hf,
      };
    });

    res.json({
      meta: {
        studentCount: rows.length,
        behavioralWindowDays: windowDays,
        description:
          "Per-student aggregates: e-learning behavior metadata (video pause/replay totals, mouse, idle, tabs, typing rate, scroll), fused learning risk, PHQ-9/GAD-7, and HF chat model labels — no keystrokes or chat plaintext.",
      },
      students: rows,
    });
  } catch (e) {
    next(e);
  }
};

function slugify(title) {
  const base = String(title || "course")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "course"}-${Date.now().toString(36)}`;
}

export const createCourse = async (req, res, next) => {
  try {
    const {
      title,
      track,
      subject,
      unitLabel,
      description,
      summaryText,
      videoUrl,
      durationSeconds,
      order,
      isPublished,
    } = req.body || {};
    if (!title || !videoUrl) {
      return res
        .status(400)
        .json({ message: "title and videoUrl are required" });
    }
    const adminId = req.admin?.userId;
    const course = await Course.create({
      title: String(title).trim(),
      slug: slugify(title),
      track: track != null ? String(track).trim() : "",
      subject: subject != null ? String(subject).trim() : "",
      unitLabel: unitLabel != null ? String(unitLabel).trim() : "",
      description: description || "",
      summaryText: summaryText || "",
      videoUrl: String(videoUrl).trim(),
      durationSeconds: Number(durationSeconds) || 0,
      order: Number(order) || 0,
      isPublished: isPublished !== false,
      createdBy: adminId && mongoose.Types.ObjectId.isValid(adminId)
        ? adminId
        : null,
    });
    res.status(201).json(course);
  } catch (e) {
    next(e);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const updates = req.body || {};
    const allowed = [
      "title",
      "track",
      "subject",
      "unitLabel",
      "description",
      "summaryText",
      "videoUrl",
      "durationSeconds",
      "order",
      "isPublished",
    ];
    const $set = {};
    for (const k of allowed) {
      if (k in updates) $set[k] = updates[k];
    }
    const course = await Course.findByIdAndUpdate(id, { $set }, { new: true });
    if (!course) return res.status(404).json({ message: "Not found" });
    res.json(course);
  } catch (e) {
    next(e);
  }
};

export const listCoursesAdmin = async (req, res, next) => {
  try {
    const courses = await Course.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(courses);
  } catch (e) {
    next(e);
  }
};

/** Aggregated metrics only — no individual narratives or typed content. */
export const getLearningAggregates = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [riskDist, avgRisk, enrollStats, optInCount, behaviorWindows] =
      await Promise.all([
        LearningRiskSnapshot.aggregate([
          { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
        ]),
        LearningRiskSnapshot.aggregate([
          {
            $group: {
              _id: null,
              avgFinal: { $avg: "$finalScore" },
              count: { $sum: 1 },
            },
          },
        ]),
        Enrollment.aggregate([
          {
            $group: {
              _id: null,
              totalEnrollments: { $sum: 1 },
              avgProgress: { $avg: "$progressPercent" },
            },
          },
        ]),
        User.countDocuments({ behaviorTrackingOptIn: true }),
        BehaviorBatch.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              batches: { $sum: 1 },
              avgBehavioral: { $avg: "$behavioralScore" },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    res.json({
      riskDistribution: riskDist.map((r) => ({
        level: r._id,
        count: r.count,
      })),
      averageFinalRiskScore: avgRisk[0]?.avgFinal ?? null,
      snapshotCount: avgRisk[0]?.count ?? 0,
      enrollments: {
        total: enrollStats[0]?.totalEnrollments ?? 0,
        averageProgressPercent: enrollStats[0]?.avgProgress ?? null,
      },
      usersWithBehaviorOptIn: optInCount,
      last7DaysBehaviorTrend: behaviorWindows.map((d) => ({
        date: d._id,
        batchesSubmitted: d.batches,
        averageBehavioralScore:
          d.avgBehavioral != null
            ? Math.round(Number(d.avgBehavioral) * 100) / 100
            : null,
      })),
      privacyNote:
        "Aggregates only. No keystroke content, page text, or chat messages are included.",
    });
  } catch (e) {
    next(e);
  }
};
