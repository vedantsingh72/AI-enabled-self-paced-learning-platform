import { Router } from "express";
import { addMood, getMoodHistory } from "../controllers/moodController.js";
import { anonymousAuth } from "../middleware/anonymousAuth.js";
const r = Router();
r.post("/add", anonymousAuth, addMood);
r.get("/history", anonymousAuth, getMoodHistory);
export default r;
