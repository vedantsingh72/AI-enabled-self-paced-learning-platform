import { Router } from "express";
import {
  getMyNotifications,
  markNotificationRead,
} from "../controllers/notificationController.js";
import { userAuth } from "../middleware/userAuth.js";

const router = Router();
router.get("/", userAuth, getMyNotifications);
router.patch("/:id/read", userAuth, markNotificationRead);

export default router;
