import User from "../models/User.js";
import RiskAlert from "../models/RiskAlert.js";
import Screening from "../models/Screening.js";
import Booking from "../models/Booking.js";
import MoodEntry from "../models/MoodEntry.js";
import IdentityVault from "../models/IdentityVault.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import MentorInviteToken from "../models/MentorInviteToken.js";
import {
  generatePublicAnonymousId,
  toDisplayName,
} from "../services/anonymousIdService.js";
import { encryptText } from "../services/cryptoService.js";

const registerRoleUser = async ({
  name,
  email,
  password,
  institute,
  role,
  isPaidCounsellor = false,
  speciality = "",
}) => {
  const existing = await User.findOne({ email: (email || "").toLowerCase() });
  if (existing) {
    const err = new Error("Email already exists");
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    anonymousId: `${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    email: email.toLowerCase(),
    passwordHash,
    institute,
    college: institute,
    role,
    isPaidCounsellor,
    speciality,
    displayName: name,
  });
};

export const registerInstitute = async (req, res, next) => {
  try {
    if (req.admin?.role !== "main_admin") {
      return res
        .status(403)
        .json({ message: "Only Main Admin can register institute accounts" });
    }
    const { instituteName, email, password } = req.body || {};
    if (!instituteName || !email || !password) {
      return res
        .status(400)
        .json({ message: "instituteName, email and password are required" });
    }
    const user = await registerRoleUser({
      name: `${instituteName} Admin`,
      email,
      password,
      institute: instituteName,
      role: "institute",
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
};

export const registerStudentCounsellor = async (req, res, next) => {
  try {
    if (req.admin?.role !== "institute") {
      return res
        .status(403)
        .json({ message: "Only Institute can register Student Counsellor" });
    }
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }
    const user = await registerRoleUser({
      name,
      email,
      password,
      institute: req.admin.institute,
      role: "counsellor",
      isPaidCounsellor: false,
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
};

export const registerPaidCounsellor = async (req, res, next) => {
  try {
    if (req.admin?.role !== "main_admin") {
      return res
        .status(403)
        .json({ message: "Only Main Admin can register Paid Counsellor" });
    }
    const { name, email, password, institute, speciality } = req.body || {};
    if (!name || !email || !password || !institute) {
      return res
        .status(400)
        .json({ message: "name, email, password and institute are required" });
    }
    const user = await registerRoleUser({
      name,
      email,
      password,
      institute,
      role: "counsellor",
      isPaidCounsellor: true,
      speciality: speciality || "General",
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
};

/** Main admin: provision a doubt teacher (academic video tutor) — same identity shape as public signup. */
export const registerDoubtTeacher = async (req, res, next) => {
  try {
    if (req.admin?.role !== "main_admin") {
      return res.status(403).json({
        message: "Only Main Admin can register doubt teachers",
      });
    }
    const { name, email, password, institute, username, speciality } =
      req.body || {};
    if (!email || !password || !institute || !name || !username) {
      return res.status(400).json({
        message: "name, username, email, password and institute are required",
      });
    }
    const normalizedUsername = username.toLowerCase().trim();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }
    const existingUsername = await User.findOne({
      username: normalizedUsername,
    });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const publicAnonymousId = generatePublicAnonymousId();
    const user = await User.create({
      anonymousId: uuidv4(),
      name,
      username: normalizedUsername,
      email: email.toLowerCase(),
      passwordHash,
      institute,
      college: institute,
      publicAnonymousId,
      displayName: name.trim() || toDisplayName(publicAnonymousId),
      role: "doubt_teacher",
      isPaidCounsellor: false,
      speciality: (speciality || "").trim(),
    });
    const encryptedPayload = encryptText(
      JSON.stringify({
        name: name || "User",
        email: email.toLowerCase(),
      }),
    );
    await IdentityVault.create({
      publicAnonymousId,
      userId: user._id,
      encryptedPayload: encryptedPayload.cipherText,
      iv: encryptedPayload.iv,
      authTag: encryptedPayload.authTag,
    });
    res.status(201).json({
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      institute: user.institute,
      speciality: user.speciality,
    });
  } catch (e) {
    next(e);
  }
};

export const createCounsellor = async (req, res, next) => {
  try {
    const { displayName, college, speciality } = req.body || {};
    const inst =
      req.admin?.role === "institute" ? req.admin.institute : undefined;
    const user = await User.create({
      anonymousId: `counsellor-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: "counsellor",
      displayName: displayName?.trim() || "Counsellor",
      college: college?.trim() || inst || "Unspecified",
      institute: inst || college?.trim() || "Unspecified",
      speciality: speciality?.trim() || "",
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
};

export const getCounsellors = async (req, res, next) => {
  try {
    const filter = { role: "counsellor" };
    if (req.admin?.role === "institute") {
      filter.institute = req.admin.institute;
    }
    const counsellors = await User.find(filter).sort({
      createdAt: -1,
    });
    res.json(counsellors);
  } catch (e) {
    next(e);
  }
};

export const getUsersForMonitoring = async (req, res, next) => {
  try {
    const { college } = req.query;
    const filter = { role: "student" };
    if (req.admin?.role === "institute") {
      filter.institute = req.admin.institute;
    }
    if (college) filter.college = college;
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(300);
    const ids = users.map((u) => u._id);

    const [riskByUser, screeningByUser, bookingByUser] = await Promise.all([
      RiskAlert.aggregate([
        { $match: { userId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$userId", latestRisk: { $first: "$riskLevel" } } },
      ]),
      Screening.aggregate([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: "$userId", screeningCount: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { userId: { $in: ids } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: "$userId",
            counsellingSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            latestCounsellorRisk: { $last: "$counsellorFeedback.riskLevel" },
          },
        },
      ]),
    ]);

    const riskMap = new Map(
      riskByUser.map((r) => [String(r._id), r.latestRisk]),
    );
    const screeningMap = new Map(
      screeningByUser.map((s) => [String(s._id), s.screeningCount]),
    );
    const bookingMap = new Map(bookingByUser.map((b) => [String(b._id), b]));
    const riskToScore = { LOW: 25, MEDIUM: 60, HIGH: 90 };

    const rows = users.map((u) => ({
      _id: u._id,
      displayName: u.displayName,
      username: u.username,
      name: u.name,
      college: u.college,
      institute: u.institute,
      createdAt: u.createdAt,
      latestRisk:
        bookingMap.get(String(u._id))?.latestCounsellorRisk ||
        riskMap.get(String(u._id)) ||
        "LOW",
      riskMeterScore:
        riskToScore[
          bookingMap.get(String(u._id))?.latestCounsellorRisk ||
            riskMap.get(String(u._id)) ||
            "LOW"
        ],
      screeningCount: screeningMap.get(String(u._id)) || 0,
      counsellingSessions: bookingMap.get(String(u._id))?.counsellingSessions || 0,
      completedSessions: bookingMap.get(String(u._id))?.completedSessions || 0,
    }));
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const getAnalytics = async (_req, res, next) => {
  try {
    const admin = _req.admin;
    const userFilter =
      admin?.role === "institute" ? { institute: admin.institute } : {};
    const users = await User.find(userFilter).select("_id");
    const userIds = users.map((u) => u._id);

    const [activeUsers, highRiskUsers, screenings, bookings, moodTrends] =
      await Promise.all([
        User.countDocuments({ ...userFilter, isActive: true }),
        RiskAlert.countDocuments(
          admin?.role === "institute"
            ? { userId: { $in: userIds }, riskLevel: "HIGH", resolved: false }
            : { riskLevel: "HIGH", resolved: false },
        ),
        Screening.aggregate([
          ...(admin?.role === "institute"
            ? [{ $match: { userId: { $in: userIds } } }]
            : []),
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
              avgScore: { $avg: "$score" },
            },
          },
        ]),
        Booking.aggregate([
          ...(admin?.role === "institute"
            ? [{ $match: { institute: admin.institute } }]
            : []),
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        MoodEntry.aggregate([
          ...(admin?.role === "institute"
            ? [{ $match: { userId: { $in: userIds } } }]
            : []),
          { $group: { _id: "$mood", count: { $sum: 1 } } },
        ]),
      ]);

    const topRiskPatterns = await RiskAlert.aggregate([
      ...(admin?.role === "institute"
        ? [{ $match: { userId: { $in: userIds } } }]
        : []),
      {
        $group: {
          _id: { $ifNull: ["$reason", "Unspecified risk reason"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      activeUsers,
      highRiskUsers,
      screenings,
      bookings,
      moodTrends,
      topRiskPatterns,
    });
  } catch (e) {
    next(e);
  }
};

export const generateMentorInviteToken = async (req, res, next) => {
  try {
    if (req.admin?.role === "institute") {
      return res.status(403).json({
        message: "Institute accounts cannot generate signup tokens",
      });
    }
    const { roleType, expiresInHours = 72 } = req.body || {};
    if (!["peer_mentor", "counsellor"].includes(roleType)) {
      return res
        .status(400)
        .json({ message: "roleType must be peer_mentor or counsellor" });
    }
    const token = `${roleType === "peer_mentor" ? "PM" : "CO"}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const row = await MentorInviteToken.create({
      token,
      institute: req.admin?.institute || "Unspecified",
      roleType,
      createdByUserId: req.admin?.userId,
      expiresAt: new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000),
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
};

export const listMentorInviteTokens = async (req, res, next) => {
  try {
    if (req.admin?.role === "institute") {
      return res.status(403).json({
        message: "Institute accounts cannot list signup tokens",
      });
    }
    const rows = await MentorInviteToken.find({
      institute: req.admin?.institute || "Unspecified",
    }).sort({ createdAt: -1 });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};
