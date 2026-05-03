import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const anonymousAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (bearer) {
      try {
        const decoded = jwt.verify(
          bearer,
          process.env.JWT_SECRET || "dev-secret-change-me",
        );
        const tokenUser = await User.findById(decoded.userId);
        if (tokenUser) {
          req.user = tokenUser;
          return next();
        }
      } catch (_err) {}
    }

    const anonymousId = req.headers["x-anonymous-id"];
    if (!anonymousId)
      return res.status(401).json({ message: "Missing anonymous session ID" });
    const user = await User.findOne({ anonymousId });
    if (!user)
      return res.status(401).json({ message: "Invalid anonymous session ID" });
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
};
