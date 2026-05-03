export const getPrivacyStatus = async (req, res, next) => {
  try {
    const u = req.user;
    res.json({
      displayName: u.displayName,
      name: u.name || u.displayName,
      username: u.username || null,
    });
  } catch (e) {
    next(e);
  }
};
