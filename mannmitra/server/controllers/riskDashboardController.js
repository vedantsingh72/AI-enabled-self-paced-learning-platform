import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { buildStudentRiskRow } from "../services/riskScoreService.js";

/**
 * Institute or main admin: risk breakdown for many students (bounded).
 */
export const getInstituteRiskDashboard = async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "80"), 10) || 80, 1),
      200,
    );
    const filter = { role: "student" };
    if (req.admin?.role === "institute") {
      filter.institute = req.admin.institute;
    } else if (req.query.institute) {
      filter.institute = String(req.query.institute);
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("displayName username name college institute")
      .lean();

    const students = await Promise.all(users.map((u) => buildStudentRiskRow(u)));

    res.json({
      generatedAt: new Date().toISOString(),
      count: students.length,
      students,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Paid / institute counsellor: students who have (or had) bookings with this counsellor.
 */
export const getCounsellorRiskDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== "counsellor") {
      return res.status(403).json({ message: "Counsellor access only" });
    }

    const userIds = await Booking.find({ counsellorId: req.user._id }).distinct(
      "userId",
    );
    if (!userIds.length) {
      return res.json({
        generatedAt: new Date().toISOString(),
        count: 0,
        students: [],
      });
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select("displayName username name college institute")
      .lean();

    const students = await Promise.all(users.map((u) => buildStudentRiskRow(u)));

    // Highest concern first
    students.sort((a, b) => b.final_score - a.final_score);

    res.json({
      generatedAt: new Date().toISOString(),
      count: students.length,
      students,
    });
  } catch (e) {
    next(e);
  }
};
