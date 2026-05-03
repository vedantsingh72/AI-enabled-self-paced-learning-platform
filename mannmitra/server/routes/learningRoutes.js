import { Router } from "express";
import { userAuth } from "../middleware/userAuth.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { requireLearningStudent } from "../middleware/learningStudentAuth.js";
import { platformLearningAdmin } from "../middleware/platformLearningAdmin.js";
import {
  postConsent,
  getConsentStatus,
  listPublishedCourses,
  getCourseById,
  enroll,
  myEnrollments,
  patchProgress,
  postBehaviorBatch,
  getRiskSnapshot,
  postPcmDoubtChat,
} from "../controllers/learningController.js";
import {
  createCourse,
  updateCourse,
  listCoursesAdmin,
  getLearningAggregates,
  getStudentLearningInsights,
} from "../controllers/learningAdminController.js";

const r = Router();

/* Student learning */
r.post("/consent", userAuth, requireLearningStudent, postConsent);
r.get("/consent", userAuth, requireLearningStudent, getConsentStatus);
r.get("/courses", userAuth, requireLearningStudent, listPublishedCourses);
r.get("/courses/:id", userAuth, requireLearningStudent, getCourseById);
r.post(
  "/enroll/:courseId",
  userAuth,
  requireLearningStudent,
  enroll,
);
r.get("/my-enrollments", userAuth, requireLearningStudent, myEnrollments);
r.patch("/progress", userAuth, requireLearningStudent, patchProgress);
r.post("/behavior", userAuth, requireLearningStudent, postBehaviorBatch);
r.get("/risk-score", userAuth, requireLearningStudent, getRiskSnapshot);
r.post("/pcm-doubt", userAuth, requireLearningStudent, postPcmDoubtChat);

/* Platform admin — courses + aggregated analytics */
const admin = Router();
admin.use(adminAuth);
admin.use(platformLearningAdmin);
admin.get("/analytics", getLearningAggregates);
admin.get("/students-insights", getStudentLearningInsights);
admin.get("/courses", listCoursesAdmin);
admin.post("/courses", createCourse);
admin.patch("/courses/:id", updateCourse);

r.use("/admin", admin);

export default r;
