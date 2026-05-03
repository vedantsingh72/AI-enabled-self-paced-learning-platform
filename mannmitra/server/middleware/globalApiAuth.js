import jwt from "jsonwebtoken";
import User from "../models/User.js";

const PUBLIC_PREFIXES = ["/api/auth"];

export const globalApiAuth = async (req, res, next) => {
  try {
    // Only protect API routes; keep non-API routes (e.g. /health) accessible.
    if (!req.path.startsWith("/api")) return next();
    if (PUBLIC_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "dev-secret-change-me",
        );
        if (decoded?.userId) {
          const user = await User.findById(decoded.userId).select("_id");
          if (!user) return res.status(401).json({ message: "Unauthorized" });
        } else if (!decoded?.role) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        return next();
      } catch (_err) {
        return res.status(401).json({ message: "Unauthorized" });
      }
    }

    const anonymousId = req.headers["x-anonymous-id"];
    if (anonymousId) {
      const user = await User.findOne({ anonymousId }).select("_id");
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      return next();
    }

    return res.status(401).json({ message: "Authentication required" });
  } catch (err) {
    return next(err);
  }
};
