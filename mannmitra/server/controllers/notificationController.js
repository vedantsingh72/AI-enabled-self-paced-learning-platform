import Notification from "../models/Notification.js";

export const getMyNotifications = async (req, res, next) => {
  try {
    const rows = await Notification.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const row = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true },
    );
    res.json(row);
  } catch (e) {
    next(e);
  }
};
