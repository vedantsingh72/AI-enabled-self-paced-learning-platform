import { Router } from "express";
import {
  adminLogin,
  createSession,
  login,
  signup,
  signupCounsellor,
  signupDoubtTeacher,
} from "../controllers/authController.js";
const r = Router();
r.post("/create-session", createSession);
r.post("/admin-login", adminLogin);
r.post("/signup", signup);
r.post("/signup-counsellor", signupCounsellor);
r.post("/signup-doubt-teacher", signupDoubtTeacher);
r.post("/login", login);
export default r;
