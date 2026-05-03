import { Router } from "express";
import {
  getMyChatHistory,
  sendChatMessage,
} from "../controllers/chatController.js";
import { anonymousAuth } from "../middleware/anonymousAuth.js";
const r = Router();
r.get("/history", anonymousAuth, getMyChatHistory);
r.post("/", anonymousAuth, sendChatMessage);
export default r;
