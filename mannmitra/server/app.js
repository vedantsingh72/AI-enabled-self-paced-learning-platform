import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import screeningRoutes from "./routes/screeningRoutes.js";
import riskRoutes from "./routes/riskRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import forumRoutes from "./routes/forumRoutes.js";
import moodRoutes from "./routes/moodRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import privacyRoutes from "./routes/privacyRoutes.js";
import peerSupportRoutes from "./routes/peerSupportRoutes.js";
import mhhRoutes from "./routes/mhhRoutes.js";
import learningRoutes from "./routes/learningRoutes.js";
import { globalApiAuth } from "./middleware/globalApiAuth.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(globalApiAuth);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/peer", peerSupportRoutes);
app.use("/api/mhh", mhhRoutes);
app.use("/api/learning", learningRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.statusCode || 500)
    .json({ message: err.message || "Internal server error" });
});

export default app;
