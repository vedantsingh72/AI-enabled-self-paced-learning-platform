import { Router } from "express";
import { getPrivacyStatus } from "../controllers/privacyController.js";
import { anonymousAuth } from "../middleware/anonymousAuth.js";

const router = Router();
router.get("/status", anonymousAuth, getPrivacyStatus);

export default router;
