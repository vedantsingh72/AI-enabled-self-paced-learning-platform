/** Student-facing learning routes: enrolled app users, not platform admins acting as students. */

export const requireLearningStudent = (req, res, next) => {
  const role = req.user?.role;
  if (!role || !["student", "peer_mentor"].includes(role)) {
    return res
      .status(403)
      .json({ message: "Learning features are available to student accounts." });
  }
  next();
};
