import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import VideoRoom from "../models/VideoRoom.js";
import RiskAlert from "../models/RiskAlert.js";
import { getDoubtSupportQuotaStatus } from "../services/doubtSupportQuotaService.js";

const ensureCounsellor = (req, res) => {
  if (!["counsellor", "doubt_teacher"].includes(req.user?.role)) {
    res.status(403).json({ message: "Counsellor or doubt teacher access required" });
    return false;
  }
  return true;
};

const sessionKindForRole = (role) =>
  role === "doubt_teacher" ? "doubt_support" : "counselling";

export const getSlots = async (_req, res, next) => {
  try {
    res.json({
      slots: ["10:00-10:30", "11:00-11:30", "14:00-14:30", "16:00-16:30"],
    });
  } catch (e) {
    next(e);
  }
};
export const createBooking = async (req, res, next) => {
  try {
    const { date, slot, counsellorId, sessionKind = "counselling" } = req.body || {};
    if (!counsellorId) {
      return res.status(400).json({ message: "counsellorId is required" });
    }
    if (!["counselling", "doubt_support"].includes(sessionKind)) {
      return res.status(400).json({ message: "Invalid sessionKind" });
    }
    const provider = await User.findById(counsellorId);
    if (!provider) {
      return res.status(400).json({ message: "Teacher not found" });
    }
    if (sessionKind === "doubt_support" && provider.role !== "doubt_teacher") {
      return res
        .status(400)
        .json({ message: "Selected educator is not a doubt teacher" });
    }
    if (sessionKind === "counselling" && provider.role !== "counsellor") {
      return res
        .status(400)
        .json({ message: "Selected provider is not a counsellor" });
    }

    if (sessionKind === "doubt_support") {
      const quota = await getDoubtSupportQuotaStatus(req.user._id);
      if (quota.remaining <= 0) {
        return res.status(403).json({
          message:
            `Monthly doubt support limit reached (${quota.used}/${quota.limit} for ${quota.month}). ` +
            `Your learning profile is "${quota.riskLevel}" (behavioral & mental scores). ` +
            `Students who need more support get a higher limit; it resets next month or if your scores change.`,
          quota,
        });
      }
    }

    const b = await Booking.create({
      userId: req.user._id,
      counsellorId,
      date,
      slot,
      sessionKind,
      institute: req.user.institute || req.user.college || "Unspecified",
    });
    res.status(201).json(b);
  } catch (e) {
    next(e);
  }
};

export const myBookings = async (req, res, next) => {
  try {
    const rows = await Booking.find({ userId: req.user._id })
      .populate(
        "counsellorId",
        "name displayName rating ratingsCount speciality",
      )
      .sort({
        createdAt: -1,
      });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const getCounsellorListForStudent = async (req, res, next) => {
  try {
    const institute = req.user.institute || req.user.college;
    const counsellors = await User.find({
      role: "counsellor",
      $or: [{ institute }, { isPaidCounsellor: true }],
    })
      .select(
        "name displayName institute speciality rating ratingsCount isPaidCounsellor",
      )
      .sort({ rating: -1, ratingsCount: -1 });
    res.json(counsellors);
  } catch (e) {
    next(e);
  }
};

/**
 * Doubt teachers for academic video support.
 * Lists all active doubt teachers so the dropdown is never empty when anyone
 * has registered; same-institute educators are sorted first.
 */
/** Monthly doubt caps from LearningRiskSnapshot (behavioral + mental → tier). */
export const getDoubtSupportQuota = async (req, res, next) => {
  try {
    const quota = await getDoubtSupportQuotaStatus(req.user._id);
    res.json(quota);
  } catch (e) {
    next(e);
  }
};

export const getDoubtTeachersForStudent = async (req, res, next) => {
  try {
    const institute = (req.user.institute || req.user.college || "").trim();
    const rows = await User.find({
      role: "doubt_teacher",
      isActive: { $ne: false },
    })
      .select(
        "name displayName institute speciality rating ratingsCount isPaidCounsellor",
      )
      .lean();

    rows.sort((a, b) => {
      const sameA =
        institute &&
        (a.institute || "").trim().toLowerCase() === institute.toLowerCase();
      const sameB =
        institute &&
        (b.institute || "").trim().toLowerCase() === institute.toLowerCase();
      if (sameA !== sameB) return sameA ? -1 : 1;
      const ra = Number(a.rating) || 0;
      const rb = Number(b.rating) || 0;
      if (rb !== ra) return rb - ra;
      return (b.ratingsCount || 0) - (a.ratingsCount || 0);
    });

    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const counsellorBookings = async (req, res, next) => {
  try {
    if (!ensureCounsellor(req, res)) return;
    const kind = sessionKindForRole(req.user.role);
    const kindClause =
      kind === "counselling"
        ? {
            $or: [
              { sessionKind: "counselling" },
              { sessionKind: { $exists: false } },
            ],
          }
        : { sessionKind: "doubt_support" };

    const assignClause =
      req.user.role === "doubt_teacher"
        ? { counsellorId: req.user._id }
        : {
            $or: [
              { counsellorId: req.user._id },
              { counsellorId: null, institute: req.user.institute },
            ],
          };

    const rows = await Booking.find({
      $and: [assignClause, kindClause],
    })
      .populate("userId", "displayName name username institute")
      .sort({ createdAt: -1 });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const counsellorScheduleMeeting = async (req, res, next) => {
  try {
    if (!ensureCounsellor(req, res)) return;
    const { date, slot, meetingCode } = req.body || {};
    if (!meetingCode || !date || !slot) {
      return res
        .status(400)
        .json({ message: "date, slot and meetingCode are required" });
    }
    const expectedKind = sessionKindForRole(req.user.role);
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { sessionKind: expectedKind },
          ...(expectedKind === "counselling"
            ? [{ sessionKind: { $exists: false } }]
            : []),
        ],
      },
      {
        counsellorId: req.user._id,
        counsellorProposedAt: new Date(),
        date,
        slot,
        meetingCode,
        roomCode: meetingCode,
        meetingStatus: "active",
        status: "scheduled",
        notified: true,
      },
      { new: true },
    );
    if (booking) {
      await VideoRoom.findOneAndUpdate(
        { roomId: meetingCode },
        { roomId: meetingCode, active: true },
        { upsert: true, new: true },
      );
      const isDoubt = booking.sessionKind === "doubt_support";
      await Notification.create({
        userId: booking.userId,
        title: isDoubt ? "Doubt session scheduled" : "Meeting Code Created",
        message: isDoubt
          ? `Your doubt teacher scheduled a video call. Meeting code: ${meetingCode}`
          : `Your counsellor scheduled a video consultancy. Meeting code: ${meetingCode}`,
        type: "meeting-code",
        meta: { bookingId: booking._id, meetingCode },
      });
    }
    res.json(booking);
  } catch (e) {
    next(e);
  }
};

export const counsellorCompleteMeeting = async (req, res, next) => {
  try {
    if (!ensureCounsellor(req, res)) return;
    const expectedKind = sessionKindForRole(req.user.role);
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        counsellorId: req.user._id,
        $or: [
          { sessionKind: expectedKind },
          ...(expectedKind === "counselling"
            ? [{ sessionKind: { $exists: false } }]
            : []),
        ],
      },
      { meetingStatus: "completed", status: "completed" },
      { new: true },
    );
    if (booking?.meetingCode) {
      await VideoRoom.findOneAndUpdate(
        { roomId: booking.meetingCode },
        { active: false },
      );
    }
    res.json(booking);
  } catch (e) {
    next(e);
  }
};

export const adminBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.admin?.role === "institute") {
      filter.institute = req.admin.institute;
    }
    if (req.query.institute) filter.institute = req.query.institute;
    const rows = await Booking.find(filter)
      .populate(
        "userId",
        "displayName name username institute",
      )
      .sort({ createdAt: -1 });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const acceptBooking = async (req, res, next) => {
  try {
    if (req.admin?.role === "institute") {
      return res.status(403).json({
        message: "Institute dashboard is view-only for consultancy workflows",
      });
    }
    const b = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "accepted", notified: true },
      { new: true },
    );
    if (b) {
      await Notification.create({
        userId: b.userId,
        title: "Video Consultation Approved",
        message:
          "Your counselling request was approved by admin. Counsellor will share room code shortly.",
        type: "booking-approved",
      });
    }
    res.json(b);
  } catch (e) {
    next(e);
  }
};

