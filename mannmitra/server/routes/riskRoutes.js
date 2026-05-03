import { Router } from "express";
import {
  emergencyIdentityReveal,
  getUserRisks,
} from "../controllers/riskController.js";
import { anonymousAuth } from "../middleware/anonymousAuth.js";
import { adminAuth } from "../middleware/adminAuth.js";
const r = Router();
r.get("/", anonymousAuth, getUserRisks);
r.post("/emergency-reveal", adminAuth, emergencyIdentityReveal);
export default r;
