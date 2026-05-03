import { Router } from "express";
import {
  createVideoRoom,
  getVideoRoom,
  validateMeetingCode,
} from "../controllers/videoController.js";
import { userAuth } from "../middleware/userAuth.js";
const r = Router();
r.post("/room", userAuth, createVideoRoom);
r.get("/room/:roomId", userAuth, getVideoRoom);
r.get("/join/:code", userAuth, validateMeetingCode);
export default r;
