import { Router } from "express";
import {
  listMyScreenings,
  submitScreening,
} from "../controllers/screeningController.js";
import { anonymousAuth } from "../middleware/anonymousAuth.js";
const r = Router();
r.post("/submit", anonymousAuth, submitScreening);
r.get("/my", anonymousAuth, listMyScreenings);
export default r;
