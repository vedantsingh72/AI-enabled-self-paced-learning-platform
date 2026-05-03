/** Course + learning analytics management: main platform admin (and explicit admin role). */

export const platformLearningAdmin = (req, res, next) => {
  const role = req.admin?.role;
  if (!role || !["main_admin", "admin"].includes(role)) {
    return res.status(403).json({ message: "Platform admin access required." });
  }
  next();
};
