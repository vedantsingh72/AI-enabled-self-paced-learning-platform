import { Router } from "express";
import {
  adminBookings,
  acceptBooking,
  counsellorBookings,
  counsellorCompleteMeeting,
  counsellorScheduleMeeting,
  createBooking,
  getCounsellorListForStudent,
  getDoubtTeachersForStudent,
  getDoubtSupportQuota,
  getSlots,
  myBookings,
  submitCounsellorFeedback,
  submitStudentFeedback,
  shareRoomCode,
} from "../controllers/bookingController.js";
import { getCounsellorRiskDashboard } from "../controllers/riskDashboardController.js";
import { userAuth } from "../middleware/userAuth.js";
import { adminAuth } from "../middleware/adminAuth.js";
const r = Router();
r.get("/slots", userAuth, getSlots);
r.get("/counsellors", userAuth, getCounsellorListForStudent);
r.get("/doubt-teachers", userAuth, getDoubtTeachersForStudent);
r.get("/doubt-support-quota", userAuth, getDoubtSupportQuota);
r.post("/create", userAuth, createBooking);
r.get("/my", userAuth, myBookings);
r.get("/counsellor/my", userAuth, counsellorBookings);
r.get("/counsellor/risk-dashboard", userAuth, getCounsellorRiskDashboard);
r.patch("/:id/schedule", userAuth, counsellorScheduleMeeting);
r.patch("/:id/complete", userAuth, counsellorCompleteMeeting);
r.patch("/:id/student-feedback", userAuth, submitStudentFeedback);
r.patch("/:id/counsellor-feedback", userAuth, submitCounsellorFeedback);
r.get("/admin", adminAuth, adminBookings);
r.patch("/:id/accept", adminAuth, acceptBooking);
r.patch("/:id/share-room", adminAuth, shareRoomCode);
export default r;
