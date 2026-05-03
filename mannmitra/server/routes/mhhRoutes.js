import { Router } from "express";
import {
  mhhChatbotHistory,
  mhhChatbotMessage,
  mhhChatbotSessionStart,
} from "../controllers/mhhProxyController.js";
import { anonymousAuth } from "../middleware/anonymousAuth.js";

const r = Router();
r.use(anonymousAuth);

r.post("/chatbot/session/start", mhhChatbotSessionStart);
r.post("/chatbot/message", mhhChatbotMessage);
r.get("/chatbot/history/:userId", mhhChatbotHistory);

export default r;