export const shareRoomCode = async (req, res, next) => {
  try {
    if (req.admin?.role === "institute") {
      return res.status(403).json({
        message: "Institute cannot share meeting or room codes",
      });
    }
    const { roomCode } = req.body || {};
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { roomCode, status: "room-shared", notified: true },
      { new: true },
    );
    if (booking) {
      await Notification.create({
        userId: booking.userId,
        title: "Counsellor Shared Room Code",
        message: `Your video consultancy room code is: ${roomCode}`,
        type: "room-code",
        meta: { roomCode, bookingId: booking._id },
      });
    }
    res.json(booking);
  } catch (e) {
    next(e);
  }
};

export const submitStudentFeedback = async (req, res, next) => {
  try {
    const { rating, comment = "" } = req.body || {};
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        studentFeedback: {
          rating: Number(rating),
          comment,
          submittedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Update counsellor rating aggregate.
    if (booking.counsellorId) {
      const counsellor = await User.findById(booking.counsellorId);
      if (counsellor) {
        const currentCount = counsellor.ratingsCount || 0;
        const currentRating = counsellor.rating || 0;
        const nextCount = currentCount + 1;
        const nextRating = (currentRating * currentCount + Number(rating)) / nextCount;
        counsellor.ratingsCount = nextCount;
        counsellor.rating = Number(nextRating.toFixed(2));
        await counsellor.save();
      }
    }

    return res.json(booking);
  } catch (e) {
    return next(e);
  }
};

export const submitCounsellorFeedback = async (req, res, next) => {
  try {
    if (!ensureCounsellor(req, res)) return;
    const expectedKind = sessionKindForRole(req.user.role);
    const {
      mentalHealthSummary = "",
      conditionLevel = "stable",
      riskLevel = "LOW",
      recommendations = "",
    } = req.body || {};

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        counsellorId: req.user._id,
        $or: [
          { sessionKind: expectedKind },
          ...(expectedKind === "counselling"
            ? [{ sessionKind: { $exists: false } }]
            : []),
        ],
      },
      {
        counsellorFeedback: {
          mentalHealthSummary,
          conditionLevel,
          riskLevel,
          recommendations,
          submittedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (riskLevel === "HIGH" && booking.sessionKind !== "doubt_support") {
      await RiskAlert.create({
        userId: booking.userId,
        source: "manual",
        riskLevel: "HIGH",
        reason: `Counsellor assessment marked HIGH risk for booking ${booking._id}`,
      });
      await Notification.create({
        userId: booking.userId,
        title: "Counsellor Follow-Up Recommended",
        message:
          "Your counsellor marked your case for urgent follow-up support. Please check support options.",
        type: "counsellor-risk-followup",
      });
    }

    return res.json(booking);
  } catch (e) {
    return next(e);
  }
};
