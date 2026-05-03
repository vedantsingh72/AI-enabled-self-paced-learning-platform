import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing admin token" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    if (!["main_admin", "institute", "admin"].includes(decoded.role)) {
      return res.status(403).json({ message: "Institute access only" });
    }
    if (decoded.userId) {
      const user = await User.findById(decoded.userId).select(
        "institute role email",
      );
      req.admin = {
        ...decoded,
        institute: user?.institute || "",
        email: user?.email || "",
      };
    } else {
      req.admin = decoded;
    }
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
};
