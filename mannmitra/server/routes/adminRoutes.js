import { Router } from "express";
import {
  createCounsellor,
  generateMentorInviteToken,
  getAnalytics,
  getCounsellors,
  listMentorInviteTokens,
  registerInstitute,
  registerPaidCounsellor,
  registerDoubtTeacher,
  registerStudentCounsellor,
  getUsersForMonitoring,
} from "../controllers/adminController.js";
import { getInstituteRiskDashboard } from "../controllers/riskDashboardController.js";
import { adminAuth } from "../middleware/adminAuth.js";
const r = Router();
r.use(adminAuth);
r.get("/analytics", getAnalytics);
r.post("/register-institute", registerInstitute);
r.post("/register-student-counsellor", registerStudentCounsellor);
r.post("/register-paid-counsellor", registerPaidCounsellor);
r.post("/register-doubt-teacher", registerDoubtTeacher);
r.post("/mentor-invites", generateMentorInviteToken);
r.get("/mentor-invites", listMentorInviteTokens);
r.post("/counsellors", createCounsellor);
r.get("/counsellors", getCounsellors);
r.get("/users", getUsersForMonitoring);
r.get("/risk-dashboard", getInstituteRiskDashboard);
export default r;
