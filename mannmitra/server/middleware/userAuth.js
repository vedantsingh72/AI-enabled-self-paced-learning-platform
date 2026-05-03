import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const userAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing user token" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "Invalid user token" });
    req.user = user;
    next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid or expired user token" });
  }
};
